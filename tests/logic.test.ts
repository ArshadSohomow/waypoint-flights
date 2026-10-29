// Logic tests for the cost model, journey warnings and search revalidation.
// Run: npx tsx tests/logic.test.ts
import assert from 'node:assert/strict';
import { searchItineraries, lowestFare, findItinerary, offerOf, EXTRA_BAG_PRICE, INFANT_FARE, FRONT_ROW_PRICE } from '../src/lib/data';
import { tripCosts, journeyEstimate } from '../src/lib/costs';
import { itineraryWarnings, pairWarnings } from '../src/lib/warnings';
import { applySearch, Booking, DEFAULT_FILTERS } from '../src/lib/booking';

let passed = 0;
const test = (name: string, fn: () => void) => {
  try {
    fn();
    passed++;
    console.log(`PASS  ${name}`);
  } catch (e) {
    console.log(`FAIL  ${name}\n      ${(e as Error).message}`);
    process.exitCode = 1;
  }
};

const D = '2026-11-13';
const all = searchItineraries('AMS', 'BCN', D);
const direct = all.find((i) => i.stops === 0)!;
const self = all.find((i) => i.selfTransfer)!;
const pax2i = { adults: 2, youngAdults: 0, children: 0, infants: 1 };

test('sample data is deterministic and ids round-trip', () => {
  assert.deepEqual(searchItineraries('AMS', 'BCN', D).map((i) => i.id), all.map((i) => i.id));
  for (const it of all) assert.equal(findItinerary(it.id)?.id, it.id);
});

test('lowestFare equals the cheapest available fare in the results', () => {
  const min = Math.min(...all.map((i) => offerOf(i, 'economy')?.price ?? Infinity));
  assert.equal(lowestFare('AMS', 'BCN', D), min);
});

test('city group searches every airport in the group', () => {
  const lon = searchItineraries('LON', 'BCN', D);
  assert.ok(lon.some((i) => i.from === 'LHR') && lon.some((i) => i.from === 'LGW'));
});

test('journey estimate = fare × seated + infant fares + extra bags', () => {
  const o = offerOf(direct, 'economy')!;
  const e = journeyEstimate(direct, 'economy', pax2i, 2)!;
  const extraBags = (2 - o.bags.checkedBags) * 2;
  assert.equal(e.total, o.price * 2 + INFANT_FARE + extraBags * EXTRA_BAG_PRICE);
  assert.equal(e.perPerson, o.price);
});

test('self-transfer fare includes no checked bag, so bags are added to its estimate', () => {
  const e = journeyEstimate(self, 'economy', pax2i, 1)!;
  assert.equal(e.extraBags, 2);
});

test('unavailable cabins give no estimate rather than a made-up price', () => {
  assert.equal(journeyEstimate(self, 'business', pax2i, 1), null);
  assert.equal(self.fares.business.available, false);
});

test('trip total is the sum of priced lines; unknown costs are null and excluded', () => {
  const picks = [{ label: 'Outbound', it: self, cabin: 'economy' as const, seats: [] }];
  const { lines, total } = tripCosts(picks, pax2i, 1, { fasttrack: false, lounge: false });
  assert.equal(total, lines.reduce((s, l) => s + (l.amount ?? 0), 0));
  assert.ok(lines.some((l) => l.amount === null && l.status === 'not-included'), 'airport transfer should be listed as not included');
});

test('adding then removing an extra returns the same total (no double counting)', () => {
  const picks = [{ label: 'Outbound', it: direct, cabin: 'economy' as const, seats: ['1A', '5B'] }];
  const base = tripCosts(picks, pax2i, 1, { fasttrack: false, lounge: false }).total;
  const withFt = tripCosts(picks, pax2i, 1, { fasttrack: true, lounge: false }).total;
  assert.equal(withFt - base, 9 * 2);
  assert.equal(tripCosts(picks, pax2i, 1, { fasttrack: false, lounge: false }).total, base);
});

