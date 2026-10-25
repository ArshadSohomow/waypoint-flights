import React, { useState } from 'react';
import { BookingHeader, SiteFooter } from '../components/Chrome';
import { Dialog } from '../components/Dialog';
import { FareConditionsButton } from '../components/FlightBits';
import { LegCard } from './ReviewPage';
import { extraFlights, money, priceLines, priceTotal, progress, seatedLabels, useBooking } from '../lib/booking';
import { CABINS, EXTRAS, milesFor, seatPosition, SERVICES } from '../lib/data';
import { Link, Redirect, useRouter } from '../lib/router';

export function PriceBreakdown() {
  const { booking } = useBooking();
  const lines = priceLines(booking);
  return (
    <div className="breakdown">
      <table>
        <caption className="sr-only">Price breakdown</caption>
        <tbody>
          {lines.map((l) => (
            <tr key={l.label}>
              <th scope="row">{l.label}</th>
              <td>{money(l.amount)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row">Total</th>
            <td>{money(priceTotal(booking))}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

export function SummaryPage() {
  const { booking, dispatch } = useBooking();
  const { navigate } = useRouter();
  const [service, setService] = useState<string | null>(null);
  const s = booking.search;
  const p = progress(booking);
  if (!s) return <Redirect to="/" />;
  if (!p.flights) return <Redirect to="/review" />;
  if (!p.seats) return <Redirect to={booking.seats.outbound.filter(Boolean).length ? '/seats/return' : '/seats/outbound'} />;

  const round = s.tripType === 'round';
  const labels = seatedLabels(s.pax);
  const legs = round ? 2 : 1;
  const cabinIds = Array.from(new Set([booking.outbound!.cabin, ...(round && booking.ret ? [booking.ret.cabin] : [])]));
  const miles = milesFor(s.from, s.to) * legs;
  const svc = SERVICES.find((x) => x.id === service);

  return (
    <>
      <BookingHeader step={3} />
      <main id="main" className="wrap page-summary">
        <p className="eyebrow">Step 3 of 5</p>
        <h1>Booking summary</h1>
        <div className="summary-layout">
          <div className="summary-main">
            <h2 className="sub">Departure flight</h2>
            <LegCard leg="outbound" choice={booking.outbound!} seats={booking.seats.outbound} changeTo="/flights/outbound" showSeats />
            {round && booking.ret && (
              <>
                <h2 className="sub">Return flight</h2>
                <LegCard leg="return" choice={booking.ret} seats={booking.seats.return} changeTo="/flights/return" showSeats />
              </>
            )}

            <div className="extras-grid">
              <section className="panel" aria-labelledby="extras-h">
                <h2 id="extras-h">More features</h2>
                <ul className="extras">
                  <li>
                    <div>
                      <span className="extra-name">Front Row seats</span>
                      <span className="extra-note">From £18 per seat · choose on the seat map</span>
                    </div>
                    <Link to="/seats/outbound" className="btn btn-small btn-outline">
                      Change seats
                    </Link>
                  </li>
                  {EXTRAS.map((e) => {
                    const on = booking.extras[e.id];
                    if (extraFlights(booking, e.id) === 0)
                      return (
                        <li key={e.id}>
                          <div>
                            <span className="extra-name">{e.name}</span>
                            <span className="extra-note">Included with your fare</span>
                          </div>
                          <span className="included">Included ✓</span>
                        </li>
                      );
                    return (
                      <li key={e.id}>
                        <div>
                          <span className="extra-name">{e.name}</span>
                          <span className="extra-note">
                            {money(e.price)} {e.per}
                          </span>
                        </div>
                        <button
                          type="button"
                          className={`btn btn-small ${on ? 'btn-primary' : 'btn-outline'}`}
                          aria-pressed={on}
                          onClick={() => dispatch({ type: 'extra', id: e.id, on: !on })}
                        >
                          {on ? 'Added ✓' : 'Add'}
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
                      <button type="button" className="link-btn" onClick={() => setService(x.id)}>
                        More<span className="sr-only"> about {x.name}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          </div>

          <aside className="summary-side" aria-labelledby="pax-h">
            <section className="panel">
              <h2 id="pax-h">Passenger overview</h2>
              <ul className="plain">
                {labels.map((l, i) => (
                  <li key={l}>
                    <strong>{l}</strong>
                    <br />
                    Departure seat: {seatPosition(booking.seats.outbound[i])} {booking.seats.outbound[i]}
                    {round && (
                      <>
                        <br />
                        Return seat: {seatPosition(booking.seats.return[i])} {booking.seats.return[i]}
                      </>
                    )}
                  </li>
                ))}
                {s.pax.infants > 0 && <li>{s.pax.infants} infant{s.pax.infants > 1 ? 's' : ''} on an adult’s lap</li>}
              </ul>
              <hr />
              {cabinIds.map((id) => {
                const c = CABINS.find((x) => x.id === id)!;
                return (
                  <div key={id} className="cabin-incl">
                    <h3>{c.name} includes</h3>
                    <ul className="ticks">
                      {c.inclusions.map((i) => (
                        <li key={i} className={i.startsWith('No ') ? 'no' : ''}>{i}</li>
                      ))}
                    </ul>
                    <FareConditionsButton cabin={id} label={`${c.name} fare conditions`} />
                  </div>
                );
              })}
              <p className="miles">Earn {miles.toLocaleString('en-GB')} miles per passenger</p>
            </section>
            <PriceBreakdown />
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
