import type { BridgeBackup, CaseCard, ReviewRecord } from './types';

export const FREE_CASE_LIMIT = 15;

export function createId(prefix = 'case'): string {
  return `${prefix}_${Date.now().toString(36)}_${crypto.randomUUID().slice(0, 8)}`;
}

export function scheduleNextReview(correct: boolean, reviewCount: number, now = new Date()): string {
  const days = correct ? Math.min(30, reviewCount < 2 ? 3 : reviewCount < 4 ? 7 : 14) : 1;
  const next = new Date(now);
  next.setDate(next.getDate() + days);
  next.setHours(9, 0, 0, 0);
  return next.toISOString();
}

export function isDue(card: CaseCard, now = new Date()): boolean {
  return new Date(card.nextReviewAt).getTime() <= now.getTime();
}

export function accuracy(records: ReviewRecord[]): number | null {
  if (!records.length) return null;
  return Math.round((records.filter((record) => record.correct).length / records.length) * 100);
}

function isText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function validateBackup(input: unknown): BridgeBackup {
  if (!input || typeof input !== 'object') throw new Error('That file is not a Concept Case Bridge backup.');
  const value = input as Partial<BridgeBackup>;
  if (value.format !== 'concept-case-bridge' || value.version !== 1 || !Array.isArray(value.cases) || !Array.isArray(value.reviews)) {
    throw new Error('That backup format is not supported. Export a fresh JSON backup and try again.');
  }
  for (const card of value.cases) {
    if (!card || !isText(card.id) || !isText(card.title) || !isText(card.scenario) || !isText(card.domainSignal) || !isText(card.concept) || !isText(card.decision) || !isText(card.alternative) || !isText(card.whyNotAlternative) || !isText(card.attribution)) {
      throw new Error('One or more cases are incomplete. Nothing was imported.');
    }
  }
  return value as BridgeBackup;
}

export function makeExample(now = new Date()): CaseCard {
  const timestamp = now.toISOString();
  return {
    id: createId(),
    title: 'Inventory updates arrive twice',
    scenario: 'A warehouse system receives stock updates from scanners. A network retry can deliver the same update more than once, and a duplicated decrement would make available stock wrong.',
    domainSignal: 'The same real-world event may be delivered repeatedly, but stock must change only once.',
    concept: 'Idempotency key',
    decision: 'Give each scanner event a stable identifier and record processed identifiers in the same transaction as the stock update.',
    alternative: 'Debounce incoming requests',
    whyNotAlternative: 'Debouncing only groups events that arrive close together. A retry minutes later could still apply twice, while two legitimate scans close together could be incorrectly merged.',
    attribution: 'Generic example authored by Concept Case Bridge; contains no employer data.',
    createdAt: timestamp,
    updatedAt: timestamp,
    nextReviewAt: timestamp,
    reviewCount: 0
  };
}
