import React, { useState } from 'react';
import { SiteHeader, SiteFooter } from '../components/Chrome';
import { AirportField } from '../components/AirportField';
import { DateRange } from '../components/DateRange';
import { PassengerField } from '../components/PassengerField';
import { TripLookup } from '../components/Hub';
import { SkyHero } from '../components/Sky';
import { Search, useBooking, money } from '../lib/booking';
import { AIRPORTS, airportByCode, DESTINATIONS, SALES, lowestFare, placeAirports, placeByCode, placeShort } from '../lib/data';
import { addDays, todayISO } from '../lib/dates';
import { Link, useRouter } from '../lib/router';
import { forgetSearches, loadRecent, rememberSearch } from '../lib/recent';

type Tab = 'flight' | 'hotel' | 'car' | 'checkin';
const TABS: { id: Tab; label: string }[] = [
  { id: 'flight', label: 'Flights' },
  { id: 'hotel', label: 'Stays' },
  { id: 'car', label: 'Car hire' },
  { id: 'checkin', label: 'Check-in' },
];

const HUB_TILES = [
  { to: '/manage', icon: '☰', title: 'Manage booking', body: 'See your trip, print it, or make changes' },
  { to: '/check-in', icon: '✓', title: 'Online check-in', body: 'Get your boarding passes' },
  { to: '/hotels', icon: '⌂', title: 'Stays', body: 'Hotels and apartments for your dates' },
  { to: '/cars', icon: '⛟', title: 'Car hire', body: 'Pick up where you land' },
  { to: '/discover', icon: '✦', title: 'Discover', body: 'Ideas for where to go next' },
  { to: '/support', icon: '?', title: 'Help', body: 'Costs, bags and journeys explained' },
];

type Errors = Partial<Record<'from' | 'to' | 'depart' | 'ret', string>>;

