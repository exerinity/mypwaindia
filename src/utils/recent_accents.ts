import { storageGet, storageSet, KEYS } from './storage.ts';
import { normalizeHex } from './colors.js';

const MAX_RECENT_ACCENTS = 8;

export function getRecentAccents(): string[] {
  const raw = storageGet<unknown>(KEYS.RECENT_ACCENTS, []);
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const entry of raw) {
    const norm = typeof entry === 'string' ? normalizeHex(entry) : null;
    if (norm && !out.includes(norm)) out.push(norm);
    if (out.length === MAX_RECENT_ACCENTS) break;
  }
  return out;
}

export function rememberAccent(hex: string): string[] {
  const norm = normalizeHex(hex);
  const current = getRecentAccents();
  if (!norm) return current;
  const next = [norm, ...current.filter((h) => h !== norm)].slice(0, MAX_RECENT_ACCENTS);
  storageSet(KEYS.RECENT_ACCENTS, next);
  return next;
}
