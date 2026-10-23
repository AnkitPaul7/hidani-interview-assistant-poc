/**
 * Global audio and networking constants
 */

export const AUDIO_CONFIG = {
  SAMPLE_RATE: 16000,
  CHANNELS: 1,
  BYTES_PER_SAMPLE: 2, // 16-bit PCM (2 bytes)
  FRAME_DURATION_MS: 100, // ~100 ms audio chunks
  SAMPLES_PER_FRAME: 1600, // 16000 * 0.1
  BYTES_PER_FRAME: 3200, // 1600 * 2
} as const;

export const WS_CONFIG = {
  DEFAULT_PORT: 8080,
  HEARTBEAT_INTERVAL_MS: 15000,
  RECONNECT_BASE_MS: 1000,
  RECONNECT_MAX_MS: 8000,
  MAX_RECONNECT_ATTEMPTS: 5,
} as const;

export const DETECTION_CONFIG = {
  MIN_WORD_COUNT: 4,
  MAX_FOLLOWUP_GAP_MS: 1600,
  SILENCE_TIMEOUT_MS: 600,
} as const;

export const LATENCY_TARGETS = {
  TARGET_TTFT_MS: 3000, // rubric threshold (< 3s)
  EXCELLENT_TTFT_MS: 1500, // high performance
} as const;
