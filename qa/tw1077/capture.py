# TW-1077 Community tab capture harness.
# Serves the worktree over http and captures stills, phase shots, a
# reduced-motion still, a route-highlight shot, a click-through
# assertion, a short motion recording, an unforced phase-mapping
# probe at the boundary hours, and the fail-closed floor probes
# (village.js blocked, JavaScript disabled, torn down after load)
# with Playwright.
# Sandbox disclosure: captures run in headless Chromium on this
# sandbox (no GPU); the village is SVG and DOM, so no GL override
# is needed. Timings are real; the roaming is the page's own loop.
import json
import subprocess
import sys
import time
import urllib.request

from playwright.sync_api import sync_playwright

ROOT = "/home/hatch/workspace/repos/ourlgcy-demo-tw1077"
OUT = f"{ROOT}/qa/tw1077"
PORT = 8957
EXE = "/home/hatch/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome"
BASE = f"http://127.0.0.1:{PORT}"

server = subprocess.Popen(
    [sys.executable, "-m", "http.server", str(PORT)],
    cwd=ROOT,
    stdout=subprocess.DEVNULL,
    stderr=subprocess.DEVNULL,
)
time.sleep(1.0)
# Guard against a foreign server already owning the port (a sibling
# session's server once served the wrong directory in TW-1147).
with urllib.request.urlopen(f"{BASE}/community.html", timeout=10) as resp:
    body = resp.read().decode("utf-8", "replace")
assert "village-svg" in body, "port serves a foreign directory; aborting"
print("@@SERVER@@ ok")

errors = []
http_errors = []
report = {}


def watch(page):
    page.on(
        "console",
        lambda m: (
            errors.append(f"{m.text} @ {m.location.get('url', '')}")
            if m.type == "error"
            else None
        ),
    )
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.on(
        "response",
        lambda r: (
            http_errors.append(f"{r.status} {r.url}") if r.status >= 400 else None
        ),
    )


def state_of(page):
    return page.evaluate(
        "() => { const s = window.__lgcyVillage || {};"
        " return { mode: s.mode, tier: s.tier, phase: s.phase,"
        " walkers: s.walkers, transport: s.transport || null }; }"
    )


