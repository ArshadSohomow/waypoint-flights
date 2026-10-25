import React from 'react';
import { BookingHeader, SiteFooter } from '../components/Chrome';
import { Times, StopInfo, FlightDetailsButton, RouteHeading } from '../components/FlightBits';
import { chosenFlight, Choice, Leg, money, priceTotal, progress, seatedCount, useBooking } from '../lib/booking';
import { CABINS } from '../lib/data';
import { shortDate } from '../lib/dates';
import { Link, Redirect, useRouter } from '../lib/router';

export function LegCard({ leg, choice, seats, changeTo, showSeats }: { leg: Leg; choice: Choice; seats?: string[]; changeTo?: string; showSeats?: boolean }) {
  const { booking } = useBooking();
  const f = chosenFlight(choice);
  if (!f) return null;
  const cabin = CABINS.find((c) => c.id === choice.cabin)!;
  const seated = booking.search ? seatedCount(booking.search.pax) : 1;
  const seatList = (seats ?? []).filter(Boolean);
  return (
    <section className="leg-card" aria-label={leg === 'outbound' ? 'Outbound flight' : 'Return flight'}>
      <div className="leg-card-head">
        <RouteHeading from={f.from} to={f.to} />
        {changeTo && (
          <Link to={changeTo} className="link-btn">
            Change<span className="sr-only"> {leg} flight</span>
          </Link>
        )}
      </div>
      <div className="leg-card-body">
        <div>
          <p className="leg-date">{shortDate(f.date)}</p>
          <Times f={f} big />
          <p className="operated">Flight {f.number} · Operated by Waypoint Air</p>
        </div>
        <div className="leg-mid">
          <StopInfo f={f} />
          <FlightDetailsButton f={f} />
        </div>
        <div className="leg-cabin">
          <p className="cabin-name">{cabin.name}</p>
          {showSeats && <p className="seat-line">{seatList.length ? `Seat${seatList.length > 1 ? 's' : ''}: ${seatList.join(', ')}` : 'No seats chosen'}</p>}
        </div>
        <p className="leg-price">
          {money(f.fares[choice.cabin] * seated)}
          {seated > 1 && <span className="per">{money(f.fares[choice.cabin])} × {seated}</span>}
        </p>
      </div>
    </section>
  );
}

export function ReviewPage() {
  const { booking } = useBooking();
  const { navigate } = useRouter();
  const p = progress(booking);
  if (!booking.search) return <Redirect to="/" />;
  if (!p.flights) return <Redirect to={p.outbound ? '/flights/return' : '/flights/outbound'} />;
  const round = booking.search.tripType === 'round';
  return (
    <>
      <BookingHeader step={1} />
      <main id="main" className="wrap page-review narrow">
        <p className="eyebrow">Step 1 of 5 · Review</p>
        <h1>Review flights</h1>
        <LegCard leg="outbound" choice={booking.outbound!} changeTo="/flights/outbound" />
        {round && booking.ret && <LegCard leg="return" choice={booking.ret} changeTo="/flights/return" />}
        <div className="page-actions">
          <p className="total-line">
            Total <strong>{money(priceTotal(booking))}</strong>
          </p>
          <button type="button" className="btn btn-primary btn-lg" onClick={() => navigate('/seats/outbound')}>
            Continue to seats
          </button>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

