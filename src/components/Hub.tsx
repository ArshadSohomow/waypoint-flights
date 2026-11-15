import React, { useState } from 'react';
import { SiteHeader, SiteFooter } from './Chrome';
import { SkyHero } from './Sky';
import { JourneySummary, RouteHeading, cabinName } from './FlightBits';
import { findItinerary, placeShort } from '../lib/data';
import { fullDate, mediumDate } from '../lib/dates';
import { findTrip, SAMPLE_REF, SAMPLE_SURNAME, ensureSampleTrip, Trip } from '../lib/trips';
import { money } from '../lib/costs';

/** Shared frame for the hub pages: header, a calm sky band, the page title. */
export function HubLayout({ title, eyebrow, intro, children, className = '' }: { title: string; eyebrow?: string; intro?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <>
      <SiteHeader />
      <main id="main" className="hub-main">
        <SkyHero compact>
          {eyebrow && <p className="sky-eyebrow">{eyebrow}</p>}
          <h1 className="sky-title hub-title">{title}</h1>
          {intro && <p className="sky-sub">{intro}</p>}
        </SkyHero>
        <div className={`wrap page-hub ${className}`}>{children}</div>
      </main>
      <SiteFooter />
    </>
  );
}

/** Small "Sample" label used on every invented listing. */
export function DemoNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="demo-note">
      <span className="sample-tag">Sample data</span> {children}
    </p>
  );
}

/** Booking reference + last name, the usual airline lookup. Never asks for a password. */
export function TripLookup({ onFound, cta = 'Find my booking' }: { onFound: (t: Trip) => void; cta?: string }) {
  const [ref, setRef] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ref.trim() || !name.trim()) {
      setError('Enter your booking reference and a last name from the booking.');
      return;
    }
    if (ref.trim().toUpperCase() === SAMPLE_REF) ensureSampleTrip();
    const t = findTrip(ref, name);
    if (!t) {
      setError('We couldn’t find a booking with that reference and last name in this browser. Check both and try again. Demo bookings are only saved on the device you booked on.');
      return;
    }
    setError(null);
    onFound(t);
  };
  return (
    <form className="panel lookup" onSubmit={submit} noValidate>
      {error && (
        <p className="field-error lookup-error" role="alert">
          {error}
        </p>
      )}
      <div className="lookup-fields">
        <div className="field">
          <label htmlFor="lk-ref">Booking reference</label>
          <input id="lk-ref" value={ref} onChange={(e) => setRef(e.target.value.toUpperCase())} autoComplete="off" spellCheck={false} maxLength={8} aria-describedby="lk-hint" placeholder="e.g. K7Q2MX" />
        </div>
        <div className="field">
          <label htmlFor="lk-name">Last name</label>
          <input id="lk-name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="family-name" />
        </div>
        <button type="submit" className="btn btn-primary btn-lg">
          {cta}
        </button>
      </div>
      <p id="lk-hint" className="hint">
        Your 6-character reference is on your confirmation. No account or password needed.{' '}
        <button
          type="button"
          className="link-btn"
          onClick={() => {
            ensureSampleTrip();
            setRef(SAMPLE_REF);
            setName(SAMPLE_SURNAME);
            setError(null);
          }}
        >
          Fill in the example booking
        </button>
      </p>
    </form>
  );
}

/** Compact read-only view of a saved trip's journeys. */
export function TripJourneys({ trip }: { trip: Trip }) {
  const legs = [
    { label: 'Outbound', c: trip.outbound, seats: trip.seats.outbound },
    ...(trip.ret ? [{ label: 'Return', c: trip.ret, seats: trip.seats.return }] : []),
  ];
  return (
    <div className="trip-journeys">
      {legs.map(({ label, c, seats }) => {
        const it = findItinerary(c.itineraryId);
        if (!it) return null;
        const s = seats.filter(Boolean);
        return (
          <section key={label} className="leg-card mini" aria-label={`${label} journey`}>
            <p className="leg-kind">
              {label} · {fullDate(it.date)}
            </p>
            <RouteHeading from={it.from} to={it.to} level={3} />
            <JourneySummary it={it} />
            <p className="muted small">
              {cabinName(c.cabin)} · {it.selfTransfer ? 'Seats allocated at check-in' : s.length ? `Seats ${s.join(', ')}` : 'No seats chosen'}
            </p>
          </section>
        );
      })}
    </div>
  );
}

export function tripTitle(t: Trip) {
  return `${placeShort(t.search.from)} to ${placeShort(t.search.to)}`;
}
export function tripDates(t: Trip) {
  return t.ret && t.search.ret ? `${mediumDate(t.search.depart)} – ${mediumDate(t.search.ret)}` : mediumDate(t.search.depart);
}
export function tripTotal(t: Trip) {
  const extras = t.stays.reduce((s, x) => s + x.total, 0) + t.cars.reduce((s, x) => s + x.total, 0);
  return { flights: t.total, extras, all: t.total + extras, label: money(t.total + extras) };
}

export function Stars({ n }: { n: number }) {
  return (
    <span className="stars" aria-label={`${n}-star category`}>
      {'★'.repeat(n)}
      <span className="stars-off" aria-hidden="true">
        {'★'.repeat(5 - n)}
      </span>
    </span>
  );
}
