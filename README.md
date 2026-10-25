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
| Pages | `src/pages/` | Search, Flights (outbound/return), Review, Seats (outbound/return), Summary, Passengers, Payment, Confirmation, 404 |
| Components | `src/components/` | Header + 5-step stepper, trip bar, airport combobox, date-range picker, passenger counter, dialogs |
| Booking state | `src/lib/booking.tsx` | One reducer, saved to `sessionStorage` so refresh and Back keep choices; prices computed in `priceLines()` |
| Sample data | `src/lib/data.ts` | 20 airports; flights, fares and seat maps generated deterministically. **Replace this module with API calls for real bookings.** |
| Routing | `src/lib/router.tsx` | Small History-API router; moves focus to each page's heading for screen-reader users |
| Styles | `src/styles.css` | Design tokens at the top; breakpoints at 1024px and 720px |

Stack: React 19 + TypeScript, bundled with esbuild. No routing or UI library.

## Demo rules (sample, not real fare rules)

- Up to 9 passengers with seats; at least one adult; one adult per infant.
- Infants: £25 per flight, on an adult's lap, no seat.
- Front Row (rows 1–2): £18 per seat on Economy, included with Business and Premium.
- Fast Track £9 and Lounge £35 per passenger per Economy flight (included with Business and Premium); extra bag £30 per passenger per flight.
- Times shown are local to each airport.

## Coming soon (shown as a message, by agreement)

Login, Language, site Search, Manage, Discover, Support, and the Hotel, Car and Check-in tabs.

## Tests

`tests/e2e.py` (Playwright for Python) runs against a local build:

```bash
python3 tests/serve.py 8787 &
python3 tests/e2e.py http://127.0.0.1:8787
```

Covers: full round trip with 2 adults + 1 infant on desktop and phone, one-way trip, search and passenger validation, sort/filter/date change, extras changing the total, page guards, 404, "coming soon" dialog, keyboard use of the airport combobox and date picker. The axe accessibility check runs when `axe-core` is installed.

## Known limitations

- Sample data only; payment is simulated and no card details are collected.
- No accounts, emails or saved bookings; a booking lives in the browser tab.
- Type-checking (`npm run typecheck`) needs `npm install`; the build environment used to create this had no npm access, so it was bundled without a type-check pass.
- `robots.txt` and a `noindex` tag keep the demo out of search engines; remove both before a real launch.
