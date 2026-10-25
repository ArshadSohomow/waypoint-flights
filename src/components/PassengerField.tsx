import React, { useEffect, useId, useRef, useState } from 'react';
import { Pax, seatedCount, totalPax } from '../lib/booking';

export const MAX_SEATED = 9;

const ROWS: { key: keyof Pax; name: string; age: string }[] = [
  { key: 'adults', name: 'Adults', age: '16+ years' },
  { key: 'youngAdults', name: 'Young adults', age: '12–15 years' },
  { key: 'children', name: 'Children', age: '2–11 years' },
  { key: 'infants', name: 'Infants', age: 'Under 2 years' },
];

export function paxSummary(p: Pax) {
  const parts: string[] = [];
  const add = (n: number, one: string, many: string) => n && parts.push(`${n} ${n === 1 ? one : many}`);
  add(p.adults, 'adult', 'adults');
  add(p.youngAdults, 'young adult', 'young adults');
  add(p.children, 'child', 'children');
  add(p.infants, 'infant', 'infants');
  return parts.join(', ') || 'No passengers';
}

function limits(p: Pax, key: keyof Pax): [number, number] {
  const seatedLeft = MAX_SEATED - seatedCount(p);
  if (key === 'adults') return [Math.max(1, p.infants), p.adults + seatedLeft];
  if (key === 'infants') return [0, p.adults];
  return [0, p[key] + seatedLeft];
}

export function PassengerField({ value, onChange }: { value: Pax; onChange: (p: Pax) => void }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => wrap.current && !wrap.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const n = totalPax(value);
  return (
    <div className="field passenger-field" ref={wrap} onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}>
      <span className="label" id={`${id}-l`}>Passengers</span>
      <button type="button" className="input select-trigger" aria-labelledby={`${id}-l ${id}-v`} aria-expanded={open} aria-controls={`${id}-p`} onClick={() => setOpen((o) => !o)}>
        <span id={`${id}-v`}>{paxSummary(value)}</span>
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d={open ? 'M3 10l5-5 5 5' : 'M3 6l5 5 5-5'} fill="none" stroke="currentColor" strokeWidth="2" /></svg>
      </button>
      {open && (
        <div className="pax-panel" id={`${id}-p`} role="group" aria-label="Choose passengers">
          {ROWS.map((r) => {
            const [min, max] = limits(value, r.key);
            const v = value[r.key];
            return (
              <div className="pax-row" key={r.key}>
                <div>
                  <span className="pax-name">{r.name}</span> <span className="pax-age">{r.age}</span>
                </div>
                <div className="stepper-ctl">
                  <button type="button" className="round-btn" aria-label={`Fewer ${r.name.toLowerCase()}`} disabled={v <= min} onClick={() => onChange({ ...value, [r.key]: v - 1 })}>−</button>
                  <output aria-live="polite" aria-label={`${r.name}: ${v}`}>{v}</output>
                  <button type="button" className="round-btn" aria-label={`More ${r.name.toLowerCase()}`} disabled={v >= max} onClick={() => onChange({ ...value, [r.key]: v + 1 })}>+</button>
                </div>
              </div>
            );
          })}
          <p className="pax-note">Up to {MAX_SEATED} passengers with seats. Each infant travels on an adult's lap, so you need one adult per infant.</p>
          <button type="button" className="btn btn-primary btn-block" onClick={() => setOpen(false)}>
            Done · {n} passenger{n === 1 ? '' : 's'}
          </button>
        </div>
      )}
    </div>
  );
}
