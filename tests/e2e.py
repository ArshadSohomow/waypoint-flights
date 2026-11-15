"""Browser tests for the spec's scenarios, against a running build.

Run:  python3 tests/serve.py 8787 &   then   python3 tests/e2e.py [base_url] [screenshot_dir]
"""
import os
import re
import sys
from playwright.sync_api import sync_playwright, expect

BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:8787'
SHOTS = sys.argv[2] if len(sys.argv) > 2 else None
results = []
DESKTOP = {'viewport': {'width': 1440, 'height': 1000}}
PHONE = {'viewport': {'width': 390, 'height': 844}, 'is_mobile': True, 'has_touch': True}
TABLET = {'viewport': {'width': 820, 'height': 1180}, 'is_mobile': True, 'has_touch': True}

# A fixed future trip, seeded straight into session storage for scenarios that start mid-flow.
SEED = {
    'search': {'from': 'AMS', 'to': 'BCN', 'depart': '2026-12-11', 'ret': '2026-12-18', 'tripType': 'round', 'pax': {'adults': 2, 'youngAdults': 0, 'children': 0, 'infants': 1}},
    'bags': 1,
}


def shot(page, name):
    if SHOTS:
        os.makedirs(SHOTS, exist_ok=True)
        page.screenshot(path=f'{SHOTS}/{name}.png', full_page=True)


def money(text):
    m = re.search(r'£([\d,]+)', text)
    return int(m.group(1).replace(',', '')) if m else None


def seed(page, data=SEED, path='/flights/outbound'):
    page.goto(BASE + '/')
    page.evaluate("s => { sessionStorage.clear(); sessionStorage.setItem('waypoint-booking-v2', JSON.stringify(s)); }", data)
    page.goto(BASE + path)


def pick_airport(page, label, text, option):
    page.get_by_role('combobox', name=label).fill(text)
    page.get_by_role('option', name=re.compile(option)).first.click()


def pick_dates(page, round_trip=True):
    page.get_by_role('button', name=re.compile('Departure date')).click()
    page.get_by_role('button', name='Next month').click()
    days = page.locator('.date-panel button[data-date]:not([disabled]):visible')
    days.nth(9).click()
    if round_trip:
        days.nth(15).click()
    page.get_by_role('button', name='Confirm').click()


def choose(page, card_filter=None, cabin='Economy', index=0):
    cards = page.locator('.flight')
    card = cards.filter(has_text=card_filter).first if card_filter else cards.nth(index)
    card.get_by_role('button', name=re.compile('Choose fare|Change fare')).click()
    card.get_by_role('button', name=re.compile(f'^Select {cabin}')).click()
    expect(card.locator('.chosen-confirm')).to_be_visible()
    return card


def check(name, fn, opts=DESKTOP):
    with sync_playwright() as p:
        b = p.chromium.launch()
        ctx = b.new_context(**opts)
        page = ctx.new_page()
        page.set_default_timeout(8000)
        errors = []
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.on('console', lambda m: m.type == 'error' and 'ERR_TUNNEL' not in m.text and 'fonts.g' not in m.text and errors.append(m.text))
        try:
            fn(page)
            assert not errors, f'console errors: {errors}'
            results.append((name, 'PASS', ''))
        except Exception as e:  # noqa
            results.append((name, 'FAIL', str(e).splitlines()[0][:240]))
            shot(page, 'FAIL-' + re.sub(r'\W+', '-', name))
        b.close()


