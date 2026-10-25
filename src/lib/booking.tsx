import React, { createContext, useContext, useEffect, useReducer } from 'react';
import { Cabin, ExtraId, findFlight, Flight, FRONT_ROW_PRICE, INFANT_FARE, isFrontRow, EXTRAS } from './data';

export type Pax = { adults: number; youngAdults: number; children: number; infants: number };
export type Search = { from: string; to: string; depart: string; ret: string | null; tripType: 'round' | 'oneway'; pax: Pax };
export type Choice = { flightId: string; cabin: Cabin };
export type Leg = 'outbound' | 'return';
export type PassengerType = 'adult' | 'youngAdult' | 'child' | 'infant';
export type Passenger = { type: PassengerType; title: string; firstName: string; lastName: string; dob: string };
export type Contact = { email: string; phone: string };
export type Confirmation = { ref: string; total: number; at: string };

export type Booking = {
  search: Search | null;
  outbound: Choice | null;
  ret: Choice | null;
  seats: { outbound: string[]; return: string[] };
  extras: Record<ExtraId, boolean>;
  passengers: Passenger[];
  contact: Contact;
  confirmation: Confirmation | null;
};

const empty: Booking = {
  search: null,
  outbound: null,
  ret: null,
  seats: { outbound: [], return: [] },
  extras: { fasttrack: false, lounge: false, baggage: false },
  passengers: [],
  contact: { email: '', phone: '' },
  confirmation: null,
};

type Action =
  | { type: 'search'; search: Search }
  | { type: 'date'; leg: Leg; date: string }
  | { type: 'choose'; leg: Leg; choice: Choice }
  | { type: 'seat'; leg: Leg; index: number; seat: string | null }
  | { type: 'extra'; id: ExtraId; on: boolean }
  | { type: 'passengers'; passengers: Passenger[]; contact: Contact }
  | { type: 'confirm'; confirmation: Confirmation }
  | { type: 'reset' };

export const seatedCount = (p: Pax) => p.adults + p.youngAdults + p.children;
export const totalPax = (p: Pax) => seatedCount(p) + p.infants;

function reducer(state: Booking, a: Action): Booking {
  switch (a.type) {
    case 'search': {
      const same =
        state.search &&
        state.search.from === a.search.from &&
        state.search.to === a.search.to &&
        state.search.depart === a.search.depart &&
        state.search.ret === a.search.ret &&
        JSON.stringify(state.search.pax) === JSON.stringify(a.search.pax);
      // A changed search invalidates everything chosen after it.
      return same ? { ...state, search: a.search, confirmation: null } : { ...empty, search: a.search };
    }
    case 'date': {
      if (!state.search) return state;
      if (a.leg === 'outbound')
        return { ...state, search: { ...state.search, depart: a.date }, outbound: null, seats: { ...state.seats, outbound: [] }, confirmation: null };
      return { ...state, search: { ...state.search, ret: a.date }, ret: null, seats: { ...state.seats, return: [] }, confirmation: null };
    }
    case 'choose': {
      if (a.leg === 'outbound') {
        const changed = state.outbound?.flightId !== a.choice.flightId;
        return { ...state, outbound: a.choice, seats: changed ? { ...state.seats, outbound: [] } : state.seats, confirmation: null };
      }
      const changed = state.ret?.flightId !== a.choice.flightId;
      return { ...state, ret: a.choice, seats: changed ? { ...state.seats, return: [] } : state.seats, confirmation: null };
    }
    case 'seat': {
      const list = [...state.seats[a.leg]];
      if (a.seat === null) list[a.index] = '';
      else list[a.index] = a.seat;
      return { ...state, seats: { ...state.seats, [a.leg]: list } };
    }
    case 'extra':
      return { ...state, extras: { ...state.extras, [a.id]: a.on } };
    case 'passengers':
      return { ...state, passengers: a.passengers, contact: a.contact };
    case 'confirm':
      return { ...state, confirmation: a.confirmation };
    case 'reset':
      return empty;
  }
}

