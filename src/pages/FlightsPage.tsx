import React, { useEffect, useMemo, useState } from 'react';
import { BookingHeader, SiteFooter } from '../components/Chrome';
import { FareFacts, FlightDetailsButton, JourneySummary, RouteHeading, WarningList, cabinName, SampleTag } from '../components/FlightBits';
import { DEFAULT_FILTERS, Filters, Leg, MAX_SHORTLIST, money, seatedCount, Sort, totalPax, useBooking } from '../lib/booking';
import { CABINS, Cabin, DATA_STATUS_LABEL, EXTRA_BAG_PRICE, Itinerary, lowestFare, offerOf, searchItineraries } from '../lib/data';
import { journeyEstimate } from '../lib/costs';
import { hassle, itineraryWarnings } from '../lib/warnings';
import { addDays, duration, fullDate, mediumDate, shortDate, todayISO } from '../lib/dates';
import { Link, Redirect, useRouter } from '../lib/router';
import { FlexibleDates } from '../components/FlexibleDates';

type Slot = Filters['times'][number];
const slotOf = (hm: string): Slot => (hm < '12:00' ? 'morning' : hm < '17:00' ? 'afternoon' : 'evening');
const SLOT_LABEL: Record<Slot, string> = { morning: 'Morning (before 12:00)', afternoon: 'Afternoon (12:00–17:00)', evening: 'Evening (after 17:00)' };
const SORT_LABEL: Record<Sort, string> = {
  recommended: 'Recommended',
  price: 'Lowest estimated total',
  depart: 'Earliest departure',
  duration: 'Shortest journey',
  easiest: 'Fewest practical issues',
};

const cheapestOffer = (it: Itinerary) =>
  CABINS.map((c) => offerOf(it, c.id))
    .filter((o): o is NonNullable<typeof o> => !!o)
    .sort((a, b) => a.price - b.price)[0];

export const isDefaultFilters = (f: Filters) => JSON.stringify({ ...f, sort: 'x' }) === JSON.stringify({ ...DEFAULT_FILTERS, sort: 'x' });

/** Shared by results and comparison: insight labels that are true of the current set. */
export function insights(list: Itinerary[], estimate: (it: Itinerary) => number) {
  if (!list.length) return { cheapest: '', fastest: '', easiest: '' };
  const by = (f: (it: Itinerary) => number) => [...list].sort((a, b) => f(a) - f(b))[0].id;
  return { cheapest: by(estimate), fastest: by((i) => i.durationMin), easiest: by(hassle) };
}

/** "£12 more per person · 1h 05m quicker" against the cheapest journey, computed from the data shown. */
export function tradeOff(it: Itinerary, base: Itinerary | undefined) {
  if (!base || base.id === it.id) return '';
  const a = cheapestOffer(it)?.price;
  const b = cheapestOffer(base)?.price;
  if (a === undefined || b === undefined) return '';
  const dp = a - b;
  const dt = base.durationMin - it.durationMin;
  const price = dp === 0 ? 'Same price' : dp > 0 ? `${money(dp)} more per person` : `${money(-dp)} less per person`;
  const time = dt === 0 ? 'same journey time' : dt > 0 ? `${duration(dt)} quicker` : `${duration(-dt)} longer`;
  return `${price} · ${time} than the lowest-price option`;
}

