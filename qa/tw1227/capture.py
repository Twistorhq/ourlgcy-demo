# TW-1227 proof capture harness (modeled on qa/tw1156/strip_capture.py).
# Run with ~/qa-venv/bin/python (playwright lives there).
# Usage: capture.py <root> <port> <outdir> <tag> <query> [wait_ms] [extra_js]
# Serves <root>, opens the Community tab with <query>, waits, shoots
# the stage full-size, and dumps window.__lgcyVillage state as JSON.
import json
import subprocess
import sys
import time
import urllib.request

from playwright.sync_api import sync_playwright

ROOT, PORT, OUT, TAG, QUERY = sys.argv[1], int(sys.argv[2]), sys.argv[3], sys.argv[4], sys.argv[5]
WAIT = int(sys.argv[6]) if len(sys.argv) > 6 else 6000
EXTRA = sys.argv[7] if len(sys.argv) > 7 else ""
EXE = "/home/hatch/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome"
BASE = f"http://127.0.0.1:{PORT}"

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
        page.goto(f"{BASE}/community.html{QUERY}")
        page.wait_for_timeout(WAIT)
        if EXTRA:
            page.evaluate(EXTRA)
            page.wait_for_timeout(600)
        stage = page.locator("#village-stage")
        stage.screenshot(path=f"{OUT}/{TAG}.png")
        state = page.evaluate("() => JSON.parse(JSON.stringify(window.__lgcyVillage || {}))")
        with open(f"{OUT}/{TAG}-state.json", "w") as fh:
            json.dump({"state": state, "pageerrors": errors}, fh, indent=1)
        print(f"@@SHOT@@ {TAG} phase={state.get('phase')} mode={state.get('mode')} walkers={state.get('walkers')} errors={len(errors)}")
        browser.close()
finally:
    server.terminate()