# 1. Return journey from search to final review and demo confirmation
def full_journey(page):
    page.goto(BASE + '/')
    page.evaluate('sessionStorage.clear()')
    page.reload()
    page.get_by_role('button', name='Search flights').click()
    expect(page.locator('.error-summary')).to_contain_text('Choose where you are flying from')
    pick_airport(page, 'From', 'Amster', 'AMS')
    pick_airport(page, 'To', 'barc', 'BCN')
    pick_dates(page)
    page.get_by_role('button', name=re.compile('Passengers')).click()
    page.get_by_role('button', name='More adults').click()
    page.get_by_role('button', name=re.compile('^Done')).click()
    page.get_by_role('button', name='Search flights').click()
    expect(page).to_have_url(re.compile('/flights/outbound'))
    shot(page, 'd01-outbound')
    choose(page, card_filter='Direct')
    page.get_by_role('button', name='Continue to return flight').first.click()
    expect(page).to_have_url(re.compile('/flights/return'))
    choose(page, card_filter='Direct')
    page.get_by_role('button', name='Continue to review flights').first.click()
    expect(page).to_have_url(re.compile('/review'))
    page.get_by_role('button', name='Continue to seats').click()
    page.get_by_role('button', name='Choose for me').click()
    page.get_by_role('button', name='Continue', exact=True).click()
    page.get_by_role('button', name='Choose for me').click()
    page.get_by_role('button', name='Continue', exact=True).click()
    expect(page).to_have_url(re.compile('/summary'))
    page.get_by_role('button', name='Continue to passenger details').click()
    forms = page.locator('.pax-form')
    for i, (t, f, l, d) in enumerate([('Mr', 'Arshad', 'Test', ('4', '7', '1990')), ('Ms', 'Sara', 'Test', ('12', '1', '1992'))]):
        forms.nth(i).get_by_label('Title').select_option(t)
        forms.nth(i).get_by_label('First name').fill(f)
        forms.nth(i).get_by_label('Last name').fill(l)
        forms.nth(i).get_by_label('Day').fill(d[0])
        forms.nth(i).get_by_label('Month').fill(d[1])
        forms.nth(i).get_by_label('Year').fill(d[2])
    page.get_by_label('Email address').fill('test@example.com')
    page.get_by_label('Phone number').fill('07700 900123')
    page.get_by_role('button', name='Continue to payment').click()
    expect(page.get_by_role('heading', name='Review and confirm')).to_be_visible()
    expect(page.locator('.demo-banner')).to_contain_text('No payment details are collected')
    assert page.locator('input[autocomplete^="cc-"], input[name*="card" i]').count() == 0, 'no card fields allowed'
    shot(page, 'd09-review-confirm')
    page.get_by_role('button', name=re.compile('^Confirm demo booking')).click()
    expect(page.locator('#agree-e')).to_be_visible()
    page.get_by_label(re.compile('I understand this is a demonstration')).check()
    page.get_by_role('button', name=re.compile('^Confirm demo booking')).click()
    expect(page).to_have_url(re.compile('/confirmation'), timeout=5000)
    expect(page.get_by_text(re.compile('Demo booking: nothing was charged'))).to_be_visible()


# 2. Changing origin resets stale selections and explains it
def change_origin(page):
    seed(page)
    choose(page, card_filter='Direct')
    page.get_by_role('button', name=re.compile('^Edit search')).click()
    pick_airport(page, 'From', 'Lisbon', 'LIS')
    page.get_by_role('button', name='Search flights').click()
    expect(page.locator('.notice-bar')).to_contain_text('outbound flight')
    expect(page.locator('.chosen-confirm')).to_have_count(0)
    expect(page.locator('h1')).to_contain_text('Lisbon')


# 3. Passenger count changes keep price basis and totals consistent
def pax_change(page):
    seed(page)
    card = choose(page, card_filter='Direct')
    pp = money(card.locator('.fare-card.selected .fare-card-price').inner_text())
    est = money(card.locator('.chosen-confirm').inner_text())
    assert est == pp * 2 + 25, f'2 adults + infant: expected {pp * 2 + 25}, got {est}'
    assert money(page.locator('.trip-total-amount').inner_text()) == est
    page.get_by_role('button', name=re.compile('^Edit search')).click()
    page.get_by_role('button', name=re.compile('Passengers')).click()
    page.get_by_role('button', name='More adults').click()
    page.get_by_role('button', name=re.compile('^Done')).click()
    page.get_by_role('button', name='Search flights').click()
    card = page.locator('.flight.chosen')
    expect(card).to_have_count(1)
    est3 = money(card.locator('.chosen-confirm').inner_text())
    assert est3 == pp * 3 + 25, f'3 adults + infant: expected {pp * 3 + 25}, got {est3}'
    expect(page.locator('.trip-total-label')).to_contain_text('4 travellers')


# 4. Add and remove an extra: no double counting
def extras(page):
    seed(page)
    choose(page, card_filter='Direct')
    page.goto(BASE + '/flights/return')
    choose(page, card_filter='Direct')
    page.goto(BASE + '/seats/outbound')
    page.get_by_role('button', name='Choose for me').click()
    page.get_by_role('button', name='Continue', exact=True).click()
    page.get_by_role('button', name='Choose for me').click()
    page.get_by_role('button', name='Continue', exact=True).click()
    total = lambda: money(page.locator('.summary-side .breakdown tfoot td').inner_text())
    t0 = total()
    page.get_by_role('button', name='Add Fast Track').click()
    t1 = total()
    assert t1 - t0 == 9 * 2 * 2, f'Fast Track: 2 travellers × 2 journeys × £9, got {t1 - t0}'
    page.get_by_role('button', name=re.compile('Added.*Fast Track')).click()
    assert total() == t0
    page.get_by_role('radio', name='2').first.check()
    t2 = total()
    assert t2 - t0 == 2 * 2 * 30, f'second bag: 2 travellers × 2 journeys × £30, got {t2 - t0}'
    assert money(page.locator('.trip-total-amount').inner_text()) == t2, 'trip bar and breakdown agree'


