import React, { useState } from 'react';
import { AnswerMode, InterviewContext } from '@hidani/shared';
import { FileText, Sparkles, X, Check } from 'lucide-react';

interface ContextModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentContext: InterviewContext;
  onSave: (updated: InterviewContext) => void;
}

const SAMPLE_RESUME = `Candidate: Ankit Paul
Experience: 4 Years Full-Stack Software Developer at TachoMind
Core Skills: React.js, Next.js, Node.js, TypeScript, WebSockets, REST APIs, AudioWorklet, Async Streams.
Projects:
• Real-time Collaboration Dashboard: Engineered low-latency WebSocket infrastructure handling live data streams with sub-50ms roundtrip UI updates.
• Voice AI Assistant Integration: Built web audio capture pipeline streaming 16kHz PCM audio to STT services and rendering LLM streaming responses.
• Performance Optimization: Replaced polling with bidirectional WebSockets, reducing server network load by 60% and UI render lag by 45%.`;

const SAMPLE_JD = `Role: Software Developer – AI & Real-Time Systems
Company: Hidani Tech
Responsibilities:
• Develop real-time applications using Node.js/TypeScript and React/Next.js.
• Build REST APIs and WebSockets for real-time data streaming.
• Integrate LLM APIs (OpenAI) and streaming speech-to-text services (Deepgram).
• Optimize low-latency pipelines (< 3 seconds end-to-end).
Requirements:
• 2+ years software engineering experience with Node/TS and React/Next.js.
• Hands-on experience with WebSockets, streaming systems, and async workflows.
• Familiarity with Deepgram and OpenAI APIs.`;

export const ContextModal: React.FC<ContextModalProps> = ({
  isOpen,
  onClose,
  currentContext,
  onSave,
}) => {
  const [resume, setResume] = useState(currentContext.resume || SAMPLE_RESUME);
  const [jd, setJd] = useState(currentContext.jd || SAMPLE_JD);
  const [candidateName, setCandidateName] = useState(currentContext.candidateName || 'Ankit Paul');
  const [targetRole, setTargetRole] = useState(currentContext.targetRole || 'Software Developer – AI & Real-Time Systems');
  const [answerMode, setAnswerMode] = useState<AnswerMode>(currentContext.answerMode || 'concise');
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave({
      resume,
      jd,
      candidateName,
      targetRole,
      answerMode,
    });
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 600);
  };

  const handleLoadPreset = () => {
    setResume(SAMPLE_RESUME);
    setJd(SAMPLE_JD);
    setCandidateName('Ankit Paul');
    setTargetRole('Software Developer – AI & Real-Time Systems');
    setAnswerMode('concise');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-surface-card border border-surface-border w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-border bg-surface/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-brand-primary/10 rounded-lg text-brand-primary">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-100">
                Interview Context (Resume & Job Description)
              </h2>
              <p className="text-xs text-slate-400">
                Strict grounding input: AI answers will ONLY use facts from these documents.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleLoadPreset}
              className="px-2.5 py-1 text-xs font-medium text-brand-cyan bg-brand-cyan/10 hover:bg-brand-cyan/20 border border-brand-cyan/30 rounded-lg flex items-center gap-1 transition-all"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Load Hidani Preset
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Metadata row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Candidate Name
              </label>
              <input
                type="text"
                value={candidateName}
                onChange={(e) => setCandidateName(e.target.value)}
                placeholder="e.g. Ankit Paul"
                className="w-full px-3 py-2 bg-surface border border-surface-border rounded-lg text-xs text-slate-200 focus:outline-none focus:border-brand-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Target Role
              </label>
              <input
                type="text"
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                placeholder="e.g. Software Developer – AI & Real-Time Systems"
                className="w-full px-3 py-2 bg-surface border border-surface-border rounded-lg text-xs text-slate-200 focus:outline-none focus:border-brand-primary"
              />
            </div>
          </div>

          {/* Answer Mode selection */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Answer Mode (Speakability Constraint)
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: 'concise', label: 'Concise (3 bullets, ~60 words)', desc: 'Fastest speakability' },
                { id: 'star', label: 'STAR Format (Behavioral)', desc: 'Situation, Action, Result' },
                { id: 'detailed', label: 'Detailed (4-5 bullets, ~85w)', desc: 'Technical depth' },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setAnswerMode(item.id as AnswerMode)}
                  className={`p-3 text-left rounded-xl border text-xs transition-all ${
                    answerMode === item.id
                      ? 'border-brand-primary bg-brand-primary/10 text-slate-100 shadow-[0_0_12px_rgba(59,130,246,0.15)]'
                      : 'border-surface-border bg-surface hover:border-slate-600 text-slate-400'
                  }`}
                >
                  <div className="font-semibold">{item.label}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">{item.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Resume area */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Candidate Resume / Experience Summary
            </label>
            <textarea
              rows={6}
              value={resume}
              onChange={(e) => setResume(e.target.value)}
              placeholder="Paste candidate experience, skills, projects, and key metrics..."
              className="w-full px-3.5 py-2.5 bg-surface border border-surface-border rounded-xl text-xs text-slate-200 font-mono leading-relaxed focus:outline-none focus:border-brand-primary resize-y"
            />
          </div>

          {/* JD area */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Job Description (JD) / Role Requirements
            </label>
            <textarea
              rows={6}
              value={jd}
              onChange={(e) => setJd(e.target.value)}
              placeholder="Paste job description, responsibilities, required skills..."
              className="w-full px-3.5 py-2.5 bg-surface border border-surface-border rounded-xl text-xs text-slate-200 font-mono leading-relaxed focus:outline-none focus:border-brand-primary resize-y"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-surface-border bg-surface/40">
          <span className="text-[11px] text-slate-400">
            Changes will take effect immediately on next detected question.
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-2 text-xs font-semibold text-white bg-brand-primary hover:bg-blue-600 rounded-lg shadow-lg shadow-brand-primary/20 flex items-center gap-1.5 transition-all"
            >
              {savedSuccess ? (
                <>
                  <Check className="w-4 h-4 text-emerald-300" />
                  Saved!
                </>
              ) : (
                'Save Context'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
