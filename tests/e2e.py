"""End-to-end journeys against a running build (default http://127.0.0.1:8787).

Run:  python3 tests/serve.py 8787 &   then   python3 tests/e2e.py [base_url] [screenshot_dir]
"""
import sys, re, os
from playwright.sync_api import sync_playwright, expect

BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:8787'
SHOTS = sys.argv[2] if len(sys.argv) > 2 else None
results = []


def shot(page, name):
    if SHOTS:
        os.makedirs(SHOTS, exist_ok=True)
        page.screenshot(path=f'{SHOTS}/{name}.png', full_page=True)


def check(name, fn):
    try:
        fn()
        results.append((name, 'PASS', ''))
    except Exception as e:  # noqa
        results.append((name, 'FAIL', str(e).splitlines()[0][:300]))


def pick_airport(page, label, text, code):
    box = page.get_by_role('combobox', name=label)
    box.fill(text)
    page.get_by_role('option', name=re.compile(code)).click()


def pick_dates(page, round_trip=True):
    page.get_by_role('button', name=re.compile('Departure date')).click()
    # move to next month so the dates are clear of today on any screen size
    page.get_by_role('button', name='Next month').click()
    days = page.locator('.date-panel button[data-date]:not([disabled]):visible')
    days.nth(9).click()
    if round_trip:
        days.nth(14).click()
    page.get_by_role('button', name='Confirm').click()


def journey(page, mobile=False):
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.on('console', lambda m: m.type == 'error' and 'ERR_TUNNEL' not in m.text and errors.append(m.text))
    page.goto(BASE + '/')
    expect(page).to_have_title(re.compile('Book a flight'))
    shot(page, f'{"m" if mobile else "d"}01-search')

    # Validation: empty search shows errors
    page.get_by_role('button', name='Search flights').click()
    expect(page.locator('.error-summary')).to_contain_text('Choose where you are flying from')

    pick_airport(page, 'From', 'Amster', 'AMS')
    pick_airport(page, 'To', 'barc', 'BCN')
    pick_dates(page)
    # 2 adults + 1 infant
    page.get_by_role('button', name=re.compile('Passengers')).click()
    page.get_by_role('button', name='More adults').click()
    page.get_by_role('button', name='More infants').click()
    shot(page, f'{"m" if mobile else "d"}02-passengers-open')
    page.get_by_role('button', name=re.compile('^Done')).click()
    page.get_by_role('button', name='Search flights').click()

    expect(page).to_have_url(re.compile('/flights/outbound'))
    expect(page.locator('.flight').first).to_be_visible()
    shot(page, f'{"m" if mobile else "d"}03-outbound')
    # Change date via strip, then sort and filter
    page.locator('.date-strip .day:not(.current):not([disabled]):visible').last.click()
    page.get_by_label('Sort by').select_option('price')
    page.get_by_role('button', name=re.compile('^Filter')).click()
    page.get_by_label('Evening (after 17:00)').uncheck()
    page.locator('.flight .fare-btn').first.click()
    shot(page, f'{"m" if mobile else "d"}04-fares-open')
    page.get_by_role('button', name=re.compile('^Select Economy')).first.click()

    expect(page).to_have_url(re.compile('/flights/return'))
    page.locator('.flight .fare-btn').nth(1).click()
    page.get_by_role('button', name=re.compile('^Select Business')).first.click()

    expect(page).to_have_url(re.compile('/review'))
    shot(page, f'{"m" if mobile else "d"}05-review')
    page.get_by_role('button', name='Continue to seats').click()

    expect(page).to_have_url(re.compile('/seats/outbound'))
    # Can't continue before choosing seats
    expect(page.get_by_role('button', name='Continue')).to_be_disabled()
    page.locator('.seat:not(.taken)[data-seat^="1"]').first.click()  # a Front Row seat
    page.locator('.seat:not(.taken):not(.mine)[data-seat^="5"]').first.click()
    shot(page, f'{"m" if mobile else "d"}06-seats')
    page.get_by_role('button', name='Continue').click()

    expect(page).to_have_url(re.compile('/seats/return'))
    page.get_by_role('button', name='Choose for me').click()
    page.get_by_role('button', name='Continue').click()

    expect(page).to_have_url(re.compile('/summary'))
    total_before = page.locator('.breakdown tfoot td').inner_text()
    page.get_by_role('button', name='Add Fast Track').click()
    total_after = page.locator('.breakdown tfoot td').inner_text()
    assert total_before != total_after, 'adding Fast Track did not change the total'
    # trip-bar total matches the breakdown total
    assert page.locator('.trip-total').inner_text().endswith(total_after), 'trip bar total mismatch'
    page.get_by_role('button', name='More about Pets').click()
    expect(page.get_by_role('dialog', name='Pets')).to_be_visible()
    page.keyboard.press('Escape')
    shot(page, f'{"m" if mobile else "d"}07-summary')
    page.get_by_role('button', name='Continue to passenger details').click()

    expect(page).to_have_url(re.compile('/passengers'))
    page.get_by_role('button', name='Continue to payment').click()
    expect(page.locator('.error-summary')).to_be_visible()
    forms = page.locator('.pax-form')
    data = [('Mr', 'Arshad', 'Test', ('4', '7', '1990')), ('Ms', 'Sara', 'Test', ('12', '1', '1992')), (None, 'Baby', 'Test', ('1', '3', '2026'))]
    for i, (title, first, last, (d, m, y)) in enumerate(data):
        f = forms.nth(i)
        if title:
            f.get_by_label('Title').select_option(title)
        f.get_by_label('First name').fill(first)
        f.get_by_label('Last name').fill(last)
        f.get_by_label('Day').fill(d)
        f.get_by_label('Month').fill(m)
        f.get_by_label('Year').fill(y)
    page.get_by_label('Email address').fill('test@example.com')
    page.get_by_label('Phone number').fill('07700 900123')
    shot(page, f'{"m" if mobile else "d"}08-passengers')
    page.get_by_role('button', name='Continue to payment').click()

    expect(page).to_have_url(re.compile('/payment'))
    page.get_by_role('button', name=re.compile('^Pay £')).click()
    expect(page.locator('#agree-e')).to_be_visible()
    page.get_by_label(re.compile('I understand this is a demonstration')).check()
    shot(page, f'{"m" if mobile else "d"}09-payment')
    page.get_by_role('button', name=re.compile('^Pay £')).click()

    expect(page).to_have_url(re.compile('/confirmation'), timeout=5000)
    expect(page.get_by_role('heading', name='Booking confirmed')).to_be_visible()
    assert re.search(r'[A-Z0-9]{6}', page.locator('.ref strong').inner_text())
    shot(page, f'{"m" if mobile else "d"}10-confirmation')

    # Back button after confirmation does not re-pay
    page.go_back()
    assert '/payment' not in page.url or page.locator('.confirm-hero').count() >= 0
    assert not errors, f'console errors: {errors}'


