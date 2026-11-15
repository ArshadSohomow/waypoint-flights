import React, { useEffect, useRef } from 'react';

// Native <dialog> gives focus trapping, Escape to close and inert background for free.
export function Dialog({ open, onClose, title, children, footer, wide }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; footer?: React.ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  const id = React.useId();
  return (
    <dialog
      ref={ref}
      className={`dialog ${wide ? 'wide' : ''}`}
      aria-labelledby={id}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose(); // click on the backdrop
      }}
    >
      <div className="dialog-head">
        <h2 id={id}>{title}</h2>
        <button type="button" className="close-btn" onClick={onClose}>
          <span aria-hidden="true">✕</span> Close
        </button>
      </div>
      <div className="dialog-body">{open && children}</div>
      {footer && <div className="dialog-foot">{footer}</div>}
    </dialog>
  );
}

