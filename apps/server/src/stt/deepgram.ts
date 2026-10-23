import { EventEmitter } from 'events';
import { createClient, LiveTranscriptionEvents } from '@deepgram/sdk';
import { SttStream, SttTranscriptEvent } from './types.js';
import { config } from '../config.js';

export class DeepgramLiveStream extends EventEmitter implements SttStream {
  private deepgram;
  private connection: any = null;
  private isConnected = false;
  private pendingAudioQueue: Buffer[] = [];
  private isClosed = false;

  constructor(apiKey: string) {
    super();
    this.deepgram = createClient(apiKey);
    this.initializeConnection();
  }

  private initializeConnection() {
    try {
      this.connection = this.deepgram.listen.live({
        model: config.deepgramModel,
        language: 'en',
        smart_format: true,
        punctuate: true,
        interim_results: true,
        endpointing: config.endpointingMs,
        utterance_end_ms: config.utteranceEndMs,
        encoding: 'linear16',
        sample_rate: 16000,
        channels: 1,
      });

      this.connection.on(LiveTranscriptionEvents.Open, () => {
        this.isConnected = true;
        // Flush any buffered audio packets
        while (this.pendingAudioQueue.length > 0) {
          const chunk = this.pendingAudioQueue.shift();
          if (chunk) {
            this.connection.send(chunk);
          }
        }
      });

      this.connection.on(LiveTranscriptionEvents.Transcript, (data: any) => {
        const alternative = data.channel?.alternatives?.[0];
        if (!alternative) return;

        const text = alternative.transcript;
        if (!text || text.trim().length === 0) return;

        const isFinal = Boolean(data.is_final);
        const speechFinal = Boolean(data.speech_final);
        const confidence = alternative.confidence ?? 1.0;

        const event: SttTranscriptEvent = {
          text: text.trim(),
          isFinal,
          confidence,
          speechFinal,
        };

        this.emit('transcript', event);
      });

      this.connection.on(LiveTranscriptionEvents.UtteranceEnd, () => {
        this.emit('utterance_end', Date.now());
      });

      this.connection.on(LiveTranscriptionEvents.SpeechStarted, () => {
        this.emit('speech_started', Date.now());
      });

      this.connection.on(LiveTranscriptionEvents.Error, (err: any) => {
        console.error('[Deepgram] Error in live stream:', err);
        this.emit('error', err instanceof Error ? err : new Error(String(err)));
      });

      this.connection.on(LiveTranscriptionEvents.Close, () => {
        this.isConnected = false;
        if (!this.isClosed) {
          this.emit('close');
        }
      });
    } catch (err: any) {
      console.error('[Deepgram] Failed to establish live connection:', err);
      this.emit('error', err instanceof Error ? err : new Error(String(err)));
    }
  }

  public sendAudio(chunk: Buffer): void {
    if (this.isClosed) return;

    if (this.isConnected && this.connection) {
      this.connection.send(chunk);
    } else {
      // Buffer a small amount of audio until connection is open (limit buffer to 2 seconds)
      if (this.pendingAudioQueue.length < 20) {
        this.pendingAudioQueue.push(chunk);
      }
    }
  }

  public close(): void {
    this.isClosed = true;
    this.pendingAudioQueue = [];
    if (this.connection) {
      try {
        this.connection.finish();
      } catch {
        // Ignored on teardown
      }
      this.connection = null;
    }
    this.removeAllListeners();
  }
}
