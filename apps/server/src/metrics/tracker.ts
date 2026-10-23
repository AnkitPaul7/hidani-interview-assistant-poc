import { LatencyMetrics } from '@hidani/shared';

export class QuestionMetricsTracker {
  private readonly questionId: string;
  private t_speech_end: number;
  private t_transcript_final?: number;
  private t_detected: number;
  private t_llm_request?: number;
  private t_first_token?: number;
  private t_done?: number;

  constructor(questionId: string, speechEndTime?: number) {
    this.questionId = questionId;
    this.t_speech_end = speechEndTime || Date.now();
    this.t_detected = Date.now();
  }

  public markTranscriptFinal(time = Date.now()): void {
    if (!this.t_transcript_final) {
      this.t_transcript_final = time;
    }
  }

  public markLlmRequest(time = Date.now()): void {
    this.t_llm_request = time;
  }

  public markFirstToken(time = Date.now()): void {
    if (!this.t_first_token) {
      this.t_first_token = time;
    }
  }

  public markDone(time = Date.now()): LatencyMetrics {
    this.t_done = time;
    const firstToken = this.t_first_token || this.t_done;

    const metrics: LatencyMetrics = {
      t_speech_end: this.t_speech_end,
      t_transcript_final: this.t_transcript_final,
      t_detected: this.t_detected,
      t_llm_request: this.t_llm_request,
      t_first_token: firstToken,
      t_done: this.t_done,
      ttftMs: Math.max(0, firstToken - this.t_speech_end),
      totalDurationMs: Math.max(0, this.t_done - this.t_speech_end),
      llmDurationMs: Math.max(0, this.t_done - firstToken),
    };

    return metrics;
  }
}
