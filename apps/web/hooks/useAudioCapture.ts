import { useState, useRef, useCallback } from 'react';

export type AudioSourceType = 'tab' | 'mic';

export interface UseAudioCaptureReturn {
  isCapturing: boolean;
  audioSource: AudioSourceType;
  volume: number; // 0.0 to 1.0 for audio level indicator
  error: string | null;
  startCapture: (source: AudioSourceType, onChunk: (buffer: ArrayBuffer) => void) => Promise<boolean>;
  stopCapture: () => void;
}

export function useAudioCapture(): UseAudioCaptureReturn {
  const [isCapturing, setIsCapturing] = useState(false);
  const [audioSource, setAudioSource] = useState<AudioSourceType>('tab');
  const [volume, setVolume] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const stopCapture = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (workletNodeRef.current) {
      workletNodeRef.current.disconnect();
      workletNodeRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }

    setIsCapturing(false);
    setVolume(0);
  }, []);

  const monitorVolume = useCallback((analyser: AnalyserNode) => {
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    const update = () => {
      analyser.getByteFrequencyData(dataArray);
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
      }
      const avg = sum / dataArray.length;
      setVolume(Math.min(1, avg / 128));
      animationFrameRef.current = requestAnimationFrame(update);
    };
    update();
  }, []);

  const startCapture = useCallback(
    async (source: AudioSourceType, onChunk: (buffer: ArrayBuffer) => void): Promise<boolean> => {
      stopCapture();
      setError(null);
      setAudioSource(source);

      try {
        let stream: MediaStream;

        if (source === 'tab') {
          // getDisplayMedia captures system or tab audio (e.g. Google Meet / Zoom tab)
          stream = await navigator.mediaDevices.getDisplayMedia({
            video: true,
            audio: {
              echoCancellation: false,
              noiseSuppression: false,
              autoGainControl: false,
            },
          });

          // Discard video track immediately to save CPU/memory
          stream.getVideoTracks().forEach((vt) => vt.stop());

          const audioTracks = stream.getAudioTracks();
          if (audioTracks.length === 0) {
            // User did not check "Share tab audio" checkbox in Chrome share dialog
            stream.getTracks().forEach((t) => t.stop());
            throw new Error(
              'No audio track detected. Please make sure to check "Share tab audio" in the Chrome dialog, or switch to Microphone mode.'
            );
          }
        } else {
          // Fallback: standard microphone input
          stream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            },
          });
        }

        mediaStreamRef.current = stream;

        // Listen for when user clicks "Stop sharing" on the browser tab bar
        stream.getAudioTracks()[0].onended = () => {
          stopCapture();
        };

        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        audioContextRef.current = ctx;

        if (ctx.state === 'suspended') {
          await ctx.resume();
        }

        // Load PCM downsampler AudioWorklet
        await ctx.audioWorklet.addModule('/pcm-worklet.js');

        const sourceNode = ctx.createMediaStreamSource(stream);
        const workletNode = new AudioWorkletNode(ctx, 'pcm-processor');
        workletNodeRef.current = workletNode;

        const analyser = ctx.createAnalyser();
        analyser.fftSize = 64;
        analyserRef.current = analyser;

        sourceNode.connect(analyser);
        sourceNode.connect(workletNode);

        // Receive downsampled 16kHz PCM16 ArrayBuffers from AudioWorklet
        workletNode.port.onmessage = (event) => {
          if (event.data instanceof ArrayBuffer) {
            onChunk(event.data);
          }
        };

        monitorVolume(analyser);
        setIsCapturing(true);
        return true;
      } catch (err: any) {
        console.error('[AudioCapture] Failed to start capture:', err);
        setError(err.message || 'Failed to capture audio.');
        stopCapture();
        return false;
      }
    },
    [monitorVolume, stopCapture]
  );

  return {
    isCapturing,
    audioSource,
    volume,
    error,
    startCapture,
    stopCapture,
  };
}
