import React from 'react';
import { CostLine, money, STATUS_LABEL } from '../lib/costs';
import { costs, picks, seatedCount, totalPax, useBooking } from '../lib/booking';
import { airportShort } from '../lib/data';
import { mediumDate, addDays } from '../lib/dates';
import { cabinName, WarningList } from './FlightBits';
import { itineraryWarnings, pairWarnings } from '../lib/warnings';

const GROUPS: { id: CostLine['group']; title: string }[] = [
  { id: 'fare', title: 'Fares' },
  { id: 'extras', title: 'Bags, seats and extras' },
  { id: 'fees', title: 'Taxes and fees' },
  { id: 'external', title: 'Not included in the estimate' },
];

/** Itemised cost table. Every price on the site comes from the same calculation. */
export function CostBreakdown({ title = 'Cost breakdown' }: { title?: string }) {
  const { booking } = useBooking();
  const { lines, total } = costs(booking);
  const s = booking.search;
  if (!s) return null;
  if (!lines.length) return <p className="muted">Choose a flight to see an itemised estimate.</p>;
  const n = totalPax(s.pax);
  return (
    <div className="breakdown">
      <table>
        <caption>
          {title}
          <span className="caption-note">
            All {n} traveller{n === 1 ? '' : 's'}, in pounds (GBP). Sample prices.
          </span>
        </caption>
        {GROUPS.map((g) => {
          const rows = lines.filter((l) => l.group === g.id);
          if (!rows.length) return null;
          return (
            <tbody key={g.id}>
              <tr className="group-row">
                <th colSpan={2} scope="colgroup">
                  {g.title}
                </th>
              </tr>
              {rows.map((l) => (
                <tr key={l.key} className={`st-${l.status}`}>
                  <th scope="row">
                    {l.label}
                    <span className="basis">{l.basis}</span>
                  </th>
                  <td>
                    {l.amount === null ? (
                      <span className="status-chip not-included">{STATUS_LABEL['not-included']}</span>
                    ) : l.status === 'included' ? (
                      <span className="status-chip included">{STATUS_LABEL.included}</span>
                    ) : (
                      money(l.amount)
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          );
        })}
        <tfoot>
          <tr>
            <th scope="row">
              Estimated total
              <span className="basis">for all {n} traveller{n === 1 ? '' : 's'}</span>
            </th>
            <td>{money(total)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

/** Selected journeys, compactly, for the trip bar panel and the summary sidebar. */
export function SelectedJourneys({ showWarnings = true }: { showWarnings?: boolean }) {
  const { booking } = useBooking();
  const ps = picks(booking);
  if (!ps.length) return <p className="muted">No flights chosen yet.</p>;
  const warnings = [...ps.flatMap((p) => itineraryWarnings(p.it).filter((w) => w.severity !== 'fyi').map((w) => ({ ...w, id: `${p.label}-${w.id}`, title: `${p.label}: ${w.title}` }))), ...pairWarnings(ps[0]?.it, ps[1]?.it)];
  return (
    <div className="selected-journeys">
      <ul className="plain">
        {ps.map((p) => (
          <li key={p.label}>
            <strong>{p.label}</strong> · {mediumDate(p.it.date)}
            <br />
            {p.it.depart} {airportShort(p.it.from)} → {p.it.arrive}
            {p.it.arriveDay ? ` (${mediumDate(addDays(p.it.date, p.it.arriveDay))})` : ''} {airportShort(p.it.to)}
            <br />
            <span className="muted">
              {cabinName(p.cabin)} · {p.it.stops ? `${p.it.stops} stop` : 'Direct'}
              {p.seats.some(Boolean) ? ` · Seats ${p.seats.filter(Boolean).join(', ')}` : ''}
            </span>
          </li>
        ))}
      </ul>
      {showWarnings && <WarningList warnings={warnings} compact />}
      {booking.search && (
        <p className="muted small">
          {seatedCount(booking.search.pax)} with seats{booking.search.pax.infants ? `, ${booking.search.pax.infants} infant on lap` : ''} · {booking.bags} checked bag{booking.bags === 1 ? '' : 's'} each
        </p>
      )}
    </div>
  );
}
