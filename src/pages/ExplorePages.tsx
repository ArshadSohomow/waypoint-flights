import React, { useMemo, useState } from 'react';
import { DemoNote, HubLayout } from '../components/Hub';
import { airportByCode, placeShort } from '../lib/data';
import { FAQS, Faq, GUIDES, guideFacts, ORIGINS, siteSearch, THEMES, Theme } from '../lib/hub';
import { money } from '../lib/costs';
import { duration, mediumDate } from '../lib/dates';
import { Link, useRouter } from '../lib/router';
import { useBooking } from '../lib/booking';

// ---------------- Discover ----------------

export function DiscoverPage() {
  const { booking } = useBooking();
  const [origin, setOrigin] = useState(booking.search?.from && ORIGINS.includes(booking.search.from) ? booking.search.from : 'LON');
  const [theme, setTheme] = useState<Theme | 'All'>('All');
  const [directOnly, setDirectOnly] = useState(false);
  const cards = useMemo(
    () =>
      GUIDES.map((g) => ({ g, a: airportByCode(g.code)!, f: guideFacts(origin, g.code) }))
        .filter((x) => x.f)
        .filter((x) => theme === 'All' || x.g.themes.includes(theme))
        .filter((x) => !directOnly || x.f!.direct),
    [origin, theme, directOnly],
  );
  return (
    <HubLayout title="Discover" eyebrow="Inspiration" intro="Ideas for where to go next, with sample fares from your nearest airport.">
      <div className="discover-controls panel">
        <div className="field">
          <label htmlFor="d-from">Flying from</label>
          <select id="d-from" value={origin} onChange={(e) => setOrigin(e.target.value)}>
            {ORIGINS.map((o) => (
              <option key={o} value={o}>
                {placeShort(o)}
              </option>
            ))}
          </select>
        </div>
        <fieldset className="chips">
          <legend>Kind of trip</legend>
          {(['All', ...THEMES] as const).map((t) => (
            <label key={t} className={`chip ${theme === t ? 'on' : ''}`}>
              <input type="radio" name="theme" checked={theme === t} onChange={() => setTheme(t)} />
              {t}
            </label>
          ))}
        </fieldset>
        <label className="check">
          <input type="checkbox" checked={directOnly} onChange={(e) => setDirectOnly(e.target.checked)} /> Direct flights only
        </label>
      </div>
      <DemoNote>Fares are the lowest sample price per person, about three weeks from today. Trip ideas are general inspiration, not opening times or entry advice.</DemoNote>
      <p className="muted" aria-live="polite">
        {cards.length} destination{cards.length === 1 ? '' : 's'}
      </p>
      <ul className="plain guide-grid">
        {cards.map(({ g, a, f }) => (
          <li key={g.code} id={g.code} className="guide-card">
            <div className={`guide-art dest-${g.code.toLowerCase()}`} style={{ ['--hue' as string]: `${(a.city.length * 47 + a.lon * 9) % 360}` }} aria-hidden="true">
              <span className="guide-code">{g.code}</span>
            </div>
            <div className="guide-body">
              <h2 className="guide-city">
                {a.city} <span className="muted small">{a.country}</span>
              </h2>
              <p className="guide-tag">{g.tagline}</p>
              <p className="guide-themes">
                {g.themes.map((t) => (
                  <span key={t} className="tag">
                    {t}
                  </span>
                ))}
              </p>
              <ul className="guide-ideas">
                {g.ideas.map((i) => (
                  <li key={i}>{i}</li>
                ))}
              </ul>
              <p className="guide-facts">
                <strong>{f!.price ? `from ${money(f!.price)} pp` : 'No sample fare'}</strong>
                <span className="muted small">
                  {f!.direct ? 'Direct flights' : 'With a connection'} · from {duration(f!.fastest)} · {mediumDate(f!.date)}
                </span>
              </p>
              <div className="guide-actions">
                <Link to={`/?from=${origin}&to=${g.code}`} className="btn btn-primary btn-small">
                  Search flights<span className="sr-only"> to {a.city}</span>
                </Link>
                <Link to={`/hotels?city=${g.code}`} className="btn btn-ghost btn-small">
                  Stays<span className="sr-only"> in {a.city}</span>
                </Link>
              </div>
            </div>
          </li>
        ))}
      </ul>
      {cards.length === 0 && (
        <div className="empty">
          <h3>No destinations match</h3>
          <p>Try another kind of trip, or include journeys with a connection.</p>
        </div>
      )}
    </HubLayout>
  );
}

// ---------------- Support ----------------

const TOPICS: Faq['topic'][] = ['Booking', 'Costs', 'Baggage', 'Journeys', 'Your trip', 'This demo'];

