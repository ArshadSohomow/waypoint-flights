import React, { useEffect, useRef, useState } from 'react';
import { Link, useRouter } from '../lib/router';
import { useComingSoon } from './Dialog';
import { costs, money, progress, totalPax, useBooking } from '../lib/booking';
import { placeShort, DATA_STATUS_LABEL } from '../lib/data';
import { mediumDate } from '../lib/dates';
import { CostBreakdown, SelectedJourneys } from './Costs';
import { AmbientControls, Beacon } from './Sky';

export const BRAND = 'Waypoint';

function Logo() {
  return (
    <Link to="/" className="logo" aria-label={`${BRAND} home`}>
      <Beacon size={28} />
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

export const STEPS: { name: string; to: string }[] = [
  { name: 'Flights', to: '/flights/outbound' },
  { name: 'Seats', to: '/seats/outbound' },
  { name: 'Bags & extras', to: '/summary' },
  { name: 'Passengers', to: '/passengers' },
  { name: 'Review', to: '/payment' },
];

function Stepper({ current }: { current: number }) {
  const { booking } = useBooking();
  const p = progress(booking);
  const reached = [true, p.flights, p.flights && p.seats, p.flights && p.seats, p.flights && p.seats && p.passengers];
  return (
    <nav aria-label="Booking progress" className="stepper-nav">
      <ol className="stepper">
        {STEPS.map((s, i) => {
          const n = i + 1;
          const state = n < current ? 'done' : n === current ? 'current' : 'todo';
          const inner = (
            <>
              <span className="dot" aria-hidden="true">
                {state === 'done' ? '✓' : n}
              </span>
              <span className="step-name">
                {s.name}
                <span className="sr-only">{state === 'done' ? ', completed' : state === 'todo' ? ', not started' : ', current step'}</span>
              </span>
            </>
          );
          return (
            <li key={s.name} className={state} aria-current={state === 'current' ? 'step' : undefined}>
              {state === 'done' && reached[i] ? (
                <Link to={s.to} className="step-link">
                  {inner}
                </Link>
              ) : (
                <span className="step-link">{inner}</span>
              )}
            </li>
          );
        })}
      </ol>
      <p className="step-mobile" aria-hidden="true">
        Step {current} of {STEPS.length}: {STEPS[current - 1].name}
      </p>
    </nav>
  );
}

export function BookingHeader({ step }: { step: number }) {
  const soon = useComingSoon();
  return (
    <header className="site-header booking-header">
      <div className="bar wrap">
        <Logo />
        <Stepper current={step} />
        <button type="button" className="btn btn-outline hide-sm" onClick={() => soon('Login')}>
          Login
        </button>
      </div>
      <TripBar />
      <Notice />
    </header>
  );
}

function TripBar() {
  const { booking } = useBooking();
  const { navigate, path } = useRouter();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  useEffect(() => setOpen(false), [path]);
  const s = booking.search;
  if (!s) return null;
  const n = totalPax(s.pax);
  const { total, lines } = costs(booking);
  return (
    <div className="trip-bar">
      <div className="wrap trip-bar-inner">
        <div className="trip-bar-main">
          <p className="trip-route">
            {placeShort(s.from)} <span aria-hidden="true">{s.tripType === 'round' ? '⇄' : '→'}</span>
            <span className="sr-only">{s.tripType === 'round' ? ' to and from ' : ' to '}</span> {placeShort(s.to)}
          </p>
          <p className="trip-meta">
            <span>{s.tripType === 'round' && s.ret ? `${mediumDate(s.depart)} – ${mediumDate(s.ret)}` : mediumDate(s.depart)}</span>
            <span>
              {n} traveller{n === 1 ? '' : 's'}
            </span>
            <span>{s.tripType === 'round' ? 'Round trip' : 'One way'}</span>
          </p>
          <button type="button" className="btn btn-small btn-outline" onClick={() => navigate('/')}>
            <span>
              Edit search<span className="hide-sm">: airports, dates or travellers</span>
            </span>
          </button>
        </div>
        <div className="trip-bar-total">
          <p className="trip-total" aria-live="polite">
            <span className="trip-total-label">Estimated total{lines.length ? ` · ${n} traveller${n === 1 ? '' : 's'}` : ''}</span>
            <span className="trip-total-amount">{lines.length ? money(total) : 'Choose a flight'}</span>
          </p>
          <button type="button" className="link-btn" aria-expanded={open} aria-controls="trip-panel" onClick={() => setOpen((o) => !o)}>
            {open ? 'Hide trip summary' : 'Show trip summary'}
          </button>
        </div>
      </div>
      {open && (
        <div id="trip-panel" className="trip-panel" ref={panelRef} role="region" aria-label="Trip summary">
          <div className="wrap trip-panel-inner">
            <div>
              <h2 className="panel-title">Your trip so far</h2>
              <SelectedJourneys />
            </div>
            <CostBreakdown />
            <button type="button" className="close-btn trip-panel-close" onClick={() => setOpen(false)}>
              <span aria-hidden="true">✕</span> Close summary
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Notice() {
  const { booking, dispatch } = useBooking();
  if (!booking.notice) return null;
  return (
    <div className="notice-bar" role="status">
      <div className="wrap notice-inner">
        <p>{booking.notice}</p>
        <button type="button" className="close-btn" onClick={() => dispatch({ type: 'clearNotice' })}>
          <span aria-hidden="true">✕</span> Dismiss
        </button>
      </div>
    </div>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="wrap footer-inner">
        <p>
          <strong>{BRAND}</strong> is a demonstration site. {DATA_STATUS_LABEL}; no real bookings, tickets or payments are made.
        </p>
        <AmbientControls />
      </div>
    </footer>
  );
}
