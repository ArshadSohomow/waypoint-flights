import React from 'react';
import { SiteHeader, SiteFooter } from '../components/Chrome';
import { SkyHero } from '../components/Sky';
import { LegCard } from './ReviewPage';
import { money, useBooking } from '../lib/booking';
import { Link, Redirect, useRouter } from '../lib/router';

export function ConfirmationPage() {
  const { booking, dispatch } = useBooking();
  const { navigate } = useRouter();
  const c = booking.confirmation;
  if (!c || !booking.search) return <Redirect to="/" />;
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