# 5. Shortlist, compare and remove
def compare(page):
    seed(page)
    for i in range(3):
        page.locator('.flight').nth(i).get_by_role('button', name=re.compile('Shortlist')).click()
    expect(page.locator('.flight').nth(3).get_by_role('button', name=re.compile('Shortlist'))).to_be_disabled()
    page.get_by_role('link', name='Compare side by side').click()
    expect(page.locator('.cmp-table thead th')).to_have_count(3)
    shot(page, 'd05-compare')
    page.locator('.cmp-table').get_by_role('button', name=re.compile('Remove from comparison')).first.click()
    expect(page.locator('.cmp-table thead th')).to_have_count(2)
    page.get_by_role('link', name=re.compile('Back to results')).click()
    expect(page.locator('.shortlist-bar')).to_contain_text('2 of 3')


# 6. Date change keeps outbound/return logic valid
def date_change(page):
    seed(page)
    choose(page, card_filter='Direct')
    page.locator('.date-strip .day:not(.current):not([disabled])').first.click()
    expect(page.locator('.chosen-confirm')).to_have_count(0)  # the old choice no longer applies
    # Outbound can't move past the return date
    seed(page, {**SEED, 'search': {**SEED['search'], 'depart': '2026-12-11', 'ret': '2026-12-12'}})
    late = page.locator('.date-strip .day', has_text='Sun 13 Dec')
    expect(late).to_be_disabled()
    assert 'after your return date' in late.get_attribute('aria-label')
    # Return can't move before the outbound date
    choose(page, card_filter='Direct')
    page.get_by_role('button', name='Continue to return flight').first.click()
    early = page.locator('.date-strip .day', has_text='Thu 10 Dec')
    expect(early).to_be_disabled()
    assert 'before your departure' in early.get_attribute('aria-label')


# 7. Filters to no results, then reset
def filters(page):
    seed(page)
    page.get_by_role('button', name=re.compile('^Filters')).click()
    page.get_by_label('Direct only').check()
    for t in ['Morning', 'Afternoon', 'Evening']:
        page.get_by_label(re.compile(f'^{t}')).uncheck()
    expect(page.get_by_role('heading', name='No journeys match your filters')).to_be_visible()
    page.locator('.empty').get_by_role('button', name='Reset filters').click()
    expect(page.locator('.flight').first).to_be_visible()


# 8. A layover journey labels each leg, local times/dates and layover length
def layover(page):
    seed(page)
    card = page.locator('.flight').filter(has_text='1 stop').first
    card.get_by_role('button', name=re.compile('Journey details')).click()
    dlg = page.get_by_role('dialog')
    expect(dlg.locator('.tl-flight')).to_have_count(2)
    expect(dlg.locator('.tl-layover')).to_contain_text(re.compile(r'Layover \d+h \d{2}m in'))
    expect(dlg.locator('.tl-flight').first).to_contain_text('Departs')
    expect(dlg.locator('.tl-flight').first).to_contain_text('Arrives')
    expect(dlg).to_contain_text('Times are local to each airport')
    dlg.get_by_role('button', name='Close').click()
    expect(page.get_by_role('dialog')).to_have_count(0)


# 9. Airport change / self-transfer warnings are clear and cautious
def warnings(page):
    seed(page)
    card = page.locator('.flight').filter(has_text='Self-transfer').first
    expect(card.locator('.warn.important')).to_have_count(2)
    expect(card).to_contain_text('Airport change in London')
    card.get_by_role('button', name=re.compile('Journey details')).click()
    dlg = page.get_by_role('dialog')
    dlg.locator('summary', has_text='Why this matters').nth(1).click()
    expect(dlg).to_contain_text('may need to collect your bags')
    expect(dlg).to_contain_text('possible consideration, not a confirmed outcome')
    page.keyboard.press('Escape')
    expect(page.get_by_role('dialog')).to_have_count(0)


