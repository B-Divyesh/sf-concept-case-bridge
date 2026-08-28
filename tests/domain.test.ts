import { describe, expect, it, vi } from 'vitest';
import { accuracy, isDue, makeExample, scheduleNextReview, validateBackup } from '../src/domain';

describe('review scheduling', () => {
  const now = new Date('2026-08-28T12:00:00.000Z');

  it('returns a missed case the next day', () => {
    expect(scheduleNextReview(false, 4, now)).toBe('2026-08-29T09:00:00.000Z');
  });

  it('increases spacing after successful checks', () => {
    expect(scheduleNextReview(true, 1, now)).toBe('2026-08-31T09:00:00.000Z');
    expect(scheduleNextReview(true, 5, now)).toBe('2026-09-11T09:00:00.000Z');
  });

  it('recognizes a due case', () => {
    const card = makeExample(now);
    expect(isDue(card, now)).toBe(true);
  });
});

describe('portable data', () => {
  it('accepts a complete version-one backup', () => {
    vi.stubGlobal('crypto', { randomUUID: () => '12345678-abcd' });
    const card = makeExample(new Date('2026-08-28T12:00:00.000Z'));
    const backup = { format: 'concept-case-bridge' as const, version: 1 as const, exportedAt: card.createdAt, cases: [card], reviews: [] };
    expect(validateBackup(backup).cases[0].concept).toBe('Idempotency key');
  });

  it('rejects incomplete records without changing data', () => {
    expect(() => validateBackup({ format: 'concept-case-bridge', version: 1, exportedAt: '2026-08-28T12:00:00.000Z', cases: [{ id: 'bad' }], reviews: [] })).toThrow('incomplete');
  });

  it('rejects malformed reviews and invalid counters before storage', () => {
    vi.stubGlobal('crypto', { randomUUID: () => '12345678-abcd' });
    const card = makeExample(new Date('2026-08-28T12:00:00.000Z'));
    const malformedReview = { id: 'review_1', caseId: null, reviewedAt: 'not-a-date', selected: {}, correct: 'true' };
    expect(() => validateBackup({ format: 'concept-case-bridge', version: 1, exportedAt: card.createdAt, cases: [card], reviews: [malformedReview] })).toThrow('review');
    expect(() => validateBackup({ format: 'concept-case-bridge', version: 1, exportedAt: card.createdAt, cases: [{ ...card, reviewCount: '3' }], reviews: [] })).toThrow('malformed');
  });

  it('rejects whitespace-only fields and reviews unrelated to their case', () => {
    vi.stubGlobal('crypto', { randomUUID: () => '12345678-abcd' });
    const card = makeExample(new Date('2026-08-28T12:00:00.000Z'));
    expect(() => validateBackup({ format: 'concept-case-bridge', version: 1, exportedAt: card.createdAt, cases: [{ ...card, scenario: '   ' }], reviews: [] })).toThrow('malformed');
    expect(() => validateBackup({ format: 'concept-case-bridge', version: 1, exportedAt: card.createdAt, cases: [card], reviews: [{ id: 'review_1', caseId: card.id, reviewedAt: card.createdAt, selected: 'Wrong concept', correct: false }] })).toThrow('does not belong');
  });

  it('calculates review accuracy', () => {
    expect(accuracy([])).toBeNull();
    expect(accuracy([{ id: '1', caseId: 'a', reviewedAt: '', selected: '', correct: true }, { id: '2', caseId: 'a', reviewedAt: '', selected: '', correct: false }])).toBe(50);
  });
});
