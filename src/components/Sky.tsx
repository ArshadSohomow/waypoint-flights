import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

// "Beacons over the globe": a restrained ambient identity.
// - The sky follows the device's local time only (no location, no weather data).
// - Motion is slow, low-amplitude and staggered; CSS transforms/opacity only.
// - Respects prefers-reduced-motion, pauses when the tab is hidden, and can be switched off.
// - Only the hero band and logo change; booking UI colours stay the same in every sky.

export type SkyMode = 'auto' | 'day' | 'dusk' | 'night';
type Resolved = Exclude<SkyMode, 'auto'>;

export function skyForHour(h: number): Resolved {
  if (h >= 7 && h < 17) return 'day';
  if ((h >= 17 && h < 20) || (h >= 5 && h < 7)) return 'dusk';
  return 'night';
}

const SKY_LABEL: Record<SkyMode, string> = { auto: 'Match my local time', day: 'Day', dusk: 'Twilight', night: 'Night' };

type SkyState = { mode: SkyMode; sky: Resolved; motion: boolean; setMode: (m: SkyMode) => void; setMotion: (on: boolean) => void };
const SkyCtx = createContext<SkyState>({ mode: 'auto', sky: 'day', motion: false, setMode: () => {}, setMotion: () => {} });
export const useSky = () => useContext(SkyCtx);

const read = (k: string) => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};
const write = (k: string, v: string) => {
  try {
    localStorage.setItem(k, v);
  } catch {
    /* per-viewer convenience only */
  }
};

