import React, { useMemo, useState } from 'react';
import { DemoNote, HubLayout, Stars, tripTitle } from '../components/Hub';
import { AIRPORTS, airportByCode, findItinerary, placeByCode } from '../lib/data';
import { BREAKFAST_LABEL, CANCEL_LABEL, Car, Hotel, nightsBetween, searchCars, searchHotels } from '../lib/hub';
import { Trip, updateTrip, useTrips } from '../lib/trips';
import { useBooking } from '../lib/booking';
import { money } from '../lib/costs';
import { addDays, mediumDate, todayISO } from '../lib/dates';
import { Link, useRouter } from '../lib/router';

// Cities you can stay in: one entry per city (London covers both airports).
const CITIES = Array.from(new Map(AIRPORTS.map((a) => [a.city, a.city === 'London' ? 'LON' : a.code])).entries())
  .map(([city, code]) => ({ city, code, country: (airportByCode(code) ?? airportByCode('LHR'))!.country }))
  .sort((a, b) => a.city.localeCompare(b.city));
const cityOf = (code: string) => placeByCode(code)?.city ?? airportByCode(code)?.city ?? '';
const cityCode = (code: string) => CITIES.find((c) => c.city === cityOf(code))?.code ?? '';

/** Arrival and departure dates for a trip, from its flights. */
function tripWindow(t: Trip) {
  const out = findItinerary(t.outbound.itineraryId);
  const ret = t.ret ? findItinerary(t.ret.itineraryId) : undefined;
  const arrive = out ? addDays(out.date, out.arriveDay) : t.search.depart;
  const leave = ret ? ret.date : addDays(arrive, 3);
  return { arrive, leave, arrivalAirport: out?.to ?? t.search.to, city: cityCode(t.search.to) };
}

function useLinkedTrip() {
  const { query } = useRouter();
  const trips = useTrips().filter((t) => t.status === 'confirmed' && t.search.depart >= todayISO());
  const ref = query.get('ref')?.toUpperCase();
  return { trips, initial: trips.find((t) => t.ref === ref) ?? null };
}

/** Choose which booked trip a stay or car is held against. */
function TripPicker({ trips, value, onChange }: { trips: Trip[]; value: string; onChange: (ref: string) => void }) {
  if (!trips.length) return null;
  return (
    <div className="field trip-picker">
      <label htmlFor="tp">Add to trip</label>
      <select id="tp" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Not linked to a trip</option>
        {trips.map((t) => (
          <option key={t.ref} value={t.ref}>
            {t.ref} · {tripTitle(t)}
          </option>
        ))}
      </select>
    </div>
  );
}

function HoldDone({ what, trip, onClose }: { what: string; trip: Trip; onClose: () => void }) {
  return (
    <div className="hold-done" role="status">
      <p>
        <strong>✓ {what} is held on booking {trip.ref}.</strong> Nothing has been charged.
      </p>
      <Link to={`/manage?ref=${trip.ref}`} className="btn btn-small btn-primary">
        View your trip
      </Link>
      <button type="button" className="close-btn" onClick={onClose}>
        <span aria-hidden="true">✕</span> Dismiss
      </button>
    </div>
  );
}

// ---------------- Hotels ----------------

type HSort = 'price' | 'distance' | 'stars';