export function validateSearch(s: Search, today = todayISO()): Errors {
  const e: Errors = {};
  if (!s.from) e.from = 'Choose where you are flying from.';
  if (!s.to) e.to = 'Choose where you are flying to.';
  if (s.from && s.to && s.from === s.to) e.to = 'Choose a destination different from your departure airport.';
  else if (s.from && s.to && placeAirports(s.from).some((a) => placeAirports(s.to).includes(a)))
    e.to = `${placeByCode(s.to)?.label} overlaps with ${placeByCode(s.from)?.label}. Choose a different city.`;
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
  const { navigate, query } = useRouter();
  const [tab, setTab] = useState<Tab>('flight');
  const [s, setS] = useState<Search>(() => {
    const base: Search = booking.search ?? { from: '', to: '', depart: '', ret: null, tripType: 'round', pax: { adults: 1, youngAdults: 0, children: 0, infants: 0 } };
    // Links from Discover pre-fill the route: /?from=LON&to=LIS
    const qf = query.get('from') ?? '';
    const qt = query.get('to') ?? '';
    if (placeByCode(qf) && placeByCode(qt) && qf !== qt) {
      const depart = base.depart && base.depart >= todayISO() ? base.depart : addDays(todayISO(), 21);
      return { ...base, from: qf, to: qt, depart, ret: base.tripType === 'round' ? (base.ret && base.ret >= depart ? base.ret : addDays(depart, 7)) : null };
    }
    // Returning visitor with nothing in progress: start from the airport they last flew from.
    if (!booking.search && !base.from) {
      const last = loadRecent()[0];
      if (last) return { ...base, from: last.from };
    }
    return base;
  });
  const [recent, setRecent] = useState(loadRecent);
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
    rememberSearch({ from: s.from, to: s.to, tripType: s.tripType });
    dispatch({ type: 'search', search: { ...s, ret: s.tripType === 'round' ? s.ret : null } });
    navigate('/flights/outbound');
  };

  const suggest = (from: string, to: string) => {
    const depart = addDays(todayISO(), 21);
    update({ from, to, depart, ret: s.tripType === 'round' ? addDays(depart, 7) : null });
    document.getElementById('search-heading')?.scrollIntoView({ behavior: 'smooth' });
  };

  const errorList = Object.values(errors).filter(Boolean);
  // Figma: the Search button fills like a progress bar as the required details are completed.
  const live = validateSearch(s);
  const steps = [
    { key: 'from', ok: !!s.from && !live.from },
    { key: 'to', ok: !!s.to && !live.to },
    { key: 'depart', ok: !!s.depart && !live.depart },
    ...(s.tripType === 'round' ? [{ key: 'ret', ok: !!s.ret && !live.ret }] : []),
  ];
  const doneCount = steps.filter((x) => x.ok).length;
  const ready = doneCount === steps.length;
  const ok = (k: string) => steps.find((x) => x.key === k)?.ok ?? false;

  return (
    <>
      <SiteHeader />
      <SkyHero>
        <p className="sky-title">Find a flight that fits.</p>
        <p className="sky-sub">Every cost and catch in plain sight, before you commit.</p>
      </SkyHero>
      <main id="main" className="wrap page-search">
        <h1 className="sr-only">Book a flight</h1>
        <section className="search-card" aria-labelledby="search-heading">
          <div className="tabs" role="tablist" aria-label="What would you like to do?">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                id={`tab-${t.id}`}
                aria-selected={tab === t.id}
                aria-controls={`panel-${t.id}`}
                tabIndex={tab === t.id ? 0 : -1}
                className={`tab ${tab === t.id ? 'active' : ''}`}
                onClick={() => setTab(t.id)}
                onKeyDown={(e) => {
                  const i = TABS.findIndex((x) => x.id === tab);
                  const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
                  if (!d) return;
                  e.preventDefault();
                  const next = TABS[(i + d + TABS.length) % TABS.length].id;
                  setTab(next);
                  document.getElementById(`tab-${next}`)?.focus();
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
          <h2 id="search-heading" className="sr-only">
            {TABS.find((t) => t.id === tab)!.label}
          </h2>
          {tab === 'flight' && (
          <form className="search-form" id="panel-flight" onSubmit={submit} noValidate role="tabpanel" aria-labelledby="tab-flight">
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
              <AirportField label="Departs from" value={s.from} exclude={s.to} onChange={(from) => update({ from })} error={errors.from} done={ok('from')} />
              <button type="button" className="swap-btn" aria-label="Swap departure and destination" onClick={() => update({ from: s.to, to: s.from })}>
                ⇄
              </button>
              <AirportField label="Arrives at" value={s.to} exclude={s.from} onChange={(to) => update({ to })} error={errors.to} done={ok('to')} />
            </div>
            <div className="grid-2">
              <DateRange from={s.from} to={s.to} depart={s.depart} ret={s.ret} round={s.tripType === 'round'} onChange={(depart, ret) => update({ depart, ret })} departError={errors.depart} returnError={errors.ret} done={{ depart: ok('depart'), ret: ok('ret') }} />
            </div>
            <div className="grid-2 bottom-row">
              <PassengerField value={s.pax} onChange={(pax) => update({ pax })} />
              <div className="field submit-field">
                <button type="submit" className={`btn btn-primary btn-lg search-cta ${ready ? 'ready' : ''}`} style={{ ['--fill' as string]: `${(doneCount / steps.length) * 100}%` }} aria-describedby="cta-progress">
                  <span className="cta-fill" aria-hidden="true" />
                  <span className="cta-label">Search flights</span>
                </button>
                <p id="cta-progress" className="cta-progress">
                  {ready ? 'Ready to search' : `${doneCount} of ${steps.length} details added`}
                </p>
              </div>
            </div>
            {recent.length > 0 && (
              <div className="recent">
                <span className="recent-label">Recent searches</span>
                {recent.map((r) => (
                  <button
                    key={`${r.from}-${r.to}`}
                    type="button"
                    className="chip-btn"
                    aria-pressed={s.from === r.from && s.to === r.to}
                    onClick={() => update({ from: r.from, to: r.to, tripType: r.tripType, ret: r.tripType === 'oneway' ? null : s.ret })}
                  >
                    {placeShort(r.from)} → {placeShort(r.to)}
                  </button>
                ))}
                <button
                  type="button"
                  className="link-btn small"
                  onClick={() => {
                    forgetSearches();
                    setRecent([]);
                  }}
                >
                  Clear<span className="sr-only"> recent searches</span>
                </button>
              </div>
            )}
          </form>
          )}
          {tab === 'hotel' && <HotelTab />}
          {tab === 'car' && <CarTab />}
          {tab === 'checkin' && (
            <div className="search-form" id="panel-checkin" role="tabpanel" aria-labelledby="tab-checkin">
              <p className="tab-intro">Check in online with your booking reference and a last name from the booking.</p>
              <TripLookup cta="Start check-in" onFound={(t) => navigate(`/check-in?ref=${t.ref}`)} />
            </div>
          )}
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
            <h2 id="sale-h">Autumn sun</h2>
            <div className="dest-row single">
              {SALES.map((d) => (
                <DestCard key={d.code} code={d.code} from={d.from} blurb={d.blurb} onPick={() => suggest(d.from, d.code)} sale />
              ))}
            </div>
          </section>
        </div>
        <p className="more-link">
          <Link to="/discover">More destination ideas →</Link>
        </p>

        <section className="hub-strip" aria-labelledby="hub-h">
          <h2 id="hub-h">Everything for your trip</h2>
          <ul className="plain hub-tiles">
            {HUB_TILES.map((t) => (
              <li key={t.to}>
                <Link to={t.to} className="hub-tile">
                  <span className="hub-ico" aria-hidden="true">{t.icon}</span>
                  <span className="hub-tile-text">
                    <strong>{t.title}</strong>
                    <span>{t.body}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
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
          From {f.city} · from {price ? `${money(price)} pp` : '—'} <span className="dest-note">(sample, in 3 weeks)</span>
        </span>
      </span>
    </button>
  );
}

const CITY_OPTIONS = Array.from(new Map(AIRPORTS.map((a) => [a.city, a.city === 'London' ? 'LON' : a.code])).entries()).sort((a, b) => a[0].localeCompare(b[0]));

function HotelTab() {
  const { navigate } = useRouter();
  const { booking } = useBooking();
  const seed = booking.search && !booking.confirmation ? booking.search : null;
  const [city, setCity] = useState(seed ? CITY_OPTIONS.find(([c]) => c === placeByCode(seed.to)?.city)?.[1] ?? '' : '');
  const [inD, setIn] = useState(seed?.depart ?? '');
  const [outD, setOut] = useState(seed?.ret ?? '');
  return (
    <form
      className="search-form compact-tab"
      id="panel-hotel"
      role="tabpanel"
      aria-labelledby="tab-hotel"
      onSubmit={(e) => {
        e.preventDefault();
        navigate(`/hotels?city=${city}&in=${inD}&out=${outD}`);
      }}
    >
      <p className="tab-intro">Hotels and apartments for your dates. Hold one against your flights after you book.</p>
      <div className="tab-grid">
        <div className="field">
          <label htmlFor="ht-city">Destination</label>
          <select id="ht-city" value={city} onChange={(e) => setCity(e.target.value)}>
            <option value="">Choose a city</option>
            {CITY_OPTIONS.map(([c, code]) => (
              <option key={code} value={code}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="ht-in">Check-in</label>
          <input id="ht-in" type="date" min={todayISO()} value={inD} onChange={(e) => setIn(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="ht-out">Check-out</label>
          <input id="ht-out" type="date" min={inD || todayISO()} value={outD} onChange={(e) => setOut(e.target.value)} />
        </div>
        <button type="submit" className="btn btn-primary btn-lg">
          Search stays
        </button>
      </div>
    </form>
  );
}

function CarTab() {
  const { navigate } = useRouter();
  const { booking } = useBooking();
  const seed = booking.search && !booking.confirmation ? booking.search : null;
  const [ap, setAp] = useState(seed ? placeAirports(seed.to)[0] ?? '' : '');
  const [pu, setPu] = useState(seed?.depart ?? '');
  const [dr, setDr] = useState(seed?.ret ?? '');
  return (
    <form
      className="search-form compact-tab"
      id="panel-car"
      role="tabpanel"
      aria-labelledby="tab-car"
      onSubmit={(e) => {
        e.preventDefault();
        navigate(`/cars?ap=${ap}&pu=${pu}&do=${dr}`);
      }}
    >
      <p className="tab-intro">Pick up a car at the airport when you land, and drop it back when you fly home.</p>
      <div className="tab-grid">
        <div className="field">
          <label htmlFor="ct-ap">Pick-up airport</label>
          <select id="ct-ap" value={ap} onChange={(e) => setAp(e.target.value)}>
            <option value="">Choose an airport</option>
            {[...AIRPORTS].sort((a, b) => a.city.localeCompare(b.city)).map((a) => (
              <option key={a.code} value={a.code}>
                {a.name} ({a.code})
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="ct-pu">Pick-up</label>
          <input id="ct-pu" type="date" min={todayISO()} value={pu} onChange={(e) => setPu(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="ct-do">Drop-off</label>
          <input id="ct-do" type="date" min={pu || todayISO()} value={dr} onChange={(e) => setDr(e.target.value)} />
        </div>
        <button type="submit" className="btn btn-primary btn-lg">
          Search cars
        </button>
      </div>
    </form>
  );
}
