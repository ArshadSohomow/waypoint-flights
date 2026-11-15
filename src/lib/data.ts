// SAMPLE DATA LAYER
// ------------------
// Waypoint has no live flight provider. Everything in this module is generated
// deterministically (same search → same results) and is labelled in the UI as
// sample data. To connect a real provider later, replace `searchItineraries`,
// `findItinerary` and `lowestFare` with API calls that return the same types;
// the UI only depends on the types below.

export const DATA_STATUS = 'sample' as const;
export const DATA_STATUS_LABEL = 'Sample fares for this demo, not live prices';
export const CURRENCY = 'GBP';

// ---------- Places ----------

export type Airport = { code: string; name: string; city: string; country: string; lat: number; lon: number };

export const AIRPORTS: Airport[] = [
  { code: 'ABZ', name: 'Aberdeen', city: 'Aberdeen', country: 'UK', lat: 57.2, lon: -2.2 },
  { code: 'ALC', name: 'Alicante–Elche', city: 'Alicante', country: 'Spain', lat: 38.28, lon: -0.56 },
  { code: 'AMS', name: 'Amsterdam Schiphol', city: 'Amsterdam', country: 'Netherlands', lat: 52.31, lon: 4.76 },
  { code: 'ATH', name: 'Athens International', city: 'Athens', country: 'Greece', lat: 37.94, lon: 23.94 },
  { code: 'BCN', name: 'Barcelona El Prat', city: 'Barcelona', country: 'Spain', lat: 41.3, lon: 2.08 },
  { code: 'BHD', name: 'Belfast City', city: 'Belfast', country: 'UK', lat: 54.62, lon: -5.87 },
  { code: 'BER', name: 'Berlin Brandenburg', city: 'Berlin', country: 'Germany', lat: 52.37, lon: 13.5 },
  { code: 'BHX', name: 'Birmingham', city: 'Birmingham', country: 'UK', lat: 52.45, lon: -1.75 },
  { code: 'CPH', name: 'Copenhagen Kastrup', city: 'Copenhagen', country: 'Denmark', lat: 55.62, lon: 12.65 },
  { code: 'DUB', name: 'Dublin', city: 'Dublin', country: 'Ireland', lat: 53.42, lon: -6.27 },
  { code: 'EDI', name: 'Edinburgh', city: 'Edinburgh', country: 'UK', lat: 55.95, lon: -3.37 },
  { code: 'FCO', name: 'Rome Fiumicino', city: 'Rome', country: 'Italy', lat: 41.8, lon: 12.25 },
  { code: 'LIS', name: 'Lisbon Humberto Delgado', city: 'Lisbon', country: 'Portugal', lat: 38.77, lon: -9.13 },
  { code: 'LHR', name: 'London Heathrow', city: 'London', country: 'UK', lat: 51.47, lon: -0.45 },
  { code: 'LGW', name: 'London Gatwick', city: 'London', country: 'UK', lat: 51.15, lon: -0.18 },
  { code: 'MAD', name: 'Madrid Barajas', city: 'Madrid', country: 'Spain', lat: 40.49, lon: -3.57 },
  { code: 'MAN', name: 'Manchester', city: 'Manchester', country: 'UK', lat: 53.35, lon: -2.27 },
  { code: 'CDG', name: 'Paris Charles de Gaulle', city: 'Paris', country: 'France', lat: 49.01, lon: 2.55 },
  { code: 'PRG', name: 'Prague Václav Havel', city: 'Prague', country: 'Czechia', lat: 50.1, lon: 14.26 },
  { code: 'VIE', name: 'Vienna', city: 'Vienna', country: 'Austria', lat: 48.11, lon: 16.57 },
  { code: 'ZRH', name: 'Zurich', city: 'Zurich', country: 'Switzerland', lat: 47.46, lon: 8.55 },
];

/** A city with more than one airport. Searching it includes every airport listed. */
export type CityGroup = { code: string; city: string; country: string; airports: string[] };
export const CITY_GROUPS: CityGroup[] = [{ code: 'LON', city: 'London', country: 'UK', airports: ['LHR', 'LGW'] }];

export type Place = { code: string; label: string; kind: 'airport' | 'group'; airports: string[]; city: string; country: string; detail: string };

