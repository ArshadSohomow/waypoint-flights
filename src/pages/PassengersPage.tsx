import React, { useRef, useState } from 'react';
import { BookingHeader, SiteFooter } from '../components/Chrome';
import { Contact, Passenger, PassengerType, passengerTypes, progress, useBooking } from '../lib/booking';
import { ageOn, isValidISO, todayISO } from '../lib/dates';
import { Redirect, useRouter } from '../lib/router';

const TYPE_NAME: Record<PassengerType, string> = { adult: 'Adult', youngAdult: 'Young adult', child: 'Child', infant: 'Infant' };
const AGE: Record<PassengerType, [number, number, string]> = {
  adult: [16, 130, '16 or over'],
  youngAdult: [12, 15, 'between 12 and 15'],
  child: [2, 11, 'between 2 and 11'],
  infant: [0, 1, 'under 2'],
};

type Draft = { title: string; firstName: string; lastName: string; d: string; m: string; y: string };
type Errs = Record<string, string>;

const toDraft = (p?: Passenger): Draft => {
  const [y = '', m = '', d = ''] = p?.dob ? p.dob.split('-') : [];
  return { title: p?.title ?? '', firstName: p?.firstName ?? '', lastName: p?.lastName ?? '', d: d.replace(/^0/, ''), m: m.replace(/^0/, ''), y };
};
const dobOf = (x: Draft) => `${x.y.padStart(4, '0')}-${x.m.padStart(2, '0')}-${x.d.padStart(2, '0')}`;
const NAME = /^[\p{L}][\p{L}' .-]*$/u;

export function validatePassengers(types: PassengerType[], drafts: Draft[], contact: Contact, departISO: string, today = todayISO()): Errs {
  const e: Errs = {};
  types.forEach((t, i) => {
    const x = drafts[i];
    if (t !== 'infant' && t !== 'child' && !x.title) e[`p${i}-title`] = 'Choose a title.';
    if (!x.firstName.trim()) e[`p${i}-first`] = 'Enter a first name.';
    else if (!NAME.test(x.firstName.trim())) e[`p${i}-first`] = 'First name can only include letters, spaces, hyphens and apostrophes.';
    if (!x.lastName.trim()) e[`p${i}-last`] = 'Enter a last name.';
    else if (!NAME.test(x.lastName.trim())) e[`p${i}-last`] = 'Last name can only include letters, spaces, hyphens and apostrophes.';
    const dob = dobOf(x);
    if (!x.d || !x.m || !x.y) e[`p${i}-dob`] = 'Enter a full date of birth.';
    else if (x.y.length !== 4 || !isValidISO(dob)) e[`p${i}-dob`] = 'Enter a real date of birth, for example 27 3 1990.';
    else if (dob > today) e[`p${i}-dob`] = 'Date of birth must be in the past.';
    else {
      const age = ageOn(dob, departISO);
      const [min, max, words] = AGE[t];
      if (age < min || age > max) e[`p${i}-dob`] = `${TYPE_NAME[t]}s must be ${words} on the day of travel.`;
    }
  });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(contact.email.trim())) e.email = 'Enter an email address like name@example.com.';
  if (!/^\+?[0-9 ()-]{7,20}$/.test(contact.phone.trim()) || contact.phone.replace(/\D/g, '').length < 7) e.phone = 'Enter a phone number, like 07700 900123.';
  return e;
}

