# TW-1156 walk-cycle strip harness.
# Usage: strip_capture.py <root> <port> <outdir> <tag>
# Serves <root>, opens the Community tab held at midday, zooms the
# SVG onto the street band by the well, and shoots a burst of
# frames so one full gait cycle can be tiled into a strip.
import subprocess
import sys
import time
import urllib.request

from playwright.sync_api import sync_playwright

ROOT, PORT, OUT, TAG = sys.argv[1], int(sys.argv[2]), sys.argv[3], sys.argv[4]
EXE = "/home/hatch/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome"
BASE = f"http://127.0.0.1:{PORT}"

server = subprocess.Popen(
    [sys.executable, "-m", "http.server", str(PORT)],
    cwd=ROOT,
    stdout=subprocess.DEVNULL,
    stderr=subprocess.DEVNULL,
)
time.sleep(1.0)
with urllib.request.urlopen(f"{BASE}/community.html", timeout=10) as resp:
    body = resp.read().decode("utf-8", "replace")
assert "village-svg" in body, "port serves a foreign directory; aborting"
print("@@SERVER@@ ok")

try:
    with sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path=EXE, args=["--no-sandbox"])
        ctx = browser.new_context(viewport={"width": 1200, "height": 760})
        page = ctx.new_page()
        page.goto(f"{BASE}/community.html?village=midday")
        page.wait_for_timeout(5000)
        # Zoom onto the street band between the church and the store:
        # walkers cross here at near full depth scale.
        page.evaluate(
            "() => document.getElementById('village-svg')"
            ".setAttribute('viewBox', '330 420 470 265')"
        )
        page.wait_for_timeout(400)
        stage = page.locator("#village-stage")
        for i in range(30):
            stage.screenshot(path=f"{OUT}/raw-{TAG}-{i:02d}.png")
            page.wait_for_timeout(95)
        ctx.close()
        browser.close()
finally:
    server.terminate()
print("@@STRIP@@ done")
