import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { addDays, fullDate, mediumDate, monthGrid, MONTHS, parseISO, todayISO } from '../lib/dates';
import { lowestFare } from '../lib/data';

const MAX_AHEAD = 330;

type Props = {
  depart: string;
  ret: string | null;
  round: boolean;
  onChange: (depart: string, ret: string | null) => void;
  departError?: string;
  returnError?: string;
  from?: string;
  to?: string;
};

export function DateRange({ depart, ret, round, onChange, departError, returnError, from, to }: Props) {
  const [open, setOpen] = useState<null | 'depart' | 'return'>(null);
  const [draftD, setDraftD] = useState(depart);
  const [draftR, setDraftR] = useState<string | null>(ret);
  const today = todayISO();
  const last = addDays(today, MAX_AHEAD);
  const start = parseISO(depart || today);
  const [view, setView] = useState({ y: start.getUTCFullYear(), m: start.getUTCMonth() });
  const [focusDate, setFocusDate] = useState(depart || today);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const id = useId();

  const openFor = (which: 'depart' | 'return', el: HTMLButtonElement) => {
    triggerRef.current = el;
    setDraftD(depart);
    setDraftR(ret);
    const anchor = (which === 'return' && ret) || depart || today;
    const d = parseISO(anchor);
    setView({ y: d.getUTCFullYear(), m: d.getUTCMonth() });
    setFocusDate(anchor);
    setOpen(which);
  };
  const close = () => {
    setOpen(null);
    triggerRef.current?.focus();
  };

  // Keep keyboard focus on the focused day.
  useEffect(() => {
    if (!open) return;
    const el = panelRef.current?.querySelector<HTMLButtonElement>(`[data-date="${focusDate}"]`);
    el?.focus();
  }, [open, focusDate, view]);

  // Close when clicking outside.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node) && !(e.target as HTMLElement).closest('.date-trigger')) setOpen(null);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const pick = (d: string) => {
    if (open === 'depart' || !round) {
      setDraftD(d);
      if (round) {
        if (draftR && draftR < d) setDraftR(null);
        setOpen('return');
      }
    } else {
      if (!draftD || d < draftD) {
        setDraftD(d);
        setDraftR(null);
      } else setDraftR(d);
    }
    setFocusDate(d);
  };

  const move = (delta: number) => {
    let next = addDays(focusDate, delta);
    if (next < today) next = today;
    if (next > last) next = last;
    const nd = parseISO(next);
    const viewStart = Date.UTC(view.y, view.m, 1);
    const viewEnd = Date.UTC(view.y, view.m + 2, 0);
    if (nd.getTime() < viewStart || nd.getTime() > viewEnd) setView({ y: nd.getUTCFullYear(), m: nd.getUTCMonth() });
    setFocusDate(next);
  };

  const shiftView = (n: number) => {
    const d = new Date(Date.UTC(view.y, view.m + n, 1));
    setView({ y: d.getUTCFullYear(), m: d.getUTCMonth() });
    const iso = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-01`;
    setFocusDate(iso < today ? today : iso);
  };

  const canPrev = Date.UTC(view.y, view.m, 1) > parseISO(today).getTime();
  const canNext = Date.UTC(view.y, view.m + 1, 1) <= parseISO(last).getTime();
  const months = [0, 1].map((k) => {
    const d = new Date(Date.UTC(view.y, view.m + k, 1));
    return { y: d.getUTCFullYear(), m: d.getUTCMonth() };
  });

  const confirmDisabled = !draftD || (round && !draftR);
  // Sample price per day for the leg being chosen: outbound uses from→to, return uses to→from.
  const priced = !!from && !!to && from !== to;
  const prices = useMemo(() => {
    const m = new Map<string, number | null>();
    if (!priced || !open) return m;
    const [a, b] = open === 'return' && round ? [to!, from!] : [from!, to!];
    for (const { y, m: mo } of months) for (const week of monthGrid(y, mo)) for (const d of week) if (d && d >= today && d <= last) m.set(d, lowestFare(a, b, d));
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [priced, open, from, to, view.y, view.m, round]);


  return (
    <div className="date-range">
      <div className={`field ${departError ? 'has-error' : ''}`}>
        <span className="label" id={`${id}-dl`}>Departure date</span>
        <button type="button" className="date-trigger input" aria-labelledby={`${id}-dl ${id}-dv`} aria-haspopup="dialog" aria-expanded={!!open} onClick={(e) => openFor('depart', e.currentTarget)}>
          <span id={`${id}-dv`} className={depart ? '' : 'placeholder'}>{depart ? mediumDate(depart) : 'Select date'}</span>
          <CalendarIcon />
        </button>
        {departError && <p className="field-error">{departError}</p>}
      </div>
      {round && (
        <div className={`field ${returnError ? 'has-error' : ''}`}>
          <span className="label" id={`${id}-rl`}>Return date</span>
          <button type="button" className="date-trigger input" aria-labelledby={`${id}-rl ${id}-rv`} aria-haspopup="dialog" aria-expanded={!!open} onClick={(e) => openFor('return', e.currentTarget)}>
            <span id={`${id}-rv`} className={ret ? '' : 'placeholder'}>{ret ? mediumDate(ret) : 'Select date'}</span>
            <CalendarIcon />
          </button>
          {returnError && <p className="field-error">{returnError}</p>}
        </div>
      )}

      {open && (
        <div
          ref={panelRef}
          className="date-panel"
          role="dialog"
          aria-modal="false"
          aria-label={open === 'depart' ? 'Choose departure date' : 'Choose return date'}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.stopPropagation();
              close();
            }
          }}
        >
          <div className="date-panel-head">
            <p className="date-panel-hint" aria-live="polite">
              {open === 'depart' || !round ? 'Select your departure date' : 'Now select your return date'}
            </p>
            <button type="button" className="close-btn" onClick={close}>
              <span aria-hidden="true">✕</span> Close
            </button>
          </div>
          <div className="month-nav">
            <button type="button" className="icon-btn" aria-label="Previous month" disabled={!canPrev} onClick={() => shiftView(-1)}>‹</button>
            <button type="button" className="icon-btn" aria-label="Next month" disabled={!canNext} onClick={() => shiftView(1)}>›</button>
          </div>
          <div className="months">
            {months.map(({ y, m }, k) => (
              <div className={`month ${k === 1 ? 'second' : ''}`} key={`${y}-${m}`}>
                <h3 className="month-title">{MONTHS[m]} {y}</h3>
                <table className="cal" role="grid">
                  <thead>
                    <tr>
                      {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                        <th key={i} scope="col" abbr={['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][i]}>{d}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {monthGrid(y, m).map((week, wi) => (
                      <tr key={wi}>
                        {week.map((d, di) => {
                          if (!d) return <td key={di} />;
                          const price = prices.get(d);
                          const noFlights = priced && price === null;
                          const disabled = d < today || d > last || noFlights;
                          const isStart = d === draftD;
                          const isEnd = d === draftR;
                          const inRange = !!draftD && !!draftR && d > draftD && d < draftR;
                          return (
                            <td key={di} className={`${isStart || isEnd ? 'sel' : ''} ${inRange ? 'range' : ''} ${isStart && draftR ? 'start' : ''} ${isEnd ? 'end' : ''} ${d === today ? 'today' : ''}`}>
                              <button
                                type="button"
                                data-date={d}
                                tabIndex={d === focusDate ? 0 : -1}
                                disabled={disabled}
                                aria-pressed={isStart || isEnd}
                                aria-label={`${fullDate(d)}${d === today ? ', today' : ''}${isStart ? ', departure' : ''}${isEnd ? ', return' : ''}${noFlights ? ', no flights' : price ? `, from ${'£' + price} per person, sample` : ''}`}
                                onClick={() => pick(d)}
                                onKeyDown={(e) => {
                                  const map: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
                                  if (e.key in map) {
                                    e.preventDefault();
                                    move(map[e.key]);
                                  }
                                }}
                              >
                                <span className="cal-day">{Number(d.slice(8))}</span>
                                {priced && !(d < today || d > last) && <span className="cal-price">{price ? `£${price}` : '–'}</span>}
                                {isStart && <span className="cal-tag">{round ? 'Out' : 'Go'}</span>}
                                {isEnd && <span className="cal-tag">Back</span>}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
          <p className="cal-legend">
            <span><i className="lg-sel" aria-hidden="true" /> Selected</span>
            {round && <span><i className="lg-range" aria-hidden="true" /> Trip range</span>}
            <span><i className="lg-today" aria-hidden="true" /> Today</span>
            {priced ? <span>£ = lowest sample fare per person{open === 'return' ? ' for the return' : ''}; – = no flights</span> : <span>Choose both airports to see sample prices.</span>}
          </p>
          <div className="date-actions">
            <button type="button" className="btn btn-ghost" onClick={() => { setDraftD(''); setDraftR(null); setOpen('depart'); }}>
              Clear
            </button>
            <span className="grow" />
            <button type="button" className="btn btn-ghost" onClick={close}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={confirmDisabled}
              onClick={() => {
                onChange(draftD, round ? draftR : null);
                close();
              }}
            >
              Confirm
            </button>
          </div>
          {confirmDisabled && <p className="muted small confirm-why">{!draftD ? 'Select a departure date to confirm.' : 'Select a return date to confirm, or switch to one way.'}</p>}
        </div>
      )}
    </div>
  );
}

function CalendarIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
      <rect x="3" y="4.5" width="14" height="12.5" rx="2" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M3 8.5h14M7 2.5v4M13 2.5v4" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}
