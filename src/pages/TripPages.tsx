import React, { useEffect, useMemo, useState } from 'react';
import { DemoNote, HubLayout, TripJourneys, TripLookup, tripDates, tripTitle, tripTotal } from '../components/Hub';
import { Dialog } from '../components/Dialog';
import { WarningList } from '../components/FlightBits';
import { lastBookingStep } from '../components/Chrome';
import { Beacon } from '../components/Sky';
import { removeTrip, Trip, updateTrip, useTrips } from '../lib/trips';
import { useBooking } from '../lib/booking';
import { money } from '../lib/costs';
import { findItinerary, Itinerary, placeShort, airportShort } from '../lib/data';
import { itineraryWarnings, pairWarnings } from '../lib/warnings';
import { fullDate, mediumDate, todayISO } from '../lib/dates';
import { Link, useRouter } from '../lib/router';

/** Look a trip up from ?ref= (in-app links) or let the traveller find it. */
function useTripFromQuery(): [Trip | null, (t: Trip | null) => void] {
  const { query, navigate, path } = useRouter();
  const trips = useTrips();
  const ref = query.get('ref');
  const trip = useMemo(() => (ref ? trips.find((t) => t.ref === ref.toUpperCase()) ?? null : null), [ref, trips]);
  const set = (t: Trip | null) => navigate(t ? `${path}?ref=${t.ref}` : path, { replace: !t });
  return [trip, set];
}

// ---------------- Manage booking ----------------

export function ManagePage() {
  const [trip, setTrip] = useTripFromQuery();
  return (
    <HubLayout title="Manage booking" eyebrow="Your trip" intro="See your flights, check in, and add a stay or car for your dates.">
      {trip ? <TripManager trip={trip} onBack={() => setTrip(null)} /> : <ManageStart onFound={setTrip} />}
    </HubLayout>
  );
}

