import { AnswerMode, InterviewContext, QAPair, QuestionType } from '@hidani/shared';

export interface PromptOptions {
  question: string;
  questionType: QuestionType;
  context: InterviewContext;
  history?: QAPair[];
}

export function buildSystemPrompt(options: PromptOptions): string {
  const { questionType, context, history } = options;
  const mode: AnswerMode = context.answerMode || 'concise';

  let formatInstruction = 'Format: 3-4 short, impactful bullet points. Max 80 words total. No introductory preamble.';

  if (mode === 'star' || questionType === 'behavioral') {
    formatInstruction = `Format as compressed STAR in 3 punchy bullets:
- Situation & Task: 1 line context from candidate experience.
- Action: Specific high-impact engineering action taken.
- Result: Measurable outcome or learning.
Total max 75 words.`;
  } else if (mode === 'concise') {
    formatInstruction = 'Format: Exactly 3 punchy bullet points, max 60 words total. Speakable and direct. No filler.';
  } else if (mode === 'detailed') {
    formatInstruction = 'Format: 4-5 concise bullet points, max 90 words total. Highlight architectural decisions and metrics.';
  }

  let typeSpecificGuidance = '';
  switch (questionType) {
    case 'technical':
      typeSpecificGuidance = 'Focus on technical depth, architecture choices, trade-offs, and exact technologies mentioned in the JD/Resume.';
      break;
    case 'behavioral':
      typeSpecificGuidance = 'Highlight teamwork, problem-solving, ownership, and engineering discipline.';
      break;
    case 'situational':
      typeSpecificGuidance = 'Connect candidate motivation and strengths directly with the role responsibilities in the Job Description.';
      break;
    default:
      typeSpecificGuidance = 'Provide a sharp, well-structured professional answer.';
      break;
  }

  const recentQaSection = history && history.length > 0
    ? `\nRECENT CONVERSATION HISTORY (Use for follow-up continuity):\n${history
        .slice(-3)
        .map((h, i) => `Q${i + 1}: ${h.question}\nA${i + 1}: ${h.answer}`)
        .join('\n\n')}\n`
    : '';

  const candidateContext = context.candidateName ? `Candidate Name: ${context.candidateName}\n` : '';
  const targetRoleContext = context.targetRole ? `Target Role: ${context.targetRole}\n` : '';

  return `You are a real-time copilot helping a candidate speak during a live technical job interview.

CORE RULES:
1. STRICT GROUNDING: Use ONLY facts, projects, technologies, and metrics from the RESUME and JOB DESCRIPTION provided below.
2. NO HALLUCINATION: Never invent companies, years of experience, tools, or metrics not grounded in the candidate context. If a question touches something not on the resume, give an honest framing (e.g., strong conceptual foundation or transferable experience) and state it plainly.
3. FIRST-PERSON SPEAKABLE VOICE: Write strictly in the first person ("I designed...", "In my previous project..."), as natural speech a candidate can speak aloud immediately.
4. BREVITY: ${formatInstruction}
5. PERSPECTIVE: ${typeSpecificGuidance}

${candidateContext}${targetRoleContext}
RESUME / EXPERIENCE PROFILE:
${context.resume || 'Experienced Full-Stack / Systems Developer with background in React, Next.js, Node.js, WebSockets, and real-time streaming architectures.'}

JOB DESCRIPTION / TARGET REQUIREMENTS:
${context.jd || 'Software Developer specializing in real-time systems, WebSockets, AI integrations (OpenAI/Deepgram), streaming data, and responsive modern web applications.'}
${recentQaSection}
Now answer the interviewer's question below:`;
}