# 10. Back/forward and refresh keep selections and passenger details
def back_forward(page):
    seed(page)
    choose(page, card_filter='Direct')
    page.get_by_role('button', name='Continue to return flight').first.click()
    page.go_back()
    expect(page.locator('.flight.chosen')).to_have_count(1)
    page.go_forward()
    expect(page).to_have_url(re.compile('/flights/return'))
    choose(page, card_filter='Direct')
    page.reload()
    expect(page.locator('.flight.chosen')).to_have_count(1)


# 11. Invalid data gives useful inline errors
def invalid(page):
    page.goto(BASE + '/')
    page.evaluate('sessionStorage.clear()')
    page.reload()
    pick_airport(page, 'From', 'London', 'all airports')
    pick_airport(page, 'To', 'Heathrow', 'LHR')
    page.get_by_role('button', name='Search flights').click()
    expect(page.locator('.error-summary')).to_contain_text('overlaps with London (all airports)')
    expect(page.locator('.error-summary')).to_contain_text('Choose a departure date')


# 12. Every dialog closes with its button and Escape
def dialogs(page):
    page.goto(BASE + '/')
    page.get_by_role('tab', name='Hotel').click()
    expect(page.get_by_role('dialog')).to_be_visible()
    page.get_by_role('dialog').get_by_role('button', name='Close').click()
    expect(page.get_by_role('dialog')).to_have_count(0)
    page.get_by_role('button', name='Login').click()
    page.keyboard.press('Escape')
    expect(page.get_by_role('dialog')).to_have_count(0)
    seed(page)
    page.get_by_role('button', name='Show trip summary').click()
    expect(page.locator('#trip-panel')).to_be_visible()
    page.get_by_role('button', name='Close summary').click()
    expect(page.locator('#trip-panel')).to_have_count(0)
    card = page.locator('.flight').first
    card.get_by_role('button', name=re.compile('Choose fare')).click()
    page.get_by_role('button', name=re.compile('Compare date combinations')).click()
    expect(page.locator('#flex-dates')).to_be_visible()
    page.locator('#flex-dates').get_by_role('button', name='Close').click()
    expect(page.locator('#flex-dates')).to_have_count(0)


# 13. Keyboard: combobox, calendar and visible focus
def keyboard(page):
    page.goto(BASE + '/')
    page.evaluate('sessionStorage.clear()')
    page.reload()
    box = page.get_by_role('combobox', name='From')
    box.focus()
    page.keyboard.type('paris')
    page.keyboard.press('Enter')
    expect(box).to_have_value(re.compile('CDG'))
    page.get_by_role('button', name=re.compile('Departure date')).focus()
    page.keyboard.press('Enter')
    for k in ['ArrowDown', 'ArrowDown', 'Enter', 'ArrowRight', 'ArrowRight', 'Enter']:
        page.keyboard.press(k)
    page.get_by_role('button', name='Confirm').focus()
    page.keyboard.press('Enter')
    expect(page.get_by_role('button', name=re.compile('Return date'))).not_to_contain_text('Select date')
    page.get_by_role('button', name='Search flights').focus()
    shadow = page.evaluate('getComputedStyle(document.activeElement).boxShadow')
    assert shadow and shadow != 'none', 'focused control should show a visible focus ring'


# 14. Reduced motion stops ambient animation
def reduced(page):
    page.goto(BASE + '/')
    assert page.evaluate('document.documentElement.dataset.motion') == 'off'
    assert page.evaluate("getComputedStyle(document.querySelector('.beacons .glow')).animationName") == 'none'
    expect(page.get_by_role('button', name=re.compile('Ambient motion'))).to_be_disabled()


def motion_toggle(page):
    page.goto(BASE + '/')
    page.evaluate('localStorage.clear()')
    page.reload()
    assert page.evaluate('document.documentElement.dataset.motion') == 'on'
    page.get_by_role('button', name=re.compile('Ambient motion')).click()
    assert page.evaluate("getComputedStyle(document.querySelector('.beacons .glow')).animationName") == 'none'
    page.get_by_label('Sky').select_option('night')
    expect(page.locator('.sky-hero')).to_have_class(re.compile('sky-night'))


# 15. No horizontal overflow at phone, tablet and desktop widths
def widths(name):
    def run(page):
        seed(page)
        choose(page, card_filter='Direct')
        for path in ['/', '/flights/outbound', '/compare/outbound', '/review']:
            page.goto(BASE + path)
            over = page.evaluate('document.documentElement.scrollWidth - window.innerWidth')
            assert over <= 1, f'{path} overflows by {over}px at {name}'
        shot(page, f'{name}-review')
    return run


