import React, { useId, useMemo, useRef, useState } from 'react';
import { PLACES, placeByCode } from '../lib/data';

const fieldLabel = (code: string) => {
  const p = placeByCode(code);
  return p ? (p.kind === 'group' ? p.label : `${p.city} · ${p.label}`) : '';
};

// ARIA 1.2 combobox: type to filter, arrow keys to move, Enter to pick, Escape to close.
// Lists city "all airports" options above that city's individual airports.
export function AirportField({ label, value, onChange, exclude, error }: { label: string; value: string; onChange: (code: string) => void; exclude?: string; error?: string }) {
  const id = useId();
  const listId = `${id}-list`;
  const errId = `${id}-err`;
  const hintId = `${id}-hint`;
  const current = placeByCode(value);
  const [text, setText] = useState(current ? fieldLabel(value) : '');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    setText(value ? fieldLabel(value) : '');
  }, [value]);

  const options = useMemo(() => {
    const q = text.trim().toLowerCase();
    const showAll = !q || (current && text === fieldLabel(current.code));
    return PLACES.filter((p) => p.code !== exclude).filter(
      (p) => showAll || p.city.toLowerCase().includes(q) || p.label.toLowerCase().includes(q) || p.code.toLowerCase().startsWith(q) || p.country.toLowerCase().startsWith(q),
    );
  }, [text, exclude, current]);

  const pick = (code: string) => {
    onChange(code);
    setText(fieldLabel(code));
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
          aria-describedby={[error ? errId : '', current?.kind === 'group' ? hintId : ''].filter(Boolean).join(' ') || undefined}
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
        <button
          type="button"
          tabIndex={-1}
          className="combo-toggle"
          aria-hidden="true"
          onClick={() => {
            setOpen((o) => !o);
            inputRef.current?.focus();
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16">
            <path d="M3 6l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="2" />
          </svg>
        </button>
        {open && (
          <ul id={listId} role="listbox" className="combo-list" aria-label={`${label}: cities and airports`}>
            {options.length === 0 && <li className="combo-empty">No airports match “{text}”</li>}
            {options.map((p, i) => (
              <li
                key={p.code}
                id={`${id}-${p.code}`}
                role="option"
                aria-selected={i === active}
                className={`${i === active ? 'active' : ''} ${p.kind === 'group' ? 'group' : ''} ${p.kind === 'airport' && placeByCode(p.code) && PLACES.some((g) => g.kind === 'group' && g.airports.includes(p.code)) ? 'member' : ''}`}
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setActive(i)}
                onClick={() => pick(p.code)}
              >
                <span>
                  <span className="opt-main">{p.kind === 'group' ? p.label : p.label}</span>
                  <span className="opt-sub">{p.kind === 'group' ? `Any of: ${p.detail}` : p.detail}</span>
                </span>
                <span className="code">{p.kind === 'group' ? 'All' : p.code}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      {current?.kind === 'group' && (
        <p id={hintId} className="hint">
          Includes flights from every {current.city} airport ({current.detail}). We’ll flag it if your outbound and return use different airports.
        </p>
      )}
      {error && (
        <p id={errId} className="field-error">
          {error}
        </p>
      )}
    </div>
  );
}