export function SupportPage() {
  const [q, setQ] = useState('');
  const [topic, setTopic] = useState<Faq['topic'] | 'All'>('All');
  const hash = typeof window !== 'undefined' ? window.location.hash.slice(1) : '';
  const list = FAQS.filter((f) => topic === 'All' || f.topic === topic).filter((f) => !q.trim() || `${f.q} ${f.a}`.toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <HubLayout title="Help and support" eyebrow="Support" intro="Straight answers about costs, bags, journeys and your trip.">
      <div className="hub-grid">
        <div>
          <div className="panel support-search">
            <div className="field">
              <label htmlFor="faq-q">Search help</label>
              <input id="faq-q" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. bags, self-transfer, check-in" />
            </div>
            <fieldset className="chips">
              <legend className="sr-only">Topic</legend>
              {(['All', ...TOPICS] as const).map((t) => (
                <label key={t} className={`chip ${topic === t ? 'on' : ''}`}>
                  <input type="radio" name="topic" checked={topic === t} onChange={() => setTopic(t)} />
                  {t}
                </label>
              ))}
            </fieldset>
          </div>
          <p className="muted" aria-live="polite">
            {list.length} answer{list.length === 1 ? '' : 's'}
          </p>
          <div className="faq-list">
            {list.map((f) => (
              <details key={f.id} id={f.id} className="faq" open={hash === f.id || (!!q.trim() && list.length <= 3)}>
                <summary>
                  <span className="faq-topic">{f.topic}</span> {f.q}
                </summary>
                <p>{f.a}</p>
                {f.link &&
                  (f.link.to.startsWith('http') ? (
                    <p>
                      <a href={f.link.to} target="_blank" rel="noopener noreferrer">
                        {f.link.label} (opens in a new tab)
                      </a>
                    </p>
                  ) : (
                    <p>
                      <Link to={f.link.to}>{f.link.label}</Link>
                    </p>
                  ))}
              </details>
            ))}
            {list.length === 0 && <p>No answers match. Try a shorter word, or choose “All”.</p>}
          </div>
        </div>
        <aside className="hub-aside">
          <section className="panel">
            <h2>Quick links</h2>
            <ul className="plain link-list">
              <li>
                <Link to="/manage">Find or manage a booking</Link>
              </li>
              <li>
                <Link to="/check-in">Check in online</Link>
              </li>
              <li>
                <Link to="/account">Your trips</Link>
              </li>
              <li>
                <a href="https://www.gov.uk/foreign-travel-advice" target="_blank" rel="noopener noreferrer">
                  Foreign travel advice, GOV.UK (opens in a new tab)
                </a>
              </li>
            </ul>
          </section>
          <section className="panel">
            <h2>Contact us</h2>
            <p>In the live service you’d be able to message the team here, with your booking attached.</p>
            <p className="muted small">This demo doesn’t send messages, so there’s no form to fill in. We’ll never ask for card details or passwords by chat or email.</p>
          </section>
          <section className="panel">
            <h2>Accessibility</h2>
            <p className="small">Everything works with a keyboard and screen reader. Ambient motion and the sky theme can be changed at the bottom of every page.</p>
          </section>
        </aside>
      </div>
    </HubLayout>
  );
}

// ---------------- Site search ----------------

export function SiteSearchPage() {
  const { query, navigate } = useRouter();
  const initial = query.get('q') ?? '';
  const [q, setQ] = useState(initial);
  const hits = useMemo(() => siteSearch(initial), [initial]);
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(`/search?q=${encodeURIComponent(q.trim())}`, { replace: true });
  };
  return (
    <HubLayout title="Search Waypoint" eyebrow="Search" intro="Pages, destinations and help, all in one place.">
      <form className="panel site-search" role="search" onSubmit={submit}>
        <div className="field">
          <label htmlFor="ss-q">What are you looking for?</label>
          <input id="ss-q" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Try “Lisbon”, “bags” or “check in”" />
        </div>
        <button type="submit" className="btn btn-primary btn-lg">
          Search
        </button>
      </form>
      {initial && (
        <section aria-labelledby="ss-h">
          <h2 id="ss-h">
            {hits.length} result{hits.length === 1 ? '' : 's'} for “{initial}”
          </h2>
          {hits.length ? (
            <ul className="plain search-hits">
              {hits.map((h) => (
                <li key={`${h.kind}-${h.to}-${h.title}`}>
                  <span className="tag">{h.kind}</span>
                  <Link to={h.to}>{h.title}</Link>
                </li>
              ))}
            </ul>
          ) : (
            <p>
              Nothing matched. Try a city name, or browse <Link to="/discover">destinations</Link> and <Link to="/support">help</Link>.
            </p>
          )}
        </section>
      )}
    </HubLayout>
  );
}
