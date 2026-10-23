/**
 * Core domain types and events for the Real-Time Interview Assistant
 */

export type SessionState = 'idle' | 'listening' | 'thinking' | 'answering' | 'reconnecting' | 'error';

export type QuestionType = 'technical' | 'behavioral' | 'situational' | 'general';

export type DetectionMethod = 'rule' | 'llm' | 'endpoint' | 'manual';

export type AnswerMode = 'concise' | 'detailed' | 'star';

export interface LatencyMetrics {
  /** Timestamp when speaker stopped talking (from Deepgram utterance_end or silence detector) */
  t_speech_end: number;
  /** Timestamp when final transcript arrived */
  t_transcript_final?: number;
  /** Timestamp when the turn was classified as a question */
  t_detected: number;
  /** Timestamp when LLM stream request was dispatched */
  t_llm_request?: number;
  /** Timestamp when first answer token was received and sent to client */
  t_first_token: number;
  /** Timestamp when last answer token completed */
  t_done: number;
  /** Time-to-First-Token in milliseconds (t_first_token - t_speech_end) */
  ttftMs: number;
  /** Total pipeline latency in milliseconds (t_done - t_speech_end) */
  totalDurationMs: number;
  /** LLM generation time in milliseconds (t_done - t_first_token) */
  llmDurationMs: number;
}

export interface InterviewContext {
  resume: string;
  jd: string;
  candidateName?: string;
  targetRole?: string;
  answerMode?: AnswerMode;
}

export interface QAPair {
  id: string;
  question: string;
  answer: string;
  questionType: QuestionType;
  timestamp: number;
}
