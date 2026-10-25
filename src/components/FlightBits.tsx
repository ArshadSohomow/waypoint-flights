import React, { useState } from 'react';
import { Dialog } from './Dialog';
import { airportByCode, Cabin, CABINS, FARE_CONDITIONS, Flight } from '../lib/data';
import { duration, fullDate, shortDate } from '../lib/dates';

export function Times({ f, big }: { f: Flight; big?: boolean }) {
  return (
    <div className={`times ${big ? 'big' : ''}`}>
      <p className="time-range">
        {f.depart} – {f.arrive}
        {f.arrivesNextDay && <sup title="Arrives the next day">+1</sup>}
      </p>
      <p className="codes">
        <span>{f.from}</span>
        <span>{f.to}</span>
      </p>
    </div>
  );
}

export function StopInfo({ f }: { f: Flight }) {
  return (
    <p className="stops">
      Direct <span aria-hidden="true">·</span> <span className="sr-only">,</span> {duration(f.durationMin)}
    </p>
  );
}

export function FlightDetailsButton({ f }: { f: Flight }) {
  const [open, setOpen] = useState(false);
  const a = airportByCode(f.from)!;
  const b = airportByCode(f.to)!;
  return (
    <>
      <button type="button" className="link-btn" onClick={() => setOpen(true)}>
        Flight details<span className="sr-only">, {f.depart} {f.from} to {f.to}</span>
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} title={`Flight ${f.number}`}>
        <dl className="details">
          <dt>Date</dt>
          <dd>{fullDate(f.date)}</dd>
          <dt>Departs</dt>
          <dd>{f.depart} from {a.city} ({a.code})</dd>
          <dt>Arrives</dt>
          <dd>
            {f.arrive}
            {f.arrivesNextDay ? ' the next day' : ''} at {b.city} ({b.code})
          </dd>
          <dt>Flight time</dt>
          <dd>{duration(f.durationMin)}, direct</dd>
          <dt>Aircraft</dt>
          <dd>{f.aircraft}</dd>
          <dt>Operated by</dt>
          <dd>Waypoint Air</dd>
        </dl>
        <p className="muted">Times are local to each airport.</p>
      </Dialog>
    </>
  );
}

export function FareConditionsButton({ cabin, label = 'Fare conditions' }: { cabin: Cabin; label?: string }) {
  const [open, setOpen] = useState(false);
  const c = CABINS.find((x) => x.id === cabin)!;
  return (
    <>
      <button type="button" className="link-btn" onClick={() => setOpen(true)}>
        {label}
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} title={`${c.name} fare conditions`}>
        <ul className="ticks">
          {FARE_CONDITIONS[cabin].map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
        <p className="muted">Sample conditions for this demonstration.</p>
      </Dialog>
    </>
  );
}

export function RouteHeading({ from, to, date, level = 2 }: { from: string; to: string; date?: string; level?: 1 | 2 }) {
  const a = airportByCode(from);
  const b = airportByCode(to);
  const H = level === 1 ? 'h1' : 'h2';
  return (
    <H className="route-heading">
      <span>{a?.city} ({from})</span>
      <span className="arrow" aria-hidden="true">→</span>
      <span className="sr-only"> to </span>
      <span>{b?.city} ({to})</span>
      {date && <span className="route-date">{shortDate(date)}</span>}
    </H>
  );
}
