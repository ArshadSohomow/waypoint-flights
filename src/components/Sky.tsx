import React from 'react';

// Placeholder for the beacon-and-sky identity (stage 4). The logo mark is static for now.
export function Beacon({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" aria-hidden="true" className="beacon-mark">
      <circle cx="14" cy="14" r="13" fill="var(--accent)" />
      <path d="M7 16.5 21 9l-4.5 12-2.6-5.2z" fill="#fff" />
    </svg>
  );
}

export function AmbientControls() {
  return null;
}
