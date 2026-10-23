import { EventEmitter } from 'events';
import { SttStream, SttTranscriptEvent } from './types.js';

export class MockSttStream extends EventEmitter implements SttStream {
  private isClosed = false;

  constructor() {
    super();
  }

  public sendAudio(_chunk: Buffer): void {
    // In mock mode, raw audio bytes are received and acknowledged.
    // Audio presence can keep the stream active.
  }

  /**
   * Helper to simulate a realistic sequence of interim and final words
   */
  public simulateUtterance(fullSentence: string, speechFinal = true): void {
    if (this.isClosed) return;

    this.emit('speech_started', Date.now());

    const words = fullSentence.split(' ');
    let currentPartial = '';

    for (let i = 0; i < words.length - 1; i++) {
      currentPartial += (i > 0 ? ' ' : '') + words[i];
      const partial = currentPartial;
      setTimeout(() => {
        if (this.isClosed) return;
        this.emit('transcript', {
          text: partial,
          isFinal: false,
          confidence: 0.85,
        });
      }, i * 120);
    }

    setTimeout(() => {
      if (this.isClosed) return;
      this.emit('transcript', {
        text: fullSentence,
        isFinal: true,
        speechFinal,
        confidence: 0.98,
      });

      if (speechFinal) {
        setTimeout(() => {
          if (!this.isClosed) {
            this.emit('utterance_end', Date.now());
          }
        }, 300);
      }
    }, words.length * 120);
  }

  public close(): void {
    this.isClosed = true;
    this.removeAllListeners();
  }
}
