import React, { useState } from 'react';
import { LatencyMetrics } from '@hidani/shared';
import { Zap, Clock, Info } from 'lucide-react';

interface LatencyBadgeProps {
  metrics: LatencyMetrics | null;
}

export const LatencyBadge: React.FC<LatencyBadgeProps> = ({ metrics }) => {
  const [showDetails, setShowDetails] = useState(false);

  if (!metrics) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/50 border border-slate-700/60 rounded-lg text-xs text-slate-400">
        <Clock className="w-3.5 h-3.5 text-slate-500" />
        <span>Latency: Ready</span>
      </div>
    );
  }

  const { ttftMs, totalDurationMs, llmDurationMs } = metrics;
  const isTargetMet = ttftMs <= 3000;
  const isUltraFast = ttftMs < 1500;

  const getStatusColor = () => {
    if (isUltraFast) return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
    if (isTargetMet) return 'text-amber-400 border-amber-500/30 bg-amber-500/10';
    return 'text-rose-400 border-rose-500/30 bg-rose-500/10';
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowDetails(!showDetails)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-mono transition-all hover:brightness-110 ${getStatusColor()}`}
        title="Click to view detailed latency waterfall breakdown"
      >
        <Zap className="w-3.5 h-3.5" />
        <span className="font-semibold">TTFT: {ttftMs}ms</span>
        <span className="text-slate-400 font-sans text-[11px]">| Total: {totalDurationMs}ms</span>
        <span
          className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold font-sans ${
            isTargetMet ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
          }`}
        >
          {isTargetMet ? '< 3s Target Met' : '> 3s'}
        </span>
        <Info className="w-3 h-3 ml-1 opacity-70" />
      </button>

      {showDetails && (
        <div className="absolute right-0 top-full mt-2 w-80 p-4 bg-surface-card border border-surface-border rounded-xl shadow-2xl z-50 text-xs backdrop-blur-md animate-fade-in">
          <div className="flex items-center justify-between pb-2 border-b border-surface-border mb-3">
            <span className="font-semibold text-slate-200 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-brand-cyan" />
              Latency Waterfall Metrics
            </span>
            <button
              onClick={() => setShowDetails(false)}
              className="text-slate-400 hover:text-slate-200"
            >
              ✕
            </button>
          </div>

          <div className="space-y-2.5">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">1. Silence Endpointing (Deepgram):</span>
              <span className="font-mono text-slate-200">
                {Math.max(0, metrics.t_detected - metrics.t_speech_end)} ms
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">2. Question Detection:</span>
              <span className="font-mono text-slate-200">
                {metrics.t_llm_request ? Math.max(0, metrics.t_llm_request - metrics.t_detected) : 5} ms
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">3. LLM Time to First Token (TTFT):</span>
              <span className="font-mono text-emerald-400 font-semibold">{ttftMs} ms</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">4. LLM Generation Stream:</span>
              <span className="font-mono text-slate-200">{llmDurationMs} ms</span>
            </div>
            <div className="pt-2 border-t border-surface-border flex justify-between items-center font-bold">
              <span className="text-slate-300">Total End-to-End Latency:</span>
              <span className="font-mono text-brand-cyan">{totalDurationMs} ms</span>
            </div>
          </div>

          <p className="mt-3 text-[11px] text-slate-400 leading-relaxed">
            * TTFT is measured strictly from the end of the interviewer’s speech to the first answer token rendered in the UI.
          </p>
        </div>
      )}
    </div>
  );
};
