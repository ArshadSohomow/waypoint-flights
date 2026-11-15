// SAMPLE HUB DATA: stays, car hire, destination guides and help content.
// ----------------------------------------------------------------------
// Like the flight data, every hotel and car here is invented and generated
// deterministically (same search, same results). Brand names are fictional.
// Nothing claims to be live availability, a real price, a review, or a policy
// of any real company. Things the sample data doesn't know (deposits,
// insurance terms, cancellation deadlines) are said to be "not supplied".

import { AIRPORTS, airportByCode, hash, lowestFare, placeAirports, placeByCode, searchItineraries } from './data';
import { addDays, parseISO, todayISO } from './dates';

const pick = <T,>(arr: T[], n: number) => arr[Math.abs(n) % arr.length];
export const nightsBetween = (a: string, b: string) => Math.max(0, Math.round((parseISO(b).getTime() - parseISO(a).getTime()) / 86400000));

// ---------- Stays ----------

export type Hotel = {
  id: string;
  name: string;
  city: string;
  area: string;
  kind: 'Hotel' | 'Apartment' | 'Guesthouse';
  stars: number; // official-style category, not a guest review score
  pricePerNight: number; // per room, sample
  kmFromCentre: number;
  amenities: string[];
  breakfast: 'included' | 'available' | 'not-offered';
  cancellation: 'free-until-2-days' | 'non-refundable';
};

const HOTEL_WORDS = ['Lumen', 'Harbour', 'Atlas', 'Cedar', 'Meridian', 'Lantern', 'Compass', 'Aurora', 'Tidewater', 'Juniper', 'Signal', 'Kestrel'];
const HOTEL_TYPES = ['House', 'Rooms', 'Residence', 'Hotel', 'Lodge', 'Suites'];
const AREAS = ['Old Town', 'Centre', 'Waterfront', 'Station quarter', 'Museum district', 'Riverside', 'Market quarter'];
const AMENITIES = ['Free Wi-Fi', 'Air conditioning', '24-hour reception', 'Lift', 'Kitchenette', 'Fitness room', 'Accessible rooms', 'Family rooms', 'Laundry', 'Bar'];

export function searchHotels(cityCode: string, checkIn: string, guests: number): Hotel[] {
  const place = placeByCode(cityCode) ?? airportByCode(cityCode);
  if (!place || !checkIn) return [];
  const city = place.city;
  const n = 7 + (hash(city) % 3);
  return Array.from({ length: n }, (_, i) => {
    const h = hash(`${city}-${i}`);
    const stars = 2 + (h % 4);
    const kind = i % 5 === 3 ? 'Apartment' : i % 7 === 5 ? 'Guesthouse' : 'Hotel';
    const day = hash(`${city}-${i}-${checkIn}`) % 18;
    const base = 48 + stars * 26 + (h % 40) + day - (kind === 'Guesthouse' ? 15 : 0) + Math.max(0, guests - 2) * 18;
    return {
      id: `H-${cityCode}-${i}`,
      name: `${pick(HOTEL_WORDS, h)} ${kind === 'Apartment' ? 'Apartments' : kind === 'Guesthouse' ? 'Guesthouse' : pick(HOTEL_TYPES, h >> 3)}`,
      city,
      area: pick(AREAS, h >> 5),
      kind,
      stars,
      pricePerNight: Math.round(base),
      kmFromCentre: Math.round(((h >> 7) % 45) + 2) / 10,
      amenities: AMENITIES.filter((_, k) => ((h >> k) & 1) === 1).slice(0, 5),
      breakfast: (['included', 'available', 'not-offered'] as const)[(h >> 2) % 3],
      cancellation: (h >> 4) % 3 === 0 ? 'non-refundable' : 'free-until-2-days',
    } satisfies Hotel;
  });
}

export const BREAKFAST_LABEL: Record<Hotel['breakfast'], string> = {
  included: 'Breakfast included',
  available: 'Breakfast available to buy',
  'not-offered': 'No breakfast',
};
export const CANCEL_LABEL: Record<Hotel['cancellation'], string> = {
  'free-until-2-days': 'Free cancellation up to 2 days before (sample rule)',
  'non-refundable': 'Non-refundable (sample rule)',
};

// ---------- Car hire ----------

