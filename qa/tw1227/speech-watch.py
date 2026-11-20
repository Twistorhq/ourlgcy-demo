# TW-1227 fix-round speech watch (Rosa gate blocker 1 proof).
# Run with ~/qa-venv/bin/python.
# Usage: speech-watch.py <root> <port> <outdir> [seconds]
# Loads the Community tab at midday and samples the live bubble
# texts every 400ms for the full watch. Any sample holding the
# same text twice is a violation. The full sample log lands in
# <outdir>/speech-watch.log; the summary prints on stdout.
import json
import subprocess
import sys
import time
import urllib.request

from playwright.sync_api import sync_playwright

ROOT, PORT, OUT = sys.argv[1], int(sys.argv[2]), sys.argv[3]
SECONDS = int(sys.argv[4]) if len(sys.argv) > 4 else 75
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
        page.goto(f"{BASE}/community.html?village=12")
        page.wait_for_timeout(3000)
        start = page.evaluate("() => (window.__lgcyVillage || {}).speechCount || 0")
        lines = []
        violations = []
        distinct = set()
        max_sim = 0
        samples = 0
        t0 = time.time()
        while time.time() - t0 < SECONDS:
            texts = page.evaluate(
                "() => Array.from(document.querySelectorAll('#v-bubbles .v-bubble text')).map(t => t.textContent)"
            )
            samples += 1
            elapsed = time.time() - t0
            if texts:
                distinct.update(texts)
                max_sim = max(max_sim, len(texts))
                lines.append(f"t={elapsed:6.1f}s bubbles={json.dumps(texts)}")
                if len(texts) != len(set(texts)):
                    violations.append({"t": round(elapsed, 1), "texts": texts})
                    lines.append(f"t={elapsed:6.1f}s VIOLATION duplicate simultaneous texts")
            page.wait_for_timeout(400)
        end = page.evaluate("() => (window.__lgcyVillage || {}).speechCount || 0")
        summary = {
            "seconds": SECONDS, "samples": samples, "violations": violations,
            "distinctLinesSeen": sorted(distinct), "maxSimultaneous": max_sim,
            "speechCountDelta": end - start, "pageerrors": errors,
        }
        with open(f"{OUT}/speech-watch.log", "w") as fh:
            fh.write("\n".join(lines) + "\n")
            fh.write(json.dumps(summary, indent=1) + "\n")
        print("@@WATCH@@ " + json.dumps(summary))
        browser.close()
finally:
    server.terminate()
