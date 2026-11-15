import React, { useState } from 'react';
import { Dialog } from './Dialog';
import { airportByCode, airportShort, Bags, Cabin, CABINS, FareOffer, Itinerary, placeShort } from '../lib/data';
import { addDays, duration, mediumDate, shortDate } from '../lib/dates';
import { itineraryWarnings, JourneyWarning, SEVERITY_LABEL } from '../lib/warnings';

const city = (code: string) => airportByCode(code)?.city ?? code;
const dayLabel = (base: string, offset: number) => shortDate(addDays(base, offset));

/** Depart / arrive summary with explicit labels, day changes and stops. */
export function JourneySummary({ it, big }: { it: Itinerary; big?: boolean }) {
  return (
    <div className={`journey ${big ? 'big' : ''}`}>
      <div className="jp">
        <span className="jp-label">Departs</span>
        <span className="jp-time">{it.depart}</span>
        <span className="jp-code" title={airportShort(it.from)}>
          {it.from}
        </span>
      </div>
      <div className="jp-line" aria-hidden="true">
        <span className="jp-dur">{duration(it.durationMin)}</span>
        <span className="jp-track">
          {it.layovers.map((_, i) => (
            <i key={i} className="jp-stop" />
          ))}
        </span>
        <span className="jp-stops">{stopText(it)}</span>
      </div>
      <div className="jp">
        <span className="jp-label">Arrives</span>
        <span className="jp-time">
          {it.arrive}
          {it.arriveDay > 0 && (
            <span className="day-change" title={`Arrives ${dayLabel(it.date, it.arriveDay)}`}>
              +{it.arriveDay}
            </span>
          )}
        </span>
        <span className="jp-code" title={airportShort(it.to)}>
          {it.to}
        </span>
      </div>
      <p className="sr-only">
        Departs {it.depart} from {airportShort(it.from)}, arrives {it.arrive}
        {it.arriveDay > 0 ? ` on ${dayLabel(it.date, it.arriveDay)}` : ''} at {airportShort(it.to)}. {duration(it.durationMin)} total, {stopText(it)}.
      </p>
    </div>
  );
}

export function stopText(it: Itinerary) {
  if (!it.stops) return 'Direct';
  return `${it.stops} stop${it.stops > 1 ? 's' : ''} · ${it.layovers.map((l) => (l.arriveAt === l.departFrom ? l.arriveAt : `${l.arriveAt}→${l.departFrom}`)).join(', ')}`;
}

/** Chronological itinerary: every flight and layover, with local dates and times. */
export function Timeline({ it }: { it: Itinerary }) {
  return (
    <ol className="timeline" aria-label="Itinerary, in order">
      {it.segments.map((s, i) => (
        <React.Fragment key={i}>
          <li className="tl-flight">
            <div className="tl-row">
              <span className="tl-when">
                <span className="tl-label">Departs</span> <strong>{s.depart}</strong> <span className="tl-date">{dayLabel(it.date, s.departDay)}</span>
              </span>
              <span className="tl-where">{airportShort(s.from)}</span>
            </div>
            <p className="tl-meta">
              Flight {s.number} · {s.carrier} · {s.aircraft} · {duration(s.durationMin)} flight
            </p>
            <div className="tl-row">
              <span className="tl-when">
                <span className="tl-label">Arrives</span> <strong>{s.arrive}</strong> <span className="tl-date">{dayLabel(it.date, s.arriveDay)}</span>
              </span>
              <span className="tl-where">{airportShort(s.to)}</span>
            </div>
          </li>
          {it.layovers[i] && (
            <li className={`tl-layover ${it.layovers[i].arriveAt !== it.layovers[i].departFrom ? 'change' : ''}`}>
              <span className="tl-label">Layover</span> {duration(it.layovers[i].minutes)} in {city(it.layovers[i].arriveAt)}
              {it.layovers[i].arriveAt !== it.layovers[i].departFrom && (
                <strong>
                  {' '}
                  · change airports: {it.layovers[i].arriveAt} → {it.layovers[i].departFrom}
                </strong>
              )}
              {it.layovers[i].overnight && <strong> · overnight</strong>}
              {it.selfTransfer && <span> · self-transfer, separate ticket</span>}
            </li>
          )}
        </React.Fragment>
      ))}
      <li className="tl-note">Times are local to each airport.</li>
    </ol>
  );
}

