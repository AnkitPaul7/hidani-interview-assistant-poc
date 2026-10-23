import { QuestionType } from '@hidani/shared';
import { DetectionResult } from './types.js';

// Common conversational fillers to clean from audio transcripts
const FILLER_REGEX = /\b(um|uh|er|ah|you know|like|so basically|basically|actually|I mean)\b/gi;

// Small talk, greetings, mic checks, and acknowledgments to fast-reject
const ACKNOWLEDGMENT_PATTERNS = [
  /^(yeah|yep|yes|nope|no|okay|ok|sure|alright|right|got it|sounds good|cool|perfect|understood|fine|great)[.,! ]*$/i,
  /^(thank you|thanks|thanks a lot|thank you so much|have a good day)[.,! ]*$/i,
  /^(can you hear me|can you see my screen|am i audible|testing one two|loud and clear)[.,!? ]*$/i,
  /^(hello|hi there|good morning|good afternoon|good evening|hey there|nice to meet you)[.,! ]*$/i,
  /(let['’]s get started|let['’]s begin|let['’]s dive in|we can start now)/i,
  /(give me a second|one moment|just a second|let me pull up|hang on)/i,
];

const ACKNOWLEDGMENT_TOKENS = new Set([
  'yeah', 'yep', 'yes', 'nope', 'no', 'okay', 'ok', 'sure', 'alright',
  'right', 'got', 'it', 'sounds', 'good', 'cool', 'perfect', 'understood',
  'fine', 'great', 'thanks', 'thank', 'you', 'hello', 'hi',
]);

// Imperative prompts that are interview questions without ending in '?'
const IMPERATIVE_QUESTION_PREFIXES = [
  'tell me about',
  'walk me through',
  'describe a',
  'describe how',
  'describe your',
  'explain how',
  'explain the',
  'explain your',
  'give me an example',
  'give an example',
  'share a time',
  'share an experience',
  'help me understand',
  'talk about a',
  'talk about your',
  'elaborate on',
];

// Direct interrogative start words and auxiliary verbs
const QUESTION_START_WORDS = [
  'what', 'why', 'how', 'when', 'where', 'who', 'which', 'whose',
  'can you', 'could you', 'would you', 'should you', 'will you',
  'have you', 'had you', 'do you', 'did you', 'are you', 'were you',
  'is there', 'are there', 'is it', 'was it', 'could it',
  'in your opinion', 'what are', 'what is', 'how do', 'how would',
];

// Technical keyword cues (with word boundaries)
const TECHNICAL_KEYWORDS = [
  'architecture', 'database', 'sql', 'nosql', 'postgres', 'redis', 'websocket',
  'websockets', 'rest', 'api', 'http', 'latency', 'concurrency', 'docker', 'kubernetes',
  'microservices', 'frontend', 'backend', 'node', 'react', 'next.js', 'typescript',
  'system design', 'scalability', 'performance', 'stream', 'event loop', 'async',
  'memory leak', 'caching', 'load balancer', 'state management',
];

// Behavioral STAR cues
const BEHAVIORAL_KEYWORDS = [
  'conflict', 'disagree', 'challenge', 'difficult', 'mistake', 'failure',
  'deadline', 'team', 'proud of', 'leadership', 'situation', 'obstacle',
  'handled', 'resolved', 'pressure', 'tight deadline', 'collaborate',
];

export function cleanTranscriptText(text: string): string {
  return text
    .replace(FILLER_REGEX, ' ')
    .replace(/[,;:]+/g, ' ') // Strip punctuation left orphaned by filler removal
    .replace(/\s+/g, ' ')
    .trim();
}

export function classifyQuestionType(cleanedText: string): QuestionType {
  const lower = cleanedText.toLowerCase();

  // 1. Situational / HR checks first
  if (
    lower.includes('why this role') ||
    lower.includes('why are you interested') ||
    lower.includes('why do you want') ||
    lower.includes('tell me about yourself') ||
    lower.includes('salary') ||
    lower.includes('remote') ||
    lower.includes('strength') ||
    lower.includes('weakness')
  ) {
    return 'situational';
  }

  // 2. Behavioral STAR check
  const behavioralMatch = BEHAVIORAL_KEYWORDS.some((kw) => lower.includes(kw));
  if (behavioralMatch || lower.includes('tell me about a time') || lower.includes('describe a situation')) {
    return 'behavioral';
  }

  // 3. Technical check
  const technicalMatch = TECHNICAL_KEYWORDS.some((kw) => {
    const regex = new RegExp(`\\b${kw}\\b`, 'i');
    return regex.test(lower);
  });
  if (technicalMatch) {
    return 'technical';
  }

  return 'general';
}

export function evaluateHeuristics(rawText: string): DetectionResult | null {
  const cleaned = cleanTranscriptText(rawText);
  const words = cleaned.toLowerCase().split(/\s+/).filter(Boolean);

  // 1. Fast reject: Pure acknowledgment or small talk regex patterns
  for (const pattern of ACKNOWLEDGMENT_PATTERNS) {
    if (pattern.test(rawText.trim()) || pattern.test(cleaned)) {
      return {
        isQuestion: false,
        cleanedText: cleaned,
        confidence: 0.95,
        method: 'rule',
        reason: 'Rejected: conversational filler or acknowledgment',
      };
    }
  }

  // 2. Fast reject: Multi-word acknowledgment sequence ("okay sounds good thanks")
  if (words.length > 0 && words.every((w) => ACKNOWLEDGMENT_TOKENS.has(w))) {
    return {
      isQuestion: false,
      cleanedText: cleaned,
      confidence: 0.95,
      method: 'rule',
      reason: 'Rejected: sequence of acknowledgments',
    };
  }

  // 3. Fast reject: Too short (< 4 words)
  if (words.length < 4) {
    return {
      isQuestion: false,
      cleanedText: cleaned,
      confidence: 0.95,
      method: 'rule',
      reason: 'Rejected: under 4 words threshold',
    };
  }

  const lower = cleaned.toLowerCase();

  // 4. Fast accept: Ends with question mark
  if (cleaned.endsWith('?')) {
    return {
      isQuestion: true,
      cleanedText: cleaned,
      questionType: classifyQuestionType(cleaned),
      confidence: 0.95,
      method: 'rule',
      reason: 'Accepted: explicit question punctuation',
    };
  }

  // 5. Fast accept: Imperative prompt ("tell me about", "walk me through", etc.)
  for (const prefix of IMPERATIVE_QUESTION_PREFIXES) {
    if (lower.startsWith(prefix)) {
      return {
        isQuestion: true,
        cleanedText: cleaned.endsWith('?') ? cleaned : `${cleaned}?`,
        questionType: classifyQuestionType(cleaned),
        confidence: 0.92,
        method: 'rule',
        reason: `Accepted: imperative question pattern "${prefix}"`,
      };
    }
  }

  // 6. Fast accept: Direct question starters ("what", "how", "can you", etc.)
  for (const start of QUESTION_START_WORDS) {
    if (lower.startsWith(start + ' ') || lower.startsWith(start + "'") || lower.startsWith(start + ',')) {
      return {
        isQuestion: true,
        cleanedText: cleaned.endsWith('?') ? cleaned : `${cleaned}?`,
        questionType: classifyQuestionType(cleaned),
        confidence: 0.9,
        method: 'rule',
        reason: `Accepted: interrogative prefix "${start}"`,
      };
    }
  }

  // Ambiguous: doesn't match clean reject or clean accept
  return null;
}
