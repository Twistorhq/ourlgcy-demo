# TW-1227 functional verification (run with ~/qa-venv/bin/python).
# Asserts: hour override drives phase + density; frozen-age shows
# on the roster; a walker click goes to the profile; still mode
# composes; speech fires on its own at midday.
import json
import subprocess
import sys
import time

from playwright.sync_api import sync_playwright

ROOT, PORT, OUT = sys.argv[1], int(sys.argv[2]), sys.argv[3]
EXE = "/home/hatch/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome"
BASE = f"http://127.0.0.1:{PORT}"

server = subprocess.Popen(
    [sys.executable, "-m", "http.server", str(PORT)],
    cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
)
time.sleep(1.0)
results = {}
try:
    with sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path=EXE, args=["--no-sandbox"])

        # Dawn: phase + density from the hour override.
        ctx = browser.new_context(viewport={"width": 1280, "height": 900})
        page = ctx.new_page()
        errs = []
        page.on("pageerror", lambda e: errs.append(str(e)))
        page.goto(f"{BASE}/community.html?village=6")
        page.wait_for_timeout(7000)
        st = page.evaluate("() => JSON.parse(JSON.stringify(window.__lgcyVillage))")
        results["dawn"] = {
            "phase": st.get("phase"), "hour": st.get("hour"),
            "desiredOut": st.get("desiredOut"),
            "expectedDesired": 6, "errors": errs,
        }
        page.locator("#village-stage").screenshot(path=f"{OUT}/after-dawn.png")
        ctx.close()

        # Midday: roster kept-age, natural speech, click-through.
        ctx = browser.new_context(viewport={"width": 1280, "height": 900})
        page = ctx.new_page()
        page.goto(f"{BASE}/community.html?village=12")
        page.wait_for_timeout(4000)
        roster = page.evaluate(
            "() => Array.from(document.querySelectorAll('#roster-list .roster-meta')).map(e => e.textContent)"
        )
        results["keptAgeOnRoster"] = sum(1 for m in roster if "Age kept at" in m)
        results["rosterCount"] = len(roster)
        # Let speech fire naturally.
        page.wait_for_timeout(16000)
        st = page.evaluate("() => JSON.parse(JSON.stringify(window.__lgcyVillage))")
        results["middaySpeechCount"] = st.get("speechCount")
        # Click a visible walker; the tap lights the route, then
        # navigates to the profile after a breath. The stage sits
        # below the fold at this viewport, so scroll it in and
        # pick a walker actually on screen: the Phase 1 run and
        # Rosa's gate both hit the below-the-fold artifact when
        # the click targeted an off-viewport figure.
        page.locator("#village-stage").scroll_into_view_if_needed()
        page.wait_for_timeout(500)
        box = page.evaluate(
            "() => { const ws = Array.from(document.querySelectorAll('#v-walkers .walker'));"
            " for (const w of ws) { const r = w.getBoundingClientRect();"
            " const o = parseFloat(w.getAttribute('opacity') || '1');"
            " if (o > 0.5 && r.width > 0 && r.x >= 0 && r.y >= 0"
            " && r.x + r.width <= innerWidth && r.y + r.height <= innerHeight)"
            " return { x: r.x + r.width / 2, y: r.y + r.height / 2, href: w.getAttribute('href') }; }"
            " return null; }"
        )
        results["clickTarget"] = box
        page.mouse.click(box["x"], box["y"])
        page.wait_for_timeout(1400)
        results["clickLandsOn"] = page.url.split("/")[-1]
        ctx.close()

        # Still mode (reduced-motion path) composes the village.
        ctx = browser.new_context(viewport={"width": 1280, "height": 900})
        page = ctx.new_page()
        page.goto(f"{BASE}/community.html?village=still")
        page.wait_for_timeout(2500)
        st = page.evaluate("() => JSON.parse(JSON.stringify(window.__lgcyVillage))")
        results["still"] = {"mode": st.get("mode"), "walkers": st.get("walkers")}
        page.locator("#village-stage").screenshot(path=f"{OUT}/after-still.png")
        ctx.close()

        # Mobile width: the cropped view still renders the street.
        ctx = browser.new_context(viewport={"width": 375, "height": 700})
        page = ctx.new_page()
        page.goto(f"{BASE}/community.html?village=12")
        page.wait_for_timeout(4000)
        page.locator("#village-stage").screenshot(path=f"{OUT}/after-mobile.png")
        ctx.close()
        browser.close()
finally:
    server.terminate()

print(json.dumps(results, indent=1))
