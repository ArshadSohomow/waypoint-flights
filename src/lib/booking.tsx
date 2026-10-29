import React, { createContext, useContext, useEffect, useReducer } from 'react';
import { Cabin, ExtraId, findItinerary, Itinerary } from './data';
import { JourneyPick, Pax, seatedCount, totalPax, tripCosts, money } from './costs';

export { seatedCount, totalPax, money };
export type { Pax };

export type Search = { from: string; to: string; depart: string; ret: string | null; tripType: 'round' | 'oneway'; pax: Pax };
export type Choice = { itineraryId: string; cabin: Cabin };
export type Leg = 'outbound' | 'return';
export type PassengerType = 'adult' | 'youngAdult' | 'child' | 'infant';
export type Passenger = { type: PassengerType; title: string; firstName: string; lastName: string; dob: string };
export type Contact = { email: string; phone: string };
export type Confirmation = { ref: string; total: number; at: string };
export type Sort = 'recommended' | 'price' | 'depart' | 'duration' | 'easiest';
export type Filters = { stops: 'any' | 'direct' | 'max1'; times: ('morning' | 'afternoon' | 'evening')[]; hideSelfTransfer: boolean; sort: Sort };
export const DEFAULT_FILTERS: Filters = { stops: 'any', times: ['morning', 'afternoon', 'evening'], hideSelfTransfer: false, sort: 'recommended' };
export const MAX_SHORTLIST = 3;

export type Booking = {
  search: Search | null;
  outbound: Choice | null;
  ret: Choice | null;
  seats: { outbound: string[]; return: string[] };
  bags: number; // checked bags wanted per traveller, applies to both journeys
  extras: Record<ExtraId, boolean>;
  shortlist: { outbound: string[]; return: string[] };
  filters: { outbound: Filters; return: Filters };
  passengers: Passenger[];
  contact: Contact;
  confirmation: Confirmation | null;
  notice: string | null; // one-off message explaining what changed after an edit
};

const empty: Booking = {
  search: null,
  outbound: null,
  ret: null,
  seats: { outbound: [], return: [] },
  bags: 1,
  extras: { fasttrack: false, lounge: false },
  shortlist: { outbound: [], return: [] },
  filters: { outbound: DEFAULT_FILTERS, return: DEFAULT_FILTERS },
  passengers: [],
  contact: { email: '', phone: '' },
  confirmation: null,
  notice: null,
};

type Action =
  | { type: 'search'; search: Search }
  | { type: 'date'; leg: Leg; date: string }
  | { type: 'choose'; leg: Leg; choice: Choice }
  | { type: 'seat'; leg: Leg; index: number; seat: string | null }
  | { type: 'bags'; bags: number }
  | { type: 'extra'; id: ExtraId; on: boolean }
  | { type: 'shortlist'; leg: Leg; id: string }
  | { type: 'filters'; leg: Leg; filters: Filters }
  | { type: 'passengers'; passengers: Passenger[]; contact: Contact }
  | { type: 'confirm'; confirmation: Confirmation }
  | { type: 'clearNotice' }
  | { type: 'reset' };

export function passengerTypes(p: Pax): PassengerType[] {
  return [...Array(p.adults).fill('adult'), ...Array(p.youngAdults).fill('youngAdult'), ...Array(p.children).fill('child'), ...Array(p.infants).fill('infant')];
}

/** Apply an edited search, keeping everything that is still valid and saying what was cleared. */
export function applySearch(state: Booking, s: Search): Booking {
  const prev = state.search;
  if (!prev) return { ...empty, bags: state.bags, search: s };
  const routeChanged = prev.from !== s.from || prev.to !== s.to;
  const outDateChanged = prev.depart !== s.depart;
  const retChanged = prev.ret !== s.ret || prev.tripType !== s.tripType;
  const seatedChanged = seatedCount(prev.pax) !== seatedCount(s.pax);
  const typesChanged = passengerTypes(prev.pax).join() !== passengerTypes(s.pax).join();
  const next: Booking = { ...state, search: s, confirmation: null, notice: null };
  const cleared: string[] = [];
  if (routeChanged || outDateChanged) {
    if (state.outbound) cleared.push('outbound flight');
    next.outbound = null;
    next.seats = { ...next.seats, outbound: [] };
    next.shortlist = { ...next.shortlist, outbound: [] };
  }
  if (routeChanged || retChanged || s.tripType === 'oneway') {
    if (state.ret) cleared.push('return flight');
    next.ret = null;
    next.seats = { ...next.seats, return: [] };
    next.shortlist = { ...next.shortlist, return: [] };
  }
  if (seatedChanged && (next.seats.outbound.some(Boolean) || next.seats.return.some(Boolean))) {
    cleared.push('seats');
    next.seats = { outbound: [], return: [] };
  }
  if (typesChanged && state.passengers.length) {
    cleared.push('passenger details');
    next.passengers = [];
  }
  if (cleared.length) {
    const kept = !routeChanged && !outDateChanged && state.outbound ? ' Your other choices are kept.' : '';
    next.notice = `Search updated. Because of your changes we cleared your ${cleared.join(', ').replace(/, ([^,]*)$/, ' and $1')}.${kept}`;
  }
  return next;
}

