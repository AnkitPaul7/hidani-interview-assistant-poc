import { EventEmitter } from 'events';
import { PromptOptions } from './prompts.js';

const MOCK_ANSWERS: Record<string, string[]> = {
  tell_me_about_yourself: [
    '• Over 4 years of frontend & full-stack experience building high-performance web applications in React, Next.js, and TypeScript.',
    '• Specialized in real-time interfaces and WebSocket streaming pipelines, handling responsive UI state under fast-moving event data.',
    '• Passionate about voice AI, clean architecture, and low-latency audio pipelines that solve real user friction.',
  ],
  why_this_role: [
    '• Hidani Tech’s mission of real-time conversational assistance perfectly aligns with my background in WebSockets and responsive interfaces.',
    '• The stack—Node/TS, Next.js, Deepgram, and OpenAI streaming—matches my sweet spot for low-latency full-stack engineering.',
    '• Excited to tackle hard engineering challenges like sub-3-second TTFT and robust browser audio capture.',
  ],
  websockets_vs_polling: [
    '• WebSockets maintain a persistent, full-duplex TCP connection with negligible framing overhead (~2 bytes vs hundreds of HTTP bytes).',
    '• Eliminates repetitive HTTP handshake latency, enabling sub-50ms bidirectional streaming crucial for live speech and audio chunks.',
    '• Use HTTP polling for infrequent, stateless queries; WebSockets for real-time streaming pipelines where latency matters.',
  ],
  behavioral_challenge: [
    '• Situation: Faced sudden latency spikes during peak real-time message broadcasting in an event-driven dashboard.',
    '• Action: Profiled the pipeline, switched from JSON serialization to binary frames, and added client-side debounce buffering.',
    '• Result: Reduced p95 broadcast latency by 68% and eliminated UI thread stuttering completely.',
  ],
  default: [
    '• Designed modular real-time streaming pipelines utilizing WebSockets and modern Node/TypeScript architectures.',
    '• Grounded solutions directly in project specifications with strict latency budgets and non-blocking asynchronous event loops.',
    '• Focused on reliability, proactive error handling, and clean code separation between capture, transport, and presentation layers.',
  ],
};

export class MockLlmStream extends EventEmitter {
  private isCancelled = false;

  public async streamAnswer(options: PromptOptions, signal?: AbortSignal): Promise<void> {
    const qLower = options.question.toLowerCase();
    let bulletList = MOCK_ANSWERS.default;

    if (qLower.includes('tell me about yourself') || qLower.includes('introduce yourself')) {
      bulletList = MOCK_ANSWERS.tell_me_about_yourself;
    } else if (qLower.includes('why this role') || qLower.includes('why hidani') || qLower.includes('why should we hire')) {
      bulletList = MOCK_ANSWERS.why_this_role;
    } else if (qLower.includes('websocket') || qLower.includes('polling') || qLower.includes('technical')) {
      bulletList = MOCK_ANSWERS.websockets_vs_polling;
    } else if (options.questionType === 'behavioral' || qLower.includes('challenge') || qLower.includes('time when')) {
      bulletList = MOCK_ANSWERS.behavioral_challenge;
    }

    const fullText = bulletList.join('\n');
    const tokens = fullText.split(/(\s+)/); // Keep whitespace tokens

    // Emulate initial network TTFT (~200ms)
    await new Promise((resolve) => setTimeout(resolve, 220));

    let accumulated = '';
    for (let i = 0; i < tokens.length; i++) {
      if (this.isCancelled || signal?.aborted) {
        this.emit('abort');
        return;
      }

      const token = tokens[i];
      accumulated += token;
      this.emit('delta', token, i);

      // Natural token typing cadence (~25ms)
      await new Promise((resolve) => setTimeout(resolve, 25));
    }

    if (!this.isCancelled && !signal?.aborted) {
      this.emit('done', accumulated);
    }
  }

  public cancel(): void {
    this.isCancelled = true;
  }
}
