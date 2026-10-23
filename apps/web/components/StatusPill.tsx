import React from 'react';
import { SessionState } from '@hidani/shared';
import { Mic, Brain, Sparkles, AlertCircle, WifiOff, CircleDot } from 'lucide-react';

interface StatusPillProps {
  state: SessionState;
  details?: string;
  volume?: number;
}

export const StatusPill: React.FC<StatusPillProps> = ({ state, details, volume = 0 }) => {
  const getBadgeConfig = () => {
    switch (state) {
      case 'listening':
        return {
          icon: <Mic className="w-4 h-4 text-emerald-400 animate-pulse" />,
          label: 'Listening',
          badgeClass: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.2)]',
          dotClass: 'bg-emerald-400',
        };
      case 'thinking':
        return {
          icon: <Brain className="w-4 h-4 text-amber-400 animate-bounce" />,
          label: 'Detecting & Thinking',
          badgeClass: 'bg-amber-500/10 border-amber-500/30 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.2)]',
          dotClass: 'bg-amber-400',
        };
      case 'answering':
        return {
          icon: <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />,
          label: 'Streaming Answer',
          badgeClass: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.25)]',
          dotClass: 'bg-cyan-400',
        };
      case 'reconnecting':
        return {
          icon: <WifiOff className="w-4 h-4 text-rose-400 animate-spin" />,
          label: 'Reconnecting...',
          badgeClass: 'bg-rose-500/10 border-rose-500/30 text-rose-300',
          dotClass: 'bg-rose-400',
        };
      case 'error':
        return {
          icon: <AlertCircle className="w-4 h-4 text-rose-400" />,
          label: 'Error',
          badgeClass: 'bg-rose-500/10 border-rose-500/30 text-rose-300',
          dotClass: 'bg-rose-500',
        };
      case 'idle':
      default:
        return {
          icon: <CircleDot className="w-4 h-4 text-slate-400" />,
          label: 'Idle (Ready)',
          badgeClass: 'bg-slate-800/80 border-slate-700 text-slate-400',
          dotClass: 'bg-slate-500',
        };
    }
  };

  const config = getBadgeConfig();

  return (
    <div className="flex items-center gap-3">
      <div className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-medium transition-all ${config.badgeClass}`}>
        <span className={`w-2 h-2 rounded-full ${config.dotClass} animate-ping`} />
        {config.icon}
        <span className="tracking-wide uppercase text-[11px] font-semibold">{config.label}</span>
      </div>

      {state === 'listening' && volume > 0.05 && (
        <div className="flex items-center gap-1 h-3 px-2 py-1 bg-slate-900/60 rounded border border-slate-800">
          <span
            className="w-1.5 bg-emerald-400 rounded-full transition-all duration-75"
            style={{ height: `${Math.max(4, Math.min(14, volume * 24))}px` }}
          />
          <span
            className="w-1.5 bg-emerald-400 rounded-full transition-all duration-75"
            style={{ height: `${Math.max(4, Math.min(18, volume * 32))}px` }}
          />
          <span
            className="w-1.5 bg-emerald-400 rounded-full transition-all duration-75"
            style={{ height: `${Math.max(4, Math.min(10, volume * 18))}px` }}
          />
        </div>
      )}

      {details && (
        <span className="text-xs text-slate-400 truncate max-w-[200px] hidden md:inline">
          {details}
        </span>
      )}
    </div>
  );
};
