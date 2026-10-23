import { EventEmitter } from 'events';
import OpenAI from 'openai';
import { cleanTranscriptText, evaluateHeuristics, classifyQuestionType } from './heuristics.js';
import { DetectionResult, TurnBuffer } from './types.js';
import { DETECTION_CONFIG } from '@hidani/shared';
import { config } from '../config.js';

export interface DetectedQuestionEvent {
  id: string;
  text: string;
  questionType: 'technical' | 'behavioral' | 'situational' | 'general';
  confidence: number;
  detectionMethod: 'rule' | 'llm' | 'endpoint' | 'manual';
  timestamp: number;
  isFollowUp?: boolean;
}

export class QuestionDetector extends EventEmitter {
  private buffer: TurnBuffer = {
    transcriptSegments: [],
    lastSegmentTime: 0,
    speechFinalReceived: false,
    utteranceEndReceived: false,
  };

  private openai: OpenAI | null = null;
  private lastQuestion: { id: string; text: string; timestamp: number } | null = null;
  private silenceTimer: NodeJS.Timeout | null = null;

  constructor() {
    super();
    if (config.openaiApiKey) {
      this.openai = new OpenAI({ apiKey: config.openaiApiKey });
    }
  }

  /**
   * Process incoming transcript segment from STT
   */
  public handleTranscript(text: string, isFinal: boolean, speechFinal = false): void {
    if (!isFinal || !text.trim()) {
      return;
    }

    this.buffer.transcriptSegments.push(text.trim());
    this.buffer.lastSegmentTime = Date.now();
    this.buffer.speechFinalReceived = speechFinal;

    this.resetSilenceTimer();

    // If Deepgram signals speech_final, evaluate immediately
    if (speechFinal) {
      this.evaluateBufferedTurn();
    }
  }

  /**
   * Called when STT provider signals UtteranceEnd (pause detected)
   */
  public handleUtteranceEnd(timestamp: number): void {
    this.buffer.utteranceEndReceived = true;
    this.buffer.lastSegmentTime = timestamp;
    this.evaluateBufferedTurn();
  }

  private resetSilenceTimer(): void {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
    }

    this.silenceTimer = setTimeout(() => {
      if (this.buffer.transcriptSegments.length > 0) {
        this.evaluateBufferedTurn();
      }
    }, DETECTION_CONFIG.SILENCE_TIMEOUT_MS);
  }

  /**
   * Evaluates the buffered turn text across the 3-layer pipeline
   */
  public async evaluateBufferedTurn(): Promise<void> {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }

    if (this.buffer.transcriptSegments.length === 0) {
      return;
    }

    const fullTurnText = this.buffer.transcriptSegments.join(' ');
    this.clearBuffer();

    const heuristicResult = evaluateHeuristics(fullTurnText);

    if (heuristicResult) {
      if (heuristicResult.isQuestion) {
        await this.dispatchQuestion(heuristicResult);
      } else {
        // Fast-rejected statement / small-talk / filler
        this.emit('rejected', {
          text: fullTurnText,
          reason: heuristicResult.reason,
        });
      }
      return;
    }

    // Heuristics were ambiguous: Tier 3 LLM Tie-Breaker
    const llmResult = await this.classifyWithLlm(fullTurnText);
    if (llmResult.isQuestion) {
      await this.dispatchQuestion(llmResult);
    } else {
      this.emit('rejected', {
        text: fullTurnText,
        reason: llmResult.reason,
      });
    }
  }

  /**
   * Rapid 1-token LLM classifier for ambiguous turns (~150-250ms)
   */
  private async classifyWithLlm(turnText: string): Promise<DetectionResult> {
    const cleaned = cleanTranscriptText(turnText);

    if (!this.openai) {
      // Fallback heuristic if no OpenAI key is set:
      // If turn has more than 5 words and contains conversational verbs, accept as question
      const words = cleaned.split(' ');
      const looksLikePrompt = words.length >= 6 && /\b(can|could|would|think|explain|opinion|experience)\b/i.test(cleaned);
      return {
        isQuestion: looksLikePrompt,
        cleanedText: cleaned,
        questionType: classifyQuestionType(cleaned),
        confidence: looksLikePrompt ? 0.75 : 0.4,
        method: 'rule',
        reason: looksLikePrompt ? 'Ambiguous: accepted via semantic fallback' : 'Ambiguous: rejected via semantic fallback',
      };
    }

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'You are a fast interview question classifier. Respond with ONLY "YES" if the text is an interviewer question or prompt requiring an answer, or "NO" if it is casual remarks, small talk, thinking out loud, or an acknowledgment.',
          },
          {
            role: 'user',
            content: cleaned,
          },
        ],
        max_tokens: 2,
        temperature: 0,
      });

      const reply = response.choices[0]?.message?.content?.trim().toUpperCase() ?? 'NO';
      const isQuestion = reply.startsWith('YES');

      return {
        isQuestion,
        cleanedText: cleaned,
        questionType: classifyQuestionType(cleaned),
        confidence: 0.9,
        method: 'llm',
        reason: `LLM tie-break classified as: ${reply}`,
      };
    } catch (err) {
      console.error('[QuestionDetector] LLM classification error, falling back to heuristics:', err);
      return {
        isQuestion: cleaned.length > 25,
        cleanedText: cleaned,
        questionType: classifyQuestionType(cleaned),
        confidence: 0.6,
        method: 'rule',
        reason: 'LLM error fallback',
      };
    }
  }

  private async dispatchQuestion(result: DetectionResult): Promise<void> {
    const now = Date.now();
    let text = result.cleanedText;

    // Follow-up merging: check if this turn arrived closely after previous question
    let isFollowUp = false;
    if (
      this.lastQuestion &&
      now - this.lastQuestion.timestamp < DETECTION_CONFIG.MAX_FOLLOWUP_GAP_MS
    ) {
      // Merge follow-up (e.g. "...and how did you scale it?")
      text = `${this.lastQuestion.text} ${text}`;
      isFollowUp = true;
      this.emit('followup_merged', {
        previousQuestionId: this.lastQuestion.id,
        mergedText: text,
      });
    }

    // Deduplication check: ignore exact or near-duplicate within 5 seconds
    if (
      this.lastQuestion &&
      now - this.lastQuestion.timestamp < 5000 &&
      this.lastQuestion.text.toLowerCase() === text.toLowerCase()
    ) {
      return;
    }

    const questionId = `q_${now}_${Math.random().toString(36).substring(2, 7)}`;
    this.lastQuestion = { id: questionId, text, timestamp: now };

    const event: DetectedQuestionEvent = {
      id: questionId,
      text,
      questionType: result.questionType || classifyQuestionType(text),
      confidence: result.confidence,
      detectionMethod: result.method,
      timestamp: now,
      isFollowUp,
    };

    this.emit('question', event);
  }

  public clearBuffer(): void {
    this.buffer.transcriptSegments = [];
    this.buffer.speechFinalReceived = false;
    this.buffer.utteranceEndReceived = false;
  }

  public reset(): void {
    this.clearBuffer();
    this.lastQuestion = null;
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
  }
}
