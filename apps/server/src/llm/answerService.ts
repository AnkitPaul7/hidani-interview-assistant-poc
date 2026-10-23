import { EventEmitter } from 'events';
import OpenAI from 'openai';
import { buildSystemPrompt, PromptOptions } from './prompts.js';
import { MockLlmStream } from './mockLlm.js';
import { config } from '../config.js';

export interface AnswerStreamCallbacks {
  onDelta: (delta: string, tokenIndex: number) => void;
  onDone: (fullAnswer: string) => void;
  onError: (err: Error) => void;
}

export class AnswerService extends EventEmitter {
  private openai: OpenAI | null = null;
  private activeAbortController: AbortController | null = null;

  constructor() {
    super();
    if (config.openaiApiKey) {
      this.openai = new OpenAI({ apiKey: config.openaiApiKey });
    }
  }

  /**
   * Dispatches streaming answer generation for a detected question
   */
  public async generateStreamingAnswer(
    options: PromptOptions,
    callbacks: AnswerStreamCallbacks
  ): Promise<void> {
    // Cancel any previous in-flight answer immediately
    this.cancelActiveStream();

    const controller = new AbortController();
    this.activeAbortController = controller;

    // Use Mock stream if OpenAI key is missing or explicitly mocked
    if (!this.openai) {
      const mockStream = new MockLlmStream();
      mockStream.on('delta', callbacks.onDelta);
      mockStream.on('done', (full) => {
        if (this.activeAbortController === controller) {
          this.activeAbortController = null;
        }
        callbacks.onDone(full);
      });
      mockStream.on('abort', () => {
        // Stream was cancelled
      });
      await mockStream.streamAnswer(options, controller.signal);
      return;
    }

    const systemPrompt = buildSystemPrompt(options);

    try {
      const stream = await this.openai.chat.completions.create(
        {
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: options.question },
          ],
          temperature: 0.2,
          max_tokens: 160,
          stream: true,
        },
        { signal: controller.signal }
      );

      let fullAnswer = '';
      let tokenIndex = 0;

      for await (const chunk of stream) {
        if (controller.signal.aborted) {
          return;
        }

        const delta = chunk.choices[0]?.delta?.content || '';
        if (delta) {
          fullAnswer += delta;
          callbacks.onDelta(delta, tokenIndex++);
        }
      }

      if (!controller.signal.aborted) {
        callbacks.onDone(fullAnswer);
      }
    } catch (err: any) {
      if (controller.signal.aborted) {
        return;
      }
      console.error('[AnswerService] Error during LLM completion streaming:', err);
      callbacks.onError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      if (this.activeAbortController === controller) {
        this.activeAbortController = null;
      }
    }
  }

  /**
   * Instantly cancel any ongoing LLM completion stream
   */
  public cancelActiveStream(): void {
    if (this.activeAbortController) {
      this.activeAbortController.abort();
      this.activeAbortController = null;
    }
  }
}
