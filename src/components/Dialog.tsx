import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

// Native <dialog> gives focus trapping, Escape to close and inert background for free.
export function Dialog({ open, onClose, title, children, footer }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; footer?: React.ReactNode }) {
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
      className="dialog"
      aria-labelledby={id}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose(); // click on the backdrop
      }}
    >
      <div className="dialog-head">
        <h2 id={id}>{title}</h2>
        <button type="button" className="icon-btn" aria-label="Close" onClick={onClose}>
          ✕
        </button>
      </div>
      <div className="dialog-body">{children}</div>
      {footer && <div className="dialog-foot">{footer}</div>}
    </dialog>
  );
}

// One shared "coming soon" message for every feature the demo deliberately leaves out.
const ComingSoonCtx = createContext<(feature: string) => void>(() => {});
export const useComingSoon = () => useContext(ComingSoonCtx);

export function ComingSoonProvider({ children }: { children: React.ReactNode }) {
  const [feature, setFeature] = useState<string | null>(null);
  const open = useCallback((f: string) => setFeature(f), []);
  return (
    <ComingSoonCtx.Provider value={open}>
      {children}
      <Dialog
        open={feature !== null}
        onClose={() => setFeature(null)}
        title={`${feature ?? ''} is coming soon`}
        footer={
          <button type="button" className="btn btn-primary" onClick={() => setFeature(null)}>
            OK
          </button>
        }
      >
        <p>This part of the site isn't in the demo yet. Flight booking works from start to finish.</p>
      </Dialog>
    </ComingSoonCtx.Provider>
  );
}
