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

function isTimestamp(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0 && Number.isFinite(new Date(value).getTime());
}

const CASE_TEXT_LIMITS = {
  id: 180,
  title: 90,
  scenario: 900,
  domainSignal: 360,
  concept: 100,
  decision: 600,
  alternative: 100,
  whyNotAlternative: 600,
  attribution: 180
} as const;

function hasTextWithin(value: unknown, limit: number): value is string {
  return isText(value) && value.length <= limit;
}

export function validateCaseCard(card: unknown): asserts card is CaseCard {
  if (!card || typeof card !== 'object') throw new Error('A case is missing required fields.');
  const value = card as Partial<CaseCard>;
  for (const [field, limit] of Object.entries(CASE_TEXT_LIMITS)) {
    if (!hasTextWithin(value[field as keyof CaseCard], limit)) {
      throw new Error(`The ${field === 'whyNotAlternative' ? 'why-not alternative' : field} needs meaningful text within its limit.`);
    }
  }
  if (!isTimestamp(value.createdAt) || !isTimestamp(value.updatedAt) || !isTimestamp(value.nextReviewAt)) {
    throw new Error('A case has an invalid saved date.');
  }
  if (!Number.isSafeInteger(value.reviewCount) || (value.reviewCount ?? -1) < 0) {
    throw new Error('A case has an invalid review count.');
  }
}

function validateReviewRecord(review: unknown, casesById: Map<string, CaseCard>): asserts review is ReviewRecord {
  if (!review || typeof review !== 'object') throw new Error('A review is malformed. Nothing was imported.');
  const value = review as Partial<ReviewRecord>;
  if (!hasTextWithin(value.id, 180) || !hasTextWithin(value.caseId, 180) || !hasTextWithin(value.selected, 100) || !isTimestamp(value.reviewedAt) || typeof value.correct !== 'boolean') {
    throw new Error('A review is malformed. Nothing was imported.');
  }
  const card = casesById.get(value.caseId);
  if (!card || (value.selected !== card.concept && value.selected !== card.alternative)) {
    throw new Error('A review does not belong to an imported case. Nothing was imported.');
  }
}

export function validateBackup(input: unknown): BridgeBackup {
  if (!input || typeof input !== 'object') throw new Error('That file is not a Concept Case Bridge backup.');
  const value = input as Partial<BridgeBackup>;
  if (value.format !== 'concept-case-bridge' || value.version !== 1 || !Array.isArray(value.cases) || !Array.isArray(value.reviews)) {
    throw new Error('That backup format is not supported. Export a fresh JSON backup and try again.');
  }
  if (!isTimestamp(value.exportedAt)) throw new Error('That backup has an invalid export date. Nothing was imported.');
  const casesById = new Map<string, CaseCard>();
  for (const card of value.cases) {
    try {
      validateCaseCard(card);
    } catch {
      throw new Error('One or more cases are incomplete or malformed. Nothing was imported.');
    }
    if (casesById.has(card.id)) throw new Error('That backup contains duplicate case IDs. Nothing was imported.');
    casesById.set(card.id, card);
  }
  const reviewIds = new Set<string>();
  for (const review of value.reviews) {
    validateReviewRecord(review, casesById);
    if (reviewIds.has(review.id)) throw new Error('That backup contains duplicate review IDs. Nothing was imported.');
    reviewIds.add(review.id);
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