function reducer(state: Booking, a: Action): Booking {
  switch (a.type) {
    case 'search':
      return applySearch(state, a.search);
    case 'date': {
      if (!state.search) return state;
      const s = a.leg === 'outbound' ? { ...state.search, depart: a.date } : { ...state.search, ret: a.date };
      const choiceKey = a.leg === 'outbound' ? 'outbound' : 'ret';
      return {
        ...state,
        search: s,
        [choiceKey]: null,
        seats: { ...state.seats, [a.leg]: [] },
        shortlist: { ...state.shortlist, [a.leg]: [] },
        confirmation: null,
        notice: null,
      };
    }
    case 'choose': {
      const key = a.leg === 'outbound' ? 'outbound' : 'ret';
      const prev = state[key];
      const changed = prev?.itineraryId !== a.choice.itineraryId;
      return { ...state, [key]: a.choice, seats: changed ? { ...state.seats, [a.leg]: [] } : state.seats, confirmation: null };
    }
    case 'seat': {
      const list = [...state.seats[a.leg]];
      list[a.index] = a.seat ?? '';
      return { ...state, seats: { ...state.seats, [a.leg]: list } };
    }
    case 'bags':
      return { ...state, bags: Math.max(0, Math.min(2, a.bags)) };
    case 'extra':
      return { ...state, extras: { ...state.extras, [a.id]: a.on } };
    case 'shortlist': {
      const cur = state.shortlist[a.leg];
      const next = cur.includes(a.id) ? cur.filter((x) => x !== a.id) : cur.length >= MAX_SHORTLIST ? cur : [...cur, a.id];
      return { ...state, shortlist: { ...state.shortlist, [a.leg]: next } };
    }
    case 'filters':
      return { ...state, filters: { ...state.filters, [a.leg]: a.filters } };
    case 'passengers':
      return { ...state, passengers: a.passengers, contact: a.contact };
    case 'confirm':
      return { ...state, confirmation: a.confirmation };
    case 'clearNotice':
      return { ...state, notice: null };
    case 'reset':
      return empty;
  }
}

const KEY = 'waypoint-booking-v2';
function load(): Booking {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return empty;
    const b = JSON.parse(raw) as Partial<Booking>;
    return {
      ...empty,
      ...b,
      seats: { ...empty.seats, ...b.seats },
      extras: { ...empty.extras, ...b.extras },
      shortlist: { ...empty.shortlist, ...b.shortlist },
      filters: { outbound: { ...DEFAULT_FILTERS, ...b.filters?.outbound }, return: { ...DEFAULT_FILTERS, ...b.filters?.return } },
    };
  } catch {
    return empty;
  }
}

const Ctx = createContext<{ booking: Booking; dispatch: React.Dispatch<Action> }>({ booking: empty, dispatch: () => {} });

export function BookingProvider({ children }: { children: React.ReactNode }) {
  const [booking, dispatch] = useReducer(reducer, undefined, load);
  useEffect(() => {
    try {
      sessionStorage.setItem(KEY, JSON.stringify(booking));
    } catch {
      /* storage unavailable: the booking still works until the tab closes */
    }
  }, [booking]);
  return <Ctx.Provider value={{ booking, dispatch }}>{children}</Ctx.Provider>;
}

export const useBooking = () => useContext(Ctx);

export function chosen(c: Choice | null): Itinerary | undefined {
  return c ? findItinerary(c.itineraryId) : undefined;
}

/** The journeys picked so far, in order, for costs and summaries. */
export function picks(b: Booking): JourneyPick[] {
  const out: JourneyPick[] = [];
  const o = chosen(b.outbound);
  if (o && b.outbound) out.push({ label: 'Outbound', it: o, cabin: b.outbound.cabin, seats: b.seats.outbound });
  const r = b.search?.tripType === 'round' ? chosen(b.ret) : undefined;
  if (r && b.ret) out.push({ label: 'Return', it: r, cabin: b.ret.cabin, seats: b.seats.return });
  return out;
}

export function costs(b: Booking) {
  if (!b.search) return { lines: [], total: 0 };
  return tripCosts(picks(b), b.search.pax, b.bags, b.extras);
}

/** Labels for each seated passenger, in order. */
export function seatedLabels(p: Pax): string[] {
  const out: string[] = [];
  for (let i = 0; i < p.adults; i++) out.push(`Adult ${i + 1}`);
  for (let i = 0; i < p.youngAdults; i++) out.push(`Young adult ${i + 1}`);
  for (let i = 0; i < p.children; i++) out.push(`Child ${i + 1}`);
  return out;
}

/** Seats can only be chosen when the journey is on one ticket; self-transfer seats are given at check-in. */
export const seatsSelectable = (it: Itinerary | undefined) => !!it && !it.selfTransfer;

/** How far the booking has got; pages use it to send people back if they skip ahead. */
export function progress(b: Booking) {
  const s = b.search;
  const needsReturn = s?.tripType === 'round';
  const seated = s ? seatedCount(s.pax) : 0;
  const seatsDone = (leg: Leg, c: Choice | null) => !seatsSelectable(chosen(c)) || b.seats[leg].filter(Boolean).length === seated;
  return {
    searched: !!s,
    outbound: !!b.outbound,
    flights: !!b.outbound && (!needsReturn || !!b.ret),
    seats: !!b.outbound && seatsDone('outbound', b.outbound) && (!needsReturn || (!!b.ret && seatsDone('return', b.ret))),
    passengers: b.passengers.length === (s ? totalPax(s.pax) : 0) && !!b.contact.email,
    confirmed: !!b.confirmation,
  };
}