try:
    with sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path=EXE, args=["--no-sandbox"])

        # 1. Desktop. First a live-clock probe (the sandbox clock
        # runs on UTC, so the unforced page reads night there; the
        # probe proves the clock path), then the hero shot held at
        # midday with the ?village= override.
        ctx = browser.new_context(viewport={"width": 1440, "height": 900})
        page = ctx.new_page()
        watch(page)
        page.goto(f"{BASE}/community.html")
        page.wait_for_timeout(1200)
        report["liveClockProbe"] = state_of(page)
        page.goto(f"{BASE}/community.html?village=midday")
        page.wait_for_timeout(6000)
        report["desktop"] = state_of(page)
        page.screenshot(path=f"{OUT}/community-desktop.png", full_page=True)
        page.locator("#village-stage").screenshot(path=f"{OUT}/stage-desktop.png")
        # 1b. Unforced phase mapping: phaseForHour is the pure
        # mapping phaseFromClock reads, independent of the
        # ?village= override holding the shots above. The boundary
        # hours are the point of the probe: deep night (hours 0 to
        # 4) must resolve to night, not morning (Rosa gate fix).
        report["phaseMap"] = page.evaluate(
            "() => { const f = window.__lgcyVillage.phaseForHour;"
            " const out = {}; for (let h = 0; h < 24; h++) out[h] = f(h);"
            " return out; }"
        )

        # 2. Traffic: first vehicle (the buggy) enters at once.
        page.goto(f"{BASE}/community.html?village=afternoon&traffic=1")
        page.wait_for_timeout(9000)
        report["traffic"] = page.evaluate(
            "() => { const v = document.querySelectorAll('#v-vehicles > g');"
            " const vis = [...v].filter(e => e.style.display !== 'none').length;"
            " return { vehicleGroups: v.length, visible: vis }; }"
        )
        page.locator("#village-stage").screenshot(path=f"{OUT}/stage-traffic.png")
        ctx.close()

        # 3. Dusk: lit windows and the warm tint.
        ctx = browser.new_context(viewport={"width": 1440, "height": 900})
        page = ctx.new_page()
        watch(page)
        page.goto(f"{BASE}/community.html?village=dusk")
        page.wait_for_timeout(1500)
        report["dusk"] = state_of(page)
        report["dusk"]["litWindows"] = page.evaluate(
            "() => document.querySelectorAll('.v-win.lit').length"
        )
        page.locator("#village-stage").screenshot(path=f"{OUT}/stage-dusk.png")
        ctx.close()

        # 4. Night: moon, lamps, most villagers home.
        ctx = browser.new_context(viewport={"width": 1440, "height": 900})
        page = ctx.new_page()
        watch(page)
        page.goto(f"{BASE}/community.html?village=night")
        page.wait_for_timeout(7000)
        report["night"] = state_of(page)
        report["night"]["visibleWalkers"] = page.evaluate(
            "() => [...document.querySelectorAll('#v-walkers > a')]"
            ".filter(a => parseFloat(a.getAttribute('opacity')) > 0.5).length"
        )
        page.locator("#village-stage").screenshot(path=f"{OUT}/stage-night.png")
        ctx.close()

        # 5. Reduced motion: composed still village, parked transport.
        ctx = browser.new_context(
            viewport={"width": 1440, "height": 900}, reduced_motion="reduce"
        )
        page = ctx.new_page()
        watch(page)
        page.goto(f"{BASE}/community.html")
        page.wait_for_timeout(1200)
        report["still"] = state_of(page)
        report["still"]["parkedVehicles"] = page.evaluate(
            "() => [...document.querySelectorAll('#v-vehicles > g')]"
            ".filter(e => e.style.display !== 'none').length"
        )
        report["still"]["xavierKit"] = page.evaluate(
            "() => document.querySelector('a[aria-label^=\"Xavier Shote\"]')"
            ".getAttribute('data-kit')"
        )
        report["rosterSize"] = page.evaluate(
            "() => (window.__lgcyVillage.roster || []).length"
        )
        page.screenshot(path=f"{OUT}/community-still.png", full_page=True)
        ctx.close()

        # 6. Mobile: cropped viewBox, roster below the stage.
        ctx = browser.new_context(viewport={"width": 390, "height": 844})
        page = ctx.new_page()
        watch(page)
        page.goto(f"{BASE}/community.html")
        page.wait_for_timeout(2200)
        report["mobile"] = state_of(page)
        report["mobile"]["viewBox"] = page.evaluate(
            "() => document.getElementById('village-svg').getAttribute('viewBox')"
        )
        page.screenshot(path=f"{OUT}/community-mobile.png", full_page=True)
        ctx.close()

        # 7. Route highlight on hover, then click-through to profile.
        ctx = browser.new_context(viewport={"width": 1440, "height": 900})
        page = ctx.new_page()
        watch(page)
        page.goto(f"{BASE}/community.html?village=midday")
        page.wait_for_timeout(1500)
        # Walkers roam, so a synthetic hover never settles; fire the
        # same mouseenter the browser would, on a visible villager.
        report["hoveredWalker"] = page.evaluate(
            "() => { const a = [...document.querySelectorAll('#v-walkers > a')]"
            ".find(e => parseFloat(e.getAttribute('opacity')) > 0.9);"
            " if (!a) return null;"
            " a.dispatchEvent(new MouseEvent('mouseenter'));"
            " return a.getAttribute('aria-label'); }"
        )
        page.wait_for_timeout(450)
        report["routeHlOpacity"] = page.evaluate(
            "() => document.getElementById('v-route-hl').getAttribute('opacity')"
        )
        page.locator("#village-stage").screenshot(path=f"{OUT}/stage-route.png")
        ctx.close()

        ctx = browser.new_context(
            viewport={"width": 1440, "height": 900}, reduced_motion="reduce"
        )
        page = ctx.new_page()
        watch(page)
        page.goto(f"{BASE}/community.html")
        page.wait_for_timeout(600)
        # Xavier stands alone at the oak in the still composition,
        # so a real pointer click lands on him and nothing else.
        page.click('a[aria-label^="Xavier Shote"]')
        page.wait_for_url(f"{BASE}/person.html", timeout=5000)
        report["clickThrough"] = "person.html reached"
        ctx.close()

        # 7b. Data-driven proof: the same page, with one record's
        # status flipped to probable at the data layer only, must
        # render that villager era-neutral and label the year
        # probable in the roster. No code changes, data only.
        ctx = browser.new_context(
            viewport={"width": 1440, "height": 900}, reduced_motion="reduce"
        )
        page = ctx.new_page()
        watch(page)
        with open(f"{ROOT}/villagers-data.js", encoding="utf-8") as fh:
            data_js = fh.read()
        data_js += (
            "\nwindow.LGCY_VILLAGERS = window.LGCY_VILLAGERS.map("
            "r => r.id === 'xavier' ? {...r, bornStatus: 'probable'} : r);\n"
        )
        page.route(
            "**/villagers-data.js",
            lambda route: route.fulfill(
                body=data_js, content_type="application/javascript"
            ),
        )
        page.goto(f"{BASE}/community.html")
        page.wait_for_timeout(900)
        report["probableMutation"] = page.evaluate(
            "() => { const a = document.querySelector("
            "'a[aria-label^=\"Xavier Shote\"]');"
            " const li = [...document.querySelectorAll('.roster-btn')]"
            ".find(e => e.textContent.includes('Xavier'));"
            " return { kit: a.getAttribute('data-kit'),"
            " status: a.getAttribute('data-status'),"
            " roster: li ? li.textContent : null }; }"
        )
        ctx.close()

        # 8. Home regression: the nav carries the Community link.
        ctx = browser.new_context(viewport={"width": 1440, "height": 900})
        page = ctx.new_page()
        watch(page)
        page.goto(f"{BASE}/index.html")
        page.wait_for_timeout(800)
        report["homeNavCommunityLinks"] = page.evaluate(
            "() => document.querySelectorAll('a[href=\"community.html\"]').length"
        )
        ctx.close()

        # 8b. Floor probes (Rosa gate fix round): what stands when
        # the layer never loads, and what stands after teardown.
        # Blocked script: village.js aborted at the network layer,
        # so the roster that stands is the static HTML rendered in
        # community.html from the same records: 14 profile links,
        # the drawn scene, and no walkers.
        ctx = browser.new_context(viewport={"width": 1440, "height": 900})
        page = ctx.new_page()
        page.route("**/village.js", lambda route: route.abort())
        page.goto(f"{BASE}/community.html")
        page.wait_for_timeout(800)
        report["blockedFloor"] = page.evaluate(
            "() => ({ scene: !!document.getElementById('village-svg'),"
            " rosterLinks:"
            " document.querySelectorAll('#roster-list a.roster-btn').length,"
            " rosterHrefs:"
            " [...document.querySelectorAll('#roster-list a.roster-btn')]"
            ".every(a => a.getAttribute('href') === 'person.html'),"
            " walkers: document.querySelectorAll('#v-walkers > a').length })"
        )
        ctx.close()

        # JavaScript disabled: the floor comes from the HTML the
        # browser parsed, scene plus static roster plus the
        # noscript note. page.content() reads the parsed DOM back
        # over CDP, which works with page scripts off.
        ctx = browser.new_context(java_script_enabled=False)
        page = ctx.new_page()
        page.goto(f"{BASE}/community.html")
        page.wait_for_timeout(400)
        nojs_html = page.content()
        report["noJsFloor"] = {
            "rosterLinks": nojs_html.count('class="roster-btn"'),
            "scene": 'id="village-svg"' in nojs_html,
            "noscript": "stand as drawn" in nojs_html,
        }
        ctx.close()

        # Torn down after load: the layer's own teardown leaves
        # the scene and the roster it built standing.
        ctx = browser.new_context(viewport={"width": 1440, "height": 900})
        page = ctx.new_page()
        watch(page)
        page.goto(f"{BASE}/community.html?village=midday")
        page.wait_for_timeout(1200)
        report["tornDownFloor"] = page.evaluate(
            "() => { window.__lgcyVillage.teardown('harness-probe');"
            " return { mode: window.__lgcyVillage.mode,"
            " scene: !!document.getElementById('village-svg'),"
            " rosterLinks:"
            " document.querySelectorAll('#roster-list a.roster-btn').length }; }"
        )
        ctx.close()

        # 9. Motion recording: 16 seconds of the roaming day.
        ctx = browser.new_context(
            viewport={"width": 1280, "height": 800},
            record_video_dir=f"{OUT}/video",
            record_video_size={"width": 1280, "height": 800},
        )
        page = ctx.new_page()
        watch(page)
        page.goto(f"{BASE}/community.html?village=midday&traffic=1")
        page.locator("#village-stage").scroll_into_view_if_needed()
        page.wait_for_timeout(16000)
        report["video"] = state_of(page)
        video_path = page.video.path()
        ctx.close()
        browser.close()

    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-loglevel",
            "error",
            "-i",
            video_path,
            "-c:v",
            "libx264",
            "-pix_fmt",
            "yuv420p",
            "-movflags",
            "+faststart",
            f"{OUT}/motion-community.mp4",
        ],
        check=True,
    )
    subprocess.run(["rm", "-rf", f"{OUT}/video"], check=True)
