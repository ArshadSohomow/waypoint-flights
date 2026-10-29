import React, { useState } from 'react';
import { BookingHeader, SiteFooter } from '../components/Chrome';
import { CostBreakdown } from '../components/Costs';
import { WarningList } from '../components/FlightBits';
import { LegCard } from './ReviewPage';
import { chosen, costs, money, picks, progress, useBooking } from '../lib/booking';
import { itineraryWarnings, pairWarnings } from '../lib/warnings';
import { mediumDate } from '../lib/dates';
import { Link, Redirect, useRouter } from '../lib/router';

const REF_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function newRef() {
  const a = new Uint32Array(6);
  crypto.getRandomValues(a);
  return Array.from(a, (n) => REF_CHARS[n % REF_CHARS.length]).join('');
}
const TYPE: Record<string, string> = { adult: 'Adult', youngAdult: 'Young adult', child: 'Child', infant: 'Infant' };

/** Step 5: final review of everything, then a demo confirmation. No payment details are ever collected. */
export function PaymentPage() {
  const { booking, dispatch } = useBooking();
  const { navigate } = useRouter();
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const p = progress(booking);
  if (!booking.search) return <Redirect to="/" />;
  if (!p.passengers) return <Redirect to="/passengers" />;
  if (p.confirmed) return <Redirect to="/confirmation" />;
  const { total } = costs(booking);
  const ps = picks(booking);
  const important = [
    ...ps.flatMap((x) => itineraryWarnings(x.it).filter((w) => w.severity !== 'fyi').map((w) => ({ ...w, id: `${x.label}-${w.id}`, title: `${x.label}: ${w.title}` }))),
    ...pairWarnings(chosen(booking.outbound), booking.search.tripType === 'round' ? chosen(booking.ret) : undefined),
  ];

  const confirm = () => {
    if (!agreed) {
      setError('Tick the box to confirm you understand this is a demonstration.');
      document.getElementById('agree')?.focus();
      return;
    }
    setError('');
    setBusy(true);
    setTimeout(() => {
      dispatch({ type: 'confirm', confirmation: { ref: newRef(), total, at: new Date().toISOString() } });
      navigate('/confirmation', { replace: true });
    }, 900);
  };

  return (
    <>
      <BookingHeader step={5} />
      <main id="main" className="wrap page-final">
        <p className="eyebrow">Step 5 of 5</p>
        <h1>Review and confirm</h1>
        <div className="demo-banner" role="note">
          <strong>Demo booking.</strong> No payment details are collected, no money is taken and no tickets are issued.
        </div>
        <div className="summary-layout">
          <div>
            {important.length > 0 && (
              <section className="panel attention" aria-labelledby="attn-h">
                <h2 id="attn-h">Before you confirm</h2>
                <WarningList warnings={important} />
              </section>
            )}
            <h2 className="sub">Flights</h2>
            {booking.outbound && <LegCard leg="outbound" choice={booking.outbound} seats={booking.seats.outbound} changeTo="/flights/outbound" showSeats showWarnings={false} />}
            {booking.search.tripType === 'round' && booking.ret && <LegCard leg="return" choice={booking.ret} seats={booking.seats.return} changeTo="/flights/return" showSeats showWarnings={false} />}

            <section className="panel" aria-labelledby="pax-h">
              <div className="panel-head">
                <h2 id="pax-h">Passengers</h2>
                <Link to="/passengers" className="btn btn-small btn-outline">
                  Change<span className="sr-only"> passenger details</span>
                </Link>
              </div>
              <ul className="plain">
                {booking.passengers.map((x, i) => (
                  <li key={i}>
                    <strong>{[x.title, x.firstName, x.lastName].filter(Boolean).join(' ')}</strong> · {TYPE[x.type]} · born {mediumDate(x.dob)}
                    {i === 0 && <span className="muted"> · lead passenger</span>}
                  </li>
                ))}
              </ul>
              <p className="muted">
                Confirmation would go to <strong>{booking.contact.email}</strong> · {booking.contact.phone}
              </p>
            </section>

            <section className="panel" aria-labelledby="bx-h">
              <div className="panel-head">
                <h2 id="bx-h">Bags and extras</h2>
                <Link to="/summary" className="btn btn-small btn-outline">
                  Change<span className="sr-only"> bags and extras</span>
                </Link>
              </div>
              <p>
                {booking.bags} checked bag{booking.bags === 1 ? '' : 's'} per traveller
                {booking.extras.fasttrack ? ' · Fast Track' : ''}
                {booking.extras.lounge ? ' · Lounge' : ''}. Itemised in the cost breakdown.
              </p>
            </section>
          </div>

          <aside className="summary-side">
            <CostBreakdown title="Estimated trip cost" />
            <div className={`check-row ${error ? 'has-error' : ''}`}>
              {error && (
                <p className="field-error" id="agree-e">
                  {error}
                </p>
              )}
              <label className="check">
                <input
                  id="agree"
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => {
                    setAgreed(e.target.checked);
                    if (e.target.checked) setError('');
                  }}
                  aria-describedby={error ? 'agree-e' : undefined}
                  aria-invalid={!!error}
                />
                I understand this is a demonstration and no real booking will be made.
              </label>
            </div>
            <button type="button" className="btn btn-primary btn-lg btn-block" onClick={confirm} disabled={busy} aria-busy={busy}>
              {busy ? 'Confirming…' : `Confirm demo booking (${money(total)})`}
            </button>
            <button type="button" className="btn btn-ghost btn-block" onClick={() => navigate('/passengers')} disabled={busy}>
              Back to passenger details
            </button>
            <p className="sr-only" aria-live="assertive">
              {busy ? 'Confirming your demo booking, please wait.' : ''}
            </p>
          </aside>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
