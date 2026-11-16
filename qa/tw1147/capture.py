# TW-1147 motion capture: before (placeholder deer) / after (composed buck).
# Usage: capture.py before|after
# Serves the worktree over http and records with Playwright's video
# capture into this folder. The sandbox renderer is SwiftShader
# (software), so the pages' GL precheck would reject it; the
# ?gl=force-a QA override is used, disclosed in the ticket evidence.
# After-mode also stubs the vendored Lenis module at the network
# layer (harness only, page code untouched): the real Lenis
# re-asserts its own scroll target every raf tick, which makes a
# programmatic jump to the section impossible to hold on camera.
import subprocess
import sys
import time

from playwright.sync_api import sync_playwright

MODE = sys.argv[1]
ROOT = "/home/hatch/workspace/repos/ourlgcy-demo-tw1075b"
OUT = f"{ROOT}/qa/tw1147"
PORT = 8941

LENIS_STUB = "export default class Lenis { constructor() {} raf() {} destroy() {} }"

server = subprocess.Popen(
    [sys.executable, "-m", "http.server", str(PORT)],
    cwd=ROOT,
    stdout=subprocess.DEVNULL,
    stderr=subprocess.DEVNULL,
)
time.sleep(1.0)
# Guard against a foreign server already owning the port (a sibling
# session's server on the old port served the wrong directory and
# cost three capture runs): the served page must be ours.
import urllib.request

with urllib.request.urlopen(f"http://127.0.0.1:{PORT}/index.html", timeout=10) as resp:
    body = resp.read().decode("utf-8", "replace")
assert "buck-break" in body, "port serves a foreign directory; aborting"
print("@@SERVER@@ ok")
try:
    with sync_playwright() as p:
        browser = p.chromium.launch(args=["--use-angle=swiftshader"])
        ctx = browser.new_context(
            viewport={"width": 640, "height": 400},
            record_video_dir=OUT,
            record_video_size={"width": 640, "height": 400},
        )
        page = ctx.new_page()
        if MODE == "after":
            page.route(
                "**/gl/vendor/lenis.mjs",
                lambda route: route.fulfill(
                    content_type="text/javascript", body=LENIS_STUB
                ),
            )
        page.goto(f"http://127.0.0.1:{PORT}/index.html?gl=force-a")
        page.wait_for_timeout(2500)
        if MODE == "before":
            page.evaluate("document.getElementById('gen-7').scrollIntoView()")
            page.wait_for_function(
                "() => window.__lgcyGL && (window.__lgcyGL.tier === 'A' || window.__lgcyGL.tier === 'B')",
                timeout=30000,
            )
            page.wait_for_timeout(1500)
            page.evaluate("window.scrollBy(0, 120)")
            page.wait_for_timeout(14000)
        else:
            # Poll from Python: wait_for_function polls on the page's
            # rAF, which starves under video recording + SwiftShader.
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
            if tier not in ("A", "B"):
                raise TimeoutError("buck tier never landed")
            page.evaluate(
                "() => document.getElementById('buck-break').scrollIntoView({behavior: 'instant', block: 'start'})"
            )
            page.wait_for_timeout(1500)
            top2 = page.evaluate(
                "() => document.getElementById('buck-break').getBoundingClientRect().top"
            )
            print("@@SCROLLED@@ section top after jump:", top2)
            # Let the canvas surface composite into the screencast
            # and the fade-in finish before the measured window.
            page.wait_for_timeout(8000)
            page.wait_for_timeout(16000)
        video = page.video
        ctx.close()
        print("@@VIDEO@@", video.path())

        if MODE == "after":
            # Mobile still: narrow viewport, same harness treatment.
            mctx = browser.new_context(
                viewport={"width": 390, "height": 844},
                record_video_dir=OUT,
            )
            mpage = mctx.new_page()
            mpage.route(
                "**/gl/vendor/lenis.mjs",
                lambda route: route.fulfill(
                    content_type="text/javascript", body=LENIS_STUB
                ),
            )
            mpage.goto(f"http://127.0.0.1:{PORT}/index.html?gl=force-a")
            mdeadline = time.time() + 240
            mtier = None
            while time.time() < mdeadline:
                mtier = mpage.evaluate(
                    "() => window.__lgcyBuck ? window.__lgcyBuck.tier : null"
                )
                if mtier in ("A", "B"):
                    break
                time.sleep(2)
            print("@@MTIER@@", mtier)
            mpage.evaluate(
                "() => document.getElementById('buck-break').scrollIntoView({behavior: 'instant', block: 'start'})"
            )
            mpage.wait_for_timeout(2500)
            mpage.screenshot(path=f"{OUT}/composed-390.png", timeout=120000)
            mctx.close()
        browser.close()
finally:
    server.terminate()
