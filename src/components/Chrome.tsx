import React, { useEffect, useRef, useState } from 'react';
import { Link, useRouter } from '../lib/router';
import { Dialog } from './Dialog';
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

export const NAV: { name: string; to: string }[] = [
  { name: 'Book', to: '/' },
  { name: 'Manage', to: '/manage' },
  { name: 'Check-in', to: '/check-in' },
  { name: 'Stays', to: '/hotels' },
  { name: 'Car hire', to: '/cars' },
  { name: 'Discover', to: '/discover' },
  { name: 'Support', to: '/support' },
];

/** Where the in-progress booking was last seen, so "Back to your booking" can return there. */
export const LAST_STEP_KEY = 'wp-last-step';
export function lastBookingStep(): string | null {
  try {
    return sessionStorage.getItem(LAST_STEP_KEY);
  } catch {
    return null;
  }
}

function ResumeBanner() {
  const { booking } = useBooking();
  const { path } = useRouter();
  const last = lastBookingStep();
  if (!booking.search || booking.confirmation || !last || path === '/') return null;
  return (
    <div className="resume-bar" role="region" aria-label="Booking in progress">
      <div className="wrap resume-inner">
        <p>
          <Beacon size={18} /> Your {placeShort(booking.search.from)} to {placeShort(booking.search.to)} booking is saved.
        </p>
        <Link to={last} className="btn btn-small btn-primary">
          Back to your booking
        </Link>
      </div>
    </div>
  );
}

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [langOpen, setLangOpen] = React.useState(false);
  const { path } = useRouter();
  const section = '/' + (path.split('/')[1] ?? '');
  useEffect(() => setMenuOpen(false), [path]);
  return (
    <header className="site-header">
      <div className="bar wrap">
        <Logo />
        <div className="header-actions">
          <Link to="/search" className="btn btn-ghost hide-sm" aria-current={section === '/search' ? 'page' : undefined}>
            <SearchIcon /> Search
          </Link>
          <button type="button" className="btn btn-ghost hide-sm" onClick={() => setLangOpen(true)}>
            <GlobeIcon /> EN · £
          </button>
          <Link to="/account" className="btn btn-outline" aria-current={section === '/account' ? 'page' : undefined}>
            Your trips
          </Link>
          <button type="button" className="icon-btn show-sm" aria-expanded={menuOpen} aria-controls="main-nav" aria-label="Menu" onClick={() => setMenuOpen((o) => !o)}>
            ☰
          </button>
        </div>
      </div>
      <nav id="main-nav" className={`main-nav ${menuOpen ? 'open' : ''}`} aria-label="Main">
        <ul className="wrap">
          {NAV.map((n) => (
            <li key={n.to}>
              <Link to={n.to} aria-current={section === n.to || (n.to === '/' && path === '/') ? 'page' : undefined}>
                {n.name}
              </Link>
            </li>
          ))}
          <li className="show-sm">
            <Link to="/search">Search the site</Link>
          </li>
          <li className="show-sm">
            <button type="button" onClick={() => setLangOpen(true)}>
              Language and currency
            </button>
          </li>
        </ul>
      </nav>
      <ResumeBanner />
      <LanguageDialog open={langOpen} onClose={() => setLangOpen(false)} />
    </header>
  );
}

const LANGS = [
  { code: 'en-GB', name: 'English (UK)', native: 'English (UK)', ready: true },
  { code: 'es', name: 'Spanish', native: 'Español', ready: false },
  { code: 'fr', name: 'French', native: 'Français', ready: false },
  { code: 'de', name: 'German', native: 'Deutsch', ready: false },
  { code: 'it', name: 'Italian', native: 'Italiano', ready: false },
  { code: 'pt', name: 'Portuguese', native: 'Português', ready: false },
];

function LanguageDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onClose={onClose} title="Language and currency" footer={<button type="button" className="btn btn-primary" onClick={onClose}>Done</button>}>
      <fieldset className="lang-list">
        <legend>Language</legend>
        {LANGS.map((l) => (
          <label key={l.code} className={`radio lang ${l.ready ? '' : 'not-ready'}`}>
            <input type="radio" name="lang" checked={l.ready} disabled={!l.ready} readOnly />
            <span lang={l.code}>{l.native}</span>
            {!l.ready && <span className="muted small">Translation not available yet</span>}
          </label>
        ))}
      </fieldset>
      <p>
        <strong>Currency:</strong> pounds sterling (GBP, £). All sample prices are shown in pounds.
      </p>
      <p className="muted small">The demo is in English only. Other languages are listed so you can see where they’d be offered.</p>
    </Dialog>
  );
}

function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" aria-hidden="true">
      <circle cx="8.5" cy="8.5" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M13 13l4.5 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
function GlobeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" aria-hidden="true">
      <circle cx="10" cy="10" r="7.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M2.5 10h15M10 2.5c2.2 2.3 2.2 12.7 0 15M10 2.5c-2.2 2.3-2.2 12.7 0 15" fill="none" stroke="currentColor" strokeWidth="1.4" />
    </svg>
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
  const { path } = useRouter();
  useEffect(() => {
    try {
      sessionStorage.setItem(LAST_STEP_KEY, path);
    } catch {
      /* ignore */
    }
  }, [path]);
  return (
    <header className="site-header booking-header">
      <div className="bar wrap">
        <Logo />
        <Stepper current={step} />
        <Link to="/account" className="btn btn-outline hide-sm" title="Your booking stays saved while you look">
          Your trips
        </Link>
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
            <span className="trip-total-amount hum" key={total}>
              {lines.length ? money(total) : 'Choose a flight'}
            </span>
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

const FOOTER: { title: string; links: [string, string][] }[] = [
  { title: 'Fly', links: [['Book a flight', '/'], ['Discover destinations', '/discover']] },
  { title: 'Your trip', links: [['Manage booking', '/manage'], ['Online check-in', '/check-in'], ['Your trips', '/account']] },
  { title: 'Stay and travel', links: [['Hotels and stays', '/hotels'], ['Car hire', '/cars']] },
  { title: 'Help', links: [['Help centre', '/support'], ['Search the site', '/search']] },
];

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="wrap">
        <nav className="footer-nav" aria-label="Site map">
          {FOOTER.map((c) => (
            <div key={c.title}>
              <h2 className="footer-h">{c.title}</h2>
              <ul>
                {c.links.map(([l, to]) => (
                  <li key={to}>
                    <Link to={to}>{l}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
        <div className="footer-inner">
          <p>
            <strong>{BRAND}</strong> is a demonstration site. {DATA_STATUS_LABEL}; no real bookings, tickets or payments are made.
          </p>
          <AmbientControls />
        </div>
      </div>
    </footer>
  );
}
