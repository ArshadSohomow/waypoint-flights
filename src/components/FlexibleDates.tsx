import React, { useMemo } from 'react';
import { money, useBooking } from '../lib/booking';
import { lowestFare } from '../lib/data';
import { addDays, fullDate, shortDate, todayISO } from '../lib/dates';
import { useRouter } from '../lib/router';
import { SampleTag } from './FlightBits';

/** A ±3-day grid of outbound × return dates with the lowest combined sample fare per person. */
export function FlexibleDates({ onClose }: { onClose: () => void }) {
  const { booking, dispatch } = useBooking();
  const { navigate, path } = useRouter();
  const s = booking.search!;
  const today = todayISO();
  const outs = Array.from({ length: 7 }, (_, i) => addDays(s.depart, i - 3));
  const rets = Array.from({ length: 7 }, (_, i) => addDays(s.ret!, i - 3));
  const grid = useMemo(() => {
    const o = new Map(outs.map((d) => [d, d < today ? null : lowestFare(s.from, s.to, d)]));
    const r = new Map(rets.map((d) => [d, d < today ? null : lowestFare(s.to, s.from, d)]));
    return outs.map((od) =>
      rets.map((rd) => {
        const a = o.get(od);
        const b = r.get(rd);
        return rd < od || a == null || b == null ? null : a + b;
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.from, s.to, s.depart, s.ret]);
  const min = Math.min(...grid.flat().filter((x): x is number => x !== null));

  const pick = (od: string, rd: string) => {
    if (od === s.depart && rd === s.ret) return onClose();
    dispatch({ type: 'search', search: { ...s, depart: od, ret: rd } });
    onClose();
    if (path !== '/flights/outbound') navigate('/flights/outbound');
  };

  return (
    <section id="flex-dates" className="flex-dates" aria-labelledby="flex-h">
      <div className="flex-head">
        <h2 id="flex-h">Compare date combinations</h2>
        <button type="button" className="close-btn" onClick={onClose}>
          <span aria-hidden="true">✕</span> Close
        </button>
      </div>
      <p className="muted small">
        <SampleTag>Sample data</SampleTag> Lowest Economy fare per person, outbound plus return. Picking new dates clears any flights you’ve already chosen.
      </p>
      <div className="flex-scroll">
        <table className="flex-grid">
          <caption className="sr-only">Outbound dates in rows, return dates in columns</caption>
          <thead>
            <tr>
              <th scope="col" className="corner">
                <span>Out ↓</span> <span>Return →</span>
              </th>
              {rets.map((rd) => (
                <th key={rd} scope="col" className={rd === s.ret ? 'cur' : ''}>
                  {shortDate(rd)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {outs.map((od, i) => (
              <tr key={od}>
                <th scope="row" className={od === s.depart ? 'cur' : ''}>
                  {shortDate(od)}
                </th>
                {rets.map((rd, j) => {
                  const v = grid[i][j];
                  const current = od === s.depart && rd === s.ret;
                  return (
                    <td key={rd} className={`${current ? 'current' : ''} ${v === min ? 'lowest' : ''}`}>
                      {v === null ? (
                        <span className="na" aria-label={`${fullDate(od)} to ${fullDate(rd)}: not available`}>
                          —
                        </span>
                      ) : (
                        <button type="button" aria-pressed={current} aria-label={`Out ${fullDate(od)}, back ${fullDate(rd)}: from ${money(v)} per person${v === min ? ', lowest in this grid' : ''}`} onClick={() => pick(od, rd)}>
                          {money(v)}
                          {v === min && <span className="lowest-mark">Lowest</span>}
                        </button>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="muted small">“—” means the return would be before the outbound date, a date has passed, or there are no flights.</p>
    </section>
  );
}
