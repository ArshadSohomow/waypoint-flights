// SAVED TRIPS (demo)
// -----------------
// Waypoint has no server. A confirmed demo booking is saved in this browser's
// localStorage so Manage booking, Check-in, Hotels and Car hire can find it again.
// Nothing leaves the device. Only what those pages need is kept: no contact
// details, no dates of birth, and never any payment information.

import { useEffect, useState } from 'react';
import type { Booking, Choice, Search } from './booking';
import type { ExtraId } from './data';
import { findItinerary, searchItineraries } from './data';
import { addDays, todayISO } from './dates';

export type StayHold = { id: string; hotelId: string; hotelName: string; city: string; checkIn: string; checkOut: string; rooms: number; guests: number; total: number };
export type CarHold = { id: string; carId: string; carName: string; airport: string; pickUp: string; dropOff: string; total: number };

export type Trip = {
  ref: string;
  createdAt: string;
  status: 'confirmed' | 'cancelled';
  search: Search;
  outbound: Choice;
  ret: Choice | null;
  seats: { outbound: string[]; return: string[] };
  bags: number;
  extras: Record<ExtraId, boolean>;
  travellers: { title: string; firstName: string; lastName: string }[];
  total: number;
  checkedIn: { outbound: boolean; return: boolean };
  stays: StayHold[];
  cars: CarHold[];
  sample?: boolean; // the built-in example trip
};

const KEY = 'wp-trips-v1';
const listeners = new Set<() => void>();

export function loadTrips(): Trip[] {
  try {
    const raw = localStorage.getItem(KEY);
    const list = raw ? (JSON.parse(raw) as Trip[]) : [];
    return Array.isArray(list) ? list.filter((t) => t && typeof t.ref === 'string' && findItinerary(t.outbound?.itineraryId)) : [];
  } catch {
    return [];
  }
}

function store(list: Trip[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* storage unavailable: trips last until the page closes */
  }
  memory = list;
  listeners.forEach((f) => f());
}
let memory: Trip[] | null = null;
const all = () => (memory ??= loadTrips());

export function subscribeTrips(f: () => void) {
  listeners.add(f);
  return () => listeners.delete(f);
}

export function tripFromBooking(b: Booking): Trip | null {
  if (!b.search || !b.outbound || !b.confirmation) return null;
  return {
    ref: b.confirmation.ref,
    createdAt: b.confirmation.at,
    status: 'confirmed',
    search: b.search,
    outbound: b.outbound,
    ret: b.search.tripType === 'round' ? b.ret : null,
    seats: b.seats,
    bags: b.bags,
    extras: b.extras,
    travellers: b.passengers.map((p) => ({ title: p.title, firstName: p.firstName, lastName: p.lastName })),
    total: b.confirmation.total,
    checkedIn: { outbound: false, return: false },
    stays: [],
    cars: [],
  };
}

export function saveTrip(t: Trip) {
  store([t, ...all().filter((x) => x.ref !== t.ref)]);
}

export function updateTrip(ref: string, patch: (t: Trip) => Trip) {
  store(all().map((t) => (t.ref === ref ? patch(t) : t)));
}

export function removeTrip(ref: string) {
  store(all().filter((t) => t.ref !== ref));
}

const norm = (s: string) => s.trim().toLowerCase().replace(/[^a-z]/g, '');

/** Booking reference plus any traveller's last name, the way airlines usually look trips up. */
export function findTrip(ref: string, lastName: string): Trip | undefined {
  const r = ref.trim().toUpperCase();
  return all().find((t) => t.ref === r && t.travellers.some((p) => norm(p.lastName) === norm(lastName)));
}

export const getTrip = (ref: string) => all().find((t) => t.ref === ref.trim().toUpperCase());

export function useTrips(): Trip[] {
  const [list, setList] = useState<Trip[]>(all);
  useEffect(() => {
    const off = subscribeTrips(() => setList(all()));
    return () => {
      off();
    };
  }, []);
  return list;
}

/** A ready-made example so every hub page can be tried without booking first. */
export const SAMPLE_REF = 'WPDEMO';
export const SAMPLE_SURNAME = 'Traveller';
export function sampleTrip(): Trip {
  const depart = addDays(todayISO(), 1); // tomorrow, so check-in is open
  const ret = addDays(depart, 6);
  const search: Search = { from: 'LON', to: 'BCN', depart, ret, tripType: 'round', pax: { adults: 2, youngAdults: 0, children: 0, infants: 0 } };
  const out = searchItineraries('LON', 'BCN', depart).find((i) => i.stops === 0) ?? searchItineraries('LON', 'BCN', depart)[0];
  const back = searchItineraries('BCN', 'LON', ret).find((i) => i.stops === 0 && i.to === out?.from) ?? searchItineraries('BCN', 'LON', ret)[0];
  return {
    ref: SAMPLE_REF,
    createdAt: new Date().toISOString(),
    status: 'confirmed',
    search,
    outbound: { itineraryId: out.id, cabin: 'economy' },
    ret: back ? { itineraryId: back.id, cabin: 'economy' } : null,
    seats: { outbound: ['4A', '4B'], return: ['6C', '6D'] },
    bags: 1,
    extras: { fasttrack: false, lounge: false },
    travellers: [
      { title: 'Ms', firstName: 'Alex', lastName: SAMPLE_SURNAME },
      { title: 'Mr', firstName: 'Sam', lastName: SAMPLE_SURNAME },
    ],
    total: 0,
    checkedIn: { outbound: false, return: false },
    stays: [],
    cars: [],
    sample: true,
  };
}

/** Make sure the example trip exists (refreshing its dates so it is always upcoming). */
export function ensureSampleTrip(): Trip {
  const existing = getTrip(SAMPLE_REF);
  if (existing && existing.search.depart >= todayISO()) return existing;
  const t = sampleTrip();
  saveTrip(t);
  return t;
}
