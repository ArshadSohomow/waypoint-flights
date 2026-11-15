import React, { useState } from 'react';
import { BookingHeader, SiteFooter } from '../components/Chrome';
import { Dialog } from '../components/Dialog';
import { CostBreakdown } from '../components/Costs';
import { LegCard } from './ReviewPage';
import { money, picks, progress, seatedCount, useBooking } from '../lib/booking';
import { EXTRA_BAG_PRICE, EXTRAS, FRONT_ROW_PRICE, milesFor, offerOf, SERVICES } from '../lib/data';
import { bagsText } from '../components/FlightBits';
import { Link, Redirect, useRouter } from '../lib/router';

export function SummaryPage() {
  const { booking, dispatch } = useBooking();
  const { navigate } = useRouter();
  const [service, setService] = useState<string | null>(null);
  const s = booking.search;
  const p = progress(booking);
  if (!s) return <Redirect to="/" />;
  if (!p.flights) return <Redirect to="/review" />;
  if (!p.seats) return <Redirect to={booking.seats.outbound.some(Boolean) || !booking.ret ? '/seats/return' : '/seats/outbound'} />;

  const ps = picks(booking);
  const seated = seatedCount(s.pax);
  const economyJourneys = ps.filter((x) => x.cabin === 'economy').length;
  const miles = ps.reduce((sum, x) => sum + milesFor(x.it), 0);
  const svc = SERVICES.find((x) => x.id === service);

  return (
    <>
      <BookingHeader step={3} />
      <main id="main" className="wrap page-summary">
        <p className="eyebrow">Step 3 of 5</p>
        <h1>Bags and extras</h1>
        <p className="lead">Everything here is optional. The estimate on the right updates as you choose.</p>
        <div className="summary-layout">
          <div className="summary-main">
            <section className="panel" aria-labelledby="bags-h">
              <h2 id="bags-h">Checked bags</h2>
              <p className="muted">You set this on the flights page. Change it here if your plans have changed. It applies to every traveller with a seat, on each journey.</p>
              <fieldset className="bags-pick">
                <legend>Checked bags per traveller</legend>
                <div className="seg">
                  {[0, 1, 2].map((b) => (
                    <label key={b} className={booking.bags === b ? 'on' : ''}>
                      <input type="radio" name="bags-summary" value={b} checked={booking.bags === b} onChange={() => dispatch({ type: 'bags', bags: b })} />
                      {b}
                    </label>
                  ))}
                </div>
              </fieldset>
              <ul className="plain bag-lines">
                {ps.map((x) => {
                  const o = offerOf(x.it, x.cabin);
                  if (!o) return null;
                  const extra = Math.max(0, booking.bags - o.bags.checkedBags);
                  return (
                    <li key={x.label}>
                      <strong>{x.label}:</strong> fare includes {bagsText(o.bags).checked.toLowerCase()} and {bagsText(o.bags).cabin.toLowerCase()} per traveller.{' '}
                      {extra > 0 ? (
                        <span>
                          Adding {extra * seated} bag{extra * seated > 1 ? 's' : ''} at {money(EXTRA_BAG_PRICE)} each = <strong>{money(extra * seated * EXTRA_BAG_PRICE)}</strong>.
                        </span>
                      ) : (
                        <span>No extra bag charge.</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>

            <section className="panel" aria-labelledby="extras-h">
              <h2 id="extras-h">Extras</h2>
              <ul className="extras">
                <li>
                  <div>
                    <span className="extra-name">Front Row seats</span>
                    <span className="extra-note">
                      {money(FRONT_ROW_PRICE)} per seat, per Economy journey. Chosen on the seat map.
                    </span>
                  </div>
                  <Link to="/seats/outbound" className="btn btn-small btn-outline">
                    Change seats
                  </Link>
                </li>
                {EXTRAS.map((e) => {
                  const on = booking.extras[e.id];
                  if (!economyJourneys)
                    return (
                      <li key={e.id}>
                        <div>
                          <span className="extra-name">{e.name}</span>
                          <span className="extra-note">{e.note}</span>
                        </div>
                        <span className="included">✓ Included with your cabin</span>
                      </li>
                    );
                  return (
                    <li key={e.id}>
                      <div>
                        <span className="extra-name">{e.name}</span>
                        <span className="extra-note">
                          {e.note} {money(e.price)} {e.basis}
                          {economyJourneys < ps.length ? ' (already included on your other journey)' : ''}. Adds {money(e.price * seated * economyJourneys)} for your party.
                        </span>
                      </div>
                      <button type="button" className={`btn btn-small ${on ? 'btn-selected' : 'btn-outline'}`} aria-pressed={on} onClick={() => dispatch({ type: 'extra', id: e.id, on: !on })}>
                        {on ? '✓ Added' : 'Add'}
                        <span className="sr-only"> {e.name}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>

            <section className="panel" aria-labelledby="svc-h">
              <h2 id="svc-h">Services and information</h2>
              <ul className="extras">
                {SERVICES.map((x) => (
                  <li key={x.id}>
                    <span className="extra-name">{x.name}</span>
                    <button type="button" className="btn btn-small btn-ghost" onClick={() => setService(x.id)}>
                      Read more<span className="sr-only"> about {x.name}</span>
                    </button>
                  </li>
                ))}
              </ul>
              <p className="muted small">About {miles.toLocaleString('en-GB')} miles flown per traveller. Earning miles isn’t part of this demo.</p>
            </section>

            <h2 className="sub">Your flights</h2>
            {booking.outbound && <LegCard leg="outbound" choice={booking.outbound} seats={booking.seats.outbound} changeTo="/flights/outbound" showSeats showWarnings={false} />}
            {s.tripType === 'round' && booking.ret && <LegCard leg="return" choice={booking.ret} seats={booking.seats.return} changeTo="/flights/return" showSeats showWarnings={false} />}
          </div>

          <aside className="summary-side">
            <CostBreakdown title="Estimated trip cost" />
            <button type="button" className="btn btn-primary btn-lg btn-block" onClick={() => navigate('/passengers')}>
              Continue to passenger details
            </button>
          </aside>
        </div>
      </main>
      <SiteFooter />
      <Dialog open={!!svc} onClose={() => setService(null)} title={svc?.name ?? ''}>
        <p>{svc?.body}</p>
      </Dialog>
    </>
  );
}