export function PassengersPage() {
  const { booking, dispatch } = useBooking();
  const { navigate } = useRouter();
  const s = booking.search;
  const types = s ? passengerTypes(s.pax) : [];
  const [drafts, setDrafts] = useState<Draft[]>(() => types.map((_, i) => toDraft(booking.passengers[i])));
  const [contact, setContact] = useState<Contact>(booking.contact);
  const [errors, setErrors] = useState<Errs>({});
  const [tried, setTried] = useState(false);
  const summaryRef = useRef<HTMLDivElement>(null);
  const p = progress(booking);

  if (!s) return <Redirect to="/" />;
  if (!p.seats) return <Redirect to="/summary" />;

  const set = (i: number, patch: Partial<Draft>) => {
    const next = drafts.map((d, k) => (k === i ? { ...d, ...patch } : d));
    setDrafts(next);
    if (tried) setErrors(validatePassengers(types, next, contact, s.depart));
  };
  const setC = (patch: Partial<Contact>) => {
    const next = { ...contact, ...patch };
    setContact(next);
    if (tried) setErrors(validatePassengers(types, drafts, next, s.depart));
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setTried(true);
    const errs = validatePassengers(types, drafts, contact, s.depart);
    setErrors(errs);
    if (Object.keys(errs).length) {
      setTimeout(() => summaryRef.current?.focus(), 0);
      return;
    }
    dispatch({
      type: 'passengers',
      passengers: types.map((t, i) => ({ type: t, title: drafts[i].title, firstName: drafts[i].firstName.trim(), lastName: drafts[i].lastName.trim(), dob: dobOf(drafts[i]) })),
      contact: { email: contact.email.trim(), phone: contact.phone.trim() },
    });
    navigate('/payment');
  };

  const counts: Record<string, number> = {};
  const errList = Object.entries(errors);

  return (
    <>
      <BookingHeader step={4} />
      <main id="main" className="wrap page-form narrow">
        <p className="eyebrow">Step 4 of 5</p>
        <h1>Passenger details</h1>
        <p className="lead">Enter names exactly as they appear on each passenger’s passport.</p>
        <form onSubmit={submit} noValidate>
          {errList.length > 0 && (
            <div className="error-summary" ref={summaryRef} tabIndex={-1} role="alert">
              <p><strong>There {errList.length === 1 ? 'is 1 problem' : `are ${errList.length} problems`} to fix</strong></p>
              <ul>
                {errList.map(([k, m]) => (
                  <li key={k}><a href={`#${k}`}>{m}</a></li>
                ))}
              </ul>
            </div>
          )}
          {types.map((t, i) => {
            counts[t] = (counts[t] ?? 0) + 1;
            const x = drafts[i];
            const err = (k: string) => errors[`p${i}-${k}`];
            const needsTitle = t === 'adult' || t === 'youngAdult';
            return (
              <fieldset className="panel pax-form" key={i}>
                <legend>
                  {TYPE_NAME[t]} {counts[t]}
                  {i === 0 && <span className="muted"> · lead passenger</span>}
                </legend>
                <div className="form-grid">
                  {needsTitle && (
                    <Field id={`p${i}-title`} label="Title" error={err('title')} narrow>
                      <select id={`p${i}-title`} value={x.title} onChange={(e) => set(i, { title: e.target.value })} aria-invalid={!!err('title')} aria-describedby={err('title') ? `p${i}-title-e` : undefined}>
                        <option value="">Select</option>
                        {['Mr', 'Mrs', 'Ms', 'Miss', 'Mx', 'Dr'].map((o) => <option key={o}>{o}</option>)}
                      </select>
                    </Field>
                  )}
                  <Field id={`p${i}-first`} label="First name" error={err('first')}>
                    <input id={`p${i}-first`} autoComplete={i === 0 ? 'given-name' : 'off'} value={x.firstName} onChange={(e) => set(i, { firstName: e.target.value })} aria-invalid={!!err('first')} aria-describedby={err('first') ? `p${i}-first-e` : undefined} />
                  </Field>
                  <Field id={`p${i}-last`} label="Last name" error={err('last')}>
                    <input id={`p${i}-last`} autoComplete={i === 0 ? 'family-name' : 'off'} value={x.lastName} onChange={(e) => set(i, { lastName: e.target.value })} aria-invalid={!!err('last')} aria-describedby={err('last') ? `p${i}-last-e` : undefined} />
                  </Field>
                </div>
                <fieldset className={`dob ${err('dob') ? 'has-error' : ''}`} aria-describedby={`p${i}-dob-hint${err('dob') ? ` p${i}-dob-e` : ''}`}>
                  <legend>Date of birth</legend>
                  <p className="hint" id={`p${i}-dob-hint`}>For example, 27 3 1990</p>
                  {err('dob') && <p className="field-error" id={`p${i}-dob-e`}>{err('dob')}</p>}
                  <div className="dob-inputs">
                    <label>Day<input id={`p${i}-dob`} inputMode="numeric" maxLength={2} value={x.d} onChange={(e) => set(i, { d: e.target.value.replace(/\D/g, '') })} aria-invalid={!!err('dob')} /></label>
                    <label>Month<input inputMode="numeric" maxLength={2} value={x.m} onChange={(e) => set(i, { m: e.target.value.replace(/\D/g, '') })} aria-invalid={!!err('dob')} /></label>
                    <label>Year<input inputMode="numeric" maxLength={4} className="year" value={x.y} onChange={(e) => set(i, { y: e.target.value.replace(/\D/g, '') })} aria-invalid={!!err('dob')} /></label>
                  </div>
                </fieldset>
              </fieldset>
            );
          })}

          <fieldset className="panel">
            <legend>Contact details</legend>
            <p className="hint">We’ll send the booking confirmation here.</p>
            <div className="form-grid">
              <Field id="email" label="Email address" error={errors.email}>
                <input id="email" type="email" autoComplete="email" value={contact.email} onChange={(e) => setC({ email: e.target.value })} aria-invalid={!!errors.email} aria-describedby={errors.email ? 'email-e' : undefined} />
              </Field>
              <Field id="phone" label="Phone number" error={errors.phone}>
                <input id="phone" type="tel" autoComplete="tel" value={contact.phone} onChange={(e) => setC({ phone: e.target.value })} aria-invalid={!!errors.phone} aria-describedby={errors.phone ? 'phone-e' : undefined} />
              </Field>
            </div>
          </fieldset>

          <div className="page-actions">
            <button type="button" className="btn btn-ghost" onClick={() => navigate('/summary')}>
              Back to summary
            </button>
            <button type="submit" className="btn btn-primary btn-lg">
              Continue to payment
            </button>
          </div>
        </form>
      </main>
      <SiteFooter />
    </>
  );
}

function Field({ id, label, error, children, narrow }: { id: string; label: string; error?: string; children: React.ReactNode; narrow?: boolean }) {
  return (
    <div className={`field ${error ? 'has-error' : ''} ${narrow ? 'narrow' : ''}`}>
      <label htmlFor={id}>{label}</label>
      {error && <p className="field-error" id={`${id}-e`}>{error}</p>}
      {children}
    </div>
  );
}