export type Car = {
  id: string;
  category: 'Small' | 'Compact' | 'Estate' | 'SUV' | 'People carrier' | 'Electric';
  example: string; // "or similar" example, invented model names
  seats: number;
  bags: number;
  gearbox: 'Manual' | 'Automatic';
  pricePerDay: number;
  supplier: string;
  pickup: 'In terminal' | 'Shuttle bus';
  fuel: 'Full to full' | 'Electric: return at 70%+';
};

const SUPPLIERS = ['Roadlight', 'Northstar Hire', 'Wayfarer Cars', 'Kerbside'];
const CARS: Omit<Car, 'id' | 'pricePerDay' | 'supplier' | 'pickup'>[] = [
  { category: 'Small', example: 'Pico 3-door or similar', seats: 4, bags: 1, gearbox: 'Manual', fuel: 'Full to full' },
  { category: 'Compact', example: 'Vela hatchback or similar', seats: 5, bags: 2, gearbox: 'Manual', fuel: 'Full to full' },
  { category: 'Compact', example: 'Vela hatchback auto or similar', seats: 5, bags: 2, gearbox: 'Automatic', fuel: 'Full to full' },
  { category: 'Estate', example: 'Strada Tourer or similar', seats: 5, bags: 4, gearbox: 'Manual', fuel: 'Full to full' },
  { category: 'SUV', example: 'Ridge crossover or similar', seats: 5, bags: 3, gearbox: 'Automatic', fuel: 'Full to full' },
  { category: 'People carrier', example: 'Convoy 7 or similar', seats: 7, bags: 3, gearbox: 'Manual', fuel: 'Full to full' },
  { category: 'Electric', example: 'Volta EV or similar', seats: 5, bags: 2, gearbox: 'Automatic', fuel: 'Electric: return at 70%+' },
];

export function searchCars(airport: string, pickUp: string): Car[] {
  if (!airportByCode(airport) || !pickUp) return [];
  return CARS.map((c, i) => {
    const h = hash(`${airport}-${i}-${pickUp}`);
    const base = [24, 31, 37, 39, 52, 61, 49][i];
    return { ...c, id: `C-${airport}-${i}`, pricePerDay: base + (h % 12), supplier: pick(SUPPLIERS, h), pickup: (h >> 3) % 3 === 0 ? 'Shuttle bus' : 'In terminal' };
  });
}

// ---------- Destination guides ----------

export type Theme = 'City break' | 'Sun' | 'Culture' | 'Food' | 'Nature' | 'Short hop';
export type Guide = { code: string; tagline: string; themes: Theme[]; ideas: string[] };

// Descriptive inspiration only: no prices, opening times, weather, or entry rules.
export const GUIDES: Guide[] = [
  { code: 'LIS', tagline: 'Tiled streets and pastel sunsets', themes: ['City break', 'Food', 'Sun'], ideas: ['Ride a tram up through Alfama', 'Sunset from a miradouro', 'Day trip to Sintra'] },
  { code: 'FCO', tagline: 'Long lunches and ancient ruins', themes: ['Culture', 'Food', 'City break'], ideas: ['Walk the Forum at golden hour', 'Trastevere for dinner', 'Book major sites ahead'] },
  { code: 'CPH', tagline: 'Canals, bikes and design', themes: ['City break', 'Food', 'Culture'], ideas: ['See the city by bike', 'Harbour baths in summer', 'Design museums'] },
  { code: 'ATH', tagline: 'Autumn sun on the Aegean', themes: ['Sun', 'Culture', 'Food'], ideas: ['The Acropolis early in the day', 'Island hop from Piraeus', 'Tavernas in Plaka'] },
  { code: 'ALC', tagline: 'Beaches into November', themes: ['Sun', 'Nature'], ideas: ['Castle views over the bay', 'Coastal walks', 'Tabarca island boat trip'] },
  { code: 'BCN', tagline: 'Gaudí, beaches and late dinners', themes: ['City break', 'Sun', 'Food', 'Culture'], ideas: ['Book Sagrada Família ahead', 'Tapas in El Born', 'Beach walk at Barceloneta'] },
  { code: 'PRG', tagline: 'Spires, bridges and cosy cellars', themes: ['City break', 'Culture'], ideas: ['Charles Bridge at dawn', 'Castle district', 'Riverside beer gardens'] },
  { code: 'VIE', tagline: 'Coffee houses and concert halls', themes: ['Culture', 'City break', 'Food'], ideas: ['A long coffee-house afternoon', 'An evening concert', 'Palaces and gardens'] },
  { code: 'AMS', tagline: 'Gabled houses and quiet canals', themes: ['City break', 'Culture', 'Short hop'], ideas: ['Museum quarter', 'A canal by boat', 'Cycle out to the polders'] },
  { code: 'DUB', tagline: 'Live music and Georgian squares', themes: ['City break', 'Short hop', 'Culture'], ideas: ['Trad music sessions', 'Coastal walk at Howth', 'Literary pubs'] },
  { code: 'EDI', tagline: 'Old Town closes and a castle skyline', themes: ['City break', 'Nature', 'Short hop'], ideas: ['Climb Arthur’s Seat', 'Explore the closes', 'Day trip to the Highlands'] },
  { code: 'ZRH', tagline: 'Lakeside walks and Alpine day trips', themes: ['Nature', 'City break'], ideas: ['Swim spots on the lake', 'Old Town lanes', 'Train into the mountains'] },
  { code: 'MAD', tagline: 'Grand museums and late nights', themes: ['Culture', 'Food', 'City break'], ideas: ['The Golden Triangle of art', 'Retiro park', 'Vermouth hour'] },
  { code: 'BER', tagline: 'History, galleries and big parks', themes: ['Culture', 'City break'], ideas: ['Museum Island', 'Tempelhofer Feld', 'Street food markets'] },
  { code: 'CDG', tagline: 'Boulevards, bistros and galleries', themes: ['Culture', 'Food', 'City break'], ideas: ['Walk the Seine', 'Neighbourhood bistros', 'Book big museums ahead'] },
];
export const THEMES: Theme[] = ['City break', 'Sun', 'Culture', 'Food', 'Nature', 'Short hop'];

