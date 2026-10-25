// Sample data for the demo. Everything here is generated deterministically so the
// same search always shows the same flights, prices and seat maps.
// When real bookings arrive, this module is the one to replace with API calls.

export type Airport = { code: string; city: string; country: string; lat: number; lon: number };

export const AIRPORTS: Airport[] = [
  { code: 'ABZ', city: 'Aberdeen', country: 'UK', lat: 57.2, lon: -2.2 },
  { code: 'ALC', city: 'Alicante', country: 'Spain', lat: 38.28, lon: -0.56 },
  { code: 'AMS', city: 'Amsterdam', country: 'Netherlands', lat: 52.31, lon: 4.76 },
  { code: 'ATH', city: 'Athens', country: 'Greece', lat: 37.94, lon: 23.94 },
  { code: 'BCN', city: 'Barcelona', country: 'Spain', lat: 41.3, lon: 2.08 },
  { code: 'BHD', city: 'Belfast City', country: 'UK', lat: 54.62, lon: -5.87 },
  { code: 'BER', city: 'Berlin', country: 'Germany', lat: 52.37, lon: 13.5 },
  { code: 'BHX', city: 'Birmingham', country: 'UK', lat: 52.45, lon: -1.75 },
  { code: 'CPH', city: 'Copenhagen', country: 'Denmark', lat: 55.62, lon: 12.65 },
  { code: 'DUB', city: 'Dublin', country: 'Ireland', lat: 53.42, lon: -6.27 },
  { code: 'EDI', city: 'Edinburgh', country: 'UK', lat: 55.95, lon: -3.37 },
  { code: 'FCO', city: 'Rome', country: 'Italy', lat: 41.8, lon: 12.25 },
  { code: 'LIS', city: 'Lisbon', country: 'Portugal', lat: 38.77, lon: -9.13 },
  { code: 'LHR', city: 'London Heathrow', country: 'UK', lat: 51.47, lon: -0.45 },
  { code: 'MAD', city: 'Madrid', country: 'Spain', lat: 40.49, lon: -3.57 },
  { code: 'MAN', city: 'Manchester', country: 'UK', lat: 53.35, lon: -2.27 },
  { code: 'CDG', city: 'Paris', country: 'France', lat: 49.01, lon: 2.55 },
  { code: 'PRG', city: 'Prague', country: 'Czechia', lat: 50.1, lon: 14.26 },
  { code: 'VIE', city: 'Vienna', country: 'Austria', lat: 48.11, lon: 16.57 },
  { code: 'ZRH', city: 'Zurich', country: 'Switzerland', lat: 47.46, lon: 8.55 },
];

// Hours ahead of UK time (both sides observe the same daylight-saving dates).
const TZ: Record<string, number> = { UK: 0, Ireland: 0, Portugal: 0, Greece: 2 };
export const tzOffset = (a: Airport) => TZ[a.country] ?? 1;

export const airportByCode = (code: string) => AIRPORTS.find((a) => a.code === code);
export const airportLabel = (a: Airport) => `${a.city}, ${a.country} (${a.code})`;

export type Cabin = 'economy' | 'business' | 'premium';
export const CABINS: { id: Cabin; name: string; inclusions: string[]; refundable: boolean }[] = [
  { id: 'economy', name: 'Economy', refundable: false, inclusions: ['Hand luggage', 'Checked bag', 'Allocated seats', 'No cash refunds'] },
  { id: 'business', name: 'Business', refundable: true, inclusions: ['Hand luggage', 'Checked bag', 'Allocated seats', 'Fast track', 'Lounge access', 'Eligible for refund', 'Leather seats'] },
  { id: 'premium', name: 'Premium', refundable: true, inclusions: ['Hand luggage', 'Checked bag', 'Priority boarding', 'Allocated seats', 'Fast track', 'Lounge access', 'Eligible for refund', 'Dedicated check-in', 'Leather seats'] },
];

export type Flight = {
  id: string;
  number: string;
  from: string;
  to: string;
  date: string; // YYYY-MM-DD, departure date (local)
  depart: string; // HH:MM
  arrive: string; // HH:MM
  arrivesNextDay: boolean;
  durationMin: number;
  aircraft: string;
  fares: Record<Cabin, number>;
};

