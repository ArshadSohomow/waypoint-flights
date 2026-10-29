// One calculation model for every price shown: result cards, the trip bar,
// the summary and the final review all call these functions, so totals agree
// and nothing is counted twice.

import { Cabin, EXTRA_BAG_PRICE, EXTRAS, FRONT_ROW_PRICE, INFANT_FARE, isFrontRow, Itinerary, offerOf } from './data';

export type Pax = { adults: number; youngAdults: number; children: number; infants: number };
export const seatedCount = (p: Pax) => p.adults + p.youngAdults + p.children;
export const totalPax = (p: Pax) => seatedCount(p) + p.infants;

export type CostStatus = 'included' | 'selected' | 'estimated' | 'not-included';
export const STATUS_LABEL: Record<CostStatus, string> = {
  included: 'Included',
  selected: 'Your choice',
  estimated: 'Estimated',
  'not-included': 'Not included in estimate',
};

export type CostLine = {
  key: string;
  label: string;
  basis: string; // e.g. "£124 × 2 travellers"
  amount: number | null; // null = unknown / not in estimate
  status: CostStatus;
  group: 'fare' | 'fees' | 'extras' | 'external';
};

export const money = (n: number) => `£${n.toLocaleString('en-GB')}`;
const plural = (n: number, one: string, many = one + 's') => `${n} ${n === 1 ? one : many}`;

/** Extra checked bags the party needs to buy on this fare, given bags wanted per traveller. */
export function extraBags(it: Itinerary, cabin: Cabin, bagsPerTraveller: number, seated: number) {
  const o = offerOf(it, cabin);
  if (!o) return 0;
  return Math.max(0, bagsPerTraveller - o.bags.checkedBags) * seated;
}

/** Estimate for one journey direction, as shown on result cards. */
export function journeyEstimate(it: Itinerary, cabin: Cabin, pax: Pax, bagsPerTraveller: number) {
  const o = offerOf(it, cabin);
  if (!o) return null;
  const seated = seatedCount(pax);
  const bags = extraBags(it, cabin, bagsPerTraveller, seated);
  const total = o.price * seated + INFANT_FARE * pax.infants + bags * EXTRA_BAG_PRICE;
  return { perPerson: o.price, total, bagCost: bags * EXTRA_BAG_PRICE, extraBags: bags };
}

export type JourneyPick = { label: string; it: Itinerary; cabin: Cabin; seats: string[] };

/** Full itemised trip cost. */
export function tripCosts(picks: JourneyPick[], pax: Pax, bagsPerTraveller: number, extras: Record<string, boolean>) {
  const seated = seatedCount(pax);
  const lines: CostLine[] = [];
  for (const p of picks) {
    const o = offerOf(p.it, p.cabin);
    if (!o) continue;
    lines.push({ key: `${p.label}-fare`, group: 'fare', label: `${p.label} fare`, basis: `${money(o.price)} × ${plural(seated, 'traveller')}`, amount: o.price * seated, status: 'selected' });
    if (pax.infants) lines.push({ key: `${p.label}-infant`, group: 'fare', label: `${p.label} infant fare`, basis: `${money(INFANT_FARE)} × ${plural(pax.infants, 'infant')}`, amount: INFANT_FARE * pax.infants, status: 'selected' });
    const bags = extraBags(p.it, p.cabin, bagsPerTraveller, seated);
    if (bagsPerTraveller > 0) {
      lines.push(
        bags
          ? { key: `${p.label}-bags`, group: 'extras', label: `${p.label} checked bags`, basis: `${plural(bags, 'extra bag')} × ${money(EXTRA_BAG_PRICE)}`, amount: bags * EXTRA_BAG_PRICE, status: 'selected' }
          : { key: `${p.label}-bags`, group: 'extras', label: `${p.label} checked bags`, basis: `${plural(bagsPerTraveller * seated, 'bag')} in your fare`, amount: 0, status: 'included' },
      );
    }
    const front = p.seats.filter((s) => s && isFrontRow(s)).length;
    if (front) {
      lines.push(
        p.cabin === 'economy'
          ? { key: `${p.label}-front`, group: 'extras', label: `${p.label} Front Row seats`, basis: `${plural(front, 'seat')} × ${money(FRONT_ROW_PRICE)}`, amount: front * FRONT_ROW_PRICE, status: 'selected' }
          : { key: `${p.label}-front`, group: 'extras', label: `${p.label} Front Row seats`, basis: 'Included with your cabin', amount: 0, status: 'included' },
      );
    }
    for (const e of EXTRAS) {
      if (!extras[e.id]) continue;
      if (p.cabin === 'economy') lines.push({ key: `${p.label}-${e.id}`, group: 'extras', label: `${p.label} ${e.name}`, basis: `${money(e.price)} × ${plural(seated, 'traveller')}`, amount: e.price * seated, status: 'selected' });
    }
  }
  if (picks.length) {
    lines.push({ key: 'taxes', group: 'fees', label: 'Taxes and airport charges', basis: 'Included in the fares above', amount: 0, status: 'included' });
    lines.push({ key: 'booking-fee', group: 'fees', label: 'Booking fee', basis: 'Waypoint doesn’t charge one', amount: 0, status: 'included' });
    lines.push({ key: 'airport-travel', group: 'external', label: 'Getting to and from the airports', basis: 'Depends on your plans', amount: null, status: 'not-included' });
    picks.forEach((p) =>
      p.it.layovers.forEach((l, i) => {
        if (l.arriveAt !== l.departFrom)
          lines.push({ key: `${p.label}-transfer-${i}`, group: 'external', label: `${p.label}: transfer ${l.arriveAt} → ${l.departFrom}`, basis: 'Price not available', amount: null, status: 'not-included' });
        if (l.overnight) lines.push({ key: `${p.label}-hotel-${i}`, group: 'external', label: `${p.label}: overnight stay`, basis: 'Price not available', amount: null, status: 'not-included' });
      }),
    );
  }
  const total = lines.reduce((s, l) => s + (l.amount ?? 0), 0);
  return { lines, total };
}
