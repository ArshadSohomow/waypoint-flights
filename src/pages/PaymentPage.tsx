import React, { useState } from 'react';
import { BookingHeader, SiteFooter } from '../components/Chrome';
import { PriceBreakdown } from './SummaryPage';
import { money, priceTotal, progress, useBooking } from '../lib/booking';
import { Redirect, useRouter } from '../lib/router';

const REF_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function newRef() {
  const a = new Uint32Array(6);
  crypto.getRandomValues(a);
  return Array.from(a, (n) => REF_CHARS[n % REF_CHARS.length]).join('');
}

export function PaymentPage() {
  const { booking, dispatch } = useBooking();
  const { navigate } = useRouter();
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState('');
  const [paying, setPaying] = useState(false);
  const p = progress(booking);
  if (!booking.search) return <Redirect to="/" />;
  if (!p.passengers) return <Redirect to="/passengers" />;
  if (p.paid) return <Redirect to="/confirmation" />;
  const total = priceTotal(booking);

  const pay = () => {
    if (!agreed) {
      setError('Tick the box to confirm you understand this is a demonstration.');
      document.getElementById('agree')?.focus();
      return;
    }
    setError('');
    setPaying(true);
    // Stand-in for a payment provider's hosted checkout.
    setTimeout(() => {
      dispatch({ type: 'confirm', confirmation: { ref: newRef(), total, at: new Date().toISOString() } });
      navigate('/confirmation', { replace: true });
    }, 1200);
  };

  return (
    <>
      <BookingHeader step={5} />
      <main id="main" className="wrap page-form narrow">
        <p className="eyebrow">Step 5 of 5</p>
        <h1>Payment</h1>
        <div className="demo-banner" role="note">
          <strong>Demo payment.</strong> No card details are collected and no money is taken. In the live site this step hands over to a secure payment provider.
        </div>
        <section className="panel" aria-labelledby="pay-h">
          <h2 id="pay-h">What you’ll pay</h2>
          <PriceBreakdown />
          <div className={`check-row ${error ? 'has-error' : ''}`}>
            {error && <p className="field-error" id="agree-e">{error}</p>}
            <label className="check">
              <input id="agree" type="checkbox" checked={agreed} onChange={(e) => { setAgreed(e.target.checked); if (e.target.checked) setError(''); }} aria-describedby={error ? 'agree-e' : undefined} aria-invalid={!!error} />
              I understand this is a demonstration and no real booking will be made.
            </label>
          </div>
          <div className="page-actions">
            <button type="button" className="btn btn-ghost" onClick={() => navigate('/passengers')} disabled={paying}>
              Back
            </button>
            <button type="button" className="btn btn-primary btn-lg" onClick={pay} disabled={paying} aria-busy={paying}>
              {paying ? 'Processing…' : `Pay ${money(total)}`}
            </button>
          </div>
          <p className="sr-only" aria-live="assertive">{paying ? 'Processing payment, please wait.' : ''}</p>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