export function FlightsPage({ leg }: { leg: Leg }) {
  const { booking, dispatch } = useBooking();
  const { navigate } = useRouter();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showFlex, setShowFlex] = useState(false);
  const [just, setJust] = useState<string | null>(null);
  const s = booking.search;
  const isOut = leg === 'outbound';
  const from = s ? (isOut ? s.from : s.to) : '';
  const to = s ? (isOut ? s.to : s.from) : '';
  const date = s ? (isOut ? s.depart : s.ret ?? '') : '';
  const f = booking.filters[leg];
  const pax = s?.pax ?? { adults: 1, youngAdults: 0, children: 0, infants: 0 };
  const est = (it: Itinerary, c: Cabin = cheapestOffer(it)?.cabin ?? 'economy') => journeyEstimate(it, c, pax, booking.bags)?.total ?? Infinity;

  const all = useMemo(() => (s ? searchItineraries(from, to, date) : []), [from, to, date, s]);
  const list = useMemo(() => {
    const filtered = all
      .filter((it) => f.times.includes(slotOf(it.depart)))
      .filter((it) => (f.stops === 'direct' ? it.stops === 0 : f.stops === 'max1' ? it.stops <= 1 : true))
      .filter((it) => !(f.hideSelfTransfer && it.selfTransfer));
    const minP = Math.min(...filtered.map((i) => est(i)));
    const minD = Math.min(...filtered.map((i) => i.durationMin));
    const score = (i: Itinerary) => est(i) / minP + (i.durationMin / minD) * 0.6 + hassle(i) * 0.08;
    const key: Record<Sort, (i: Itinerary) => number | string> = { recommended: score, price: (i) => est(i), depart: (i) => i.depart, duration: (i) => i.durationMin, easiest: hassle };
    return [...filtered].sort((a, b) => (key[f.sort](a) < key[f.sort](b) ? -1 : key[f.sort](a) > key[f.sort](b) ? 1 : 0));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [all, f, booking.bags, pax.adults, pax.youngAdults, pax.children, pax.infants]);

  // Coming back from comparison: restore scroll position; otherwise bring a chosen journey into view.
  useEffect(() => {
    let y: string | null = null;
    try {
      y = sessionStorage.getItem(`wp-scroll-${leg}`);
      sessionStorage.removeItem(`wp-scroll-${leg}`);
    } catch {
      /* ignore */
    }
    const chosenId = (isOut ? booking.outbound : booking.ret)?.itineraryId;
    requestAnimationFrame(() => {
      if (y) window.scrollTo(0, Number(y));
      else if (chosenId) document.getElementById(`it-${chosenId}`)?.scrollIntoView({ block: 'center' });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!s) return <Redirect to="/" />;
  if (!isOut && s.tripType !== 'round') return <Redirect to="/review" />;
  if (!isOut && !booking.outbound) return <Redirect to="/flights/outbound" />;

  const chosenChoice = isOut ? booking.outbound : booking.ret;
  const chosenIt = all.find((i) => i.id === chosenChoice?.itineraryId);
  const seated = seatedCount(s.pax);
  const n = totalPax(s.pax);
  const ins = insights(list, (i) => est(i));
  const cheapest = list.find((i) => i.id === ins.cheapest);
  const shortlist = booking.shortlist[leg];
  const minDate = isOut ? todayISO() : s.depart;
  const maxDate = isOut && s.tripType === 'round' && s.ret ? s.ret : addDays(todayISO(), 330);
  const strip = Array.from({ length: 7 }, (_, i) => addDays(date, i - 3));
  const nextPath = isOut && s.tripType === 'round' ? '/flights/return' : '/review';
  const nextLabel = isOut && s.tripType === 'round' ? 'Continue to return flight' : 'Continue to review flights';
  const setF = (patch: Partial<Filters>) => dispatch({ type: 'filters', leg, filters: { ...f, ...patch } });
  const changeDate = (d: string) => {
    dispatch({ type: 'date', leg, date: d });
    setExpanded(null);
  };
  const choose = (it: Itinerary, cabin: Cabin) => {
    dispatch({ type: 'choose', leg, choice: { itineraryId: it.id, cabin } });
    setJust(it.id);
  };

  return (
    <>
      <BookingHeader step={1} />
      <main id="main" className="wrap page-flights">
        <p className="eyebrow">{isOut ? 'Step 1 of 5 · Outbound flight' : 'Step 1 of 5 · Return flight'}</p>
        <RouteHeading from={from} to={to} level={1} />
        <p className="subhead">
          {fullDate(date)} · {n} traveller{n === 1 ? '' : 's'} ({seated} with seats{s.pax.infants ? `, ${s.pax.infants} infant on lap` : ''})
        </p>
        <p className="data-status">
          <SampleTag>Sample data</SampleTag> {DATA_STATUS_LABEL}. Prices are in GBP. <strong>Per person</strong> shows one traveller’s fare; <strong>estimated total</strong> covers all {n} traveller{n === 1 ? '' : 's'} and any bags you need to add.
        </p>

        <nav className="date-strip" aria-label="Try another date">
          <button type="button" className="icon-btn" aria-label="Earlier dates" disabled={addDays(date, -1) < minDate} onClick={() => changeDate(addDays(date, -1))}>
            ‹
          </button>
          <ul>
            {strip.map((d) => {
              const outOfRange = d < minDate || d > maxDate;
              const price = outOfRange ? null : lowestFare(from, to, d);
              const current = d === date;
              return (
                <li key={d}>
                  <button
                    type="button"
                    className={`day ${current ? 'current' : ''}`}
                    disabled={outOfRange || price === null}
                    aria-current={current ? 'date' : undefined}
                    aria-label={`${fullDate(d)}${outOfRange ? (isOut ? ', after your return date' : ', before your departure') : price ? `, from ${money(price)} per person, sample` : ', no flights'}`}
                    onClick={() => changeDate(d)}
                  >
                    <span className="day-name">{shortDate(d)}</span>
                    <span className="day-price">{outOfRange ? '—' : price ? money(price) : 'No flights'}</span>
                  </button>
                </li>
              );
            })}
          </ul>
          <button type="button" className="icon-btn" aria-label="Later dates" disabled={addDays(date, 1) > maxDate} onClick={() => changeDate(addDays(date, 1))}>
            ›
          </button>
        </nav>
        <div className="strip-foot">
          <p className="muted small">Lowest sample fare per person on each day.</p>
          {s.tripType === 'round' && (
            <button type="button" className="link-btn" aria-expanded={showFlex} aria-controls="flex-dates" onClick={() => setShowFlex((v) => !v)}>
              {showFlex ? 'Hide flexible dates' : 'Compare date combinations'}
            </button>
          )}
        </div>
        {showFlex && <FlexibleDates onClose={() => setShowFlex(false)} />}

        <section className="toolbar" aria-label="Bags, filters and sorting">
          <fieldset className="bags-pick">
            <legend>Checked bags per traveller</legend>
            <div className="seg">
              {[0, 1, 2].map((b) => (
                <label key={b} className={booking.bags === b ? 'on' : ''}>
                  <input type="radio" name={`bags-${leg}`} value={b} checked={booking.bags === b} onChange={() => dispatch({ type: 'bags', bags: b })} />
                  {b}
                </label>
              ))}
            </div>
            <p className="hint">Bags your fare doesn’t include are added at {money(EXTRA_BAG_PRICE)} each, per journey.</p>
          </fieldset>
          <div className="tool-actions">
            <button type="button" className="btn btn-small btn-soft" aria-expanded={showFilters} aria-controls="filters" onClick={() => setShowFilters((v) => !v)}>
              Filters{!isDefaultFilters(f) ? ' (on)' : ''}
            </button>
            <label className="sort">
              <span>Sort by</span>
              <select value={f.sort} onChange={(e) => setF({ sort: e.target.value as Sort })}>
                {(Object.keys(SORT_LABEL) as Sort[]).map((k) => (
                  <option key={k} value={k}>
                    {SORT_LABEL[k]}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>
        {f.sort === 'recommended' && <p className="muted small sort-note">Recommended balances estimated total, journey time and practical issues. It never favours a pricier fare.</p>}
        {showFilters && (
          <div id="filters" className="filters">
            <fieldset>
              <legend>Stops</legend>
              {(
                [
                  ['any', 'Any number'],
                  ['direct', 'Direct only'],
                  ['max1', 'Up to 1 stop'],
                ] as const
              ).map(([v, l]) => (
                <label key={v} className="radio">
                  <input type="radio" name={`stops-${leg}`} checked={f.stops === v} onChange={() => setF({ stops: v })} />
                  {l}
                </label>
              ))}
            </fieldset>
            <fieldset>
              <legend>Departure time</legend>
              {(['morning', 'afternoon', 'evening'] as Slot[]).map((sl) => (
                <label key={sl} className="check">
                  <input type="checkbox" checked={f.times.includes(sl)} onChange={(e) => setF({ times: e.target.checked ? [...f.times, sl] : f.times.filter((x) => x !== sl) })} />
                  {SLOT_LABEL[sl]}
                </label>
              ))}
            </fieldset>
            <fieldset>
              <legend>Connections</legend>
              <label className="check">
                <input type="checkbox" checked={f.hideSelfTransfer} onChange={(e) => setF({ hideSelfTransfer: e.target.checked })} />
                Hide self-transfer journeys
              </label>
            </fieldset>
            <button type="button" className="btn btn-small btn-outline" disabled={isDefaultFilters(f)} onClick={() => setF({ ...DEFAULT_FILTERS, sort: f.sort })}>
              Reset filters
            </button>
          </div>
        )}

        {shortlist.length > 0 && (
          <div className="shortlist-bar" role="region" aria-label="Shortlist">
            <p>
              <strong>
                {shortlist.length} of {MAX_SHORTLIST}
              </strong>{' '}
              journeys shortlisted
            </p>
            <Link
              to={`/compare/${leg}`}
              className="btn btn-small btn-primary"
              onClick={() => {
                try {
                  sessionStorage.setItem(`wp-scroll-${leg}`, String(window.scrollY));
                } catch {
                  /* ignore */
                }
              }}
            >
              Compare side by side
            </Link>
          </div>
        )}

        <div className="results-head">
          <h2>{isOut ? 'Outbound journeys' : 'Return journeys'}</h2>
          <p className="muted" aria-live="polite">
            Showing {list.length} of {all.length}
          </p>
        </div>

        {all.length === 0 ? (
          <div className="empty">
            <h3>No flights on {mediumDate(date)}</h3>
            <p>There’s no service on this route that day in the sample data. Try a nearby date above, or change your search.</p>
            <Link to="/" className="btn btn-outline btn-small">
              Edit search
            </Link>
          </div>
        ) : list.length === 0 ? (
          <div className="empty">
            <h3>No journeys match your filters</h3>
            <p>
              {all.length} journey{all.length === 1 ? '' : 's'} are hidden by your filters. Remove one, or try another date.
            </p>
            <button type="button" className="btn btn-primary btn-small" onClick={() => setF({ ...DEFAULT_FILTERS, sort: f.sort })}>
              Reset filters
            </button>
          </div>
        ) : (
          <ul className="flight-list">
            {list.map((it) => {
              const open = expanded === it.id;
              const best = cheapestOffer(it);
              const e = best ? journeyEstimate(it, best.cabin, s.pax, booking.bags) : null;
              const isChosen = chosenChoice?.itineraryId === it.id;
              const listed = shortlist.includes(it.id);
              const w = itineraryWarnings(it);
              const tags = [ins.cheapest === it.id && 'Lowest estimated total', ins.fastest === it.id && 'Fastest', ins.easiest === it.id && 'Fewest issues'].filter(Boolean) as string[];
              return (
                <li key={it.id} id={`it-${it.id}`} className={`flight ${isChosen ? 'chosen' : ''} ${open ? 'open' : ''}`}>
                  {(tags.length > 0 || isChosen) && (
                    <p className="tags">
                      {isChosen && <span className="tag chosen-tag">✓ Selected: {cabinName(chosenChoice!.cabin)}</span>}
                      {tags.map((t) => (
                        <span key={t} className="tag">
                          {t}
                        </span>
                      ))}
                    </p>
                  )}
                  <div className="flight-main">
                    <JourneySummary it={it} />
                    <div className="price-col">
                      {best && e ? (
                        <>
                          <p className="pp">
                            <span className="pp-from">from</span> {money(best.price)} <span className="pp-basis">per person</span>
                          </p>
                          <p className="party">
                            Est. {money(e.total)} for {n} traveller{n === 1 ? '' : 's'}
                            {e.extraBags ? ` incl. ${e.extraBags} bag${e.extraBags > 1 ? 's' : ''}` : ''}
                          </p>
                        </>
                      ) : (
                        <p className="party">No fares available</p>
                      )}
                    </div>
                  </div>
                  {cheapest && tradeOff(it, cheapest) && <p className="tradeoff">{tradeOff(it, cheapest)}</p>}
                  <WarningList warnings={w.filter((x) => x.severity !== 'fyi')} compact />
                  <div className="flight-actions">
                    <FlightDetailsButton it={it} />
                    <button
                      type="button"
                      className={`btn btn-small ${listed ? 'btn-soft' : 'btn-ghost'}`}
                      aria-pressed={listed}
                      disabled={!listed && shortlist.length >= MAX_SHORTLIST}
                      title={!listed && shortlist.length >= MAX_SHORTLIST ? `Shortlist holds ${MAX_SHORTLIST}; remove one first` : undefined}
                      onClick={() => dispatch({ type: 'shortlist', leg, id: it.id })}
                    >
                      {listed ? '★ Shortlisted' : '☆ Shortlist'}
                      <span className="sr-only"> journey departing {it.depart}</span>
                    </button>
                    <button type="button" className="btn btn-small btn-primary" aria-expanded={open} aria-controls={`fares-${it.id}`} onClick={() => setExpanded(open ? null : it.id)}>
                      {open ? 'Hide fares' : isChosen ? 'Change fare' : 'Choose fare'}
                      <span className="sr-only"> for the {it.depart} journey</span>
                    </button>
                  </div>
                  {open && (
                    <div className="fare-cards" id={`fares-${it.id}`}>
                      {CABINS.map((c) => {
                        const o = it.fares[c.id];
                        if (!o.available)
                          return (
                            <div key={c.id} className="fare-card unavailable">
                              <h3>{c.name}</h3>
                              <p className="fare-card-price">Not available</p>
                              <p className="muted">{o.reason}</p>
                            </div>
                          );
                        const fe = journeyEstimate(it, c.id, s.pax, booking.bags)!;
                        const sel = isChosen && chosenChoice?.cabin === c.id;
                        return (
                          <div key={c.id} className={`fare-card ${c.id} ${sel ? 'selected' : ''}`}>
                            <h3>{c.name}</h3>
                            <p className="fare-card-price">
                              {money(o.price)} <span>per person</span>
                            </p>
                            <p className="fare-card-total">
                              Est. {money(fe.total)} for {n} traveller{n === 1 ? '' : 's'}
                              {fe.bagCost ? ` (incl. ${money(fe.bagCost)} bags)` : ''}
                            </p>
                            <FareFacts offer={o} />
                            <button type="button" className={`btn btn-block ${sel ? 'btn-selected' : 'btn-primary'}`} aria-pressed={sel} onClick={() => choose(it, c.id)}>
                              {sel ? `✓ ${c.name} selected` : `Select ${c.name}`}
                              <span className="sr-only">, {it.depart} journey</span>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {isChosen && (
                    <div className={`chosen-confirm ${just === it.id ? 'pop' : ''}`} role="status">
                      <p>
                        <strong>✓ {cabinName(chosenChoice!.cabin)} on the {it.depart} journey is selected.</strong> Estimated {money(journeyEstimate(it, chosenChoice!.cabin, s.pax, booking.bags)!.total)} for{' '}
                        {n} traveller{n === 1 ? '' : 's'}.
                      </p>
                      <button type="button" className="btn btn-primary" onClick={() => navigate(nextPath)}>
                        {nextLabel}
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {chosenIt && chosenChoice && (
          <div className="sticky-cta" role="region" aria-label="Your selection">
            <div className="wrap sticky-inner">
              <p>
                <span className="muted">Selected:</span> {chosenIt.depart} → {chosenIt.arrive} · {cabinName(chosenChoice.cabin)} · Est. {money(journeyEstimate(chosenIt, chosenChoice.cabin, s.pax, booking.bags)!.total)}
              </p>
              <button type="button" className="btn btn-primary" onClick={() => navigate(nextPath)}>
                {nextLabel}
              </button>
            </div>
          </div>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
