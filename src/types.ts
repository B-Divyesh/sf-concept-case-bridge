export interface CaseCard {
  id: string;
  title: string;
  scenario: string;
  domainSignal: string;
  concept: string;
  decision: string;
  alternative: string;
  whyNotAlternative: string;
  attribution: string;
  createdAt: string;
  updatedAt: string;
  nextReviewAt: string;
  reviewCount: number;
}

export interface ReviewRecord {
  id: string;
  caseId: string;
  reviewedAt: string;
  selected: string;
  correct: boolean;
}

export interface BridgeBackup {
  format: 'concept-case-bridge';
  version: 1;
  exportedAt: string;
  cases: CaseCard[];
  reviews: ReviewRecord[];
}

export interface LicenseState {
  token: string | null;
  unlocked: boolean;
  checking: boolean;
  notice: string;
}
