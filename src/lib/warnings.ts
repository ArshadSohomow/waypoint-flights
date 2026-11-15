// Journey analysis: practical flags derived ONLY from explicit itinerary fields.
// Wording is cautious: we state confirmed facts (an airport change, an overnight
// gap) and label possible consequences as things to check, never as certainties.

import { airportByCode, Itinerary } from './data';
import { shortDate, addDays } from './dates';

export type Severity = 'important' | 'check' | 'fyi';
export const SEVERITY_LABEL: Record<Severity, string> = { important: 'Important', check: 'Check this', fyi: 'FYI' };

export type JourneyWarning = {
  id: string;
  severity: Severity;
  title: string;
  why: string; // why it matters, in plain language
  next: string; // a practical next step
  basis: 'fact' | 'possible'; // confirmed itinerary fact vs possible consequence
  link?: { href: string; label: string; covers: string };
};

const dur = (m: number) => `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m`;
const city = (code: string) => airportByCode(code)?.city ?? code;
const named = (code: string) => {
  const a = airportByCode(code);
  return a ? `${a.name} (${a.code})` : code;
};

export function itineraryWarnings(it: Itinerary): JourneyWarning[] {
  const w: JourneyWarning[] = [];
  it.layovers.forEach((l, i) => {
    const at = city(l.arriveAt);
    if (l.arriveAt !== l.departFrom) {
      w.push({
        id: `airport-change-${i}`,
        severity: 'important',
        title: `Airport change in ${at}`,
        why: `You land at ${named(l.arriveAt)} and the next flight leaves from ${named(l.departFrom)}. You’ll need to travel between the airports and go through security again.`,
        next: `Check transport between the airports and allow plenty of time. The transfer cost isn’t included in the estimate.`,
        basis: 'fact',
      });
    }
    if (l.overnight) {
      w.push({
        id: `overnight-${i}`,
        severity: 'check',
        title: `Overnight layover in ${at} (${dur(l.minutes)})`,
        why: `Your connection runs overnight, so you may need somewhere to stay. Accommodation isn’t included in the estimate.`,
        next: `Check whether you’d need a hotel near the airport and how you’d get there and back.`,
        basis: 'fact',
      });
    } else if (l.minutes >= 300) {
      w.push({
        id: `long-${i}`,
        severity: 'fyi',
        title: `Long layover in ${at} (${dur(l.minutes)})`,
        why: `You’ll wait over five hours between flights.`,
        next: `Compare with the faster options if time matters more than price.`,
        basis: 'fact',
      });
    } else if (l.minutes < 60 && l.arriveAt === l.departFrom) {
      w.push({
        id: `short-${i}`,
        severity: 'check',
        title: `Short connection in ${at} (${dur(l.minutes)})`,
        why: `There isn’t much time between flights. Minimum connection times vary by airport and airline, and a delay could make the second flight hard to reach.`,
        next: `With a real booking, check the airline’s minimum connection time and what happens if you miss the connection.`,
        basis: 'possible',
      });
    }
  });
  if (it.selfTransfer) {
    w.push({
      id: 'self-transfer',
      severity: 'important',
      title: 'Self-transfer on two separate tickets',
      why: `The flights are ticketed separately, so you make the connection yourself. You may need to collect your bags and check in again, and if a delay makes you miss the second flight, its airline may not have to rebook you.`,
      next: `Check each airline’s terms and consider whether the saving is worth the risk.`,
      basis: 'possible',
    });
  }
  const firstDep = it.segments[0].depart;
  if (firstDep < '07:00') {
    w.push({
      id: 'early',
      severity: 'fyi',
      title: `Early start: departs ${firstDep}`,
      why: `Public transport to the airport may be limited this early.`,
      next: `Plan how you’ll get to the airport in time for check-in.`,
      basis: 'fact',
    });
  }
  if (it.arriveDay > 0) {
    w.push({
      id: 'next-day',
      severity: 'fyi',
      title: `Arrives the next day (${shortDate(addDays(it.date, it.arriveDay))})`,
      why: `You land on a later date than you leave.`,
      next: `Check any hotel or car bookings use the arrival date.`,
      basis: 'fact',
    });
  }
  // Connecting in a third country: we don't know the traveller's nationality, so point to official guidance only.
  const o = airportByCode(it.from)?.country;
  const d = airportByCode(it.to)?.country;
  const via = it.layovers.map((l) => airportByCode(l.arriveAt)?.country).filter((c): c is string => !!c && c !== o && c !== d);
  if (via.length) {
    w.push({
      id: 'transit-rules',
      severity: 'fyi',
      title: `Connecting in ${Array.from(new Set(via)).join(', ')}`,
      why: `Entry and transit rules depend on your nationality and the countries involved. Waypoint can’t confirm them for you.`,
      next: `Check the official requirements before you book.`,
      basis: 'possible',
      link: {
        href: 'https://www.gov.uk/foreign-travel-advice',
        label: 'GOV.UK foreign travel advice',
        covers: 'Entry requirements and travel advice for British nationals, by country. Other nationalities should check their own government’s advice.',
      },
    });
  }
  const order: Record<Severity, number> = { important: 0, check: 1, fyi: 2 };
  return w.sort((a, b) => order[a.severity] - order[b.severity]);
}

/** Flags that only appear when outbound and return are looked at together. */
export function pairWarnings(out: Itinerary | undefined, ret: Itinerary | undefined): JourneyWarning[] {
  if (!out || !ret) return [];
  const w: JourneyWarning[] = [];
  if (out.from !== ret.to) {
    w.push({
      id: 'return-airport',
      severity: 'check',
      title: `Your return lands at a different airport`,
      why: `You leave from ${named(out.from)} but come back to ${named(ret.to)}.`,
      next: `Check this suits your plans for getting home, parking or a car pick-up.`,
      basis: 'fact',
    });
  }
  if (out.to !== ret.from) {
    w.push({
      id: 'away-airport',
      severity: 'check',
      title: `Your return leaves from a different airport`,
      why: `You arrive at ${named(out.to)} but fly home from ${named(ret.from)}.`,
      next: `Check how you’ll get to ${named(ret.from)} on your last day.`,
      basis: 'fact',
    });
  }
  return w;
}

/** A simple convenience score for sorting: lower is easier. Uses only the flags above plus duration. */
export function hassle(it: Itinerary): number {
  const weights: Record<Severity, number> = { important: 6, check: 3, fyi: 1 };
  return itineraryWarnings(it).reduce((s, w) => s + weights[w.severity], 0) + it.stops * 2 + it.durationMin / 120;
}
