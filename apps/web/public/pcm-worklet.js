/**
 * High-Performance AudioWorkletProcessor:
 * Resamples browser audio (44.1kHz / 48kHz) to 16kHz 16-bit mono PCM chunks (~100ms)
 * and transfers ArrayBuffers with zero-copy to the main thread.
 */

class PCMProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.targetSampleRate = 16000;
    this.bufferSize = 1600; // 16000 * 0.1s = 1600 samples (~100ms)
    this.outputBuffer = new Int16Array(this.bufferSize);
    this.outputIndex = 0;
  }

  process(inputs) {
    const input = inputs[0];
    if (!input || !input[0] || input[0].length === 0) {
      return true;
    }

    const inputChannel = input[0]; // Mono input or primary left channel
    const inputSampleRate = sampleRate; // Global AudioWorklet sampleRate (e.g. 44100 or 48000)
    const ratio = inputSampleRate / this.targetSampleRate;

    for (let i = 0; i < inputChannel.length; i += ratio) {
      // Linear interpolation between adjacent samples
      const index = Math.floor(i);
      const frac = i - index;
      const s0 = inputChannel[index] || 0;
      const s1 = inputChannel[index + 1] !== undefined ? inputChannel[index + 1] : s0;
      const interpolated = s0 + frac * (s1 - s0);

      // Clamp to [-1.0, 1.0] and convert to 16-bit signed integer
      const clamped = Math.max(-1, Math.min(1, interpolated));
      const pcm16 = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;

      this.outputBuffer[this.outputIndex++] = Math.round(pcm16);

      // If buffer is filled (~100ms), transfer to main thread
      if (this.outputIndex >= this.bufferSize) {
        const transferBuffer = this.outputBuffer.slice(0).buffer;
        this.port.postMessage(transferBuffer, [transferBuffer]);
        this.outputIndex = 0;
      }
    }

    return true;
  }
}

registerProcessor('pcm-processor', PCMProcessor);
