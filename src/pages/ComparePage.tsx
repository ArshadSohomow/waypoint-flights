import React from 'react';
import { BookingHeader, SiteFooter } from '../components/Chrome';
import { bagsText, cabinName, RouteHeading, stopText } from '../components/FlightBits';
import { Leg, MAX_SHORTLIST, money, totalPax, useBooking } from '../lib/booking';
import { airportShort, CABINS, findItinerary, Itinerary, offerOf } from '../lib/data';
import { journeyEstimate } from '../lib/costs';
import { itineraryWarnings, SEVERITY_LABEL } from '../lib/warnings';
import { addDays, duration, mediumDate } from '../lib/dates';
import { Link, Redirect, useRouter } from '../lib/router';
import { insights } from './FlightsPage';

const cheapest = (it: Itinerary) =>
  CABINS.map((c) => offerOf(it, c.id))
    .filter((o): o is NonNullable<typeof o> => !!o)
    .sort((a, b) => a.price - b.price)[0];

export function ComparePage({ leg }: { leg: Leg }) {
  const { booking, dispatch } = useBooking();
  const { navigate } = useRouter();
  const s = booking.search;
  if (!s) return <Redirect to="/" />;
  if (leg === 'return' && s.tripType !== 'round') return <Redirect to="/compare/outbound" />;
  const its = booking.shortlist[leg].map(findItinerary).filter((x): x is Itinerary => !!x);
  const n = totalPax(s.pax);
  const back = `/flights/${leg}`;
  const est = (it: Itinerary) => {
    const o = cheapest(it);
    return o ? journeyEstimate(it, o.cabin, s.pax, booking.bags)!.total : Infinity;
  };
  const ins = insights(its, est);

  const choose = (it: Itinerary, cabin: (typeof CABINS)[number]['id']) => {
    dispatch({ type: 'choose', leg, choice: { itineraryId: it.id, cabin } });
    navigate(back);
  };

  type Row = { label: string; cell: (it: Itinerary) => React.ReactNode };
  const rows: Row[] = [
    { label: 'Departs', cell: (it) => <><strong>{it.depart}</strong> {mediumDate(it.date)}<br /><span className="muted">{airportShort(it.from)}</span></> },
    { label: 'Arrives', cell: (it) => <><strong>{it.arrive}</strong> {mediumDate(addDays(it.date, it.arriveDay))}{it.arriveDay > 0 && <span className="day-change"> next day</span>}<br /><span className="muted">{airportShort(it.to)}</span></> },
    { label: 'Journey time', cell: (it) => duration(it.durationMin) },
    { label: 'Stops', cell: (it) => stopText(it) },
    { label: 'Layovers', cell: (it) => (it.layovers.length ? it.layovers.map((l, i) => <div key={i}>{duration(l.minutes)}{l.overnight ? ', overnight' : ''}</div>) : 'None') },
    { label: 'Airport change', cell: (it) => (it.layovers.some((l) => l.arriveAt !== l.departFrom) ? <strong>Yes</strong> : 'No') },
    { label: 'Ticketing', cell: (it) => (it.selfTransfer ? <strong>Two separate tickets (self-transfer)</strong> : 'One ticket') },
    { label: 'Lowest fare, per person', cell: (it) => { const o = cheapest(it); return o ? `${money(o.price)} (${cabinName(o.cabin)})` : 'None'; } },
    { label: `Estimated total, ${n} traveller${n === 1 ? '' : 's'}`, cell: (it) => { const e = est(it); return e === Infinity ? '—' : <strong>{money(e)}</strong>; } },
    { label: 'Checked bags in that fare', cell: (it) => { const o = cheapest(it); return o ? bagsText(o.bags).checked : '—'; } },
    { label: 'Changes / refunds', cell: (it) => { const o = cheapest(it); return o ? `${{ free: 'Free changes', fee: 'Changes for a fee', 'not-allowed': 'No changes', unknown: 'Change rules not supplied' }[o.rules.changes]} · ${{ full: 'Refundable', partial: 'Partly refundable', none: 'Non-refundable', unknown: 'Refund rules not supplied' }[o.rules.refund]}` : '—'; } },
    {
      label: 'Things to check',
      cell: (it) => {
        const w = itineraryWarnings(it);
        return w.length ? (
          <ul className="plain small">
            {w.map((x) => (
              <li key={x.id}>
                <span className={`sev sev-${x.severity}`}>{SEVERITY_LABEL[x.severity]}</span> {x.title}
              </li>
            ))}
          </ul>
        ) : (
          'Nothing flagged'
        );
      },
    },
  ];
  const tagsFor = (it: Itinerary) => [ins.cheapest === it.id && 'Lowest estimated total', ins.fastest === it.id && 'Fastest', ins.easiest === it.id && 'Fewest issues'].filter(Boolean) as string[];
  const actions = (it: Itinerary) => (
    <div className="cmp-actions">
      {CABINS.map((c) => {
        const o = it.fares[c.id];
        return o.available ? (
          <button key={c.id} type="button" className="btn btn-small btn-primary" onClick={() => choose(it, c.id)}>
            Select {c.name} · {money(o.price)} pp
          </button>
        ) : null;
      })}
      <button type="button" className="btn btn-small btn-ghost" onClick={() => dispatch({ type: 'shortlist', leg, id: it.id })}>
        Remove from comparison<span className="sr-only">: the {it.depart} journey</span>
      </button>
    </div>
  );

  return (
    <>
      <BookingHeader step={1} />
      <main id="main" className="wrap page-compare">
        <p className="eyebrow">Step 1 of 5 · Compare {leg === 'outbound' ? 'outbound' : 'return'} journeys</p>
        <h1>Compare side by side</h1>
        <RouteHeading from={leg === 'outbound' ? s.from : s.to} to={leg === 'outbound' ? s.to : s.from} level={2} className="sub-route" />
        <p className="data-status">
          Sample prices in GBP, using the cheapest available fare on each journey and your {booking.bags} checked bag{booking.bags === 1 ? '' : 's'} per traveller. Up to {MAX_SHORTLIST} journeys.
        </p>
        <p>
          <Link to={back} className="btn btn-small btn-outline">
            ← Back to results
          </Link>
        </p>
        {its.length === 0 ? (
          <div className="empty">
            <h2>Nothing to compare yet</h2>
            <p>Use “☆ Shortlist” on up to {MAX_SHORTLIST} journeys in the results, then come back here.</p>
          </div>
        ) : (
          <>
            {its.length === 1 && <p className="muted">Add at least one more journey to compare.</p>}
            <div className="cmp-table-wrap">
              <table className="cmp-table">
                <caption className="sr-only">Shortlisted journeys compared</caption>
                <thead>
                  <tr>
                    <td />
                    {its.map((it) => (
                      <th key={it.id} scope="col">
                        {it.depart} → {it.arrive}
                        <div className="tags">
                          {tagsFor(it).map((t) => (
                            <span key={t} className="tag">
                              {t}
                            </span>
                          ))}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.label}>
                      <th scope="row">{r.label}</th>
                      {its.map((it) => (
                        <td key={it.id}>{r.cell(it)}</td>
                      ))}
                    </tr>
                  ))}
                  <tr>
                    <th scope="row">Choose</th>
                    {its.map((it) => (
                      <td key={it.id}>{actions(it)}</td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
            <ul className="cmp-cards">
              {its.map((it) => (
                <li key={it.id} className="panel">
                  <h2 className="cmp-card-title">
                    {it.depart} → {it.arrive}
                  </h2>
                  <div className="tags">
                    {tagsFor(it).map((t) => (
                      <span key={t} className="tag">
                        {t}
                      </span>
                    ))}
                  </div>
                  <dl className="details">
                    {rows.map((r) => (
                      <React.Fragment key={r.label}>
                        <dt>{r.label}</dt>
                        <dd>{r.cell(it)}</dd>
                      </React.Fragment>
                    ))}
                  </dl>
                  {actions(it)}
                </li>
              ))}
            </ul>
          </>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
