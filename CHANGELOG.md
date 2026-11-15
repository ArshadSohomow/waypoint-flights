# Changelog

## 0.3.0: a hub for the whole trip (branch `feature/hub-and-usability-v3`)

Built from the *Waypoint Flights Supplementary Specification* and the annotation comments on the Figma prototype. Still sample data throughout.

**Booking usability first**
- Search labels now read *Departs from* and *Arrives at*. Completed fields turn green with a tick, and the Search button fills like a progress bar ("2 of 4 details added") until it's ready (Figma annotations).
- Bags choice reads *No checked bag / 1 bag / 2 bags*, with a "what counts as a checked bag?" tip. Choosing none adds nothing.
- Sort by *Earliest arrival* and filter by arrival time.
- A return that uses a different airport is flagged on the result card and must be acknowledged before you can continue (spec: detect early, require acknowledgement).
- The estimated total gives a soft "hum" of light when it changes (motion permitting).
- Info tips: small "i" buttons open a short explanation beside the term; Escape or a click elsewhere closes them.

**The hub: every "coming soon" is now a page**
- Manage booking: look up by reference + last name, quick actions, journeys, "before you go" warnings, stays and cars held, cancel (with confirmation) or remove from this browser, print.
- Online check-in: per-journey check-in with two plain confirmations, then sample boarding passes clearly marked not valid.
- Stays and Car hire: search, filter, sort, and hold against a booked trip; pre-filled from your booking's dates and arrival airport.
- Discover: destination ideas by kind of trip, origin and direct-only, with sample fares that hand off to search or stays.
- Help: searchable answers by topic, deep-linkable; plus quick links, contact and accessibility notes.
- Site search, Your trips (no sign-in or passwords; resume an in-progress booking), Language and currency.
- Home: real Flights / Stays / Car hire / Check-in tabs (arrow-key navigation) and an "Everything for your trip" strip. Footer site map.
- Confirmed bookings are saved in this browser, and the confirmation page offers a stay, a car and Manage booking.

**From your research (Project 3 notes and the four Miro boards)**
- Remembers the airport you last flew from and shows up to three recent searches (places only, never dates or names). From the research: "Airport is pre-selected without needing to manually search".
- Fares that aren't sold become one quiet line below the available fares instead of greyed-out cards. From the research: "What’s the point in telling me what I can’t have?"
- Bags aren't asked twice: *Bags & extras* shows the choice you made on the flights page, with a *Change bags* button. From the research: "Doesn't like the two previous pages have the same options to select for the baggage."
- A slim bar with the route and estimated total stays at the top once you scroll past the trip bar. From the research: "Likes the itinerary on the right side to easily refer to it without having to scroll too far", and the total wasn't noticed at the top.

**Atmosphere**
- Hub pages share the sky band, with the globe lowered so beacons never sit behind a headline.
- Decorative fog drifts at dusk and night; a beacon pulse marks the confirming state; empty states carry a small beacon. All motion respects the footer switch and reduced motion.

**Quality**
- 21 logic tests and 31 browser scenarios: hub flows on desktop and phone, accessibility audits and overflow checks for every new page.

## 0.2.0: transparent booking (branch `feature/transparent-booking-v2`)

Built from the *Waypoint Flights Additional Implementation Specification*. All data is still sample data.

**Booking flow and progress**
- Steps renamed to what they do: Flights, Seats, Bags & extras, Passengers, Review. Completed steps are links.
- Choosing a fare now selects it in place, with a confirmation and a nearby *Continue* button, plus a sticky bar.
- Trip bar shows an estimated total with its basis and opens a full trip summary on every booking page.
- Editing the search keeps what is still valid (for example flights when only passenger numbers change) and says what was cleared.
- New final *Review and confirm* step: flights, passengers, bags and extras, itemised costs and important caveats. Demo confirmation only.

**Cost transparency**
- One cost model for every price. Per-person and whole-party prices are labelled everywhere.
- Checked-bag needs (0–2 per traveller) feed every estimate; bags a fare doesn't include are added.
- Breakdown groups fares, bags/seats/extras, taxes and fees, and costs *not included* (airport transfers, overnight stays) without inventing numbers.

**Comparison and journeys**
- Result cards with labelled Departs/Arrives, day changes, stops, a chronological timeline, insight tags and computed trade-offs.
- Shortlist up to three journeys and compare side by side (stacked on phones).
- Filters for stops, departure time and self-transfer, with reset and helpful empty states. Sorts include "Fewest practical issues".
- Unavailable fares are shown with the reason, never as dead buttons.

**Flexible dates and journey analysis**
- Calendar shows sample lowest fares per day; dates with no flights are marked.
- ±3-day grid of outbound × return combinations.
- Warnings with severity labels (Important / Check this / FYI), "why this matters" and a next step, using cautious wording.
- London (all airports) search, with a flag when outbound and return use different airports.

**Beacons over the globe**
- Calm hero band with globe, beacons, route arcs and clouds; day/twilight/night from local time.
- Slow CSS motion, paused in hidden tabs, off for reduced motion, with a footer switch.

**Quality**
- 17 logic tests and 22 browser scenarios, including an accessibility audit and overflow checks at three widths.
