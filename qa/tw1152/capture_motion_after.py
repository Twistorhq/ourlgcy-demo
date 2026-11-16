# TW-1152 after-motion re-record: video context only, long hold.
# The first after recording's WebGL surface merged into the
# screencast only in its final seconds (SwiftShader, same limit
# TW-1147 disclosed), leaving too short a composited window. This
# run holds 60 s after the scroll so the trimmed tail is fully
# composited and spans scheduled gestures (every 9 to 15 s of
# active time under the new cadence).
import subprocess
import sys
import time
import urllib.request

from playwright.sync_api import sync_playwright

ROOT = "/home/hatch/workspace/repos/ourlgcy-demo-tw1152"
OUT = "/home/hatch/workspace/repos/ourlgcy-demo-tw1152/qa/tw1152"
PORT = 8953
CHROME = "/home/hatch/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome"
LENIS_STUB = "export default class Lenis { constructor() {} raf() {} destroy() {} }"

server = subprocess.Popen(
    [sys.executable, "-m", "http.server", str(PORT)],
    cwd=ROOT,
    stdout=subprocess.DEVNULL,
    stderr=subprocess.DEVNULL,
)
time.sleep(1.0)
with urllib.request.urlopen(f"http://127.0.0.1:{PORT}/index.html", timeout=10) as resp:
    body = resp.read().decode("utf-8", "replace")
assert "buck-break" in body and "critter-deer" not in body, "wrong root; aborting"
print("@@SERVER@@ ok")

try:
    with sync_playwright() as p:
        browser = p.chromium.launch(
            executable_path=CHROME, args=["--use-angle=swiftshader"]
        )
        ctx = browser.new_context(
            viewport={"width": 640, "height": 400},
            record_video_dir=OUT,
            record_video_size={"width": 640, "height": 400},
        )
        page = ctx.new_page()
        page.route(
            "**/gl/vendor/lenis.mjs",
            lambda route: route.fulfill(
                content_type="text/javascript", body=LENIS_STUB
            ),
        )
        page.goto(f"http://127.0.0.1:{PORT}/index.html?gl=force-a")
        deadline = time.time() + 400
        tier = None
        while time.time() < deadline:
            tier = page.evaluate(
                "() => window.__lgcyBuck ? window.__lgcyBuck.tier : null"
            )
            if tier in ("A", "B"):
                break
            time.sleep(2)
        print("@@TIER@@", tier)
        assert tier in ("A", "B")
        page.evaluate(
            "() => document.getElementById('buck-break')"
            ".scrollIntoView({behavior: 'instant', block: 'start'})"
        )
        page.wait_for_timeout(60000)
        video = page.video
        ctx.close()
        print("@@VIDEO@@", video.path())
        browser.close()
finally:
    server.terminate()