/** Sample "from" fare and typical journey time for a guide, for one origin and date. */
export function guideFacts(origin: string, code: string, date = addDays(todayISO(), 21)) {
  if (placeAirports(origin).includes(code)) return null;
  const its = searchItineraries(origin, code, date);
  if (!its.length) return null;
  const direct = its.some((i) => i.stops === 0);
  const fastest = Math.min(...its.map((i) => i.durationMin));
  return { price: lowestFare(origin, code, date), direct, fastest, date };
}

export const ORIGINS = ['LON', 'MAN', 'EDI', 'BHX', 'DUB', 'AMS'];

// ---------- Help centre ----------

export type Faq = { id: string; topic: 'Booking' | 'Costs' | 'Baggage' | 'Journeys' | 'Your trip' | 'This demo'; q: string; a: string; link?: { label: string; to: string } };

export const FAQS: Faq[] = [
  { id: 'demo', topic: 'This demo', q: 'Is Waypoint a real travel agent?', a: 'No. Waypoint is a working demonstration. Flights, hotels and cars are sample data generated for the demo, and no booking, ticket or payment is ever made. Nothing you type is sent anywhere.' },
  { id: 'data', topic: 'This demo', q: 'Where is my information kept?', a: 'Your search and choices are kept in this browser tab. Confirmed demo bookings are saved in this browser only, so Manage booking and Check-in can find them. Clear your browser data to remove them.' },
  { id: 'per-person', topic: 'Costs', q: 'What’s the difference between “per person” and “estimated total”?', a: 'Per person is one traveller’s fare. The estimated total covers everyone in your search, plus any checked bags your fare doesn’t include, seats and extras you choose. The trip summary at the top of each booking page itemises it.' },
  { id: 'not-included', topic: 'Costs', q: 'Why are some costs marked “not included”?', a: 'Some costs depend on things we can’t know, such as how you get to and from the airport. We list them so they don’t surprise you, but we don’t make up a price for them.', link: { label: 'See a cost breakdown', to: '/' } },
  { id: 'bags', topic: 'Baggage', q: 'Do I have to add a checked bag?', a: 'No. Choose “No checked bag” on the flights page and nothing extra is added. Every fare includes at least one cabin bag. If you choose bags your fare doesn’t include, the price per bag is shown before you continue.' },
  { id: 'bag-size', topic: 'Baggage', q: 'What size can my bags be?', a: 'Size and weight limits are set by each airline. The sample data includes weights where they’re supplied, but not sizes, so check with the airline before you fly.' },
  { id: 'self-transfer', topic: 'Journeys', q: 'What is a self-transfer journey?', a: 'Two or more separately booked flights. You may need to collect your bags and check in again between them, and if the first flight is late the next airline may not wait. We flag these clearly on every result.' },
  { id: 'airport-change', topic: 'Journeys', q: 'Why am I asked to confirm a different airport?', a: 'Some cities have more than one airport. If your return lands somewhere different from where you started, or a connection needs you to change airports, we ask you to confirm before you continue so it doesn’t catch you out.' },
  { id: 'entry', topic: 'Journeys', q: 'Do I need a visa or passport for my trip?', a: 'Entry rules depend on your nationality and destination and can change. Waypoint doesn’t give entry advice: check the official foreign travel advice before you book.', link: { label: 'GOV.UK foreign travel advice', to: 'https://www.gov.uk/foreign-travel-advice' } },
  { id: 'manage', topic: 'Your trip', q: 'How do I find my booking again?', a: 'Go to Manage booking and enter your booking reference and the last name of anyone on the booking. Try reference WPDEMO with last name Traveller to see an example.', link: { label: 'Manage booking', to: '/manage' } },
  { id: 'checkin', topic: 'Your trip', q: 'When can I check in online?', a: 'Each airline sets its own check-in window. In this demo, online check-in opens for any saved booking and produces a sample boarding pass that isn’t valid for travel.', link: { label: 'Online check-in', to: '/check-in' } },
  { id: 'hotel', topic: 'Your trip', q: 'Can I add a hotel or car to my flights?', a: 'Yes. After booking, your confirmation and Manage booking pages suggest stays and car hire for your dates. In this demo they’re sample listings and are held against your trip without payment.', link: { label: 'Find a stay', to: '/hotels' } },
  { id: 'change-search', topic: 'Booking', q: 'If I change my search, do I lose everything?', a: 'No. We keep everything that still fits your new search and tell you exactly what had to be cleared, for example seats if the number of travellers changed.' },
  { id: 'access', topic: 'Booking', q: 'Can I book with a keyboard or screen reader?', a: 'Yes. Every step works with a keyboard, dialogs close with Escape, and messages are announced to screen readers. You can also turn ambient motion off at the bottom of any page.' },
];

