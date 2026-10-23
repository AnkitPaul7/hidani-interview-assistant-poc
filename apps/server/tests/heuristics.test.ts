import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  cleanTranscriptText,
  evaluateHeuristics,
  classifyQuestionType,
} from '../src/detection/heuristics.js';

describe('Heuristics & Text Cleaning', () => {
  it('should strip conversational fillers cleanly', () => {
    const raw = 'Um, so basically, like, how do you handle WebSockets?';
    const cleaned = cleanTranscriptText(raw);
    assert.equal(cleaned, 'how do you handle WebSockets?');
  });

  it('should fast-reject pure small talk and mic checks', () => {
    const result1 = evaluateHeuristics('Can you hear me?');
    assert.ok(result1);
    assert.equal(result1.isQuestion, false);

    const result2 = evaluateHeuristics('Let’s get started now');
    assert.ok(result2);
    assert.equal(result2.isQuestion, false);

    const result3 = evaluateHeuristics('Okay sounds good thanks');
    assert.ok(result3);
    assert.equal(result3.isQuestion, false);
  });

  it('should fast-reject turns with fewer than 4 words', () => {
    const result = evaluateHeuristics('Hello there right?');
    assert.ok(result);
    assert.equal(result.isQuestion, false);
  });

  it('should fast-accept explicit questions with interrogatives', () => {
    const result = evaluateHeuristics('What are the key trade-offs between WebSockets and HTTP polling?');
    assert.ok(result);
    assert.equal(result.isQuestion, true);
    assert.equal(result.questionType, 'technical');
  });

  it('should fast-accept imperative interview prompts without question mark', () => {
    const result = evaluateHeuristics('Tell me about a time you handled a severe production outage');
    assert.ok(result);
    assert.equal(result.isQuestion, true);
    assert.equal(result.questionType, 'behavioral');
  });

  it('should correctly classify technical vs behavioral vs situational questions', () => {
    assert.equal(
      classifyQuestionType('Can you explain how Redis caching works in a distributed cluster?'),
      'technical'
    );
    assert.equal(
      classifyQuestionType('Describe a situation where you had a conflict with a senior engineer'),
      'behavioral'
    );
    assert.equal(
      classifyQuestionType('Why are you interested in this role at Hidani Tech?'),
      'situational'
    );
  });
});
