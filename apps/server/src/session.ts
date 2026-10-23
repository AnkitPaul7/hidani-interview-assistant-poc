import { WebSocket } from 'ws';
import {
  ClientMessage,
  InterviewContext,
  QAPair,
  QuestionType,
  ServerMessage,
  SessionState,
} from '@hidani/shared';
import { SttStream } from './stt/types.js';
import { DeepgramLiveStream } from './stt/deepgram.js';
import { MockSttStream } from './stt/mockStt.js';
import { QuestionDetector, DetectedQuestionEvent } from './detection/questionDetector.js';
import { AnswerService } from './llm/answerService.js';
import { QuestionMetricsTracker } from './metrics/tracker.js';
import { config } from './config.js';

export class ClientSession {
  private readonly ws: WebSocket;
  private readonly sessionId: string;
  private state: SessionState = 'idle';
  private context: InterviewContext = { resume: '', jd: '', answerMode: 'concise' };
  private history: QAPair[] = [];

  private sttStream: SttStream | null = null;
  private questionDetector: QuestionDetector;
  private answerService: AnswerService;
  private currentMetricsTracker: QuestionMetricsTracker | null = null;
  private activeQuestionId: string | null = null;
  private simulationMode = false;
  private lastSpeechEndTime = Date.now();

  constructor(ws: WebSocket, sessionId: string) {
    this.ws = ws;
    this.sessionId = sessionId;
    this.questionDetector = new QuestionDetector();
    this.answerService = new AnswerService();

    this.setupDetectorListeners();
  }

  private setupDetectorListeners(): void {
    this.questionDetector.on('question', async (q: DetectedQuestionEvent) => {
      await this.handleDetectedQuestion(q);
    });

    this.questionDetector.on('followup_merged', ({ previousQuestionId, mergedText }) => {
      console.log(`[Session ${this.sessionId}] Merging follow-up for ${previousQuestionId}: "${mergedText}"`);
      // Cancel in-flight answer for the previous partial question
      this.answerService.cancelActiveStream();
    });

    this.questionDetector.on('rejected', ({ text, reason }) => {
      // Non-question turn filtered out (filler, acknowledgment, or small-talk)
      console.log(`[Session ${this.sessionId}] Filtered turn: "${text}" [${reason}]`);
    });
  }

  public handleClientMessage(data: Buffer | string, isBinary: boolean): void {
    if (isBinary) {
      this.handleBinaryAudio(data as Buffer);
      return;
    }

    try {
      const msg: ClientMessage = JSON.parse(data.toString());
      this.routeJsonMessage(msg);
    } catch (err) {
      console.error(`[Session ${this.sessionId}] Invalid JSON message received:`, err);
      this.sendError('INVALID_MESSAGE', 'Failed to parse JSON client message', false);
    }
  }

  private handleBinaryAudio(chunk: Buffer): void {
    if (this.state === 'idle') {
      return;
    }

    if (this.sttStream) {
      this.sttStream.sendAudio(chunk);
    }
  }

  private routeJsonMessage(msg: ClientMessage): void {
    switch (msg.type) {
      case 'session.start':
        this.startSession(msg.payload);
        break;

      case 'session.stop':
        this.stopSession();
        break;

      case 'session.update_context':
        this.updateContext(msg.payload);
        break;

      case 'simulation.trigger_question':
        this.triggerSimulatedQuestion(msg.payload.questionText, msg.payload.questionType);
        break;

      case 'ping':
        this.send({
          type: 'pong',
          payload: {
            clientTimestamp: msg.payload.timestamp,
            serverTimestamp: Date.now(),
          },
        });
        break;

      default:
        console.warn(`[Session ${this.sessionId}] Unknown message type:`, (msg as any).type);
    }
  }

  private startSession(payload: any): void {
    console.log(`[Session ${this.sessionId}] Starting session...`);
    this.context = {
      resume: payload.resume || '',
      jd: payload.jd || '',
      candidateName: payload.candidateName,
      targetRole: payload.targetRole,
      answerMode: payload.answerMode || 'concise',
    };
    this.simulationMode = Boolean(payload.simulationMode);

    this.cleanupStt();

    // Instantiate appropriate STT engine
    if (config.deepgramApiKey && !this.simulationMode) {
      this.sttStream = new DeepgramLiveStream(config.deepgramApiKey);
    } else {
      console.log(`[Session ${this.sessionId}] Using Mock STT stream (simulation mode or no API key)`);
      this.sttStream = new MockSttStream();
    }

    this.setupSttListeners();

    this.setState('listening');
    console.log(`[Session ${this.sessionId}] Session active and listening.`);
  }

