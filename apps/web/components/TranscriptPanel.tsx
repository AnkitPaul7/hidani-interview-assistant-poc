import React, { useRef, useEffect } from 'react';
import { TranscriptItem } from '../hooks/useSession';
import { Mic, Trash2, Radio } from 'lucide-react';

interface TranscriptPanelProps {
  transcripts: TranscriptItem[];
  interimTranscript: string;
  isCapturing: boolean;
  onClear: () => void;
}

export const TranscriptPanel: React.FC<TranscriptPanelProps> = ({
  transcripts,
  interimTranscript,
  isCapturing,
  onClear,
}) => {
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll to bottom on new transcripts
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcripts, interimTranscript]);

  return (
    <div className="flex flex-col h-full bg-surface-card border border-surface-border rounded-2xl overflow-hidden shadow-xl">
      {/* Panel Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-surface-border bg-surface/50">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-blue-500/10 rounded-lg text-blue-400">
            <Radio className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Live Transcript (Deepgram STT)
            </h3>
            <span className="text-[11px] text-slate-400">
              Interim (grey/italic) vs Final (solid)
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isCapturing && (
            <span className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              Streaming Audio
            </span>
          )}
          {transcripts.length > 0 && (
            <button
              onClick={onClear}
              className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
              title="Clear transcript history"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Transcript List */}
      <div
        ref={scrollRef}
        className="flex-1 p-5 overflow-y-auto space-y-3.5 font-sans text-sm leading-relaxed"
      >
        {transcripts.length === 0 && !interimTranscript && (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
            <Mic className="w-8 h-8 mb-2 stroke-[1.5] text-slate-600" />
            <p className="text-xs font-medium text-slate-400">Audio stream is idle</p>
            <p className="text-[11px] text-slate-500 max-w-xs mt-1">
              Click &quot;Start Session&quot; to begin capturing tab audio or microphone. Words will appear here in real time.
            </p>
          </div>
        )}

        {/* Finalized Transcripts */}
        {transcripts.map((item) => (
          <div key={item.id} className="group flex items-start gap-3 animate-fade-in">
            <span className="text-[10px] font-mono text-slate-500 mt-1 select-none">
              {new Date(item.timestamp).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              })}
            </span>
            <div className="flex-1 text-slate-200 bg-surface/60 rounded-xl px-3.5 py-2.5 border border-surface-border/60">
              {item.text}
            </div>
          </div>
        ))}

        {/* Interim / In-Flight Transcript */}
        {interimTranscript && (
          <div className="flex items-start gap-3 animate-pulse">
            <span className="text-[10px] font-mono text-amber-500/70 mt-1 select-none">LIVE</span>
            <div className="flex-1 text-slate-400 italic bg-slate-900/40 rounded-xl px-3.5 py-2.5 border border-dashed border-slate-700">
              {interimTranscript}
              <span className="inline-block w-1.5 h-3.5 ml-1 bg-amber-400 animate-pulse align-middle" />
            </div>
          </div>
        )}
      </div>

      {/* Footer hint */}
      <div className="px-5 py-2.5 border-t border-surface-border/60 bg-surface/30 text-[11px] text-slate-400 flex items-center justify-between">
        <span>Audio: 16 kHz Mono PCM16</span>
        <span>Model: Nova-3 (Streaming)</span>
      </div>
    </div>
  );
};