const KEY = 'waypoint-booking-v1';
function load(): Booking {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return empty;
    const b = JSON.parse(raw) as Booking;
    return { ...empty, ...b, seats: { ...empty.seats, ...b.seats }, extras: { ...empty.extras, ...b.extras } };
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

export function chosenFlight(c: Choice | null): Flight | undefined {
  return c ? findFlight(c.flightId) : undefined;
}

export type LineItem = { label: string; amount: number };

/** Price breakdown for everything chosen so far. */
export function priceLines(b: Booking): LineItem[] {
  if (!b.search) return [];
  const seated = seatedCount(b.search.pax);
  const infants = b.search.pax.infants;
  const legs: { leg: Leg; choice: Choice | null }[] = [
    { leg: 'outbound', choice: b.outbound },
    { leg: 'return', choice: b.search.tripType === 'round' ? b.ret : null },
  ];
  const lines: LineItem[] = [];
  for (const { leg, choice } of legs) {
    const f = chosenFlight(choice);
    if (!f || !choice) continue;
    const name = leg === 'outbound' ? 'Outbound' : 'Return';
    lines.push({ label: `${name} fare × ${seated}`, amount: f.fares[choice.cabin] * seated });
    if (infants) lines.push({ label: `${name} infant fare × ${infants}`, amount: INFANT_FARE * infants });
    const front = b.seats[leg].filter((s) => s && isFrontRow(s)).length;
    if (front && choice.cabin === 'economy') lines.push({ label: `${name} Front Row seats × ${front}`, amount: FRONT_ROW_PRICE * front });
  }
  for (const e of EXTRAS) {
    const n = extraFlights(b, e.id);
    if (b.extras[e.id] && n) lines.push({ label: `${e.name} × ${seated * n}`, amount: e.price * seated * n });
  }
  return lines;
}

/** How many chosen flights an extra applies to: Fast Track and Lounge come free with Business and Premium. */
export function extraFlights(b: Booking, id: ExtraId): number {
  if (!b.search) return 0;
  const choices = [b.outbound, b.search.tripType === 'round' ? b.ret : null].filter((c): c is Choice => !!c);
  return choices.filter((c) => id === 'baggage' || c.cabin === 'economy').length;
}

export const priceTotal = (b: Booking) => priceLines(b).reduce((s, l) => s + l.amount, 0);

export const money = (n: number) => `£${n.toLocaleString('en-GB')}`;

/** Labels for each seated passenger, in order. */
export function seatedLabels(p: Pax): string[] {
  const out: string[] = [];
  for (let i = 0; i < p.adults; i++) out.push(`Adult ${i + 1}`);
  for (let i = 0; i < p.youngAdults; i++) out.push(`Young adult ${i + 1}`);
  for (let i = 0; i < p.children; i++) out.push(`Child ${i + 1}`);
  return out;
}

export function passengerTypes(p: Pax): PassengerType[] {
  return [
    ...Array(p.adults).fill('adult'),
    ...Array(p.youngAdults).fill('youngAdult'),
    ...Array(p.children).fill('child'),
    ...Array(p.infants).fill('infant'),
  ];
}

/** Which step of the journey the booking has reached; pages use it to send people back if they skip ahead. */
export function progress(b: Booking) {
  const s = b.search;
  const needsReturn = s?.tripType === 'round';
  const seated = s ? seatedCount(s.pax) : 0;
  const seatsDone = (leg: Leg) => b.seats[leg].filter(Boolean).length === seated;
  return {
    searched: !!s,
    outbound: !!b.outbound,
    flights: !!b.outbound && (!needsReturn || !!b.ret),
    seats: seatsDone('outbound') && (!needsReturn || seatsDone('return')),
    passengers: b.passengers.length === (s ? seated + s.pax.infants : 0) && !!b.contact.email,
    paid: !!b.confirmation,
  };
}