export function SkyProvider({ children }: { children: React.ReactNode }) {
  const reduced = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const [mode, setModeState] = useState<SkyMode>(() => (read('wp-sky') as SkyMode) || 'auto');
  const [motion, setMotionState] = useState<boolean>(() => {
    const v = read('wp-motion');
    return v === null ? !reduced : v === 'on' && !reduced;
  });
  const [hour, setHour] = useState(() => new Date().getHours());

  // Re-check the hour every 10 minutes so a long session moves from day to dusk gently.
  useEffect(() => {
    const t = setInterval(() => setHour(new Date().getHours()), 10 * 60 * 1000);
    return () => clearInterval(t);
  }, []);

  // Pause ambient animation while the tab isn't visible.
  useEffect(() => {
    const onVis = () => document.documentElement.toggleAttribute('data-tab-hidden', document.hidden);
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  const sky: Resolved = mode === 'auto' ? skyForHour(hour) : mode;
  useEffect(() => {
    document.documentElement.dataset.sky = sky;
    document.documentElement.dataset.motion = motion ? 'on' : 'off';
  }, [sky, motion]);

  const value = useMemo<SkyState>(
    () => ({
      mode,
      sky,
      motion,
      setMode: (m) => {
        setModeState(m);
        write('wp-sky', m);
      },
      setMotion: (on) => {
        setMotionState(on);
        write('wp-motion', on ? 'on' : 'off');
      },
    }),
    [mode, sky, motion],
  );
  return <SkyCtx.Provider value={value}>{children}</SkyCtx.Provider>;
}

/** Logo mark: a waypoint beacon with a soft, slow glow. */
export function Beacon({ size = 28 }: { size?: number }) {
  return (
    <span className="beacon-mark" style={{ width: size, height: size }} aria-hidden="true">
      <span className="beacon-halo" />
      <svg width={size} height={size} viewBox="0 0 28 28">
        <circle cx="14" cy="14" r="13" fill="var(--accent)" />
        <path d="M7 16.5 21 9l-4.5 12-2.6-5.2z" fill="#fff" />
      </svg>
    </span>
  );
}

// The globe is an ellipse centred below the band; beacons sit exactly on its horizon.
const GX = 600, GY = 980, GRX = 900, GRY = 795;
const horizonY = (x: number) => GY - GRY * Math.sqrt(Math.max(0, 1 - ((x - GX) / GRX) ** 2));
const BEACONS: [number, number, number][] = [90, 205, 330, 470, 610, 750, 880, 1000, 1115].map((x, i) => [x, horizonY(x) + 6 + (i % 3) * 7, (i * 1.37) % 5]);
const ROUTES: [number, number][] = [
  [0, 2],
  [2, 4],
  [4, 7],
  [5, 8],
];
// Stars stay out of the central headline area so text contrast never depends on them.
const STARS = Array.from({ length: 60 }, (_, i) => [(i * 263.7) % 1200, (i * 97.3) % 150, (i % 7) / 2] as const).filter(([x, y]) => !(x > 330 && x < 870 && y > 15 && y < 130));

/** Decorative hero band behind the search form. Purely ambient: never conveys information. */
export function SkyHero({ compact = false, children }: { compact?: boolean; children?: React.ReactNode }) {
  const { sky } = useSky();
  return (
    <div className={`sky-hero sky-${sky} ${compact ? 'compact' : ''}`}>
      <div className="sky-art" aria-hidden="true">
        <div className="cloud c1" />
        <div className="cloud c2" />
        <div className="cloud c3" />
        <svg className="globe" viewBox="0 0 1200 320" preserveAspectRatio="xMidYMax slice">
          <defs>
            <radialGradient id="globe-fill" cx="50%" cy="0%" r="80%">
              <stop offset="0%" stopColor="var(--globe-hi)" />
              <stop offset="100%" stopColor="var(--globe-lo)" />
            </radialGradient>
          </defs>
          <g className="stars">
            {STARS.map(([x, y, d], i) => (
              <circle key={i} cx={x} cy={y} r={i % 5 === 0 ? 1.6 : 1} style={{ animationDelay: `${d}s` }} className={i % 3 === 0 ? 'tw' : ''} />
            ))}
          </g>
          <ellipse cx={GX} cy={GY} rx={GRX} ry={GRY} fill="url(#globe-fill)" />
          <g className="graticule" fill="none">
            <ellipse cx={GX} cy={GY} rx={GRX} ry={GRY - 30} />
            <ellipse cx={GX} cy={GY} rx={GRX} ry={GRY - 70} />
            <ellipse cx={GX} cy={GY} rx={620} ry={GRY} />
            <ellipse cx={GX} cy={GY} rx={300} ry={GRY} />
          </g>
          <g className="routes" fill="none">
            {ROUTES.map(([a, b], i) => {
              const [x1, y1] = BEACONS[a];
              const [x2, y2] = BEACONS[b];
              const mx = (x1 + x2) / 2;
              const my = Math.min(y1, y2) - 55;
              return <path key={i} d={`M${x1} ${y1} Q${mx} ${my} ${x2} ${y2}`} style={{ animationDelay: `${i * 2.5}s` }} />;
            })}
          </g>
          <g className="beacons">
            {BEACONS.map(([x, y, d], i) => (
              <g key={i} transform={`translate(${x} ${y})`}>
                <circle className="glow" r="14" style={{ animationDelay: `${d}s`, animationDuration: `${7 + (i % 4) * 1.5}s` }} />
                <circle className="core" r="3" />
              </g>
            ))}
          </g>
        </svg>
        <div className="mist" />
      </div>
      {children && <div className="sky-content wrap">{children}</div>}
    </div>
  );
}

/** Footer controls: sky theme and ambient motion. Stored in this browser only. */
export function AmbientControls() {
  const { mode, sky, motion, setMode, setMotion } = useSky();
  const reduced = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  return (
    <div className="ambient-controls">
      <label>
        <span>Sky</span>
        <select value={mode} onChange={(e) => setMode(e.target.value as SkyMode)}>
          {(Object.keys(SKY_LABEL) as SkyMode[]).map((m) => (
            <option key={m} value={m}>
              {SKY_LABEL[m]}
              {m === 'auto' ? ` (${SKY_LABEL[sky].toLowerCase()})` : ''}
            </option>
          ))}
        </select>
      </label>
      <button type="button" className="btn btn-small btn-outline" aria-pressed={motion} disabled={reduced} title={reduced ? 'Your device asks for reduced motion' : undefined} onClick={() => setMotion(!motion)}>
        Ambient motion: {motion ? 'on' : 'off'}
      </button>
      {reduced && <span className="muted small">Motion off: your device asks for reduced motion.</span>}
    </div>
  );
}