// ---------- Site search ----------

export type SearchHit = { title: string; to: string; kind: 'Page' | 'Destination' | 'Help' | 'Airport'; text: string };

const PAGES: SearchHit[] = [
  { title: 'Book a flight', to: '/', kind: 'Page', text: 'search flights fares round trip one way' },
  { title: 'Manage booking', to: '/manage', kind: 'Page', text: 'find change cancel seats bags booking reference trip' },
  { title: 'Online check-in', to: '/check-in', kind: 'Page', text: 'check in boarding pass' },
  { title: 'Hotels and stays', to: '/hotels', kind: 'Page', text: 'hotel stay accommodation apartment room' },
  { title: 'Car hire', to: '/cars', kind: 'Page', text: 'car hire rental drive pick up' },
  { title: 'Discover destinations', to: '/discover', kind: 'Page', text: 'inspiration ideas destinations guides holidays' },
  { title: 'Help and support', to: '/support', kind: 'Page', text: 'help faq contact support questions' },
  { title: 'Your trips', to: '/account', kind: 'Page', text: 'account login sign in saved trips' },
];

export function siteSearch(q: string): SearchHit[] {
  const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return [];
  const hits: SearchHit[] = [
    ...PAGES,
    ...GUIDES.map((g) => {
      const a = airportByCode(g.code)!;
      return { title: `${a.city}, ${a.country}`, to: `/discover#${g.code}`, kind: 'Destination' as const, text: `${a.city} ${a.country} ${g.tagline} ${g.themes.join(' ')}` };
    }),
    ...AIRPORTS.map((a) => ({ title: `${a.name} (${a.code})`, to: `/discover`, kind: 'Airport' as const, text: `${a.code} ${a.name} ${a.city} airport` })),
    ...FAQS.map((f) => ({ title: f.q, to: `/support#${f.id}`, kind: 'Help' as const, text: `${f.q} ${f.a} ${f.topic}` })),
  ];
  return hits
    .map((h) => {
      const hay = `${h.title} ${h.text}`.toLowerCase();
      const score = terms.reduce((s, t) => s + (h.title.toLowerCase().includes(t) ? 3 : hay.includes(t) ? 1 : -100), 0);
      return { h, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.h)
    .slice(0, 12);
}
