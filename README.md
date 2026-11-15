# Waypoint — flight booking demo

A working, responsive demo of the flight booking flow from the Figma file *Prototype* (medium-fidelity, 23 frames). Search, flight selection, review, seat selection and booking summary follow the Figma design; passenger details, a simulated payment step and a confirmation page complete the journey.

**Everything is sample data. No real flights, bookings or payments.**

## Run it

```bash
npm install          # first time only
npm run build        # builds ./dist
npx wrangler dev     # local preview at http://localhost:8787
```

## Deploy to Cloudflare

**Without installing anything:** in the Cloudflare dashboard go to Workers & Pages → Create application → Pages → Drag and drop your files, name the project, and drop in `waypoint-site.zip` (the contents of `dist/`). The site goes live at `<project-name>.pages.dev`. Pages serves `index.html` for unknown paths, so every route works.

**With Node.js installed:**

```bash
npx wrangler login   # opens your browser to sign in to Cloudflare (first time only)
npm run deploy       # builds and deploys; prints the live *.workers.dev URL
```

The site deploys as a Cloudflare Worker with static assets only (no server code), configured in `wrangler.jsonc`. Unknown paths fall back to `index.html`, so the app shows its own "Page not found" page.

A pre-built `dist/` is included, so `npx wrangler deploy` works without `npm install`.

## How it's built

| Part | Where | Notes |
| --- | --- | --- |
| Booking pages | `src/pages/` | Search, Flights (outbound/return), Compare, Review flights, Seats, Bags & extras (`/summary`), Passengers, Review & confirm (`/payment`), Confirmation, 404 |
| Hub pages | `src/pages/TripPages.tsx`, `StayPages.tsx`, `ExplorePages.tsx` | Manage booking (`/manage`), Online check-in (`/check-in`), Your trips (`/account`), Stays (`/hotels`), Car hire (`/cars`), Discover (`/discover`), Help (`/support`), site Search (`/search`) |
| Saved trips | `src/lib/trips.ts` | Confirmed demo bookings kept in this browser's `localStorage` (no contact details, no dates of birth, never payment data). Example booking: **WPDEMO / Traveller** |
| Hub sample data | `src/lib/hub.ts` | Invented hotels and car suppliers, destination guides, help answers and the site-search index. Unknown terms (taxes, deposits, insurance) are said to be not supplied |
| Components | `src/components/` | Header, 5-step stepper (completed steps are links), trip bar with expandable trip summary, journey summary and timeline, warnings, cost breakdown, flexible-dates grid, airport combobox, date picker with sample prices, passenger counter, dialogs, sky hero |
| Sample data | `src/lib/data.ts` | Typed itineraries with legs, layovers, self-transfer, baggage and fare rules, generated deterministically and labelled as sample. **Replace `searchItineraries`, `findItinerary` and `lowestFare` with API calls for real bookings**; the UI depends only on the types. |
| Costs | `src/lib/costs.ts` | The single calculation used everywhere: per person vs party, bags, seats, extras, taxes and costs not included (shown as unknown, never invented) |
| Journey analysis | `src/lib/warnings.ts` | Cautious flags from itinerary fields only: airport change, self-transfer, overnight, long or short connection, early start, next-day arrival, third-country connection (links to GOV.UK) |
| Booking state | `src/lib/booking.tsx` | One reducer saved to `sessionStorage`; edited searches keep what's still valid and explain what was cleared |
| Sky identity | `src/components/Sky.tsx` | Day / twilight / night from local time only; CSS-only motion, paused when hidden, off for reduced motion, switchable in the footer |
| Styles | `src/styles.css` | Tokens at the top; breakpoints at 1024px and 720px |

Stack: React 19 + TypeScript, bundled with esbuild. No routing or UI library.

## Demo rules (sample, not real fare rules)

- Up to 9 passengers with seats; at least one adult; one adult per infant.
- Infants: £25 per journey, on an adult's lap, no seat.
- Checked bags: Economy includes 1, Business and Premium 2, self-transfer tickets none; each extra bag is £30 per traveller per journey.
- Front Row (rows 1–2): £18 per seat on Economy, included with Business and Premium.
- Fast Track £9 and Lounge £35 per traveller per Economy journey (included with Business and Premium).
- Seats are chosen for the first flight of a journey; connecting and self-transfer seats are allocated at check-in.
- Times are local to each airport. Sky colours never represent real weather.

## Hub features (v0.3)

Every header, nav and tab link now goes somewhere real. Find a booking with its reference and a last name (no passwords anywhere). Hold sample stays and cars against a trip, check in for sample boarding passes marked *not valid for travel*, browse destination ideas with sample fares, and search help or the whole site. Language shows English (UK) with other languages listed as not yet translated; prices stay in GBP.

## Tests

```bash
npx tsx tests/logic.test.ts          # cost model, warnings, search revalidation, hub data (21 tests)
python3 tests/serve.py 8787 &        # local server with the same fallback as Cloudflare
python3 tests/e2e.py http://127.0.0.1:8787   # 30 browser scenarios (Playwright for Python)
```

The browser suite follows the spec's test list: return journey to confirmation (desktop and phone), route and passenger changes, extras without double counting, shortlist and compare, date logic, filters to empty and reset, layover timeline, cautious warnings, back/forward/refresh, inline errors, closing every dialog, keyboard use and focus, reduced motion, no overflow at phone/tablet/desktop, routes and 404, one-way self-transfer, and an accessibility audit. v0.3 adds: acknowledging a different return airport, the hub journey (manage, hold a stay and a car, check in, cancel) on desktop and phone, finding a confirmed booking by reference, home tabs and search-button progress, site search, Discover and Help, plus accessibility and overflow checks on every hub page.

## Known limitations

- Sample data only. No live fares, bookings, payments or tickets; no card details are ever collected.
- No accounts or emails. Confirmed demo bookings are saved only in the browser they were made in.
- `npm run typecheck` needs `npm install`. In the environment used to build this, React's type packages couldn't be downloaded, so the code was type-checked strictly with React's own types stubbed.
- `robots.txt` and a `noindex` tag keep the demo out of search engines; remove both before a real launch.
