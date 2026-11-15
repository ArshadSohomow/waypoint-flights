import React, { useEffect, useId, useRef, useState } from 'react';

/**
 * "What does this mean?" toggletip. From the Figma annotations: a small info icon
 * beside the term, a soft translucent bubble beside it with a brief explanation.
 * Opens on click/tap, keyboard (Enter/Space) and mouse hover; Escape or a click
 * elsewhere closes it. The text lives in a live region so screen readers hear it.
 */
export function InfoTip({ label, children }: { label: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setPinned(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        setPinned(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <span className="infotip" ref={ref} onMouseEnter={() => setOpen(true)} onMouseLeave={() => !pinned && setOpen(false)}>
      <button
        type="button"
        className="infotip-btn"
        aria-label={label}
        aria-expanded={open}
        aria-controls={id}
        onClick={(e) => {
          e.preventDefault(); // inside <legend>/<label> this must not toggle the field
          const next = !(open && pinned);
          setOpen(next);
          setPinned(next);
        }}
      >
        <span aria-hidden="true">i</span>
      </button>
      <span id={id} role="status" className={`infotip-bubble ${open ? 'open' : ''}`}>
        {open && children}
      </span>
    </span>
  );
}
