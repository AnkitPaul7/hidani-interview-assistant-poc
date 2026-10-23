import { EventEmitter } from 'events';

export interface SttTranscriptEvent {
  text: string;
  isFinal: boolean;
  speakerTurn?: number;
  confidence?: number;
  speechFinal?: boolean;
}

export interface SttStream extends EventEmitter {
  sendAudio(chunk: Buffer): void;
  close(): void;

  on(event: 'transcript', listener: (data: SttTranscriptEvent) => void): this;
  on(event: 'speech_started', listener: (timestamp: number) => void): this;
  on(event: 'utterance_end', listener: (timestamp: number) => void): this;
  on(event: 'error', listener: (err: Error) => void): this;
  on(event: 'close', listener: () => void): this;
}
