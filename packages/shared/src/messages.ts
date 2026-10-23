import { AnswerMode, DetectionMethod, LatencyMetrics, QuestionType, SessionState } from './events.js';

/**
 * WebSocket Protocol: Messages from Client to Server
 */
export type ClientMessage =
  | {
      type: 'session.start';
      payload: {
        resume?: string;
        jd?: string;
        candidateName?: string;
        targetRole?: string;
        answerMode?: AnswerMode;
        simulationMode?: boolean;
      };
    }
  | {
      type: 'session.stop';
      payload?: Record<string, never>;
    }
  | {
      type: 'session.update_context';
      payload: {
        resume?: string;
        jd?: string;
        answerMode?: AnswerMode;
      };
    }
  | {
      type: 'simulation.trigger_question';
      payload: {
        questionText: string;
        questionType?: QuestionType;
      };
    }
  | {
      type: 'ping';
      payload: {
        timestamp: number;
      };
    };

/**
 * WebSocket Protocol: Messages from Server to Client
 */
export type ServerMessage =
  | {
      type: 'status';
      payload: {
        state: SessionState;
        details?: string;
        activeQuestionId?: string;
      };
    }
  | {
      type: 'transcript';
      payload: {
        text: string;
        isFinal: boolean;
        speakerTurn?: number;
        confidence?: number;
        timestamp: number;
      };
    }
  | {
      type: 'question.detected';
      payload: {
        id: string;
        text: string;
        questionType: QuestionType;
        confidence: number;
        detectionMethod: DetectionMethod;
        timestamp: number;
      };
    }
  | {
      type: 'answer.delta';
      payload: {
        questionId: string;
        delta: string;
        tokenIndex: number;
      };
    }
  | {
      type: 'answer.done';
      payload: {
        questionId: string;
        fullAnswer: string;
        metrics: LatencyMetrics;
      };
    }
  | {
      type: 'error';
      payload: {
        code: string;
        message: string;
        retryable: boolean;
      };
    }
  | {
      type: 'pong';
      payload: {
        clientTimestamp: number;
        serverTimestamp: number;
      };
    };