# 16. Refresh on deep routes and 404
def routes(page):
    page.goto(BASE + '/payment')
    expect(page).to_have_url(BASE + '/')
    page.goto(BASE + '/no-such-page')
    expect(page.get_by_role('heading', name='Page not found')).to_be_visible()


# 18. Lightweight accessibility audit (axe isn't installable here)
A11Y_JS = r"""() => {
  const out = [];
  const name = el => (el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') && el.getAttribute('aria-labelledby').split(' ').map(id => document.getElementById(id)?.textContent || '').join(' ') || el.textContent || el.title || '').trim();
  document.querySelectorAll('button, a[href], [role=tab], [role=option], [role=combobox]').forEach(el => {
    if (el.closest('[aria-hidden=true]') || el.offsetParent === null && el.getAttribute('role') !== 'combobox') return;
    if (!name(el) && !(el.tagName === 'INPUT' && el.labels && el.labels.length)) out.push('unnamed ' + el.tagName + ' ' + el.className);
  });
  document.querySelectorAll('input:not([type=hidden]), select').forEach(el => {
    if (el.closest('[aria-hidden=true]')) return;
    const ok = (el.labels && el.labels.length) || el.getAttribute('aria-label') || el.getAttribute('aria-labelledby');
    if (!ok) out.push('unlabelled ' + el.tagName + ' ' + (el.name || el.id));
  });
  const ids = {}; document.querySelectorAll('[id]').forEach(el => { ids[el.id] = (ids[el.id] || 0) + 1; });
  Object.entries(ids).forEach(([k, v]) => v > 1 && out.push('duplicate id ' + k));
  if (document.querySelectorAll('main h1').length !== 1) out.push('expected one h1 in main, got ' + document.querySelectorAll('main h1').length);
  if (!document.documentElement.lang) out.push('missing lang');
  return out;
}"""


def a11y(page):
    seed(page)
    choose(page, card_filter='Direct')
    problems = []
    for path in ['/', '/flights/outbound', '/compare/outbound', '/review', '/no-such-page']:
        page.goto(BASE + path)
        problems += [f'{path}: {x}' for x in page.evaluate(A11Y_JS)]
    assert not problems, '; '.join(problems[:6])


# 17. One-way trip and a self-transfer (seats at check-in)
def one_way_self_transfer(page):
    seed(page, {**SEED, 'search': {**SEED['search'], 'tripType': 'oneway', 'ret': None}})
    choose(page, card_filter='Self-transfer')
    page.get_by_role('button', name='Continue to review flights').first.click()
    expect(page.locator('.leg-card')).to_have_count(1)
    page.get_by_role('button', name='Continue to seats').click()
    expect(page.get_by_role('heading', name='Seats are allocated at check-in')).to_be_visible()
    page.get_by_role('button', name='Continue', exact=True).click()
    expect(page).to_have_url(re.compile('/summary'))
    expect(page.locator('.breakdown')).to_contain_text('transfer LGW → LHR')


check('1  Return journey to review and demo confirmation', full_journey)
check('2  Changing origin resets stale selections', change_origin)
check('3  Passenger count updates price basis and totals', pax_change)
check('4  Extras and bags: no double counting', extras)
check('5  Shortlist, compare, remove, back to results', compare)
check('6  Date change keeps outbound/return valid', date_change)
check('7  Filters to no results, then reset', filters)
check('8  Layover timeline labels legs and layover', layover)
check('9  Self-transfer / airport-change warnings', warnings)
check('10 Back, forward and refresh keep choices', back_forward)
check('11 Invalid search shows inline errors', invalid)
check('12 Dialogs and panels close by button and Escape', dialogs)
check('13 Keyboard: combobox, calendar, focus ring', keyboard)
check('14 Reduced motion stops ambient animation', reduced, {**DESKTOP, 'reduced_motion': 'reduce'})
check('14b Motion switch and sky selector work', motion_toggle)
check('15 No overflow: phone', widths('phone'), PHONE)
check('15 No overflow: tablet', widths('tablet'), TABLET)
check('15 No overflow: desktop', widths('desktop'), DESKTOP)
check('16 Deep routes, guards and 404', routes)
check('17 One way with self-transfer', one_way_self_transfer)
check('1  Full journey on a phone', full_journey, PHONE)
check('18 Accessibility checks on key pages', a11y)

w = max(len(r[0]) for r in results)
for n, s, e in results:
    print(f'{s}  {n.ljust(w)}  {e}')
print(f"\n{sum(1 for r in results if r[1] == 'PASS')}/{len(results)} passed")
sys.exit(0 if all(s == 'PASS' for _, s, _ in results) else 1)