export function WarningList({ warnings, compact }: { warnings: JourneyWarning[]; compact?: boolean }) {
  if (!warnings.length) return null;
  return (
    <ul className={`warnings ${compact ? 'compact' : ''}`} aria-label="Things to know about this journey">
      {warnings.map((w) => (
        <li key={w.id} className={`warn ${w.severity}`}>
          <span className={`sev sev-${w.severity}`}>
            <span aria-hidden="true">{w.severity === 'important' ? '!' : w.severity === 'check' ? '?' : 'i'}</span> {SEVERITY_LABEL[w.severity]}
          </span>
          <span className="warn-title">{w.title}</span>
          {!compact && (
            <details className="warn-more">
              <summary>Why this matters</summary>
              <p>{w.why}</p>
              <p>
                <strong>What to do:</strong> {w.next}
              </p>
              {w.basis === 'possible' && <p className="muted small">This is a possible consideration, not a confirmed outcome.</p>}
              {w.link && (
                <p className="small">
                  <a href={w.link.href} target="_blank" rel="noopener noreferrer">
                    {w.link.label} (opens in a new tab)
                  </a>{' '}
                  · {w.link.covers}
                </p>
              )}
            </details>
          )}
        </li>
      ))}
    </ul>
  );
}

export function bagsText(b: Bags) {
  const cabin = `${b.cabinBags} cabin bag${b.cabinBags > 1 ? 's' : ''}${b.cabinKg ? ` up to ${b.cabinKg} kg` : ''}`;
  const checked = b.checkedBags ? `${b.checkedBags} checked bag${b.checkedBags > 1 ? 's' : ''}${b.checkedKg ? ` up to ${b.checkedKg} kg` : ''}` : 'No checked bag';
  return { cabin, checked };
}

/** What a fare includes, in plain language. */
export function FareFacts({ offer }: { offer: Extract<FareOffer, { available: true }> }) {
  const b = bagsText(offer.bags);
  const ch = { free: 'Changes: free', fee: 'Changes: allowed for a fee', 'not-allowed': 'Changes: not allowed', unknown: 'Changes: rules not supplied' }[offer.rules.changes];
  const rf = { full: 'Refund: yes', partial: 'Refund: partial', none: 'Refund: no', unknown: 'Refund: rules not supplied' }[offer.rules.refund];
  return (
    <ul className="facts">
      <li className="yes">{b.cabin}</li>
      <li className={offer.bags.checkedBags ? 'yes' : 'no'}>{b.checked}</li>
      {offer.perks.map((p) => (
        <li key={p} className="yes">
          {p}
        </li>
      ))}
      <li className={offer.rules.changes === 'free' ? 'yes' : offer.rules.changes === 'unknown' ? 'unknown' : 'part'}>{ch}</li>
      <li className={offer.rules.refund === 'full' ? 'yes' : offer.rules.refund === 'unknown' ? 'unknown' : 'no'}>{rf}</li>
    </ul>
  );
}

export function FareConditionsButton({ offer, label }: { offer: Extract<FareOffer, { available: true }>; label?: string }) {
  const [open, setOpen] = useState(false);
  const c = CABINS.find((x) => x.id === offer.cabin)!;
  const b = bagsText(offer.bags);
  return (
    <>
      <button type="button" className="link-btn" onClick={() => setOpen(true)}>
        {label ?? `${c.name} fare rules`}
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} title={`${c.name}: what’s included`}>
        <dl className="details">
          <dt>Cabin baggage</dt>
          <dd>{b.cabin}</dd>
          <dt>Checked baggage</dt>
          <dd>
            {b.checked}
            {offer.bags.checkedBags > 0 && offer.bags.checkedKg === null ? ' (weight not supplied)' : ''}
          </dd>
          <dt>Changes</dt>
          <dd>{offer.rules.changesText}</dd>
          <dt>Refunds</dt>
          <dd>{offer.rules.refundText}</dd>
          <dt>Also included</dt>
          <dd>{offer.perks.join(', ')}</dd>
        </dl>
        <p className="muted small">Sample fare rules for this demo. Bag size limits aren’t supplied in the sample data.</p>
      </Dialog>
    </>
  );
}

export function FlightDetailsButton({ it }: { it: Itinerary }) {
  const [open, setOpen] = useState(false);
  const warnings = itineraryWarnings(it);
  return (
    <>
      <button type="button" className="link-btn" onClick={() => setOpen(true)}>
        Journey details<span className="sr-only">, departs {it.depart} from {it.from}</span>
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} title={`${placeShort(it.from)} to ${placeShort(it.to)}, ${mediumDate(it.date)}`} wide>
        <Timeline it={it} />
        <WarningList warnings={warnings} />
      </Dialog>
    </>
  );
}

export function RouteHeading({ from, to, level = 2, className = '' }: { from: string; to: string; level?: 1 | 2 | 3; className?: string }) {
  const H = (level === 1 ? 'h1' : level === 2 ? 'h2' : 'h3') as 'h1';
  return (
    <H className={`route-heading ${className}`}>
      <span>{placeShort(from)}</span>
      <span className="arrow" aria-hidden="true">
        →
      </span>
      <span className="sr-only"> to </span>
      <span>{placeShort(to)}</span>
    </H>
  );
}

export function SampleTag({ children = 'Sample price' }: { children?: React.ReactNode }) {
  return <span className="sample-tag">{children}</span>;
}

export const cabinName = (c: Cabin) => CABINS.find((x) => x.id === c)!.name;