export const PLACES: Place[] = [
  ...CITY_GROUPS.map((g) => ({
    code: g.code,
    label: `${g.city} (all airports)`,
    kind: 'group' as const,
    airports: g.airports,
    city: g.city,
    country: g.country,
    detail: g.airports.join(', '),
  })),
  ...AIRPORTS.map((a) => ({ code: a.code, label: `${a.name} (${a.code})`, kind: 'airport' as const, airports: [a.code], city: a.city, country: a.country, detail: `${a.city}, ${a.country}` })),
].sort((x, y) => x.city.localeCompare(y.city) || (x.kind === 'group' ? -1 : 1));

export const airportByCode = (code: string) => AIRPORTS.find((a) => a.code === code);
export const placeByCode = (code: string) => PLACES.find((p) => p.code === code);
export const placeAirports = (code: string) => placeByCode(code)?.airports ?? [];
/** Short name for a place in headings: "Barcelona (BCN)" or "London (all airports)". */
export const placeShort = (code: string) => {
  const p = placeByCode(code);
  if (!p) return code;
  return p.kind === 'group' ? p.label : `${p.city} (${p.code})`;
};
export const airportShort = (code: string) => {
  const a = airportByCode(code);
  return a ? `${a.name} (${a.code})` : code;
};

// Hours ahead of UK time. Both sides observe the same daylight-saving dates, so a fixed offset is enough here.
const TZ: Record<string, number> = { UK: 0, Ireland: 0, Portugal: 0, Greece: 2 };
export const tzOffset = (code: string) => {
  const a = airportByCode(code);
  return a ? TZ[a.country] ?? 1 : 0;
};

// ---------- Fares, baggage ----------

export type Cabin = 'economy' | 'business' | 'premium';

export type Bags = {
  cabinBags: number;
  cabinKg: number | null; // null = weight not supplied
  checkedBags: number; // per person, per journey
  checkedKg: number | null;
};

export type FareRules = {
  changes: 'free' | 'fee' | 'not-allowed' | 'unknown';
  changesText: string;
  refund: 'full' | 'partial' | 'none' | 'unknown';
  refundText: string;
};

export type FareOffer =
  | { cabin: Cabin; available: true; price: number; bags: Bags; rules: FareRules; perks: string[] }
  | { cabin: Cabin; available: false; reason: string };

export const CABINS: { id: Cabin; name: string; blurb: string }[] = [
  { id: 'economy', name: 'Economy', blurb: 'Standard seat, allocated free' },
  { id: 'business', name: 'Business', blurb: 'Flexible ticket with lounge and fast track' },
  { id: 'premium', name: 'Premium', blurb: 'Most flexible, priority everything' },
];

const BAGS: Record<Cabin, Bags> = {
  economy: { cabinBags: 1, cabinKg: 10, checkedBags: 1, checkedKg: 23 },
  business: { cabinBags: 1, cabinKg: 12, checkedBags: 2, checkedKg: 23 },
  premium: { cabinBags: 2, cabinKg: 12, checkedBags: 2, checkedKg: 32 },
};
const SELF_TRANSFER_BAGS: Bags = { cabinBags: 1, cabinKg: 10, checkedBags: 0, checkedKg: null };

const RULES: Record<Cabin, FareRules> = {
  economy: { changes: 'fee', changesText: 'Changes allowed up to 24 hours before departure for a £45 fee plus any fare difference.', refund: 'none', refundText: 'No refund of the fare. Unused airport taxes can be reclaimed.' },
  business: { changes: 'free', changesText: 'Free changes up to 2 hours before departure; you pay any fare difference.', refund: 'full', refundText: 'Refundable up to 24 hours before departure.' },
  premium: { changes: 'free', changesText: 'Free changes up to departure; you pay any fare difference.', refund: 'full', refundText: 'Fully refundable up to departure.' },
};
const SELF_TRANSFER_RULES: FareRules = {
  changes: 'unknown',
  changesText: 'Each of the two tickets has its own change rules. They aren’t supplied in this demo data.',
  refund: 'unknown',
  refundText: 'Each ticket has its own refund rules. They aren’t supplied in this demo data.',
};

const PERKS: Record<Cabin, string[]> = {
  economy: ['Seat allocated free (choose one on the seat map)'],
  business: ['Fast Track security', 'Lounge access', 'Leather seats'],
  premium: ['Priority boarding', 'Fast Track security', 'Lounge access', 'Dedicated check-in', 'Leather seats'],
};

/** Price of one extra checked bag, per person, per journey direction (sample). */
export const EXTRA_BAG_PRICE = 30;
export const INFANT_FARE = 25; // per infant, per journey direction (sample)

// ---------- Itineraries ----------

