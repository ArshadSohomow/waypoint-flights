# Changelog

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