// Small deterministic hash so results are stable between visits.
export function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function distanceKm(a: Airport, b: Airport) {
  const r = (d: number) => (d * Math.PI) / 180;
  const dLat = r(b.lat - a.lat);
  const dLon = r(b.lon - a.lon);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

const SLOTS = ['06:45', '10:30', '13:55', '15:20', '18:05', '20:45'];
const pad = (n: number) => String(n).padStart(2, '0');
const toMin = (hm: string) => Number(hm.slice(0, 2)) * 60 + Number(hm.slice(3));
const fromMin = (m: number) => `${pad(Math.floor((m % 1440) / 60))}:${pad(m % 60)}`;

export function flightsFor(from: string, to: string, date: string): Flight[] {
  const a = airportByCode(from);
  const b = airportByCode(to);
  if (!a || !b || from === to) return [];
  const base = Math.round(distanceKm(a, b) / 12.5) + 35; // AMS-BCN ≈ £136
  const minutes = Math.round((distanceKm(a, b) / 760) * 60 + 35);
  const day = new Date(date + 'T00:00:00Z').getUTCDay();
  const weekendBump = day === 5 || day === 0 ? 1.08 : 1;
  const count = 4 + (hash(from + to) % 2); // 4 or 5 flights a day
  const slots = SLOTS.filter((_, i) => (hash(from + to + i) % 6) !== 0).slice(0, count);
  return slots.map((depart, i) => {
    const seed = hash(`${from}${to}${date}${i}`);
    const dur = minutes - 5 + (seed % 11);
    const economy = Math.round((base * 0.82 + (seed % 23)) * weekendBump);
    const arriveMin = toMin(depart) + dur + (tzOffset(b) - tzOffset(a)) * 60;
    return {
      id: `${from}-${to}-${date}-${depart.replace(':', '')}`,
      number: `WP${100 + (hash(from + to) % 700) + i * 2}`,
      from,
      to,
      date,
      depart,
      arrive: fromMin(arriveMin),
      arrivesNextDay: arriveMin >= 1440,
      durationMin: dur,
      aircraft: seed % 2 ? 'Airbus A320' : 'Boeing 737-800',
      fares: {
        economy,
        business: economy + 30 + (seed % 9),
        premium: economy + 62 + (seed % 13),
      },
    };
  });
}

export function lowestFare(from: string, to: string, date: string): number | null {
  const fl = flightsFor(from, to, date);
  return fl.length ? Math.min(...fl.map((f) => f.fares.economy)) : null;
}

export function findFlight(id: string): Flight | undefined {
  const [from, to, y, m, d] = id.split('-');
  if (!from || !to || !y) return undefined;
  return flightsFor(from, to, `${y}-${m}-${d}`).find((f) => f.id === id);
}

// Seats: 8 rows, A–D. Rows 1–2 are Front Row (extra legroom, leather seats).
export const SEAT_ROWS = 8;
export const SEAT_COLS = ['A', 'B', 'C', 'D'] as const;
export const FRONT_ROW_PRICE = 18;
export const isFrontRow = (seat: string) => Number(seat.slice(0, -1)) <= 2;
export const seatPosition = (seat: string) => (/[AD]$/.test(seat) ? 'Window' : 'Aisle');

export function unavailableSeats(flightId: string): Set<string> {
  const taken = new Set<string>();
  for (let r = 1; r <= SEAT_ROWS; r++) {
    for (const c of SEAT_COLS) {
      if (hash(flightId + r + c) % 7 === 0) taken.add(`${r}${c}`);
    }
  }
  return taken;
}

export type ExtraId = 'fasttrack' | 'lounge' | 'baggage';
export const EXTRAS: { id: ExtraId; name: string; price: number; per: string; note: string }[] = [
  { id: 'fasttrack', name: 'Fast Track', price: 9, per: 'per passenger, per Economy flight', note: 'Skip the main security queue at both airports.' },
  { id: 'lounge', name: 'Lounge', price: 35, per: 'per passenger, per Economy flight', note: 'Lounge access before each departure.' },
  { id: 'baggage', name: 'Extra baggage', price: 30, per: 'per passenger, per flight', note: 'One extra 23 kg checked bag.' },
];

export const INFANT_FARE = 25;

export const SERVICES: { id: string; name: string; body: string }[] = [
  { id: 'pets', name: 'Pets', body: 'Small dogs and cats up to 8 kg, including the carrier, can travel in the cabin on most routes. Assistance dogs always travel free. In the full service you will request this after booking.' },
  { id: 'mobility', name: 'Mobility assistance', body: 'Free help from check-in to your seat, including wheelchairs and priority boarding. Let us know at least 48 hours before you fly.' },
  { id: 'special', name: 'Special service', body: 'Travelling with a medical device, needing special meals, or flying as an unaccompanied young person? Tell us before you fly and we will arrange it.' },
  { id: 'miles', name: 'Miles', body: 'Members earn miles on every flight, based on distance and fare. Membership is coming soon in this demo.' },
];

export const FARE_CONDITIONS: Record<Cabin, string[]> = {
  economy: ['Changes allowed up to 24 hours before departure, for a fee plus any fare difference.', 'No cash refunds. Unused taxes can be refunded on request.', 'Name changes are not permitted.'],
  business: ['Free changes up to 2 hours before departure; you pay any fare difference.', 'Refundable up to 24 hours before departure.', 'Name changes are not permitted.'],
  premium: ['Free changes up to departure; you pay any fare difference.', 'Fully refundable up to departure.', 'One free name change.'],
};

export function milesFor(from: string, to: string): number {
  const a = airportByCode(from);
  const b = airportByCode(to);
  return a && b ? Math.round(distanceKm(a, b) * 0.621) : 0;
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
