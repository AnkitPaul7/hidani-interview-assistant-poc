import React from 'react';
import { DetectedQuestionUI } from '../hooks/useSession';
import { HelpCircle, Brain, Filter, CheckCircle2 } from 'lucide-react';

interface QuestionPanelProps {
  activeQuestion: DetectedQuestionUI | null;
  isThinking: boolean;
}

export const QuestionPanel: React.FC<QuestionPanelProps> = ({
  activeQuestion,
  isThinking,
}) => {
  const getQuestionTypeBadge = (type: string) => {
    switch (type) {
      case 'technical':
        return 'bg-blue-500/10 border-blue-500/30 text-blue-300';
      case 'behavioral':
        return 'bg-purple-500/10 border-purple-500/30 text-purple-300';
      case 'situational':
        return 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300';
      default:
        return 'bg-slate-800 border-slate-700 text-slate-300';
    }
  };

  return (
    <div className="flex flex-col h-full bg-surface-card border border-surface-border rounded-2xl overflow-hidden shadow-xl">
      {/* Panel Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-surface-border bg-surface/50">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-amber-500/10 rounded-lg text-amber-400">
            <HelpCircle className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Detected Question
            </h3>
            <span className="text-[11px] text-slate-400">
              Endpointing + Heuristics + LLM Tie-Break
            </span>
          </div>
        </div>

        {activeQuestion && (
          <div className="flex items-center gap-2">
            <span
              className={`px-2.5 py-0.5 rounded-full border text-[10px] font-bold uppercase ${getQuestionTypeBadge(
                activeQuestion.questionType
              )}`}
            >
              {activeQuestion.questionType}
            </span>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 p-5 flex flex-col justify-center">
        {isThinking && !activeQuestion && (
          <div className="flex flex-col items-center justify-center text-center p-6 space-y-3 animate-pulse">
            <Brain className="w-8 h-8 text-amber-400 animate-bounce" />
            <p className="text-sm font-medium text-amber-300">
              Analyzing turn & classifying question...
            </p>
            <p className="text-xs text-slate-400">Filtering filler and small talk</p>
          </div>
        )}

        {!activeQuestion && !isThinking && (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
            <Filter className="w-8 h-8 mb-2 stroke-[1.5] text-slate-600" />
            <p className="text-xs font-medium text-slate-400">No question detected yet</p>
            <p className="text-[11px] text-slate-500 max-w-xs mt-1">
              Filler words (&quot;um&quot;, &quot;uh&quot;) and small talk (&quot;can you hear me&quot;) are ignored. Complete interview questions will lock in here.
            </p>
          </div>
        )}

        {activeQuestion && (
          <div className="space-y-4 animate-fade-in">
            <div className="p-4 rounded-xl bg-surface/80 border border-amber-500/30 shadow-lg shadow-amber-500/5">
              <p className="text-base font-semibold text-slate-100 leading-snug">
                &ldquo;{activeQuestion.text}&rdquo;
              </p>
            </div>

            {/* Classification & Confidence metadata */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-surface/40 border border-surface-border">
                <span className="text-slate-400 block text-[10px] uppercase font-bold mb-1">
                  Detection Layer
                </span>
                <span className="font-mono text-slate-200 capitalize flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  {activeQuestion.detectionMethod === 'rule' ? 'Fast Heuristic Rule' : 'LLM Semantic Tie-Break'}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-surface/40 border border-surface-border">
                <span className="text-slate-400 block text-[10px] uppercase font-bold mb-1">
                  Confidence
                </span>
                <span className="font-mono text-slate-200">
                  {Math.round(activeQuestion.confidence * 100)}% Match
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer hint */}
      <div className="px-5 py-2.5 border-t border-surface-border/60 bg-surface/30 text-[11px] text-slate-400 flex items-center justify-between">
        <span>Filler Filter: Active</span>
        <span>Follow-up Merge: Enabled (~1.5s)</span>
      </div>
    </div>
  );
};
