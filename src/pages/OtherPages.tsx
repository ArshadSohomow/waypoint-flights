import React from 'react';
import { SiteHeader, SiteFooter } from '../components/Chrome';
import { SkyHero } from '../components/Sky';
import { LegCard } from './ReviewPage';
import { money, useBooking } from '../lib/booking';
import { Link, Redirect, useRouter } from '../lib/router';
import { saveTrip, tripFromBooking } from '../lib/trips';
import { placeAirports, placeByCode } from '../lib/data';

export function ConfirmationPage() {
  const { booking, dispatch } = useBooking();
  const { navigate } = useRouter();
  const c = booking.confirmation;
  // Keep a copy in this browser so Manage booking, Check-in, Stays and Car hire can find it.
  React.useEffect(() => {
    const t = tripFromBooking(booking);
    if (t) saveTrip(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [c?.ref]);
  if (!c || !booking.search) return <Redirect to="/" />;
  const city = placeByCode(booking.search.to)?.city ?? '';
  const lead = booking.passengers[0];
  return (
    <>
      <SiteHeader />
      <SkyHero compact />
      <main id="main" className="wrap page-confirm narrow">
        <div className="confirm-hero">
          <p className="tick" aria-hidden="true">✓</p>
          <h1>Booking confirmed</h1>
          <p className="ref">
            Booking reference <strong>{c.ref}</strong>
          </p>
          <p>
            Thanks{lead ? `, ${lead.firstName}` : ''}. In the live site a confirmation would go to <strong>{booking.contact.email}</strong>.
          </p>
          <p className="muted">Demo booking: nothing was charged and no tickets were issued.</p>
        </div>
        <LegCard leg="outbound" choice={booking.outbound!} seats={booking.seats.outbound} showSeats />
        {booking.search.tripType === 'round' && booking.ret && <LegCard leg="return" choice={booking.ret} seats={booking.seats.return} showSeats />}
        <section className="panel">
          <h2>Passengers</h2>
          <ul className="plain">
            {booking.passengers.map((p, i) => (
              <li key={i}>
                {[p.title, p.firstName, p.lastName].filter(Boolean).join(' ')}
              </li>
            ))}
          </ul>
          <p className="total-line">
            Demo total <strong>{money(c.total)}</strong> <span className="muted small">(nothing was charged)</span>
          </p>
        </section>
        <section className="panel next-steps" aria-labelledby="next-h">
          <h2 id="next-h">Complete your trip</h2>
          <p className="muted">Your booking is saved in this browser. Find it any time with reference {c.ref}.</p>
          <ul className="plain hub-tiles">
            <li>
              <Link to={`/hotels?ref=${c.ref}`} className="hub-tile">
                <span className="hub-ico" aria-hidden="true">⌂</span>
                <span className="hub-tile-text">
                  <strong>Add a stay in {city}</strong>
                  <span>Sample hotels for your dates</span>
                </span>
              </Link>
            </li>
            <li>
              <Link to={`/cars?ref=${c.ref}`} className="hub-tile">
                <span className="hub-ico" aria-hidden="true">⛟</span>
                <span className="hub-tile-text">
                  <strong>Hire a car</strong>
                  <span>Pick up at {placeAirports(booking.search.to).length > 1 ? 'your arrival airport' : placeAirports(booking.search.to)[0]}</span>
                </span>
              </Link>
            </li>
            <li>
              <Link to={`/manage?ref=${c.ref}`} className="hub-tile">
                <span className="hub-ico" aria-hidden="true">☰</span>
                <span className="hub-tile-text">
                  <strong>Manage booking</strong>
                  <span>Check in, print or make changes</span>
                </span>
              </Link>
            </li>
          </ul>
        </section>
        <div className="page-actions">
          <button
            type="button"
            className="btn btn-primary btn-lg"
            onClick={() => {
              dispatch({ type: 'reset' });
              navigate('/');
            }}
          >
            Book another trip
          </button>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

export function NotFoundPage() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="wrap page-error narrow">
        <h1>Page not found</h1>
        <p>We couldn’t find that page. It may have moved, or the address may be mistyped.</p>
        <p>
          <Link to="/" className="btn btn-primary">Search flights</Link>
        </p>
      </main>
      <SiteFooter />
    </>
  );
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(err: unknown) {
    console.error(err);
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <main id="main" className="wrap page-error narrow">
        <h1>Something went wrong</h1>
        <p>Sorry, the page hit an unexpected error. Your choices are saved in this browser tab.</p>
        <p>
          <a className="btn btn-primary" href="/">Start again</a>{' '}
          <button type="button" className="btn btn-ghost" onClick={() => window.location.reload()}>Reload page</button>
        </p>
      </main>
    );
  }
}