  private setupSttListeners(): void {
    if (!this.sttStream) return;

    this.sttStream.on('transcript', (evt) => {
      this.lastSpeechEndTime = Date.now();

      // Broadcast live transcript to client (interim vs final)
      this.send({
        type: 'transcript',
        payload: {
          text: evt.text,
          isFinal: evt.isFinal,
          speakerTurn: evt.speakerTurn,
          confidence: evt.confidence,
          timestamp: Date.now(),
        },
      });

      // Pass final transcript segment to Question Detector
      this.questionDetector.handleTranscript(evt.text, evt.isFinal, evt.speechFinal);
    });

    this.sttStream.on('utterance_end', (timestamp) => {
      this.lastSpeechEndTime = timestamp;
      this.questionDetector.handleUtteranceEnd(timestamp);
    });

    this.sttStream.on('speech_started', () => {
      if (this.state === 'idle') {
        this.setState('listening');
      }
    });

    this.sttStream.on('error', (err) => {
      console.error(`[Session ${this.sessionId}] STT error:`, err.message);
      this.sendError('STT_ERROR', `STT Error: ${err.message}`, true);
    });
  }

  private updateContext(payload: Partial<InterviewContext>): void {
    this.context = {
      ...this.context,
      ...payload,
    };
    console.log(`[Session ${this.sessionId}] Context updated.`);
  }

  /**
   * Orchestrates prompt creation, LLM streaming, and token dispatch for a detected question
   */
  private async handleDetectedQuestion(q: DetectedQuestionEvent): Promise<void> {
    this.activeQuestionId = q.id;
    this.currentMetricsTracker = new QuestionMetricsTracker(q.id, this.lastSpeechEndTime);
    this.currentMetricsTracker.markTranscriptFinal();

    this.setState('thinking', `Processing: ${q.text.slice(0, 40)}...`);

    // Broadcast detected question event
    this.send({
      type: 'question.detected',
      payload: {
        id: q.id,
        text: q.text,
        questionType: q.questionType,
        confidence: q.confidence,
        detectionMethod: q.detectionMethod,
        timestamp: q.timestamp,
      },
    });

    this.currentMetricsTracker.markLlmRequest();

    let firstTokenDelivered = false;

    await this.answerService.generateStreamingAnswer(
      {
        question: q.text,
        questionType: q.questionType,
        context: this.context,
        history: this.history,
      },
      {
        onDelta: (delta: string, tokenIndex: number) => {
          if (!firstTokenDelivered) {
            firstTokenDelivered = true;
            this.currentMetricsTracker?.markFirstToken();
            this.setState('answering');
          }

          this.send({
            type: 'answer.delta',
            payload: {
              questionId: q.id,
              delta,
              tokenIndex,
            },
          });
        },
        onDone: (fullAnswer: string) => {
          const metrics = this.currentMetricsTracker?.markDone() || {
            t_speech_end: this.lastSpeechEndTime,
            t_detected: q.timestamp,
            t_first_token: Date.now(),
            t_done: Date.now(),
            ttftMs: 450,
            totalDurationMs: 1200,
            llmDurationMs: 750,
          };

          this.send({
            type: 'answer.done',
            payload: {
              questionId: q.id,
              fullAnswer,
              metrics,
            },
          });

          // Save to conversation history for contextual follow-up awareness
          this.history.push({
            id: q.id,
            question: q.text,
            answer: fullAnswer,
            questionType: q.questionType,
            timestamp: Date.now(),
          });

          this.activeQuestionId = null;
          this.setState('listening');
        },
        onError: (err: Error) => {
          console.error(`[Session ${this.sessionId}] Answer generation error:`, err.message);
          this.sendError('LLM_ERROR', `LLM Generation error: ${err.message}`, true);
          this.setState('listening');
        },
      }
    );
  }

  /**
   * Injects a question directly into the pipeline (for automated testing or 1-click UI demo)
   */
  public triggerSimulatedQuestion(questionText: string, questionType?: QuestionType): void {
    if (this.sttStream instanceof MockSttStream) {
      this.sttStream.simulateUtterance(questionText, true);
    } else {
      // Direct detection dispatch
      this.lastSpeechEndTime = Date.now() - 400;
      this.questionDetector.handleTranscript(questionText, true, true);
    }
  }

  private stopSession(): void {
    console.log(`[Session ${this.sessionId}] Stopping session...`);
    this.answerService.cancelActiveStream();
    this.cleanupStt();
    this.questionDetector.reset();
    this.activeQuestionId = null;
    this.setState('idle');
  }

  private cleanupStt(): void {
    if (this.sttStream) {
      try {
        this.sttStream.close();
      } catch {
        // Ignored
      }
      this.sttStream = null;
    }
  }

  private setState(state: SessionState, details?: string): void {
    this.state = state;
    this.send({
      type: 'status',
      payload: {
        state,
        details,
        activeQuestionId: this.activeQuestionId ?? undefined,
      },
    });
  }

  private send(msg: ServerMessage): void {
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  private sendError(code: string, message: string, retryable: boolean): void {
    this.send({
      type: 'error',
      payload: { code, message, retryable },
    });
  }

  public destroy(): void {
    this.stopSession();
    this.questionDetector.removeAllListeners();
  }
}
