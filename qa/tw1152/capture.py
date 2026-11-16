# TW-1152 capture harness: before/after stills and motion pair.
# Usage: capture.py before|after
#   before serves the TW-1147 worktree (the merged state, untouched)
#   after  serves this worktree (the TW-1152 build)
# Output lands in this folder either way.
#
# Sandbox honesty, same as TW-1147: the renderer is SwiftShader
# (software), which the page's GL precheck rejects, so captures use
# the ?gl=force-a QA override; the vendored Lenis module is stubbed
# at the network layer (harness only, page code untouched) because
# the real Lenis re-asserts its scroll target every raf tick and a
# programmatic jump cannot hold on camera. The screencast merges
# the WebGL surface late under load, so the buck composites in some
# seconds after the scroll; the motion window is taken after that.
import subprocess
import sys
import time
import urllib.request

from playwright.sync_api import sync_playwright

MODE = sys.argv[1]
ROOTS = {
    "before": "/home/hatch/workspace/repos/ourlgcy-demo-tw1075b",
    "after": "/home/hatch/workspace/repos/ourlgcy-demo-tw1152",
}
ROOT = ROOTS[MODE]
OUT = "/home/hatch/workspace/repos/ourlgcy-demo-tw1152/qa/tw1152"
PORT = 8952
CHROME = "/home/hatch/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome"
LENIS_STUB = "export default class Lenis { constructor() {} raf() {} destroy() {} }"

server = subprocess.Popen(
    [sys.executable, "-m", "http.server", str(PORT)],
    cwd=ROOT,
    stdout=subprocess.DEVNULL,
    stderr=subprocess.DEVNULL,
)
time.sleep(1.0)
# Guard against a foreign server owning the port (a sibling
# session's server once served the wrong directory and cost three
# capture runs in TW-1147): the served page must be the right root.
with urllib.request.urlopen(f"http://127.0.0.1:{PORT}/index.html", timeout=10) as resp:
    body = resp.read().decode("utf-8", "replace")
assert "buck-break" in body, "port serves a foreign directory; aborting"
has_deer = "critter-deer" in body
assert has_deer == (MODE == "before"), f"deer marker mismatch for mode {MODE}"
print(f"@@SERVER@@ ok root={ROOT} deer={has_deer}")

try:
    with sync_playwright() as p:
        browser = p.chromium.launch(
            executable_path=CHROME, args=["--use-angle=swiftshader"]
        )

        def open_page(ctx):
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
            assert tier in ("A", "B"), "buck tier never landed"
            return page

        # ---- desktop stills + base section ----
        ctx = browser.new_context(viewport={"width": 1152, "height": 768})
        page = open_page(ctx)
        page.evaluate(
            "() => document.getElementById('buck-break')"
            ".scrollIntoView({behavior: 'instant', block: 'start'})"
        )
        page.wait_for_timeout(4000)  # mid arrival look
        page.screenshot(path=f"{OUT}/composed-{MODE}-1152.png", timeout=120000)
        print(f"@@SHOT@@ composed-{MODE}-1152.png")
        page.wait_for_timeout(9000)  # arrival look done, at rest
        page.screenshot(path=f"{OUT}/composed-{MODE}-rest-1152.png", timeout=120000)
        print(f"@@SHOT@@ composed-{MODE}-rest-1152.png")
        page.evaluate(
            "() => document.getElementById('gen-7')"
            ".scrollIntoView({behavior: 'instant', block: 'start'})"
        )
        page.wait_for_timeout(2000)
        page.screenshot(path=f"{OUT}/base-{MODE}-1152.png", timeout=120000)
        print(f"@@SHOT@@ base-{MODE}-1152.png")
        ctx.close()

        # ---- mobile still ----
        mctx = browser.new_context(viewport={"width": 390, "height": 844})
        mpage = open_page(mctx)
        mpage.evaluate(
            "() => document.getElementById('buck-break')"
            ".scrollIntoView({behavior: 'instant', block: 'start'})"
        )
        mpage.wait_for_timeout(4000)
        mpage.screenshot(path=f"{OUT}/composed-{MODE}-390.png", timeout=120000)
        print(f"@@SHOT@@ composed-{MODE}-390.png")
        mctx.close()

        # ---- motion ----
        vctx = browser.new_context(
            viewport={"width": 640, "height": 400},
            record_video_dir=OUT,
            record_video_size={"width": 640, "height": 400},
        )
        vpage = open_page(vctx)
        vpage.evaluate(
            "() => document.getElementById('buck-break')"
            ".scrollIntoView({behavior: 'instant', block: 'start'})"
        )
        # Let the surface composite into the screencast, then hold
        # through the arrival look and into the gesture cadence.
        vpage.wait_for_timeout(26000)
        video = vpage.video
        vctx.close()
        print("@@VIDEO@@", video.path())
        browser.close()
finally:
    server.terminate()