function ManageStart({ onFound }: { onFound: (t: Trip) => void }) {
  const trips = useTrips().filter((t) => !t.sample);
  return (
    <div className="hub-grid">
      <section aria-labelledby="find-h">
        <h2 id="find-h">Find your booking</h2>
        <TripLookup onFound={onFound} />
      </section>
      <aside className="panel hub-aside" aria-labelledby="saved-h">
        <h2 id="saved-h">Booked on this device</h2>
        {trips.length ? (
          <ul className="plain trip-list">
            {trips.map((t) => (
              <li key={t.ref}>
                <button type="button" className="trip-pill" onClick={() => onFound(t)}>
                  <strong>{tripTitle(t)}</strong>
                  <span className="muted small">
                    {t.ref} · {tripDates(t)}
                    {t.status === 'cancelled' ? ' · Cancelled' : ''}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">Demo bookings you confirm in this browser appear here. Or try the example booking: reference <strong>WPDEMO</strong>, last name <strong>Traveller</strong>.</p>
        )}
      </aside>
    </div>
  );
}

function TripManager({ trip, onBack }: { trip: Trip; onBack: () => void }) {
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const out = findItinerary(trip.outbound.itineraryId);
  const ret = trip.ret ? findItinerary(trip.ret.itineraryId) : undefined;
  const warnings = [...(out ? itineraryWarnings(out) : []), ...(ret ? itineraryWarnings(ret) : []), ...pairWarnings(out, ret)].filter((w) => w.severity !== 'fyi');
  const cancelled = trip.status === 'cancelled';
  const totals = tripTotal(trip);
  const arrival = out ? out.to : trip.search.to;
  const n = trip.travellers.length || 1;

  return (
    <div className="trip-manager">
      <div className="trip-head panel">
        <div>
          <p className="leg-kind">Booking {trip.ref}{trip.sample ? ' · Example' : ''}</p>
          <h2 className="trip-h">{tripTitle(trip)}</h2>
          <p className="muted">
            {tripDates(trip)} · {n} traveller{n === 1 ? '' : 's'}: {trip.travellers.map((p) => `${p.firstName} ${p.lastName}`).join(', ')}
          </p>
        </div>
        <p className={`status-pill ${cancelled ? 'off' : 'on'}`}>{cancelled ? 'Cancelled' : 'Confirmed'}</p>
      </div>

      {cancelled && (
        <p className="notice-inline" role="status">
          This demo booking is cancelled. In a live booking, any refund would follow the fare rules shown when you booked.
        </p>
      )}

      {!cancelled && (
        <nav className="quick-actions" aria-label="Things you can do">
          <Link to={`/check-in?ref=${trip.ref}`} className="qa">
            <span className="qa-ico" aria-hidden="true">✈</span>
            <span>
              <strong>Check in online</strong>
              <span className="muted small">{trip.checkedIn.outbound ? 'Outbound: checked in' : 'Get your boarding passes'}</span>
            </span>
          </Link>
          <Link to={`/hotels?ref=${trip.ref}`} className="qa">
            <span className="qa-ico" aria-hidden="true">⌂</span>
            <span>
              <strong>Add a stay</strong>
              <span className="muted small">In {placeShort(trip.search.to).replace(/ \(.*/, '')} for your dates</span>
            </span>
          </Link>
          <Link to={`/cars?ref=${trip.ref}`} className="qa">
            <span className="qa-ico" aria-hidden="true">⛟</span>
            <span>
              <strong>Hire a car</strong>
              <span className="muted small">Pick up at {airportShort(arrival)}</span>
            </span>
          </Link>
          <button type="button" className="qa" onClick={() => window.print()}>
            <span className="qa-ico" aria-hidden="true">⎙</span>
            <span>
              <strong>Print itinerary</strong>
              <span className="muted small">Or save it as a PDF</span>
            </span>
          </button>
        </nav>
      )}

      <div className="hub-grid">
        <div>
          <h2>Your flights</h2>
          <TripJourneys trip={trip} />
          {warnings.length > 0 && (
            <section className="panel" aria-labelledby="tocheck-h">
              <h2 id="tocheck-h">Before you go</h2>
              <WarningList warnings={warnings} />
            </section>
          )}
        </div>
        <aside className="hub-aside">
          <section className="panel" aria-labelledby="extras-h">
            <h2 id="extras-h">Added to your trip</h2>
            {trip.stays.length + trip.cars.length === 0 ? (
              <p className="muted">No stays or cars yet. Holds are free in this demo, and nothing is charged.</p>
            ) : (
              <ul className="plain hold-list">
                {trip.stays.map((h) => (
                  <li key={h.id}>
                    <strong>{h.hotelName}</strong>
                    <span className="muted small">
                      {h.city} · {mediumDate(h.checkIn)} – {mediumDate(h.checkOut)} · {h.rooms} room{h.rooms > 1 ? 's' : ''} · {money(h.total)}
                    </span>
                    {!cancelled && (
                      <button type="button" className="link-btn small" onClick={() => updateTrip(trip.ref, (t) => ({ ...t, stays: t.stays.filter((x) => x.id !== h.id) }))}>
                        Remove<span className="sr-only"> {h.hotelName}</span>
                      </button>
                    )}
                  </li>
                ))}
                {trip.cars.map((c) => (
                  <li key={c.id}>
                    <strong>{c.carName}</strong>
                    <span className="muted small">
                      {c.airport} · {mediumDate(c.pickUp)} – {mediumDate(c.dropOff)} · {money(c.total)}
                    </span>
                    {!cancelled && (
                      <button type="button" className="link-btn small" onClick={() => updateTrip(trip.ref, (t) => ({ ...t, cars: t.cars.filter((x) => x.id !== c.id) }))}>
                        Remove<span className="sr-only"> {c.carName}</span>
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
            <dl className="mini-costs">
              <dt>Flights (demo total)</dt>
              <dd>{trip.sample ? 'Example' : money(totals.flights)}</dd>
              <dt>Stays and cars (sample)</dt>
              <dd>{money(totals.extras)}</dd>
            </dl>
            <p className="muted small">Nothing has been charged. Stays and cars are sample holds.</p>
          </section>
          <section className="panel" aria-labelledby="change-h">
            <h2 id="change-h">Changes</h2>
            <p className="muted small">Date and name changes follow your fare’s rules and are handled by the airline in a live booking. They aren’t part of this demo.</p>
            <div className="stack-actions">
              {!cancelled && (
                <button type="button" className="btn btn-outline btn-small" onClick={() => setConfirmCancel(true)}>
                  Cancel this booking
                </button>
              )}
              <button type="button" className="link-btn" onClick={() => setConfirmRemove(true)}>
                Remove from this browser
              </button>
              <button type="button" className="link-btn" onClick={onBack}>
                Look up a different booking
              </button>
            </div>
          </section>
        </aside>
      </div>

      <Dialog
        open={confirmCancel}
        onClose={() => setConfirmCancel(false)}
        title="Cancel this booking?"
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setConfirmCancel(false)}>
              Keep booking
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => {
                updateTrip(trip.ref, (t) => ({ ...t, status: 'cancelled', stays: [], cars: [] }));
                setConfirmCancel(false);
              }}
            >
              Cancel booking
            </button>
          </>
        }
      >
        <p>
          This cancels demo booking <strong>{trip.ref}</strong> and releases any stays or cars held against it. You can’t undo this.
        </p>
        <p className="muted small">In a live booking, whether you get money back depends on the fare rules you agreed to.</p>
      </Dialog>
      <Dialog
        open={confirmRemove}
        onClose={() => setConfirmRemove(false)}
        title="Remove from this browser?"
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setConfirmRemove(false)}>
              Keep it
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => {
                removeTrip(trip.ref);
                setConfirmRemove(false);
                onBack();
              }}
            >
              Remove
            </button>
          </>
        }
      >
        <p>This deletes the saved copy of {trip.ref} from this browser. Demo bookings aren’t stored anywhere else, so you won’t be able to look it up again.</p>
      </Dialog>
    </div>
  );
}

// ---------------- Online check-in ----------------

type LegKey = 'outbound' | 'return';

export function CheckInPage() {
  const [trip, setTrip] = useTripFromQuery();
  return (
    <HubLayout title="Online check-in" eyebrow="Your trip" intro="Confirm your details and get your boarding passes.">
      {trip ? <CheckIn trip={trip} onBack={() => setTrip(null)} /> : <CheckInStart onFound={setTrip} />}
    </HubLayout>
  );
}

function CheckInStart({ onFound }: { onFound: (t: Trip) => void }) {
  return (
    <div className="hub-grid">
      <section aria-labelledby="ci-find">
        <h2 id="ci-find">Find your booking</h2>
        <TripLookup onFound={onFound} cta="Start check-in" />
      </section>
      <aside className="panel hub-aside">
        <h2>Good to know</h2>
        <ul className="ticks">
          <li>Each airline sets when online check-in opens and closes. Check yours before you travel.</li>
          <li>If your journey is a self-transfer, you check in separately for each ticket.</li>
          <li>Check the entry requirements for your destination before you fly.</li>
        </ul>
        <p className="small">
          <a href="https://www.gov.uk/foreign-travel-advice" target="_blank" rel="noopener noreferrer">
            GOV.UK foreign travel advice (opens in a new tab)
          </a>
        </p>
      </aside>
    </div>
  );
}

function CheckIn({ trip, onBack }: { trip: Trip; onBack: () => void }) {
  const legs = ([['outbound', trip.outbound], ['return', trip.ret]] as const).filter(([, c]) => !!c).map(([k, c]) => ({ key: k as LegKey, it: findItinerary(c!.itineraryId)!, cabin: c!.cabin })).filter((l) => !!l.it);
  const firstOpen = legs.find((l) => !trip.checkedIn[l.key] && l.it.date >= todayISO())?.key ?? legs[0]?.key;
  const [leg, setLeg] = useState<LegKey>(firstOpen ?? 'outbound');
  const [ack, setAck] = useState({ docs: false, items: false });
  const [error, setError] = useState<string | null>(null);
  const current = legs.find((l) => l.key === leg);
  const done = trip.checkedIn[leg];
  const past = current ? current.it.date < todayISO() : false;

  useEffect(() => {
    setAck({ docs: false, items: false });
    setError(null);
  }, [leg]);

  if (trip.status === 'cancelled') {
    return (
      <div className="panel">
        <p>Booking {trip.ref} is cancelled, so there’s nothing to check in.</p>
        <button type="button" className="link-btn" onClick={onBack}>
          Look up a different booking
        </button>
      </div>
    );
  }
  if (!current) return null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ack.docs || !ack.items) {
      setError('Please confirm both statements to check in.');
      return;
    }
    updateTrip(trip.ref, (t) => ({ ...t, checkedIn: { ...t.checkedIn, [leg]: true } }));
  };

  return (
    <div className="checkin">
      <p className="muted">
        Booking <strong>{trip.ref}</strong> · {tripTitle(trip)} ·{' '}
        <Link to={`/manage?ref=${trip.ref}`}>Manage this booking</Link>
      </p>
      {legs.length > 1 && (
        <div className="seg leg-seg" role="radiogroup" aria-label="Which journey">
          {legs.map((l) => (
            <label key={l.key} className={leg === l.key ? 'on' : ''}>
              <input type="radio" name="ci-leg" checked={leg === l.key} onChange={() => setLeg(l.key)} />
              {l.key === 'outbound' ? 'Outbound' : 'Return'} · {mediumDate(l.it.date)}
              {trip.checkedIn[l.key] ? ' ✓' : ''}
            </label>
          ))}
        </div>
      )}

      {done ? (
        <BoardingPasses trip={trip} it={current.it} leg={leg} />
      ) : past ? (
        <p className="panel">This journey has already departed.</p>
      ) : (
        <form className="panel checkin-form" onSubmit={submit} noValidate>
          <h2>
            Check in: {placeShort(current.it.from)} to {placeShort(current.it.to)}
          </h2>
          <p className="muted">{fullDate(current.it.date)} · {trip.travellers.length} traveller{trip.travellers.length === 1 ? '' : 's'}</p>
          {current.it.selfTransfer && (
            <p className="notice-inline">
              This is a self-transfer journey on separate tickets. In a live booking you’d check in with each airline separately. Here, one sample pass is shown per flight.
            </p>
          )}
          <ul className="plain ci-people">
            {trip.travellers.map((p, i) => (
              <li key={i}>
                <span className="avatar" aria-hidden="true">{p.firstName.slice(0, 1)}</span>
                {[p.title, p.firstName, p.lastName].filter(Boolean).join(' ')}
              </li>
            ))}
          </ul>
          {error && (
            <p className="field-error" role="alert">
              {error}
            </p>
          )}
          <label className="check block">
            <input type="checkbox" checked={ack.docs} onChange={(e) => setAck({ ...ack, docs: e.target.checked })} />
            <span>
              Everyone travelling has checked the passport, visa and entry requirements for {placeShort(current.it.to)}.{' '}
              <a href="https://www.gov.uk/foreign-travel-advice" target="_blank" rel="noopener noreferrer">
                Check entry requirements (opens in a new tab)
              </a>
            </span>
          </label>
          <label className="check block">
            <input type="checkbox" checked={ack.items} onChange={(e) => setAck({ ...ack, items: e.target.checked })} />
            <span>Nobody is carrying items that aren’t allowed on a plane. Rules are set by airports and airlines; check them if you’re unsure.</span>
          </label>
          <button type="submit" className="btn btn-primary btn-lg">
            Check in {trip.travellers.length === 1 ? '' : `all ${trip.travellers.length} `}and get boarding passes
          </button>
        </form>
      )}
    </div>
  );
}

function BoardingPasses({ trip, it, leg }: { trip: Trip; it: Itinerary; leg: LegKey }) {
  const seats = trip.seats[leg].filter(Boolean);
  return (
    <section aria-labelledby="bp-h">
      <div className="ci-done" role="status">
        <Beacon size={22} /> <span>You’re checked in. Show these at the airport in a live booking.</span>
      </div>
      <h2 id="bp-h">Boarding passes</h2>
      <DemoNote>Sample boarding passes: not valid for travel.</DemoNote>
      <div className="passes">
        {trip.travellers.flatMap((p, i) =>
          it.segments.map((sg, k) => (
            <article key={`${i}-${k}`} className="pass" aria-label={`Boarding pass for ${p.firstName} ${p.lastName}, flight ${sg.number}`}>
              <div className="pass-top">
                <span className="pass-brand">
                  <Beacon size={18} /> Waypoint
                </span>
                <span className="pass-sample">SAMPLE · NOT VALID</span>
              </div>
              <div className="pass-route">
                <span>
                  <strong>{sg.from}</strong>
                  <span className="muted small">{sg.depart}</span>
                </span>
                <span aria-hidden="true" className="pass-plane">✈</span>
                <span>
                  <strong>{sg.to}</strong>
                  <span className="muted small">{sg.arrive}</span>
                </span>
              </div>
              <dl className="pass-grid">
                <dt>Passenger</dt>
                <dd>{`${p.lastName.toUpperCase()}/${p.firstName.toUpperCase()}`}</dd>
                <dt>Flight</dt>
                <dd>{sg.number}</dd>
                <dt>Date</dt>
                <dd>{mediumDate(it.date)}</dd>
                <dt>Seat</dt>
                <dd>{k === 0 && !it.selfTransfer && seats[i] ? seats[i] : 'At gate'}</dd>
                <dt>Gate</dt>
                <dd>Shown at airport</dd>
              </dl>
              <div className="pass-code" aria-hidden="true">
                {Array.from({ length: 36 }, (_, j) => (
                  <i key={j} style={{ opacity: ((j * 7 + i * 3 + k) % 5) / 5 + 0.15 }} />
                ))}
              </div>
            </article>
          )),
        )}
      </div>
      <p>
        <button type="button" className="btn btn-outline" onClick={() => window.print()}>
          Print boarding passes
        </button>
      </p>
    </section>
  );
}

// ---------------- Your trips (sign-in) ----------------

export function AccountPage() {
  const trips = useTrips();
  const { booking } = useBooking();
  const last = lastBookingStep();
  const inProgress = booking.search && !booking.confirmation && last;
  const [confirmClear, setConfirmClear] = useState(false);
  const upcoming = trips.filter((t) => t.search.depart >= todayISO() && t.status === 'confirmed');
  const other = trips.filter((t) => !upcoming.includes(t));
  return (
    <HubLayout title="Your trips" eyebrow="Account" intro="Everything you’ve booked in this browser, in one place.">
      {inProgress && (
        <div className="panel resume-panel">
          <p>
            <strong>Your booking is saved.</strong> {placeShort(booking.search!.from)} to {placeShort(booking.search!.to)}, {mediumDate(booking.search!.depart)}.
          </p>
          <Link to={last!} className="btn btn-primary">
            Back to your booking
          </Link>
        </div>
      )}
      <div className="hub-grid">
        <div>
          <h2>Upcoming</h2>
          {upcoming.length ? <TripCards trips={upcoming} /> : <p className="muted">No upcoming trips in this browser yet.</p>}
          {other.length > 0 && (
            <>
              <h2>Past and cancelled</h2>
              <TripCards trips={other} />
            </>
          )}
          <p>
            <Link to="/" className="btn btn-outline">
              Book a new trip
            </Link>{' '}
            <Link to="/manage" className="btn btn-ghost">
              Find a booking by reference
            </Link>
          </p>
        </div>
        <aside className="panel hub-aside">
          <h2>About sign-in</h2>
          <p>Accounts aren’t part of this demo, so there’s nothing to sign in to. Your trips are saved in this browser instead, and you can find any booking with its reference and a last name.</p>
          <p className="muted small">Waypoint will never ask for your password in a chat, email or pop-up.</p>
          {trips.length > 0 && (
            <button type="button" className="btn btn-ghost btn-small" onClick={() => setConfirmClear(true)}>
              Clear saved trips
            </button>
          )}
        </aside>
      </div>
      <Dialog
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        title="Clear all saved trips?"
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setConfirmClear(false)}>
              Keep them
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => {
                trips.forEach((t) => removeTrip(t.ref));
                setConfirmClear(false);
              }}
            >
              Clear {trips.length} trip{trips.length === 1 ? '' : 's'}
            </button>
          </>
        }
      >
        <p>This deletes every demo booking saved in this browser. You can’t undo this.</p>
      </Dialog>
    </HubLayout>
  );
}

function TripCards({ trips }: { trips: Trip[] }) {
  return (
    <ul className="plain trip-cards">
      {trips.map((t) => (
        <li key={t.ref} className="trip-card panel">
          <div>
            <p className="leg-kind">
              {t.ref}
              {t.sample ? ' · Example' : ''}
              {t.status === 'cancelled' ? ' · Cancelled' : ''}
            </p>
            <h3>{tripTitle(t)}</h3>
            <p className="muted small">
              {tripDates(t)} · {t.travellers.length} traveller{t.travellers.length === 1 ? '' : 's'}
              {t.stays.length ? ` · ${t.stays.length} stay` : ''}
              {t.cars.length ? ` · ${t.cars.length} car` : ''}
            </p>
          </div>
          <div className="trip-card-actions">
            <Link to={`/manage?ref=${t.ref}`} className="btn btn-small btn-primary">
              Manage<span className="sr-only"> {t.ref}</span>
            </Link>
            {t.status === 'confirmed' && (
              <Link to={`/check-in?ref=${t.ref}`} className="btn btn-small btn-outline">
                Check in<span className="sr-only"> {t.ref}</span>
              </Link>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

