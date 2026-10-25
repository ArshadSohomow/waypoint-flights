import React, { useMemo, useState } from 'react';
import { BookingHeader, SiteFooter } from '../components/Chrome';
import { Times, StopInfo, FlightDetailsButton, RouteHeading } from '../components/FlightBits';
import { Leg, money, seatedCount, useBooking } from '../lib/booking';
import { Cabin, CABINS, flightsFor, lowestFare } from '../lib/data';
import { addDays, fullDate, shortDate, todayISO } from '../lib/dates';
import { Redirect, useRouter } from '../lib/router';

type Sort = 'price' | 'depart' | 'duration';
type Slot = 'morning' | 'afternoon' | 'evening';
const slotOf = (hm: string): Slot => (hm < '12:00' ? 'morning' : hm < '17:00' ? 'afternoon' : 'evening');

export function FlightsPage({ leg }: { leg: Leg }) {
  const { booking, dispatch } = useBooking();
  const { navigate } = useRouter();
  const s = booking.search;
  const [sort, setSort] = useState<Sort>('depart');
  const [slots, setSlots] = useState<Slot[]>(['morning', 'afternoon', 'evening']);
  const [showFilter, setShowFilter] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const isOut = leg === 'outbound';
  const from = s ? (isOut ? s.from : s.to) : '';
  const to = s ? (isOut ? s.to : s.from) : '';
  const date = s ? (isOut ? s.depart : s.ret ?? '') : '';

  const flights = useMemo(() => {
    const list = flightsFor(from, to, date).filter((f) => slots.includes(slotOf(f.depart)));
    const key = { price: (f: any) => f.fares.economy, depart: (f: any) => f.depart, duration: (f: any) => f.durationMin }[sort];
    return [...list].sort((a, b) => (key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : 0));
  }, [from, to, date, slots, sort]);

  if (!s) return <Redirect to="/" />;
  if (!isOut && s.tripType !== 'round') return <Redirect to="/review" />;
  if (!isOut && !booking.outbound) return <Redirect to="/flights/outbound" />;

  const chosen = isOut ? booking.outbound : booking.ret;
  const seated = seatedCount(s.pax);

  // Outbound can't move past the return date; return can't move before departure.
  const minDate = isOut ? todayISO() : s.depart;
  const maxDate = isOut && s.ret ? s.ret : addDays(todayISO(), 330);
  const strip = Array.from({ length: 7 }, (_, i) => addDays(date, i - 3));

  const choose = (flightId: string, cabin: Cabin) => {
    dispatch({ type: 'choose', leg, choice: { flightId, cabin } });
    navigate(isOut && s.tripType === 'round' ? '/flights/return' : '/review');
  };

  return (
    <>
      <BookingHeader step={1} />
      <main id="main" className="wrap page-flights">
        <p className="eyebrow">{isOut ? 'Step 1 of 5 · Outbound flight' : 'Step 1 of 5 · Return flight'}</p>
        <RouteHeading from={from} to={to} level={1} />

        <nav className="date-strip" aria-label="Change date">
          <button type="button" className="icon-btn" aria-label="Earlier dates" disabled={addDays(date, -1) < minDate} onClick={() => dispatch({ type: 'date', leg, date: addDays(date, -1) })}>
            ‹
          </button>
          <ul>
            {strip.map((d) => {
              const disabled = d < minDate || d > maxDate;
              const price = disabled ? null : lowestFare(from, to, d);
              const current = d === date;
              return (
                <li key={d}>
                  <button
                    type="button"
                    className={`day ${current ? 'current' : ''}`}
                    disabled={disabled}
                    aria-current={current ? 'date' : undefined}
                    aria-label={`${fullDate(d)}${price ? `, from ${money(price)}` : ', unavailable'}`}
                    onClick={() => dispatch({ type: 'date', leg, date: d })}
                  >
                    <span className="day-name">{shortDate(d)}</span>
                    <span className="day-price">{price ? money(price) : '—'}</span>
                  </button>
                </li>
              );
            })}
          </ul>
          <button type="button" className="icon-btn" aria-label="Later dates" disabled={addDays(date, 1) > maxDate} onClick={() => dispatch({ type: 'date', leg, date: addDays(date, 1) })}>
            ›
          </button>
        </nav>

        <div className="results-head">
          <h2>{isOut ? 'Departure flights' : 'Return flights'}</h2>
          <div className="results-tools">
            <button type="button" className="btn btn-small btn-soft" aria-expanded={showFilter} aria-controls="filters" onClick={() => setShowFilter((v) => !v)}>
              Filter{slots.length < 3 ? ` (${slots.length})` : ''}
            </button>
            <label className="sort">
              <span>Sort by</span>
              <select value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
                <option value="depart">Departure time</option>
                <option value="price">Lowest price</option>
                <option value="duration">Shortest flight</option>
              </select>
            </label>
          </div>
        </div>
        {showFilter && (
          <fieldset id="filters" className="filters">
            <legend>Departure time</legend>
            {(['morning', 'afternoon', 'evening'] as Slot[]).map((sl) => (
              <label key={sl} className="check">
                <input
                  type="checkbox"
                  checked={slots.includes(sl)}
                  onChange={(e) => setSlots((cur) => (e.target.checked ? [...cur, sl] : cur.filter((x) => x !== sl)))}
                />
                {sl === 'morning' ? 'Morning (before 12:00)' : sl === 'afternoon' ? 'Afternoon (12:00–17:00)' : 'Evening (after 17:00)'}
              </label>
            ))}
          </fieldset>
        )}

        <p className="sr-only" aria-live="polite">
          {flights.length} flight{flights.length === 1 ? '' : 's'} on {fullDate(date)}
        </p>
        {flights.length === 0 ? (
          <div className="empty">
            <p><strong>No flights match.</strong> Try another date or change the departure-time filter.</p>
          </div>
        ) : (
          <ul className="flight-list">
            {flights.map((f) => {
              const open = expanded === f.id;
              return (
                <li key={f.id} className={`flight ${chosen?.flightId === f.id ? 'chosen' : ''} ${open ? 'open' : ''}`}>
                  <div className="flight-main">
                    <div className="flight-info">
                      <Times f={f} />
                      <FlightDetailsButton f={f} />
                    </div>
                    <StopInfo f={f} />
                    <div className="fare-buttons" role="group" aria-label={`Fares for the ${f.depart} flight`}>
                      {CABINS.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          className={`fare-btn ${chosen?.flightId === f.id && chosen.cabin === c.id ? 'selected' : ''}`}
                          aria-expanded={open}
                          aria-controls={`fares-${f.id}`}
                          onClick={() => setExpanded(open ? null : f.id)}
                        >
                          <span className="fare-name">{c.name}</span>
                          <span className="fare-price">{money(f.fares[c.id])}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  {open && (
                    <div className="fare-cards" id={`fares-${f.id}`}>
                      {CABINS.map((c) => (
                        <div key={c.id} className={`fare-card ${c.id}`}>
                          <h3>{c.name}</h3>
                          <p className="fare-card-price">
                            {money(f.fares[c.id])} <span>per person</span>
                          </p>
                          <ul className="ticks">
                            {c.inclusions.map((i) => (
                              <li key={i} className={i.startsWith('No ') ? 'no' : ''}>
                                {i}
                              </li>
                            ))}
                          </ul>
                          <button type="button" className="btn btn-primary btn-block" onClick={() => choose(f.id, c.id)}>
                            Select {c.name}
                            <span className="sr-only">, {f.depart} flight, {money(f.fares[c.id] * seated)} total</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {seated > 1 && <p className="muted">Prices are per person. You are booking for {seated} passengers with seats.</p>}
      </main>
      <SiteFooter />
    </>
  );
}
