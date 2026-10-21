import test from 'node:test';
import assert from 'node:assert/strict';
import {
  tokenize,
  calculateCosineSimilarity,
  calculateJaccardSimilarity,
  findDuplicateSuggestions,
  analyzePriorityAndClassification,
} from '../src/lib/ai/intelligence';
import { SEED_COMPLAINTS } from '../src/lib/db/seed-data';

test('AI Intelligence Suite: Zero-Cost NLP, Duplicate Detection, and Explainable Priority Scoring', async (t) => {
  await t.test('Tokenization and Stemming normalizes campus terminology', () => {
    const tokens = tokenize('Sparks and loose wiring sparking near the hostel switchboards');
    assert.ok(tokens.includes('spark'));
    assert.ok(tokens.includes('wire'));
    assert.ok(tokens.includes('switchboard'));
    assert.ok(tokens.includes('hostel'));
    // Stop words removed
    assert.ok(!tokens.includes('and'));
    assert.ok(!tokens.includes('the'));
  });

  await t.test('Detects duplicate complaint with high similarity score', () => {
    // There is an existing complaint about "Exposed High-Voltage Switchboard in Hostel Block C Corridor"
    const queryTitle = 'Dangerous sparking electrical switchboard in Hostel Block C';
    const queryDesc = 'Loose wires and sparks on the second floor corridor near water cooler';

    const suggestions = findDuplicateSuggestions(
      queryTitle,
      queryDesc,
      'electricity',
      'Hostel Block C (Boys)',
      SEED_COMPLAINTS
    );

    assert.ok(suggestions.length > 0);
    const topMatch = suggestions[0];
    assert.equal(topMatch.complaint.id, 'cmp-001');
    assert.ok(topMatch.similarityScore >= 0.50);
    assert.ok(topMatch.matchedTokens.length >= 2);
  });

  await t.test('Explainable Priority: Severe electrical hazard triggers CRITICAL score with reasons', () => {
    const analysis = analyzePriorityAndClassification(
      'Live Sparking Wire Near Water Tank',
      'Exposed live electrical wire touching wet surface with continuous sparks. Immediate fire hazard!',
      'electricity',
      'Hostel Block B'
    );

    assert.ok(analysis.score >= 85);
    assert.equal(analysis.priority, 'critical');
    assert.ok(analysis.reasons.length >= 2);
    assert.ok(analysis.reasons.some((r) => r.includes('Electrical or fire hazard')));
    assert.equal(analysis.suggestedDepartment, 'Electrical & Power Facilities');
  });

  await t.test('Explainable Priority: Minor cosmetic issue gets LOW or MEDIUM priority', () => {
    const analysis = analyzePriorityAndClassification(
      'Notice board cork pin loose',
      'The cork pin on notice board near seminar room is loose.',
      'infrastructure',
      'Academic Block'
    );

    assert.ok(analysis.score < 50);
    assert.notEqual(analysis.priority, 'critical');
  });
});
