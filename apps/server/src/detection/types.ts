import { DetectionMethod, QuestionType } from '@hidani/shared';

export interface DetectionResult {
  isQuestion: boolean;
  cleanedText: string;
  questionType?: QuestionType;
  confidence: number;
  method: DetectionMethod;
  reason: string;
}

export interface TurnBuffer {
  transcriptSegments: string[];
  lastSegmentTime: number;
  speechFinalReceived: boolean;
  utteranceEndReceived: boolean;
}
