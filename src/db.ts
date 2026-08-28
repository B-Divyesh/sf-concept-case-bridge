import type { BridgeBackup, CaseCard, ReviewRecord } from './types';

const DB_NAME = 'concept-case-bridge';
const DB_VERSION = 1;

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('cases')) db.createObjectStore('cases', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('reviews')) {
        const reviews = db.createObjectStore('reviews', { keyPath: 'id' });
        reviews.createIndex('caseId', 'caseId');
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error('Your browser could not open the local casebook. Check private-browsing storage settings and reload.'));
  });
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Local storage operation failed.'));
  });
}

export async function getAllCases(): Promise<CaseCard[]> {
  const db = await openDatabase();
  const items = await requestResult(db.transaction('cases').objectStore('cases').getAll()) as CaseCard[];
  db.close();
  return items.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getAllReviews(): Promise<ReviewRecord[]> {
  const db = await openDatabase();
  const items = await requestResult(db.transaction('reviews').objectStore('reviews').getAll()) as ReviewRecord[];
  db.close();
  return items.sort((a, b) => b.reviewedAt.localeCompare(a.reviewedAt));
}

export async function saveCase(card: CaseCard): Promise<void> {
  const db = await openDatabase();
  await requestResult(db.transaction('cases', 'readwrite').objectStore('cases').put(card));
  db.close();
}

export async function removeCase(id: string): Promise<void> {
  const db = await openDatabase();
  const transaction = db.transaction(['cases', 'reviews'], 'readwrite');
  transaction.objectStore('cases').delete(id);
  const index = transaction.objectStore('reviews').index('caseId');
  const keys = await requestResult(index.getAllKeys(id));
  keys.forEach((key) => transaction.objectStore('reviews').delete(key));
  await new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error('Could not delete the case.'));
  });
  db.close();
}

export async function addReview(record: ReviewRecord): Promise<void> {
  const db = await openDatabase();
  await requestResult(db.transaction('reviews', 'readwrite').objectStore('reviews').put(record));
  db.close();
}

export async function importBackup(backup: BridgeBackup, replace: boolean): Promise<void> {
  const db = await openDatabase();
  const transaction = db.transaction(['cases', 'reviews'], 'readwrite');
  const cases = transaction.objectStore('cases');
  const reviews = transaction.objectStore('reviews');
  if (replace) {
    cases.clear();
    reviews.clear();
  }
  backup.cases.forEach((card) => cases.put(card));
  backup.reviews.forEach((review) => reviews.put(review));
  await new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error('The backup could not be saved.'));
  });
  db.close();
}
