import React, { useState } from 'react';
import { Sparkles, Copy, Check, MessageSquare } from 'lucide-react';

interface AnswerPanelProps {
  streamingAnswer: string;
  isAnswering: boolean;
  questionText?: string;
}

export const AnswerPanel: React.FC<AnswerPanelProps> = ({
  streamingAnswer,
  isAnswering,
  questionText,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!streamingAnswer) return;
    navigator.clipboard.writeText(streamingAnswer);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const wordCount = streamingAnswer.trim()
    ? streamingAnswer.trim().split(/\s+/).length
    : 0;

  // Split lines into clean bullets
  const lines = streamingAnswer
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  return (
    <div className="flex flex-col h-full bg-surface-card border border-surface-border rounded-2xl overflow-hidden shadow-xl">
      {/* Panel Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-surface-border bg-surface/50">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-cyan-500/10 rounded-lg text-cyan-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Streaming Suggested Answer (OpenAI GPT-4o-mini)
            </h3>
            <span className="text-[11px] text-slate-400">
              Strictly Grounded in Resume + JD (Max 80 Words)
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {streamingAnswer && (
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-surface border border-surface-border text-slate-400">
                {wordCount} words
              </span>
              <button
                onClick={handleCopy}
                className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1 text-xs"
                title="Copy suggested answer to clipboard"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Answer Body */}
      <div className="flex-1 p-5 overflow-y-auto space-y-3 font-sans">
        {!streamingAnswer && !isAnswering && (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
            <MessageSquare className="w-8 h-8 mb-2 stroke-[1.5] text-slate-600" />
            <p className="text-xs font-medium text-slate-400">Answer stream ready</p>
            <p className="text-[11px] text-slate-500 max-w-xs mt-1">
              As soon as an interview question finishes, a grounded, 3-bullet speakable answer will stream here token by token.
            </p>
          </div>
        )}

        {/* Streaming Bullets */}
        {lines.length > 0 && (
          <div className="space-y-2.5 animate-fade-in text-sm text-slate-100 leading-relaxed">
            {lines.map((line, idx) => {
              const cleanBullet = line.replace(/^[•\-\*]\s*/, '');
              return (
                <div
                  key={idx}
                  className="flex items-start gap-3 p-3 rounded-xl bg-surface/70 border border-surface-border/80 hover:border-cyan-500/30 transition-colors"
                >
                  <span className="w-2 h-2 mt-2 rounded-full bg-cyan-400 shrink-0 shadow-[0_0_8px_#22d3ee]" />
                  <p className="flex-1 font-medium text-slate-200">
                    {cleanBullet}
                  </p>
                </div>
              );
            })}

            {isAnswering && (
              <span className="inline-block w-2 h-4 bg-cyan-400 animate-pulse ml-1 align-middle" />
            )}
          </div>
        )}
      </div>

      {/* Footer hint */}
      <div className="px-5 py-2.5 border-t border-surface-border/60 bg-surface/30 text-[11px] text-slate-400 flex items-center justify-between">
        <span>Grounded System Prompt: Anti-Hallucination Active</span>
        <span>Format: Speakable First-Person</span>
      </div>
    </div>
  );
};
