import React from 'react';
import { SessionState } from '@hidani/shared';
import { StatusPill } from './StatusPill';
import { LatencyBadge } from './LatencyBadge';
import { AudioSourceType } from '../hooks/useAudioCapture';
import {
  Radio,
  Play,
  Square,
  FileText,
  Volume2,
  Mic,
  Monitor,
  FlaskConical,
} from 'lucide-react';

interface HeaderProps {
  sessionState: SessionState;
  statusDetails: string;
  isConnected: boolean;
  isCapturing: boolean;
  audioSource: AudioSourceType;
  volume: number;
  simulationMode: boolean;
  latestMetrics: any;
  onToggleSession: () => void;
  onChangeAudioSource: (src: AudioSourceType) => void;
  onToggleSimulation: () => void;
  onOpenContextModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  sessionState,
  statusDetails,
  isConnected,
  isCapturing,
  audioSource,
  volume,
  simulationMode,
  latestMetrics,
  onToggleSession,
  onChangeAudioSource,
  onToggleSimulation,
  onOpenContextModal,
}) => {
  const isRunning = sessionState !== 'idle';

  return (
    <header className="border-b border-surface-border bg-surface/90 backdrop-blur-md sticky top-0 z-40 px-6 py-3.5">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Brand & Connection */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-primary to-brand-cyan flex items-center justify-center text-white shadow-lg shadow-brand-primary/25">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-100 tracking-tight">
                Hidani Tech Copilot
              </h1>
              <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-brand-primary/10 text-brand-primary border border-brand-primary/20">
                POC Core Loop
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isConnected ? 'bg-emerald-400 shadow-[0_0_6px_#34d399]' : 'bg-rose-400'
                  }`}
                />
                {isConnected ? 'Server Connected' : 'Disconnected'}
              </span>
              <span>•</span>
              <span className="text-slate-400">Sub-3s Streaming Pipeline</span>
            </div>
          </div>
        </div>

        {/* Center: Live Status & Latency Badge */}
        <div className="flex items-center gap-3">
          <StatusPill state={sessionState} details={statusDetails} volume={volume} />
          <LatencyBadge metrics={latestMetrics} />
        </div>

        {/* Right: Controls & Context */}
        <div className="flex items-center gap-3">
          {/* Audio Source Dropdown */}
          <div className="flex items-center bg-surface-card border border-surface-border rounded-xl p-1 text-xs">
            <button
              disabled={isRunning}
              onClick={() => onChangeAudioSource('tab')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
                audioSource === 'tab'
                  ? 'bg-brand-primary text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 disabled:opacity-50'
              }`}
              title="Capture meeting tab audio (Google Meet/Zoom) via getDisplayMedia"
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>Tab Audio</span>
            </button>
            <button
              disabled={isRunning}
              onClick={() => onChangeAudioSource('mic')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
                audioSource === 'mic'
                  ? 'bg-brand-primary text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 disabled:opacity-50'
              }`}
              title="Microphone input fallback"
            >
              <Mic className="w-3.5 h-3.5" />
              <span>Mic</span>
            </button>
          </div>

          {/* Simulation Toggle */}
          <button
            onClick={onToggleSimulation}
            disabled={isRunning}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-medium transition-all ${
              simulationMode
                ? 'bg-purple-500/10 border-purple-500/30 text-purple-300'
                : 'bg-surface-card border-surface-border text-slate-400 hover:text-slate-200 disabled:opacity-50'
            }`}
            title="Toggle simulation mode for testing when running without Deepgram/OpenAI API keys"
          >
            <FlaskConical className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sim Mode</span>
          </button>

          {/* Context Input Modal Trigger */}
          <button
            onClick={onOpenContextModal}
            className="flex items-center gap-1.5 px-3 py-2 bg-surface-card hover:bg-slate-800 border border-surface-border rounded-xl text-xs font-medium text-slate-300 hover:text-white transition-all shadow-sm"
          >
            <FileText className="w-3.5 h-3.5 text-brand-primary" />
            <span>Resume & JD</span>
          </button>

          {/* Main Start / Stop Button */}
          <button
            onClick={onToggleSession}
            className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-lg ${
              isRunning
                ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/25 animate-pulse'
                : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/25'
            }`}
          >
            {isRunning ? (
              <>
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>Stop Session</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Start Session</span>
              </>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
