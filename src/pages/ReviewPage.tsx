import React, { useState } from 'react';
import { BookingHeader, SiteFooter } from '../components/Chrome';
import { FareConditionsButton, FareFacts, JourneySummary, RouteHeading, Timeline, WarningList, cabinName } from '../components/FlightBits';
import { CostBreakdown } from '../components/Costs';
import { chosen, Choice, Leg, money, progress, seatedCount, useBooking } from '../lib/booking';
import { offerOf, seatPosition } from '../lib/data';
import { fullDate } from '../lib/dates';
import { itineraryWarnings, pairWarnings } from '../lib/warnings';
import { Link, Redirect, useRouter } from '../lib/router';

/** One chosen journey: summary, timeline on demand, fare facts, price basis and its warnings. */
export function LegCard({ leg, choice, seats, changeTo, showSeats, showWarnings = true }: { leg: Leg; choice: Choice; seats?: string[]; changeTo?: string; showSeats?: boolean; showWarnings?: boolean }) {
  const { booking } = useBooking();
  const [showTimeline, setShowTimeline] = useState(false);
  const it = chosen(choice);
  if (!it) return null;
  const offer = offerOf(it, choice.cabin);
  const seated = booking.search ? seatedCount(booking.search.pax) : 1;
  const seatList = (seats ?? []).filter(Boolean);
  return (
    <section className="leg-card" aria-label={leg === 'outbound' ? 'Outbound journey' : 'Return journey'}>
      <div className="leg-card-head">
        <div>
          <p className="leg-kind">{leg === 'outbound' ? 'Outbound' : 'Return'}</p>
          <RouteHeading from={it.from} to={it.to} level={3} />
        </div>
        {changeTo && (
          <Link to={changeTo} className="btn btn-small btn-outline">
            Change<span className="sr-only"> {leg} journey</span>
          </Link>
        )}
      </div>
      <div className="leg-card-body">
        <div>
          <p className="leg-date">{fullDate(it.date)}</p>
          <JourneySummary it={it} big />
          <button type="button" className="link-btn" aria-expanded={showTimeline} onClick={() => setShowTimeline((v) => !v)}>
            {showTimeline ? 'Hide each flight' : 'Show each flight and layover'}
          </button>
        </div>
        <div className="leg-cabin">
          <p className="cabin-name">{cabinName(choice.cabin)}</p>
          {offer && <FareFacts offer={offer} />}
          {offer && <FareConditionsButton offer={offer} />}
          {showSeats && (
            <p className="seat-line">
              {it.selfTransfer
                ? 'Seats: allocated at check-in (separate tickets)'
                : seatList.length
                  ? `Seat${seatList.length > 1 ? 's' : ''}: ${seatList.map((x) => `${x} (${seatPosition(x).toLowerCase()})`).join(', ')}`
                  : 'No seats chosen'}
              {!it.selfTransfer && it.segments.length > 1 && seatList.length > 0 && <span className="muted small"> · first flight; connecting-flight seats are allocated at check-in</span>}
            </p>
          )}
        </div>
        {offer && (
          <p className="leg-price">
            {money(offer.price * seated)}
            <span className="per">
              {money(offer.price)} per person × {seated}
            </span>
          </p>
        )}
      </div>
      {showTimeline && (
        <div className="leg-timeline">
          <Timeline it={it} />
        </div>
      )}
      {showWarnings && <WarningList warnings={itineraryWarnings(it)} />}
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
  const pw = pairWarnings(chosen(booking.outbound), round ? chosen(booking.ret) : undefined);
  return (
    <>
      <BookingHeader step={1} />
      <main id="main" className="wrap page-review">
        <p className="eyebrow">Step 1 of 5 · Check your flights</p>
        <h1>Review flights</h1>
        <div className="summary-layout">
          <div>
            <LegCard leg="outbound" choice={booking.outbound!} changeTo="/flights/outbound" />
            {round && booking.ret && <LegCard leg="return" choice={booking.ret} changeTo="/flights/return" />}
            {pw.length > 0 && (
              <section className="panel">
                <h2>About the whole trip</h2>
                <WarningList warnings={pw} />
              </section>
            )}
          </div>
          <aside className="summary-side">
            <CostBreakdown title="Estimated cost so far" />
            <button type="button" className="btn btn-primary btn-lg btn-block" onClick={() => navigate('/seats/outbound')}>
              Continue to seats
            </button>
          </aside>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