finally:
    server.terminate()

report["consoleErrors"] = errors
report["httpErrors"] = http_errors
print(json.dumps(report, indent=2))
real_errors = [e for e in http_errors if "favicon" not in e]
assert not real_errors, f"http errors: {real_errors}"
assert not [e for e in errors if "favicon" not in e], f"console errors: {errors}"
assert report["desktop"]["mode"] == "roam", report["desktop"]
assert report["desktop"]["walkers"] == 14, report["desktop"]
assert report["still"]["mode"] == "still", report["still"]
assert report["still"]["parkedVehicles"] == 4, report["still"]
assert report["dusk"]["litWindows"] > 0, report["dusk"]
assert report["clickThrough"] == "person.html reached"
assert report["homeNavCommunityLinks"] >= 1
assert report["routeHlOpacity"] == "0.5", report["routeHlOpacity"]
assert report["traffic"]["visible"] >= 1, report["traffic"]
assert report["rosterSize"] == 14, report["rosterSize"]
assert report["still"]["xavierKit"] == "hoodie", report["still"]
mut = report["probableMutation"]
assert mut["kit"] == "neutral", mut
assert mut["status"] == "probable", mut
assert "probable" in (mut["roster"] or ""), mut
# Unforced phase mapping, full sweep plus the boundary hours by
# name: 0 and 4 are night, 5 is dawn, 19 is dusk, 20 is night.
expected_phases = (
    ["night"] * 5
    + ["dawn"] * 2
    + ["morning"] * 4
    + ["midday"] * 4
    + ["afternoon"] * 3
    + ["dusk"] * 2
    + ["night"] * 4
)
pm = report["phaseMap"]
assert [pm[str(h)] for h in range(24)] == expected_phases, pm
assert pm["0"] == "night" and pm["4"] == "night", pm
assert pm["5"] == "dawn" and pm["19"] == "dusk" and pm["20"] == "night", pm
# Floors: blocked script and no-JavaScript both stand on the
# static roster (14 links, all to person.html where checkable),
# and teardown leaves the built roster standing.
bf = report["blockedFloor"]
assert bf["scene"] and bf["rosterLinks"] == 14, bf
assert bf["rosterHrefs"] and bf["walkers"] == 0, bf
nj = report["noJsFloor"]
assert nj["scene"] and nj["rosterLinks"] == 14 and nj["noscript"], nj
td = report["tornDownFloor"]
assert td["mode"] == "off" and td["scene"] and td["rosterLinks"] == 14, td
print("@@CAPTURE@@ all assertions passed")