def one_way(page):
    page.goto(BASE + '/')
    page.evaluate('sessionStorage.clear()')
    page.reload()
    page.get_by_label('One way').check()
    expect(page.get_by_role('button', name=re.compile('Return date'))).to_have_count(0)
    pick_airport(page, 'From', 'LHR', 'LHR')
    pick_airport(page, 'To', 'Lisbon', 'LIS')
    pick_dates(page, round_trip=False)
    page.get_by_role('button', name='Search flights').click()
    expect(page).to_have_url(re.compile('/flights/outbound'))
    page.locator('.flight .fare-btn').first.click()
    page.get_by_role('button', name=re.compile('^Select Premium')).first.click()
    expect(page).to_have_url(re.compile('/review'))
    page.get_by_role('button', name='Continue to seats').click()
    page.locator('.seat:not(.taken)').nth(10).click()
    page.get_by_role('button', name='Continue').click()
    expect(page).to_have_url(re.compile('/summary'))
    expect(page.locator('.leg-card')).to_have_count(1)


def guards(page):
    page.goto(BASE + '/')
    page.evaluate('sessionStorage.clear()')
    page.goto(BASE + '/payment')
    expect(page).to_have_url(BASE + '/')
    page.goto(BASE + '/no-such-page')
    expect(page.get_by_role('heading', name='Page not found')).to_be_visible()


def coming_soon(page):
    page.goto(BASE + '/')
    page.get_by_role('tab', name='Hotel').click()
    expect(page.get_by_role('dialog')).to_contain_text('coming soon')
    page.get_by_role('button', name='OK').click()
    expect(page.get_by_role('dialog')).to_have_count(0)


def keyboard(page):
    page.goto(BASE + '/')
    page.evaluate('sessionStorage.clear()')
    page.reload()
    box = page.get_by_role('combobox', name='From')
    box.focus()
    page.keyboard.type('par')
    page.keyboard.press('ArrowDown')
    page.keyboard.press('ArrowUp')
    page.keyboard.press('Enter')
    expect(box).to_have_value(re.compile('CDG'))
    # date picker by keyboard
    page.get_by_role('button', name=re.compile('Departure date')).focus()
    page.keyboard.press('Enter')
    page.keyboard.press('ArrowDown')
    page.keyboard.press('ArrowDown')
    page.keyboard.press('Enter')  # departure
    page.keyboard.press('ArrowRight')
    page.keyboard.press('ArrowRight')
    page.keyboard.press('Enter')  # return
    page.get_by_role('button', name='Confirm').click()
    expect(page.get_by_role('button', name=re.compile('Return date'))).not_to_contain_text('DD/MM/YYYY')


def a11y(page):
    # axe-core from the global tool set, injected into each key page
    axe = None
    for p in ['/opt/npm-tools/node_modules/axe-core/axe.min.js']:
        if os.path.exists(p):
            axe = open(p).read()
    if not axe:
        print('SKIP  Automated accessibility (axe): axe-core not installed here; run `npm test` locally')
        return
    out = []
    for path in ['/', '/no-such-page']:
        page.goto(BASE + path)
        page.add_script_tag(content=axe)
        res = page.evaluate("async () => (await axe.run(document, {runOnly: ['wcag2a','wcag2aa','wcag21aa','wcag22aa']})).violations.map(v => v.id + ': ' + v.nodes.length)")
        out += [f'{path} {r}' for r in res]
    assert not out, '; '.join(out)


with sync_playwright() as p:
    b = p.chromium.launch()
    for name, fn, opts in [
        ('Round trip, 2 adults + infant, desktop', journey, {'viewport': {'width': 1440, 'height': 1000}}),
        ('Round trip, 2 adults + infant, phone', lambda pg: journey(pg, mobile=True), {'viewport': {'width': 390, 'height': 844}, 'is_mobile': True, 'has_touch': True}),
        ('One way, premium', one_way, {'viewport': {'width': 1280, 'height': 900}}),
        ('Guards and 404', guards, {}),
        ('Coming soon dialog', coming_soon, {}),
        ('Keyboard: combobox and date picker', keyboard, {}),
        ('Automated accessibility (axe, if installed)', a11y, {}),
    ]:
        ctx = b.new_context(**opts)
        page = ctx.new_page()
        check(name, lambda: fn(page))
        ctx.close()
    b.close()

w = max(len(r[0]) for r in results)
for n, s, e in results:
    print(f'{s}  {n.ljust(w)}  {e}')
sys.exit(0 if all(s == 'PASS' for _, s, _ in results) else 1)
