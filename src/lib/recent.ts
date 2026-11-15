// Recent searches, kept in this browser so a returning traveller doesn't retype
// their home airport (research: "Airport is pre-selected without needing to
// manually search"). Only places and trip type are stored: no dates or names.

import { placeByCode } from './data';

export type Recent = { from: string; to: string; tripType: 'round' | 'oneway' };
const KEY = 'wp-recent-searches';
const MAX = 3;

export function loadRecent(): Recent[] {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) ?? '[]') as Recent[];
    return Array.isArray(list) ? list.filter((r) => placeByCode(r.from) && placeByCode(r.to)).slice(0, MAX) : [];
  } catch {
    return [];
  }
}

export function rememberSearch(r: Recent) {
  try {
    const next = [r, ...loadRecent().filter((x) => !(x.from === r.from && x.to === r.to))].slice(0, MAX);
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable: nothing to remember */
  }
}

export function forgetSearches() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