export function HotelsPage() {
  const { booking } = useBooking();
  const { query } = useRouter();
  const { trips, initial } = useLinkedTrip();
  const w = initial ? tripWindow(initial) : null;
  const seedCity = w?.city ?? cityCode(query.get('city') ?? '') ?? '';
  const qIn = query.get('in') ?? '';
  const qOut = query.get('out') ?? '';
  const seedIn = w?.arrive ?? (qIn >= todayISO() ? qIn : booking.search && !booking.confirmation ? booking.search.depart : '');
  const seedOut = w?.leave ?? (qOut > seedIn ? qOut : booking.search?.ret && !booking.confirmation ? booking.search.ret : seedIn ? addDays(seedIn, 3) : '');
  const seedGuests = initial ? Math.max(1, initial.travellers.length) : 2;

  const [form, setForm] = useState({ city: seedCity || (booking.search ? cityCode(booking.search.to) : ''), checkIn: seedIn, checkOut: seedOut, guests: seedGuests, rooms: 1 });
  const [run, setRun] = useState(form.city && form.checkIn && form.checkOut ? form : null);
  const [error, setError] = useState<string | null>(null);
  const [sort, setSort] = useState<HSort>('price');
  const [freeCancel, setFreeCancel] = useState(false);
  const [breakfast, setBreakfast] = useState(false);
  const [tripRef, setTripRef] = useState(initial?.ref ?? '');
  const [held, setHeld] = useState<{ name: string; trip: Trip } | null>(null);

  const nights = run ? nightsBetween(run.checkIn, run.checkOut) : 0;
  const results = useMemo(() => {
    if (!run) return [];
    const list = searchHotels(run.city, run.checkIn, run.guests)
      .filter((h) => !freeCancel || h.cancellation !== 'non-refundable')
      .filter((h) => !breakfast || h.breakfast === 'included');
    const key: Record<HSort, (h: Hotel) => number> = { price: (h) => h.pricePerNight, distance: (h) => h.kmFromCentre, stars: (h) => -h.stars };
    return list.sort((a, b) => key[sort](a) - key[sort](b));
  }, [run, sort, freeCancel, breakfast]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.city || !form.checkIn || !form.checkOut) return setError('Choose a city and both dates.');
    if (form.checkIn < todayISO()) return setError('Check-in can’t be in the past.');
    const n = nightsBetween(form.checkIn, form.checkOut);
    if (n < 1) return setError('Check-out must be at least one night after check-in.');
    if (n > 30) return setError('Stays can be up to 30 nights.');
    setError(null);
    setRun({ ...form });
  };

  const hold = (h: Hotel) => {
    const t = trips.find((x) => x.ref === tripRef);
    if (!t || !run) return;
    updateTrip(t.ref, (x) => ({
      ...x,
      stays: [...x.stays, { id: `${h.id}-${Date.now()}`, hotelId: h.id, hotelName: h.name, city: h.city, checkIn: run.checkIn, checkOut: run.checkOut, rooms: run.rooms, guests: run.guests, total: h.pricePerNight * nights * run.rooms }],
    }));
    setHeld({ name: h.name, trip: t });
  };

  return (
    <HubLayout title="Stays" eyebrow="Hotels and apartments" intro={initial ? `Somewhere to stay for your ${tripTitle(initial)} trip.` : 'Find somewhere to stay, and keep it with your flights.'}>
      <form className="panel hub-search" onSubmit={submit} noValidate aria-label="Search stays">
        {error && (
          <p className="field-error" role="alert">
            {error}
          </p>
        )}
        <div className="hub-search-grid">
          <div className="field">
            <label htmlFor="h-city">Destination</label>
            <select id="h-city" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })}>
              <option value="">Choose a city</option>
              {CITIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.city}, {c.country}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="h-in">Check-in</label>
            <input id="h-in" type="date" min={todayISO()} value={form.checkIn} onChange={(e) => setForm({ ...form, checkIn: e.target.value, checkOut: form.checkOut && form.checkOut > e.target.value ? form.checkOut : addDays(e.target.value, 1) })} />
          </div>
          <div className="field">
            <label htmlFor="h-out">Check-out</label>
            <input id="h-out" type="date" min={form.checkIn ? addDays(form.checkIn, 1) : todayISO()} value={form.checkOut} onChange={(e) => setForm({ ...form, checkOut: e.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="h-g">Guests</label>
            <select id="h-g" value={form.guests} onChange={(e) => setForm({ ...form, guests: Number(e.target.value) })}>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="h-r">Rooms</label>
            <select id="h-r" value={form.rooms} onChange={(e) => setForm({ ...form, rooms: Number(e.target.value) })}>
              {[1, 2, 3, 4].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className="btn btn-primary btn-lg">
            Search stays
          </button>
        </div>
      </form>

      {held && <HoldDone what={held.name} trip={held.trip} onClose={() => setHeld(null)} />}

      {run ? (
        <>
          <div className="results-head hub-results-head">
            <h2>
              {results.length} stays in {cityOf(run.city)}
            </h2>
            <p className="muted">
              {mediumDate(run.checkIn)} – {mediumDate(run.checkOut)} · {nights} night{nights === 1 ? '' : 's'} · {run.guests} guest{run.guests === 1 ? '' : 's'} · {run.rooms} room{run.rooms === 1 ? '' : 's'}
            </p>
          </div>
          <DemoNote>Invented properties and sample prices per room, per night. Taxes and local charges aren’t included in the sample data.</DemoNote>
          <div className="hub-toolbar">
            <label className="check">
              <input type="checkbox" checked={freeCancel} onChange={(e) => setFreeCancel(e.target.checked)} /> Free cancellation
            </label>
            <label className="check">
              <input type="checkbox" checked={breakfast} onChange={(e) => setBreakfast(e.target.checked)} /> Breakfast included
            </label>
            <label className="sort">
              <span>Sort by</span>
              <select value={sort} onChange={(e) => setSort(e.target.value as HSort)}>
                <option value="price">Lowest price</option>
                <option value="distance">Closest to centre</option>
                <option value="stars">Highest category</option>
              </select>
            </label>
            <TripPicker trips={trips} value={tripRef} onChange={setTripRef} />
          </div>
          {results.length === 0 ? (
            <div className="empty">
              <h3>No stays match your filters</h3>
              <button
                type="button"
                className="btn btn-primary btn-small"
                onClick={() => {
                  setFreeCancel(false);
                  setBreakfast(false);
                }}
              >
                Clear filters
              </button>
            </div>
          ) : (
            <ul className="plain listing">
              {results.map((h) => (
                <li key={h.id} className="listing-card">
                  <div className={`listing-art hue-${h.id.length % 6}`} aria-hidden="true" style={{ ['--hue' as string]: `${(h.name.length * 37) % 360}` }}>
                    <span>{h.kind}</span>
                  </div>
                  <div className="listing-body">
                    <h3>{h.name}</h3>
                    <p className="muted small">
                      <Stars n={h.stars} /> · {h.kind} · {h.area}, {h.kmFromCentre} km from the centre
                    </p>
                    <ul className="facts">
                      <li className={h.cancellation === 'non-refundable' ? 'no' : 'yes'}>{CANCEL_LABEL[h.cancellation]}</li>
                      <li className={h.breakfast === 'included' ? 'yes' : 'part'}>{BREAKFAST_LABEL[h.breakfast]}</li>
                      {h.amenities.slice(0, 3).map((a) => (
                        <li key={a} className="yes">
                          {a}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="listing-price">
                    <p className="pp">
                      {money(h.pricePerNight)} <span className="pp-basis">per room, per night</span>
                    </p>
                    <p className="party">
                      Est. {money(h.pricePerNight * nights * run.rooms)} for {nights} night{nights === 1 ? '' : 's'}
                      {run.rooms > 1 ? `, ${run.rooms} rooms` : ''}
                    </p>
                    {tripRef ? (
                      <button type="button" className="btn btn-primary btn-small" onClick={() => hold(h)}>
                        Hold for trip {tripRef}
                        <span className="sr-only">: {h.name}</span>
                      </button>
                    ) : (
                      <p className="muted small">{trips.length ? 'Choose a trip above to hold this stay.' : 'Book flights first to hold a stay with your trip.'}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : (
        <p className="muted hub-empty">Choose a city and dates to see sample stays.</p>
      )}
    </HubLayout>
  );
}

// ---------------- Car hire ----------------

export function CarsPage() {
  const { booking } = useBooking();
  const { query } = useRouter();
  const qAp = airportByCode(query.get('ap') ?? '') ? query.get('ap')! : '';
  const qPu = (query.get('pu') ?? '') >= todayISO() ? query.get('pu')! : '';
  const qDo = (query.get('do') ?? '') >= qPu && qPu ? query.get('do')! : '';
  const { trips, initial } = useLinkedTrip();
  const w = initial ? tripWindow(initial) : null;
  const pending = booking.search && !booking.confirmation ? booking.search : null;
  const firstAirport = (code: string) => (placeByCode(code)?.airports ?? [])[0] ?? '';
  const [form, setForm] = useState({
    airport: w?.arrivalAirport ?? (qAp || (pending ? firstAirport(pending.to) : '')),
    pickUp: w?.arrive ?? (qPu || pending?.depart || ''),
    pickTime: '12:00',
    dropOff: w?.leave ?? (qDo || pending?.ret || (qPu ? addDays(qPu, 3) : pending?.depart ? addDays(pending.depart, 3) : '')),
    dropTime: '10:00',
  });
  const [run, setRun] = useState(form.airport && form.pickUp && form.dropOff ? form : null);
  const [error, setError] = useState<string | null>(null);
  const [auto, setAuto] = useState(false);
  const [minSeats, setMinSeats] = useState(0);
  const [tripRef, setTripRef] = useState(initial?.ref ?? '');
  const [held, setHeld] = useState<{ name: string; trip: Trip } | null>(null);

  const days = run ? Math.max(1, nightsBetween(run.pickUp, run.dropOff) + (run.dropTime > run.pickTime ? 1 : 0)) : 0;
  const results = useMemo(
    () => (run ? searchCars(run.airport, run.pickUp).filter((c) => (!auto || c.gearbox === 'Automatic') && c.seats >= minSeats).sort((a, b) => a.pricePerDay - b.pricePerDay) : []),
    [run, auto, minSeats],
  );

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.airport || !form.pickUp || !form.dropOff) return setError('Choose a pick-up airport and both dates.');
    if (form.pickUp < todayISO()) return setError('Pick-up can’t be in the past.');
    if (form.dropOff < form.pickUp || (form.dropOff === form.pickUp && form.dropTime <= form.pickTime)) return setError('Drop-off must be after pick-up.');
    if (nightsBetween(form.pickUp, form.dropOff) > 28) return setError('Car hire can be up to 28 days.');
    setError(null);
    setRun({ ...form });
  };

  const hold = (c: Car) => {
    const t = trips.find((x) => x.ref === tripRef);
    if (!t || !run) return;
    updateTrip(t.ref, (x) => ({ ...x, cars: [...x.cars, { id: `${c.id}-${Date.now()}`, carId: c.id, carName: `${c.category}: ${c.example}`, airport: run.airport, pickUp: run.pickUp, dropOff: run.dropOff, total: c.pricePerDay * days }] }));
    setHeld({ name: `${c.category} car`, trip: t });
  };

  const times = Array.from({ length: 24 }, (_, h) => `${String(h).padStart(2, '0')}:00`);

  return (
    <HubLayout title="Car hire" eyebrow="Pick up where you land" intro={initial ? `A car waiting at ${airportByCode(w!.arrivalAirport)?.name ?? 'the airport'} when you land.` : 'Collect a car at the airport and drop it back when you fly home.'}>
      <form className="panel hub-search" onSubmit={submit} noValidate aria-label="Search car hire">
        {error && (
          <p className="field-error" role="alert">
            {error}
          </p>
        )}
        <div className="hub-search-grid cars">
          <div className="field">
            <label htmlFor="c-ap">Pick-up airport</label>
            <select id="c-ap" value={form.airport} onChange={(e) => setForm({ ...form, airport: e.target.value })}>
              <option value="">Choose an airport</option>
              {[...AIRPORTS].sort((a, b) => a.city.localeCompare(b.city)).map((a) => (
                <option key={a.code} value={a.code}>
                  {a.name} ({a.code})
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="c-pu">Pick-up date</label>
            <input id="c-pu" type="date" min={todayISO()} value={form.pickUp} onChange={(e) => setForm({ ...form, pickUp: e.target.value, dropOff: form.dropOff && form.dropOff >= e.target.value ? form.dropOff : addDays(e.target.value, 3) })} />
          </div>
          <div className="field">
            <label htmlFor="c-pt">Time</label>
            <select id="c-pt" value={form.pickTime} onChange={(e) => setForm({ ...form, pickTime: e.target.value })}>
              {times.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="c-do">Drop-off date</label>
            <input id="c-do" type="date" min={form.pickUp || todayISO()} value={form.dropOff} onChange={(e) => setForm({ ...form, dropOff: e.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="c-dt">Time</label>
            <select id="c-dt" value={form.dropTime} onChange={(e) => setForm({ ...form, dropTime: e.target.value })}>
              {times.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>
          <button type="submit" className="btn btn-primary btn-lg">
            Search cars
          </button>
        </div>
        <p className="hint">Return to the same airport. Drivers usually need a full licence; age rules and fees are set by each supplier.</p>
      </form>

      {held && <HoldDone what={held.name} trip={held.trip} onClose={() => setHeld(null)} />}

      {run ? (
        <>
          <div className="results-head hub-results-head">
            <h2>
              {results.length} cars at {airportByCode(run.airport)?.name}
            </h2>
            <p className="muted">
              {mediumDate(run.pickUp)} {run.pickTime} – {mediumDate(run.dropOff)} {run.dropTime} · {days} day{days === 1 ? '' : 's'}
            </p>
          </div>
          <DemoNote>Invented suppliers and sample prices per day. Deposits, insurance excess and extra-driver fees aren’t supplied in the sample data.</DemoNote>
          <div className="hub-toolbar">
            <label className="check">
              <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} /> Automatic only
            </label>
            <label className="sort">
              <span>Seats</span>
              <select value={minSeats} onChange={(e) => setMinSeats(Number(e.target.value))}>
                <option value={0}>Any</option>
                <option value={5}>5 or more</option>
                <option value={7}>7 or more</option>
              </select>
            </label>
            <TripPicker trips={trips} value={tripRef} onChange={setTripRef} />
          </div>
          {results.length === 0 ? (
            <div className="empty">
              <h3>No cars match your filters</h3>
              <button
                type="button"
                className="btn btn-primary btn-small"
                onClick={() => {
                  setAuto(false);
                  setMinSeats(0);
                }}
              >
                Clear filters
              </button>
            </div>
          ) : (
            <ul className="plain listing">
              {results.map((c) => (
                <li key={c.id} className="listing-card">
                  <div className="listing-art car" aria-hidden="true">
                    <CarArt />
                    <span>{c.category}</span>
                  </div>
                  <div className="listing-body">
                    <h3>
                      {c.category} <span className="muted small">· {c.example}</span>
                    </h3>
                    <p className="muted small">
                      {c.supplier} · {c.pickup === 'In terminal' ? 'Desk in the terminal' : 'Free shuttle bus to the desk'}
                    </p>
                    <ul className="facts inline">
                      <li className="yes">{c.seats} seats</li>
                      <li className="yes">{c.bags} large bag{c.bags === 1 ? '' : 's'}</li>
                      <li className="yes">{c.gearbox}</li>
                      <li className="yes">{c.fuel}</li>
                    </ul>
                  </div>
                  <div className="listing-price">
                    <p className="pp">
                      {money(c.pricePerDay)} <span className="pp-basis">per day</span>
                    </p>
                    <p className="party">
                      Est. {money(c.pricePerDay * days)} for {days} day{days === 1 ? '' : 's'}
                    </p>
                    {tripRef ? (
                      <button type="button" className="btn btn-primary btn-small" onClick={() => hold(c)}>
                        Hold for trip {tripRef}
                        <span className="sr-only">: {c.category}</span>
                      </button>
                    ) : (
                      <p className="muted small">{trips.length ? 'Choose a trip above to hold this car.' : 'Book flights first to hold a car with your trip.'}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : (
        <p className="muted hub-empty">Choose an airport and dates to see sample cars.</p>
      )}
    </HubLayout>
  );
}

function CarArt() {
  return (
    <svg viewBox="0 0 120 50" width="120" height="50">
      <path d="M10 36 L18 22 Q22 16 30 16 L78 16 Q86 16 92 22 L104 30 Q112 31 112 38 L112 40 L10 40 Z" fill="currentColor" opacity=".9" />
      <path d="M32 20 L52 20 L52 29 L24 29 Z M56 20 L76 20 Q82 20 86 25 L88 29 L56 29 Z" fill="#fff" opacity=".55" />
      <circle cx="32" cy="40" r="7" fill="#1c1b19" />
      <circle cx="90" cy="40" r="7" fill="#1c1b19" />
    </svg>
  );
}
