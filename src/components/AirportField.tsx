import React, { useId, useMemo, useRef, useState } from 'react';
import { AIRPORTS, airportByCode, airportLabel } from '../lib/data';

// ARIA 1.2 combobox: type to filter, arrow keys to move, Enter to pick, Escape to close.
export function AirportField({ label, value, onChange, exclude, error }: { label: string; value: string; onChange: (code: string) => void; exclude?: string; error?: string }) {
  const id = useId();
  const listId = `${id}-list`;
  const errId = `${id}-err`;
  const current = airportByCode(value);
  const [text, setText] = useState(current ? airportLabel(current) : '');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    const a = airportByCode(value);
    setText(a ? airportLabel(a) : '');
  }, [value]);

  const options = useMemo(() => {
    const q = text.trim().toLowerCase();
    const showAll = !q || (current && text === airportLabel(current));
    return AIRPORTS.filter((a) => a.code !== exclude).filter(
      (a) => showAll || a.city.toLowerCase().includes(q) || a.code.toLowerCase().startsWith(q) || a.country.toLowerCase().startsWith(q),
    );
  }, [text, exclude, current]);

  const pick = (code: string) => {
    onChange(code);
    const a = airportByCode(code)!;
    setText(airportLabel(a));
    setOpen(false);
  };

  return (
    <div className={`field ${error ? 'has-error' : ''}`}>
      <label htmlFor={id}>{label}</label>
      <div className="combo">
        <input
          ref={inputRef}
          id={id}
          type="text"
          role="combobox"
          autoComplete="off"
          placeholder="City or airport"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && options[active] ? `${id}-${options[active].code}` : undefined}
          aria-invalid={!!error}
          aria-describedby={error ? errId : undefined}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setOpen(true);
            setActive(0);
            if (value) onChange('');
          }}
          onFocus={(e) => {
            e.target.select();
            setOpen(true);
          }}
          onBlur={() => {
            setTimeout(() => setOpen(false), 120);
            if (!value && options.length === 1) pick(options[0].code);
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setOpen(true);
              setActive((i) => Math.min(i + 1, options.length - 1));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setActive((i) => Math.max(i - 1, 0));
            } else if (e.key === 'Enter' && open && options[active]) {
              e.preventDefault();
              pick(options[active].code);
            } else if (e.key === 'Escape') {
              setOpen(false);
            }
          }}
        />
        <button type="button" tabIndex={-1} className="combo-toggle" aria-hidden="true" onClick={() => { setOpen((o) => !o); inputRef.current?.focus(); }}>
          <svg width="16" height="16" viewBox="0 0 16 16"><path d="M3 6l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="2" /></svg>
        </button>
        {open && (
          <ul id={listId} role="listbox" className="combo-list" aria-label={`${label} airports`}>
            {options.length === 0 && <li className="combo-empty">No airports match “{text}”</li>}
            {options.map((a, i) => (
              <li
                key={a.code}
                id={`${id}-${a.code}`}
                role="option"
                aria-selected={i === active}
                className={i === active ? 'active' : ''}
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setActive(i)}
                onClick={() => pick(a.code)}
              >
                <span>{a.city}, {a.country}</span> <span className="code">{a.code}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      {error && <p id={errId} className="field-error">{error}</p>}
    </div>
  );
}
