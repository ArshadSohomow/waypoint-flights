import React, { useState } from 'react';
import { SiteHeader, SiteFooter } from '../components/Chrome';
import { AirportField } from '../components/AirportField';
import { DateRange } from '../components/DateRange';
import { PassengerField } from '../components/PassengerField';
import { useComingSoon } from '../components/Dialog';
import { Search, useBooking, money } from '../lib/booking';
import { airportByCode, DESTINATIONS, SALES, lowestFare } from '../lib/data';
import { addDays, todayISO } from '../lib/dates';
import { useRouter } from '../lib/router';

type Errors = Partial<Record<'from' | 'to' | 'depart' | 'ret', string>>;

export function validateSearch(s: Search, today = todayISO()): Errors {
  const e: Errors = {};
  if (!s.from) e.from = 'Choose where you are flying from.';
  if (!s.to) e.to = 'Choose where you are flying to.';
  if (s.from && s.to && s.from === s.to) e.to = 'Choose a destination different from your departure airport.';
  if (!s.depart) e.depart = 'Choose a departure date.';
  else if (s.depart < today) e.depart = 'Departure date can’t be in the past.';
  if (s.tripType === 'round') {
    if (!s.ret) e.ret = 'Choose a return date, or switch to one way.';
    else if (s.depart && s.ret < s.depart) e.ret = 'Return date must be on or after the departure date.';
  }
  return e;
}

export function SearchPage() {
  const { booking, dispatch } = useBooking();
  const { navigate } = useRouter();
  const soon = useComingSoon();
  const [s, setS] = useState<Search>(
    () => booking.search ?? { from: '', to: '', depart: '', ret: null, tripType: 'round', pax: { adults: 1, youngAdults: 0, children: 0, infants: 0 } },
  );
  const [errors, setErrors] = useState<Errors>({});
  const [submitted, setSubmitted] = useState(false);
  const errorSummary = React.useRef<HTMLDivElement>(null);

  const update = (patch: Partial<Search>) => {
    const next = { ...s, ...patch };
    setS(next);
    if (submitted) setErrors(validateSearch(next));
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    const errs = validateSearch(s);
    setErrors(errs);
    if (Object.keys(errs).length) {
      setTimeout(() => errorSummary.current?.focus(), 0);
      return;
    }
    dispatch({ type: 'search', search: { ...s, ret: s.tripType === 'round' ? s.ret : null } });
    navigate('/flights/outbound');
  };

  const suggest = (from: string, to: string) => {
    const depart = addDays(todayISO(), 21);
    update({ from, to, depart, ret: s.tripType === 'round' ? addDays(depart, 7) : null });
    document.getElementById('search-heading')?.scrollIntoView({ behavior: 'smooth' });
  };

  const errorList = Object.values(errors).filter(Boolean);

  return (
    <>
      <SiteHeader />
      <main id="main" className="wrap page-search">
        <h1 className="sr-only">Book a flight</h1>
        <section className="search-card" aria-labelledby="search-heading">
          <div className="tabs" role="tablist" aria-label="What would you like to book?">
            <button type="button" role="tab" aria-selected="true" className="tab active" id="search-heading">
              Flight
            </button>
            {['Hotel', 'Car', 'Check-in'].map((t) => (
              <button key={t} type="button" role="tab" aria-selected="false" className="tab" onClick={() => soon(t === 'Check-in' ? 'Online check-in' : `${t} booking`)}>
                {t}
              </button>
            ))}
          </div>
          <form className="search-form" onSubmit={submit} noValidate role="tabpanel" aria-labelledby="search-heading">
            {errorList.length > 0 && (
              <div className="error-summary" ref={errorSummary} tabIndex={-1} role="alert">
                <p><strong>Please fix {errorList.length === 1 ? 'this' : 'these'} to search:</strong></p>
                <ul>{errorList.map((m) => <li key={m}>{m}</li>)}</ul>
              </div>
            )}
            <fieldset className="trip-type">
              <legend className="sr-only">Trip type</legend>
              {(['round', 'oneway'] as const).map((t) => (
                <label key={t} className="radio">
                  <input type="radio" name="tripType" value={t} checked={s.tripType === t} onChange={() => update({ tripType: t, ret: t === 'oneway' ? null : s.ret })} />
                  <span>{t === 'round' ? 'Round trip' : 'One way'}</span>
                </label>
              ))}
            </fieldset>
            <div className="grid-2 airports">
              <AirportField label="From" value={s.from} exclude={s.to} onChange={(from) => update({ from })} error={errors.from} />
              <button type="button" className="swap-btn" aria-label="Swap departure and destination" onClick={() => update({ from: s.to, to: s.from })}>
                ⇄
              </button>
              <AirportField label="To" value={s.to} exclude={s.from} onChange={(to) => update({ to })} error={errors.to} />
            </div>
            <div className="grid-2">
              <DateRange depart={s.depart} ret={s.ret} round={s.tripType === 'round'} onChange={(depart, ret) => update({ depart, ret })} departError={errors.depart} returnError={errors.ret} />
            </div>
            <div className="grid-2 bottom-row">
              <PassengerField value={s.pax} onChange={(pax) => update({ pax })} />
              <div className="field submit-field">
                <button type="submit" className="btn btn-primary btn-lg">
                  Search flights
                </button>
              </div>
            </div>
          </form>
        </section>

        <div className="promo-grid">
          <section aria-labelledby="pop-h">
            <h2 id="pop-h">Popular destinations for you</h2>
            <div className="dest-row">
              {DESTINATIONS.map((d) => (
                <DestCard key={d.code} code={d.code} from={d.from} blurb={d.blurb} onPick={() => suggest(d.from, d.code)} />
              ))}
            </div>
          </section>
          <section aria-labelledby="sale-h">
            <h2 id="sale-h">Holiday sales</h2>
            <div className="dest-row single">
              {SALES.map((d) => (
                <DestCard key={d.code} code={d.code} from={d.from} blurb={d.blurb} onPick={() => suggest(d.from, d.code)} sale />
              ))}
            </div>
          </section>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

function DestCard({ code, from, blurb, onPick, sale }: { code: string; from: string; blurb: string; onPick: () => void; sale?: boolean }) {
  const a = airportByCode(code)!;
  const f = airportByCode(from)!;
  const date = addDays(todayISO(), 21);
  const price = lowestFare(from, code, date);
  return (
    <button type="button" className={`dest-card dest-${code.toLowerCase()} ${sale ? 'sale' : ''}`} onClick={onPick}>
      <span className="dest-art" aria-hidden="true" />
      <span className="dest-text">
        <span className="dest-city">{a.city}</span>
        <span className="dest-blurb">{blurb}</span>
        <span className="dest-price">
          From {f.city} · from {price ? money(price) : '—'}
        </span>
      </span>
    </button>
  );
}