export type Segment = {
  number: string;
  carrier: string;
  from: string;
  to: string;
  departDay: number; // days after the journey date (local at origin)
  depart: string; // HH:MM local
  arriveDay: number; // days after the journey date (local at destination)
  arrive: string; // HH:MM local
  durationMin: number;
  aircraft: string;
};

export type Layover = {
  arriveAt: string; // airport where the previous flight lands
  departFrom: string; // airport the next flight leaves from (differs on an airport change)
  minutes: number;
  overnight: boolean;
};

export type Itinerary = {
  id: string;
  from: string;
  to: string;
  date: string; // journey date, YYYY-MM-DD, local at origin
  segments: Segment[];
  layovers: Layover[];
  durationMin: number; // door-to-door in the air and on the ground, departure to arrival
  stops: number;
  selfTransfer: boolean; // separately ticketed: the traveller makes the connection themselves
  fares: Record<Cabin, FareOffer>;
  // Convenience: first departure and last arrival
  depart: string;
  arrive: string;
  arriveDay: number;
};

export function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function distanceKm(x: string, y: string) {
  const a = airportByCode(x)!;
  const b = airportByCode(y)!;
  const r = (d: number) => (d * Math.PI) / 180;
  const dLat = r(b.lat - a.lat);
  const dLon = r(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

const pad = (n: number) => String(n).padStart(2, '0');
export const toMin = (hm: string) => Number(hm.slice(0, 2)) * 60 + Number(hm.slice(3));
const hm = (m: number) => `${pad(Math.floor((((m % 1440) + 1440) % 1440) / 60))}:${pad(((m % 60) + 60) % 60)}`;
const flightMinutes = (a: string, b: string) => Math.max(45, Math.round((distanceKm(a, b) / 760) * 60 + 30));
const AIRCRAFT = ['Airbus A320', 'Boeing 737-800', 'Airbus A321neo', 'Embraer E190'];
const SMALL = new Set(['ABZ', 'BHD']);
const HUBS = ['AMS', 'CDG', 'FCO', 'MAD', 'VIE', 'ZRH', 'DUB'];
const DIRECT_SLOTS = ['06:45', '10:30', '13:55', '15:20', '18:05', '20:45'];

/** Absolute minutes since 00:00 UK time on the journey date. */
const abs = (day: number, local: string, code: string) => day * 1440 + toMin(local) - tzOffset(code) * 60;

function segment(a: string, b: string, departAbs: number, seed: number, carrier: string, n: number): Segment {
  const dur = flightMinutes(a, b) - 5 + (seed % 11);
  const depLocal = departAbs + tzOffset(a) * 60;
  const arrLocal = departAbs + dur + tzOffset(b) * 60;
  return {
    number: `${carrier === 'Waypoint Air' ? 'WP' : 'SK'}${n}`,
    carrier,
    from: a,
    to: b,
    departDay: Math.floor(depLocal / 1440),
    depart: hm(depLocal),
    arriveDay: Math.floor(arrLocal / 1440),
    arrive: hm(arrLocal),
    durationMin: dur,
    aircraft: AIRCRAFT[seed % AIRCRAFT.length],
  };
}

function build(id: string, from: string, to: string, date: string, segs: Segment[], selfTransfer: boolean, economy: number, premiumReason?: string): Itinerary {
  const layovers: Layover[] = [];
  for (let i = 1; i < segs.length; i++) {
    const p = segs[i - 1];
    const n = segs[i];
    const minutes = abs(n.departDay, n.depart, n.from) - abs(p.arriveDay, p.arrive, p.to);
    const overnight = n.departDay > p.arriveDay && minutes >= 240;
    layovers.push({ arriveAt: p.to, departFrom: n.from, minutes, overnight });
  }
  const first = segs[0];
  const last = segs[segs.length - 1];
  const durationMin = abs(last.arriveDay, last.arrive, last.to) - abs(first.departDay, first.depart, first.from);
  const offer = (cabin: Cabin, price: number): FareOffer => ({ cabin, available: true, price, bags: BAGS[cabin], rules: RULES[cabin], perks: PERKS[cabin] });
  const s = hash(id);
  const fares: Record<Cabin, FareOffer> = selfTransfer
    ? {
        economy: { cabin: 'economy', available: true, price: economy, bags: SELF_TRANSFER_BAGS, rules: SELF_TRANSFER_RULES, perks: ['Two separate tickets', 'Seats allocated at check-in'] },
        business: { cabin: 'business', available: false, reason: 'Not offered: this journey is two separate Economy tickets, so other cabins can’t be booked together.' },
        premium: { cabin: 'premium', available: false, reason: 'Not offered: this journey is two separate Economy tickets, so other cabins can’t be booked together.' },
      }
    : {
        economy: offer('economy', economy),
        business: offer('business', economy + 30 + (s % 9)),
        premium: premiumReason ? { cabin: 'premium', available: false, reason: premiumReason } : offer('premium', economy + 62 + (s % 13)),
      };
  return { id, from, to, date, segments: segs, layovers, durationMin, stops: segs.length - 1, selfTransfer, fares, depart: first.depart, arrive: last.arrive, arriveDay: last.arriveDay };
}

/** Does any flight operate on this airport pair on this date? Small regional airports skip some weekdays. */
function operates(a: string, b: string, date: string) {
  if (!SMALL.has(a) && !SMALL.has(b)) return true;
  const dow = new Date(date + 'T00:00:00Z').getUTCDay();
  return hash(a + b + 'dow' + dow) % 4 !== 0;
}

/** All sample itineraries between two specific airports on a date. */
function itinerariesForAirports(a: string, b: string, date: string): Itinerary[] {
  if (a === b || !airportByCode(a) || !airportByCode(b) || !operates(a, b, date)) return [];
  const out: Itinerary[] = [];
  const day = new Date(date + 'T00:00:00Z').getUTCDay();
  const weekend = day === 5 || day === 0 ? 1.08 : 1;
  const base = Math.round(distanceKm(a, b) / 12.5) + 35;
  const routeSeed = hash([a, b].sort().join(''));
  const id = (key: string) => `${a}-${b}-${date}-${key}`;

  // Direct flights: most routes have them; pairs of small airports and a few others don't.
  const hasDirect = !(SMALL.has(a) && SMALL.has(b)) && routeSeed % 7 !== 0;
  if (hasDirect) {
    const slots = DIRECT_SLOTS.filter((_, i) => hash(a + b + i) % 6 !== 0).slice(0, 4);
    slots.forEach((t, i) => {
      const seed = hash(`${a}${b}${date}${i}`);
      const seg = segment(a, b, toMin(t) - tzOffset(a) * 60, seed, 'Waypoint Air', 100 + (routeSeed % 700) + i * 2);
      const economy = Math.round((base * 0.82 + (seed % 23)) * weekend);
      const noPremium = seed % 5 === 0 ? 'Not offered: this aircraft has no Premium cabin.' : undefined;
      out.push(build(id(t.replace(':', '')), a, b, date, [seg], false, economy, noPremium));
    });
  }

  // One-stop connections through two hubs, with different layover lengths.
  // Pick the hubs with the smallest detour, so connections are geographically plausible.
  const detour = (h: string) => (distanceKm(a, h) + distanceKm(h, b)) / Math.max(distanceKm(a, b), 1);
  const hubs = HUBS.filter((h) => h !== a && h !== b && distanceKm(a, h) > 250 && distanceKm(h, b) > 250)
    .sort((x, y) => detour(x) - detour(y))
    .slice(0, 2);
  const profiles = [
    { dep: '07:20', layover: 50 }, // short connection
    { dep: '11:40', layover: 105 },
    { dep: '14:10', layover: 330 }, // long layover
    { dep: '19:35', layover: 0 }, // overnight: next flight first thing tomorrow
  ];
  hubs.forEach((h, k) => {
    const p = profiles[(routeSeed + k + (hash(date) % 2)) % profiles.length];
    const seed = hash(`${a}${h}${b}${date}`);
    const s1 = segment(a, h, toMin(p.dep) - tzOffset(a) * 60, seed, 'Waypoint Air', 300 + (seed % 400));
    const land = abs(s1.arriveDay, s1.arrive, h);
    const next = p.layover ? land + p.layover : (s1.arriveDay + 1) * 1440 + toMin('06:50') - tzOffset(h) * 60;
    const s2 = segment(h, b, next, seed >> 3, 'Waypoint Air', 300 + ((seed >> 5) % 400));
    const economy = Math.round(((distanceKm(a, h) + distanceKm(h, b)) / 19 + 40 + (seed % 19)) * weekend);
    out.push(build(id(`via${h}${k}`), a, b, date, [s1, s2], false, economy, k === 1 ? 'Not offered: the connecting flight has no Premium cabin.' : undefined));
  });

  // A cheaper self-transfer via London: land at Gatwick, leave from Heathrow on a separate ticket.
  const london = new Set(['LHR', 'LGW']);
  if (!london.has(a) && !london.has(b) && airportByCode(a)!.country !== 'UK' && airportByCode(b)!.country !== 'UK') {
    const seed = hash(`${a}LON${b}${date}`);
    const s1 = segment(a, 'LGW', toMin('08:05') - tzOffset(a) * 60, seed, 'SkyLink (partner)', 800 + (seed % 90));
    const land = abs(s1.arriveDay, s1.arrive, 'LGW');
    const s2 = segment('LHR', b, land + 200, seed >> 4, 'Waypoint Air', 500 + ((seed >> 2) % 300));
    const direct = Math.round((base * 0.82) * weekend);
    out.push(build(id('selfLON'), a, b, date, [s1, s2], true, Math.max(39, direct - 32 - (seed % 15))));
  }
  return out;
}

/** Itineraries between two places (airport or "all airports" city group). */
export function searchItineraries(fromPlace: string, toPlace: string, date: string): Itinerary[] {
  const out: Itinerary[] = [];
  for (const a of placeAirports(fromPlace)) for (const b of placeAirports(toPlace)) out.push(...itinerariesForAirports(a, b, date));
  return out;
}

export function lowestFare(fromPlace: string, toPlace: string, date: string): number | null {
  const prices = searchItineraries(fromPlace, toPlace, date)
    .map((i) => i.fares.economy)
    .filter((f): f is Extract<FareOffer, { available: true }> => f.available)
    .map((f) => f.price);
  return prices.length ? Math.min(...prices) : null;
}

export function findItinerary(id: string): Itinerary | undefined {
  const [a, b, y, m, d] = id.split('-');
  if (!a || !b || !y) return undefined;
  return itinerariesForAirports(a, b, `${y}-${m}-${d}`).find((i) => i.id === id);
}

export function offerOf(it: Itinerary, cabin: Cabin) {
  const f = it.fares[cabin];
  return f.available ? f : null;
}

// ---------- Seats ----------

export const SEAT_ROWS = 8;
export const SEAT_COLS = ['A', 'B', 'C', 'D'] as const;
export const FRONT_ROW_PRICE = 18; // per seat, per flight, Economy only (sample)
export const isFrontRow = (seat: string) => Number(seat.slice(0, -1)) <= 2;
export const seatPosition = (seat: string) => (/[AD]$/.test(seat) ? 'Window' : 'Aisle');

export function unavailableSeats(flightNumber: string): Set<string> {
  const taken = new Set<string>();
  for (let r = 1; r <= SEAT_ROWS; r++) for (const c of SEAT_COLS) if (hash(flightNumber + r + c) % 7 === 0) taken.add(`${r}${c}`);
  return taken;
}

// ---------- Extras and information ----------

export type ExtraId = 'fasttrack' | 'lounge';
export const EXTRAS: { id: ExtraId; name: string; price: number; basis: string; note: string }[] = [
  { id: 'fasttrack', name: 'Fast Track', price: 9, basis: 'per traveller, per Economy journey', note: 'Shorter security queue at your departure airport.' },
  { id: 'lounge', name: 'Lounge', price: 35, basis: 'per traveller, per Economy journey', note: 'Lounge access before your first flight.' },
];

export const SERVICES: { id: string; name: string; body: string }[] = [
  { id: 'pets', name: 'Pets', body: 'Small dogs and cats up to 8 kg, including the carrier, can travel in the cabin on most routes. Assistance dogs always travel free. In the full service you would request this after booking.' },
  { id: 'mobility', name: 'Mobility assistance', body: 'Free help from check-in to your seat, including wheelchairs and priority boarding. Let the airline know at least 48 hours before you fly.' },
  { id: 'special', name: 'Special service', body: 'Travelling with a medical device, needing special meals, or flying as an unaccompanied young person? Tell the airline before you fly.' },
  { id: 'miles', name: 'Miles', body: 'Members would earn miles on every flight, based on distance and fare. Membership is not part of this demo.' },
];

export function milesFor(it: Itinerary): number {
  return Math.round(it.segments.reduce((s, g) => s + distanceKm(g.from, g.to), 0) * 0.621);
}

export const DESTINATIONS = [
  { code: 'LIS', blurb: 'Tiled streets and pastel sunsets', from: 'AMS' },
  { code: 'FCO', blurb: 'Long lunches and ancient ruins', from: 'AMS' },
  { code: 'CPH', blurb: 'Canals, bikes and design', from: 'AMS' },
];
export const SALES = [
  { code: 'ATH', blurb: 'Autumn sun on the Aegean', from: 'AMS' },
  { code: 'ALC', blurb: 'Beaches into November', from: 'AMS' },
];
