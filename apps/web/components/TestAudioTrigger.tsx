import React from 'react';
import { QuestionType } from '@hidani/shared';
import { PlayCircle, ShieldAlert, Sparkles, Terminal, Users, RotateCcw } from 'lucide-react';

interface TestAudioTriggerProps {
  onTrigger: (text: string, type?: QuestionType) => void;
  disabled?: boolean;
}

const PRESET_QUESTIONS = [
  {
    title: '1. Tell me about yourself',
    text: 'Tell me about yourself and your experience with real-time web applications.',
    type: 'situational' as QuestionType,
    icon: <Users className="w-3.5 h-3.5 text-cyan-400" />,
    badge: 'Profile',
  },
  {
    title: '2. Why this role at Hidani?',
    text: 'Why do you want to join Hidani Tech for this AI & Real-Time Systems role?',
    type: 'situational' as QuestionType,
    icon: <Sparkles className="w-3.5 h-3.5 text-brand-primary" />,
    badge: 'Company Fit',
  },
  {
    title: '3. WebSockets vs Polling',
    text: 'What are the key architectural trade-offs between WebSockets and HTTP polling for real-time data streaming?',
    type: 'technical' as QuestionType,
    icon: <Terminal className="w-3.5 h-3.5 text-blue-400" />,
    badge: 'Technical JD',
  },
  {
    title: '4. Behavioral Challenge (STAR)',
    text: 'Describe a situation where you faced severe latency or outage in production and how you handled it.',
    type: 'behavioral' as QuestionType,
    icon: <PlayCircle className="w-3.5 h-3.5 text-purple-400" />,
    badge: 'STAR Format',
  },
  {
    title: '5. Follow-up Question',
    text: 'And how did you verify the latency metrics and prevent regressions under peak load?',
    type: 'technical' as QuestionType,
    icon: <RotateCcw className="w-3.5 h-3.5 text-amber-400" />,
    badge: 'Follow-Up Merge',
  },
  {
    title: '6. Small Talk (Should Ignore)',
    text: 'Can you hear me alright? Okay great, thanks a lot, let’s get started.',
    type: 'general' as QuestionType,
    icon: <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />,
    badge: 'Filter Test',
  },
];

export const TestAudioTrigger: React.FC<TestAudioTriggerProps> = ({
  onTrigger,
  disabled = false,
}) => {
  return (
    <div className="bg-surface-card border border-surface-border rounded-2xl p-4 shadow-lg">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="p-1 bg-brand-primary/10 rounded-md text-brand-primary">
            <Sparkles className="w-3.5 h-3.5" />
          </span>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
            Demo & Reviewer Quick Test Bar (6 Pre-configured Rubric Questions)
          </span>
        </div>
        <span className="text-[11px] text-slate-400 hidden sm:inline">
          1-Click simulation of interviewer voice turns to test pipeline & video demo
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {PRESET_QUESTIONS.map((q, idx) => (
          <button
            key={idx}
            disabled={disabled}
            onClick={() => onTrigger(q.text, q.type)}
            className="flex flex-col items-start p-2.5 rounded-xl bg-surface/70 border border-surface-border hover:border-slate-500 hover:bg-surface text-left transition-all disabled:opacity-40 group"
          >
            <div className="flex items-center justify-between w-full mb-1">
              {q.icon}
              <span className="text-[9px] uppercase font-bold px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 group-hover:text-slate-200">
                {q.badge}
              </span>
            </div>
            <span className="text-xs font-semibold text-slate-200 truncate w-full">
              {q.title}
            </span>
            <span className="text-[10px] text-slate-400 truncate w-full mt-0.5">
              {q.text}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};