test('Front Row is charged once per seat on Economy and included on Business', () => {
  const eco = tripCosts([{ label: 'Outbound', it: direct, cabin: 'economy', seats: ['1A', '2B'] }], pax2i, 0, { fasttrack: false, lounge: false });
  assert.equal(eco.lines.find((l) => l.key.endsWith('front'))!.amount, 2 * FRONT_ROW_PRICE);
  const bus = tripCosts([{ label: 'Outbound', it: direct, cabin: 'business', seats: ['1A', '2B'] }], pax2i, 0, { fasttrack: false, lounge: false });
  assert.equal(bus.lines.find((l) => l.key.endsWith('front'))!.amount, 0);
});

test('warnings: self-transfer flags airport change and separate tickets, cautiously', () => {
  const w = itineraryWarnings(self);
  assert.ok(w.some((x) => x.id.startsWith('airport-change') && x.severity === 'important'));
  const st = w.find((x) => x.id === 'self-transfer')!;
  assert.equal(st.basis, 'possible');
  assert.match(st.why, /may/);
});

test('warnings: a direct daytime flight has no important or check flags', () => {
  assert.equal(itineraryWarnings(direct).filter((x) => x.severity !== 'fyi').length, 0);
});

test('warnings: overnight layovers are flagged with accommodation not included', () => {
  const any = ['LON', 'AMS', 'ABZ'].flatMap((f) => [D, '2026-11-14', '2026-11-15'].flatMap((d) => searchItineraries(f, 'BCN', d).concat(searchItineraries(f, 'ATH', d))));
  const night = any.find((i) => i.layovers.some((l) => l.overnight))!;
  assert.ok(night, 'expected at least one overnight sample');
  assert.ok(itineraryWarnings(night).some((x) => x.id.startsWith('overnight') && /isn’t included/.test(x.why)));
});

test('pair warning when the return lands at a different London airport', () => {
  const out = searchItineraries('LON', 'BCN', D).find((i) => i.from === 'LHR')!;
  const ret = searchItineraries('BCN', 'LON', '2026-11-20').find((i) => i.to === 'LGW')!;
  assert.ok(pairWarnings(out, ret).some((w) => w.id === 'return-airport'));
});

const base: Booking = {
  search: { from: 'AMS', to: 'BCN', depart: D, ret: '2026-11-20', tripType: 'round', pax: { adults: 2, youngAdults: 0, children: 0, infants: 0 } },
  outbound: { itineraryId: direct.id, cabin: 'economy' },
  ret: { itineraryId: 'x', cabin: 'economy' },
  seats: { outbound: ['3A', '3B'], return: ['4A', '4B'] },
  bags: 1,
  extras: { fasttrack: true, lounge: false },
  shortlist: { outbound: [direct.id], return: [] },
  filters: { outbound: DEFAULT_FILTERS, return: DEFAULT_FILTERS },
  passengers: [],
  contact: { email: '', phone: '' },
  confirmation: null,
  notice: null,
};

test('changing the route clears flights and seats and explains why', () => {
  const n = applySearch(base, { ...base.search!, from: 'LIS' });
  assert.equal(n.outbound, null);
  assert.equal(n.ret, null);
  assert.deepEqual(n.seats, { outbound: [], return: [] });
  assert.match(n.notice ?? '', /outbound flight/);
  assert.equal(n.extras.fasttrack, true, 'extras are kept');
});

test('changing only passenger numbers keeps flights but clears seats', () => {
  const n = applySearch(base, { ...base.search!, pax: { adults: 3, youngAdults: 0, children: 0, infants: 0 } });
  assert.ok(n.outbound && n.ret);
  assert.deepEqual(n.seats, { outbound: [], return: [] });
  assert.match(n.notice ?? '', /seats/);
});

test('switching to one way clears only the return', () => {
  const n = applySearch(base, { ...base.search!, tripType: 'oneway', ret: null });
  assert.ok(n.outbound);
  assert.equal(n.ret, null);
});

test('an unchanged search keeps everything and shows no notice', () => {
  const n = applySearch(base, { ...base.search! });
  assert.equal(n.outbound, base.outbound);
  assert.equal(n.notice, null);
});

console.log(`\n${passed} logic tests passed${process.exitCode ? ', some FAILED' : ''}.`);
