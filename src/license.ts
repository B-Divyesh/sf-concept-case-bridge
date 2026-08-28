import type { LicenseState } from './types';

const SLUG = 'concept-case-bridge';
const TOKEN_KEY = `sb_license:${SLUG}`;
const VERDICT_KEY = `sb_license_verdict:${SLUG}`;
const BILLING_BASE = (import.meta.env.VITE_BILLING_BASE as string | undefined) ?? 'https://api.sociobot.in';
const DAY = 86_400_000;

interface CachedVerdict { valid: boolean; checkedAt: number }

export const checkoutUrl = `${BILLING_BASE}/api/v1/products/${SLUG}/checkout`;

function readVerdict(): CachedVerdict | null {
  try {
    return JSON.parse(localStorage.getItem(VERDICT_KEY) ?? 'null') as CachedVerdict | null;
  } catch {
    return null;
  }
}

export function captureReturnedLicense(): void {
  const url = new URL(location.href);
  const token = url.searchParams.get('license');
  if (!token) return;
  localStorage.setItem(TOKEN_KEY, token.trim());
  localStorage.removeItem(VERDICT_KEY);
  url.searchParams.delete('license');
  history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
}

export function initialLicenseState(): LicenseState {
  const token = localStorage.getItem(TOKEN_KEY);
  const verdict = readVerdict();
  return {
    token,
    unlocked: Boolean(token && verdict?.valid === true),
    checking: Boolean(token),
    notice: ''
  };
}

export function storeLicense(token: string): void {
  localStorage.setItem(TOKEN_KEY, token.trim());
  localStorage.removeItem(VERDICT_KEY);
}

export async function verifyLicense(force = false): Promise<LicenseState> {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return { token: null, unlocked: false, checking: false, notice: '' };
  const cached = readVerdict();
  if (!force && cached && Date.now() - cached.checkedAt < DAY) {
    return { token, unlocked: cached.valid, checking: false, notice: cached.valid ? '' : 'License no longer active.' };
  }
  try {
    const response = await fetch(`${BILLING_BASE}/api/v1/products/${SLUG}/verify?license=${encodeURIComponent(token)}`);
    if (!response.ok) throw new Error('verification unavailable');
    const body = await response.json() as { valid?: boolean };
    const valid = body.valid === true;
    localStorage.setItem(VERDICT_KEY, JSON.stringify({ valid, checkedAt: Date.now() }));
    return { token, unlocked: valid, checking: false, notice: valid ? '' : 'License no longer active.' };
  } catch {
    return { token, unlocked: cached?.valid ?? false, checking: false, notice: cached?.valid ? 'Could not recheck the license. Your last local unlock is still in use.' : 'Could not verify this license. Reconnect and try again.' };
  }
}
