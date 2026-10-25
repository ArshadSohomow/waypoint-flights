import React from 'react';
import { Link, useRouter } from '../lib/router';
import { useComingSoon } from './Dialog';
import { useBooking, priceTotal, money, totalPax } from '../lib/booking';
import { airportByCode } from '../lib/data';
import { longDate } from '../lib/dates';

export const BRAND = 'Waypoint';

function Logo() {
  return (
    <Link to="/" className="logo" aria-label={`${BRAND} home`}>
      <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true">
        <circle cx="14" cy="14" r="13" fill="var(--accent)" />
        <path d="M7 16.5 21 9l-4.5 12-2.6-5.2z" fill="#fff" />
      </svg>
      <span>{BRAND}</span>
    </Link>
  );
}

export function SiteHeader() {
  const soon = useComingSoon();
  const [menuOpen, setMenuOpen] = React.useState(false);
  return (
    <header className="site-header">
      <div className="bar wrap">
        <Logo />
        <div className="header-actions">
          <button type="button" className="btn btn-ghost hide-sm" onClick={() => soon('Site search')}>
            Search
          </button>
          <button type="button" className="btn btn-ghost hide-sm" onClick={() => soon('Language options')}>
            Language
          </button>
          <button type="button" className="btn btn-outline" onClick={() => soon('Login')}>
            Login
          </button>
          <button type="button" className="icon-btn show-sm" aria-expanded={menuOpen} aria-controls="main-nav" aria-label="Menu" onClick={() => setMenuOpen((o) => !o)}>
            ☰
          </button>
        </div>
      </div>
      <nav id="main-nav" className={`main-nav ${menuOpen ? 'open' : ''}`} aria-label="Main">
        <ul className="wrap">
          <li>
            <Link to="/" aria-current="page">
              Book
            </Link>
          </li>
          {['Manage', 'Discover', 'Support'].map((n) => (
            <li key={n}>
              <button type="button" onClick={() => soon(n === 'Manage' ? 'Manage booking' : n)}>
                {n}
              </button>
            </li>
          ))}
          <li className="show-sm">
            <button type="button" onClick={() => soon('Site search')}>
              Search
            </button>
          </li>
          <li className="show-sm">
            <button type="button" onClick={() => soon('Language options')}>
              Language
            </button>
          </li>
        </ul>
      </nav>
    </header>
  );
}

export const STEPS = ['Flights', 'Seats', 'Summary', 'Passengers', 'Payment'];

function Stepper({ current }: { current: number }) {
  return (
    <ol className="stepper" aria-label="Booking progress">
      {STEPS.map((s, i) => {
        const n = i + 1;
        const state = n < current ? 'done' : n === current ? 'current' : 'todo';
        return (
          <li key={s} className={state} aria-current={state === 'current' ? 'step' : undefined}>
            <span className="dot" aria-hidden="true">
              {state === 'done' ? '✓' : n}
            </span>
            <span className="step-name">
              {s}
              <span className="sr-only">{state === 'done' ? ', completed' : state === 'todo' ? ', not started' : ''}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export function BookingHeader({ step }: { step: number }) {
  const soon = useComingSoon();
  return (
    <header className="site-header booking-header">
      <div className="bar wrap">
        <Logo />
        <Stepper current={step} />
        <button type="button" className="btn btn-outline" onClick={() => soon('Login')}>
          Login
        </button>
      </div>
      <TripBar />
    </header>
  );
}

function TripBar() {
  const { booking } = useBooking();
  const { navigate } = useRouter();
  const s = booking.search;
  if (!s) return null;
  const from = airportByCode(s.from);
  const to = airportByCode(s.to);
  const n = totalPax(s.pax);
  return (
    <div className="trip-bar">
      <div className="wrap trip-bar-inner">
        <div>
          <p className="trip-route">
            {from?.city} ({s.from}) <span aria-hidden="true">{s.tripType === 'round' ? '⇄' : '→'}</span>
            <span className="sr-only">{s.tripType === 'round' ? ' to and from ' : ' to '}</span> {to?.city} ({s.to})
          </p>
          <p className="trip-meta">
            <span>{s.tripType === 'round' && s.ret ? `${longDate(s.depart)} – ${longDate(s.ret)}` : longDate(s.depart)}</span>
            <span>
              {n} passenger{n === 1 ? '' : 's'}
            </span>
            <span>{s.tripType === 'round' ? 'Round trip' : 'One way'}</span>
          </p>
          <button type="button" className="btn btn-small btn-outline" onClick={() => navigate('/')}>
            Edit search
          </button>
        </div>
        <p className="trip-total" aria-live="polite">
          <span className="trip-total-label">Total</span> {money(priceTotal(booking))}
        </p>
      </div>
    </div>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="wrap">
        <p>
          <strong>{BRAND}</strong> is a demonstration site. Flights, prices and seats are sample data; no real bookings or payments are made.
        </p>
      </div>
    </footer>
  );
}
