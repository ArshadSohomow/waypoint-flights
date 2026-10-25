import React, { useState } from 'react';
import { BookingHeader, SiteFooter } from '../components/Chrome';
import { Dialog } from '../components/Dialog';
import { RouteHeading, Times } from '../components/FlightBits';
import { chosenFlight, Leg, money, progress, seatedCount, seatedLabels, useBooking } from '../lib/booking';
import { FRONT_ROW_PRICE, isFrontRow, SEAT_COLS, SEAT_ROWS, seatPosition, SERVICES, unavailableSeats } from '../lib/data';
import { fullDate, shortDate } from '../lib/dates';
import { Redirect, useRouter } from '../lib/router';

export function SeatsPage({ leg }: { leg: Leg }) {
  const { booking, dispatch } = useBooking();
  const { navigate } = useRouter();
  const [active, setActive] = useState(0);
  const [focusSeat, setFocusSeat] = useState('3A');
  const [info, setInfo] = useState<null | 'front' | 'assist'>(null);
  const [notice, setNotice] = useState('');
  const s = booking.search;
  const p = progress(booking);

  if (!s) return <Redirect to="/" />;
  if (!p.flights) return <Redirect to="/review" />;
  const isOut = leg === 'outbound';
  if (!isOut && s.tripType !== 'round') return <Redirect to="/summary" />;
  const choice = isOut ? booking.outbound! : booking.ret!;
  const f = chosenFlight(choice)!;
  const labels = seatedLabels(s.pax);
  const mine = booking.seats[leg];
  const taken = unavailableSeats(f.id);
  const paidFront = choice.cabin === 'economy';
  const done = labels.every((_, i) => !!mine[i]);

  const assign = (seat: string) => {
    const owner = mine.findIndex((x) => x === seat);
    if (owner === active) {
      dispatch({ type: 'seat', leg, index: active, seat: null });
      setNotice(`Seat ${seat} removed for ${labels[active]}.`);
      return;
    }
    if (owner >= 0) {
      setNotice(`Seat ${seat} is already chosen for ${labels[owner]}.`);
      return;
    }
    dispatch({ type: 'seat', leg, index: active, seat });
    setNotice(`Seat ${seat} chosen for ${labels[active]}.`);
    const nextEmpty = labels.findIndex((_, i) => i !== active && !mine[i]);
    if (nextEmpty >= 0) setActive(nextEmpty);
  };

  const autoAssign = () => {
    const free: string[] = [];
    for (let r = 3; r <= SEAT_ROWS; r++) for (const c of SEAT_COLS) {
      const seat = `${r}${c}`;
      if (!taken.has(seat) && !mine.includes(seat)) free.push(seat);
    }
    labels.forEach((_, i) => {
      if (!mine[i] && free.length) dispatch({ type: 'seat', leg, index: i, seat: free.shift()! });
    });
    setNotice('We have chosen free seats for everyone without one.');
  };

  const next = () => navigate(isOut && s.tripType === 'round' ? '/seats/return' : '/summary');

  const moveFocus = (seat: string, key: string) => {
    let r = Number(seat.slice(0, -1));
    let c = SEAT_COLS.indexOf(seat.slice(-1) as any);
    if (key === 'ArrowUp') r = Math.max(1, r - 1);
    else if (key === 'ArrowDown') r = Math.min(SEAT_ROWS, r + 1);
    else if (key === 'ArrowLeft') c = Math.max(0, c - 1);
    else if (key === 'ArrowRight') c = Math.min(SEAT_COLS.length - 1, c + 1);
    else return false;
    const id = `${r}${SEAT_COLS[c]}`;
    setFocusSeat(id);
    document.querySelector<HTMLButtonElement>(`[data-seat="${id}"]`)?.focus();
    return true;
  };

  return (
    <>
      <BookingHeader step={2} />
      <main id="main" className="wrap page-seats">
        <p className="eyebrow">Step 2 of 5 · {isOut ? 'Outbound' : 'Return'} seats</p>
        <h1>Select your seat{labels.length > 1 ? 's' : ''}</h1>
        <div className="seats-layout">
          <div className="plane" role="grid" aria-label={`Seat map, ${shortDate(f.date)} ${f.from} to ${f.to}`} aria-describedby="seat-help">
            <div className="plane-nose" aria-hidden="true" />
            <div className="seat-cols" aria-hidden="true">
              <span>A</span><span>B</span><span /><span>C</span><span>D</span>
            </div>
            {Array.from({ length: SEAT_ROWS }, (_, i) => i + 1).map((r) => (
              <div className="seat-row" role="row" key={r}>
                {SEAT_COLS.map((c, ci) => {
                  const seat = `${r}${c}`;
                  const unavailable = taken.has(seat);
                  const owner = mine.findIndex((x) => x === seat);
                  const front = isFrontRow(seat);
                  const label = `Seat ${seat}, ${seatPosition(seat).toLowerCase()}${front ? `, Front Row${paidFront ? ` ${money(FRONT_ROW_PRICE)}` : ', included'}` : ''}, ${
                    unavailable ? 'unavailable' : owner >= 0 ? `selected for ${labels[owner]}` : 'available'
                  }`;
                  return (
                    <React.Fragment key={seat}>
                      {ci === 2 && (
                        <span className="row-num" aria-hidden="true">
                          {r}
                        </span>
                      )}
                      <span role="gridcell">
                        <button
                          type="button"
                          data-seat={seat}
                          className={`seat ${front ? 'front' : ''} ${unavailable ? 'taken' : ''} ${owner >= 0 ? 'mine' : ''} ${owner === active ? 'mine-active' : ''}`}
                          aria-label={label}
                          aria-pressed={owner >= 0}
                          aria-disabled={unavailable}
                          tabIndex={seat === focusSeat ? 0 : -1}
                          onFocus={() => setFocusSeat(seat)}
                          onKeyDown={(e) => moveFocus(seat, e.key) && e.preventDefault()}
                          onClick={() => !unavailable && assign(seat)}
                        >
                          {owner >= 0 ? <span className="seat-tag">{labels.length > 1 ? owner + 1 : '✓'}</span> : unavailable ? <span aria-hidden="true">✕</span> : null}
                        </button>
                      </span>
                    </React.Fragment>
                  );
                })}
              </div>
            ))}
            <div className="plane-tail" aria-hidden="true" />
          </div>

          <div className="seats-side">
            <RouteHeading from={f.from} to={f.to} />
            <p className="leg-date">{fullDate(f.date)}</p>
            <Times f={f} big />

            <ul className="legend" aria-label="Seat key">
              <li><span className="seat front sample" aria-hidden="true" /> Front Row {paidFront ? `+${money(FRONT_ROW_PRICE)}` : '(included)'}</li>
              <li><span className="seat sample" aria-hidden="true" /> Economy</li>
              <li><span className="seat mine sample" aria-hidden="true" /> Selected</li>
              <li><span className="seat taken sample" aria-hidden="true">✕</span> Unavailable</li>
            </ul>
            <p id="seat-help" className="muted small">Use the arrow keys to move between seats and Enter to choose.</p>

            <div className="promo-cards">
              <div className="promo">
                <p>Prefer the leather seats and extra legroom of Front Row?</p>
                <button type="button" className="link-btn" onClick={() => setInfo('front')}>About Front Row seats</button>
              </div>
              <div className="promo">
                <p>We provide mobility assistance and special services at every step. Tell us now and we’ll be ready.</p>
                <button type="button" className="link-btn" onClick={() => setInfo('assist')}>Assistance and services</button>
              </div>
            </div>
          </div>
        </div>

        <div className="seat-footer">
          <fieldset className="who">
            <legend>{labels.length > 1 ? 'Choosing a seat for' : 'Your seat'}</legend>
            {labels.map((l, i) => (
              <label key={l} className={`who-chip ${i === active ? 'active' : ''}`}>
                <input type="radio" name="who" checked={i === active} onChange={() => setActive(i)} className="sr-only" />
                <span>{l}</span>
                <strong>{mine[i] || '—'}</strong>
              </label>
            ))}
          </fieldset>
          <p className="sr-only" aria-live="polite">{notice}</p>
          <div className="seat-actions">
            {!done && (
              <button type="button" className="btn btn-ghost" onClick={autoAssign}>
                Choose for me
              </button>
            )}
            <button type="button" className="btn btn-primary btn-lg" disabled={!done} aria-describedby={!done ? 'seat-need' : undefined} onClick={next}>
              Continue
            </button>
          </div>
          {!done && (
            <p id="seat-need" className="muted small">
              Choose a seat for each passenger, or let us choose free ones.
            </p>
          )}
        </div>
      </main>
      <SiteFooter />

      <Dialog open={info === 'front'} onClose={() => setInfo(null)} title="Front Row seats">
        <p>Rows 1 and 2 have leather seats, extra legroom and are first off the plane.</p>
        <p>{paidFront ? `They cost ${money(FRONT_ROW_PRICE)} per seat, per flight, on Economy fares.` : 'They are included with your fare.'}</p>
      </Dialog>
      <Dialog open={info === 'assist'} onClose={() => setInfo(null)} title="Assistance and services">
        {SERVICES.slice(0, 3).map((x) => (
          <div key={x.id} className="service-block">
            <h3>{x.name}</h3>
            <p>{x.body}</p>
          </div>
        ))}
      </Dialog>
    </>
  );
}
