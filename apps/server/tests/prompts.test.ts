import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildSystemPrompt } from '../src/llm/prompts.js';

describe('Prompt Engineering & Grounding Constraints', () => {
  it('should enforce strict anti-hallucination grounding instructions', () => {
    const prompt = buildSystemPrompt({
      question: 'Tell me about yourself',
      questionType: 'situational',
      context: {
        resume: '4 years React developer at TachoMind. Built real-time dashboards.',
        jd: 'Node.js and WebSocket developer at Hidani Tech.',
        answerMode: 'concise',
      },
    });

    assert.ok(prompt.includes('STRICT GROUNDING: Use ONLY facts'));
    assert.ok(prompt.includes('NO HALLUCINATION: Never invent companies'));
    assert.ok(prompt.includes('FIRST-PERSON SPEAKABLE VOICE'));
    assert.ok(prompt.includes('TachoMind'));
    assert.ok(prompt.includes('Hidani Tech'));
  });

  it('should format behavioral prompts with STAR guidelines', () => {
    const prompt = buildSystemPrompt({
      question: 'Tell me about a difficult bug you tracked down',
      questionType: 'behavioral',
      context: {
        resume: 'Frontend engineer',
        jd: 'Fullstack role',
        answerMode: 'star',
      },
    });

    assert.ok(prompt.includes('Situation & Task'));
    assert.ok(prompt.includes('Action:'));
    assert.ok(prompt.includes('Result:'));
  });

  it('should inject conversational history for follow-up questions', () => {
    const prompt = buildSystemPrompt({
      question: 'And how did you resolve that?',
      questionType: 'technical',
      context: {
        resume: 'Software developer',
        jd: 'Backend engineer',
      },
      history: [
        {
          id: 'q1',
          question: 'What database did you use?',
          answer: 'PostgreSQL with Redis caching.',
          questionType: 'technical',
          timestamp: Date.now(),
        },
      ],
    });

    assert.ok(prompt.includes('RECENT CONVERSATION HISTORY'));
    assert.ok(prompt.includes('What database did you use?'));
    assert.ok(prompt.includes('PostgreSQL with Redis caching.'));
  });
});
