# TW-1227 fix-round sightline proof (Rosa gate blocker 2).
# Run with ~/qa-venv/bin/python.
# Usage: sightlines.py <root> <port> <outdir> [budget_s]
# Loads the Community tab at midday and polls live walker ground
# positions (the translate of each .walker element is its feet
# point in scene units). The moment a walker's feet enter one of
# the three flagged structure zones, it shoots a clipped frame
# of that structure's sightline: canopy (filling station), stall
# (market stall at its new position), well (at its new position).
# Trigger positions land in <outdir>/sightlines.json.
import json
import subprocess
import sys
import time
import urllib.request

from playwright.sync_api import sync_playwright

ROOT, PORT, OUT = sys.argv[1], int(sys.argv[2]), sys.argv[3]
BUDGET = int(sys.argv[4]) if len(sys.argv) > 4 else 120
EXE = "/home/hatch/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome"
BASE = f"http://127.0.0.1:{PORT}"

ZONES = {
    "canopy": {"feet": (990, 455, 1200, 625), "clip": (975, 415, 225, 235)},
    "stall": {"feet": (825, 455, 1035, 585), "clip": (795, 395, 270, 215)},
    "well": {"feet": (475, 455, 685, 585), "clip": (455, 395, 250, 215)},
}
FEET_JS = (
    "() => Array.from(document.querySelectorAll('#v-walkers .walker')).map(w => {"
    " const m = /translate\\(([-\\d.]+)[ ,]+([-\\d.]+)\\)/.exec(w.getAttribute('transform') || '');"
    " const o = parseFloat(w.getAttribute('opacity') || '1');"
    " return m && o > 0.5 ? { x: +m[1], y: +m[2] } : null; }).filter(Boolean)"
)

server = subprocess.Popen(
    [sys.executable, "-m", "http.server", str(PORT)],
    cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
)
time.sleep(1.0)
try:
    with urllib.request.urlopen(f"{BASE}/community.html", timeout=10) as resp:
        body = resp.read().decode("utf-8", "replace")
    assert "village-svg" in body, "port serves a foreign directory; aborting"
    with sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path=EXE, args=["--no-sandbox"])
        ctx = browser.new_context(viewport={"width": 1280, "height": 900})
        page = ctx.new_page()
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.goto(f"{BASE}/community.html?village=12")
        page.wait_for_timeout(3500)
        svg = page.locator("#village-stage svg").first
        svg.scroll_into_view_if_needed()
        page.wait_for_timeout(500)
        box = svg.bounding_box()
        scale = box["width"] / 1200.0
        caught = {}
        t0 = time.time()
        while len(caught) < len(ZONES) and time.time() - t0 < BUDGET:
            feet = page.evaluate(FEET_JS)
            for name, zone in ZONES.items():
                if name in caught:
                    continue
                fx0, fy0, fx1, fy1 = zone["feet"]
                hit = next((f for f in feet if fx0 <= f["x"] <= fx1 and fy0 <= f["y"] <= fy1), None)
                if hit:
                    cx, cy, cw, ch = zone["clip"]
                    page.screenshot(
                        path=f"{OUT}/sightline-{name}.png",
                        clip={"x": box["x"] + cx * scale, "y": box["y"] + cy * scale,
                              "width": cw * scale, "height": ch * scale},
                    )
                    caught[name] = {"feet": hit, "t": round(time.time() - t0, 1)}
            page.wait_for_timeout(350)
        result = {"caught": caught, "missing": [z for z in ZONES if z not in caught],
                  "pageerrors": errors}
        with open(f"{OUT}/sightlines.json", "w") as fh:
            json.dump(result, fh, indent=1)
        print("@@SIGHTLINES@@ " + json.dumps(result))
        browser.close()
finally:
    server.terminate()
