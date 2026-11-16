# TW-1147 mobile still: composed buck at 390x844 (no video; the
# desktop run carries the motion). Same harness treatment as
# capture.py: ?gl=force-a override + Lenis stub, disclosed.
import subprocess
import sys
import time

from playwright.sync_api import sync_playwright

ROOT = "/home/hatch/workspace/repos/ourlgcy-demo-tw1075b"
OUT = f"{ROOT}/qa/tw1147"
STUB = "export default class Lenis { constructor() {} raf() {} destroy() {} }"

server = subprocess.Popen(
    [sys.executable, "-m", "http.server", "8937"],
    cwd=ROOT,
    stdout=subprocess.DEVNULL,
    stderr=subprocess.DEVNULL,
)
time.sleep(1.0)
try:
    with sync_playwright() as p:
        b = p.chromium.launch(args=["--use-angle=swiftshader"])
        page = b.new_page(viewport={"width": 390, "height": 844})
        page.route(
            "**/gl/vendor/lenis.mjs",
            lambda r: r.fulfill(content_type="text/javascript", body=STUB),
        )
        page.goto("http://127.0.0.1:8937/index.html?gl=force-a")
        page.wait_for_function(
            "() => window.__lgcyBuck && window.__lgcyBuck.tier",
            timeout=120000,
        )
        print("@@TIER@@", page.evaluate("() => window.__lgcyBuck.tier"))
        page.evaluate(
            "() => document.getElementById('buck-break').scrollIntoView({behavior: 'instant', block: 'start'})"
        )
        page.wait_for_timeout(2500)
        page.screenshot(path=f"{OUT}/composed-390.png", timeout=120000)
        print("@@SHOT@@ composed-390.png")
        b.close()
finally:
    server.terminate()
