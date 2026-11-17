# TW-1076 composed stills: all four fauna residents in the buck's
# threshold scene at desktop (1152) and mobile (390) widths, plus
# posed gesture stills and native-pixel crops of each animal at
# final size for the blend-law evidence. Crops land in each
# species' own QA folder.
# Same harness treatment as TW-1147, disclosed in the packs: the
# sandbox renderer is SwiftShader (software), so the ?gl=force-a
# QA override is used, and the vendored Lenis module is stubbed at
# the network layer (harness only, page code untouched) so the
# section can be held on camera.
import os
import subprocess
import sys
import time
import urllib.request

from playwright.sync_api import sync_playwright

# The sandbox venv's playwright expects a browser revision that is
# not in the local cache; a cached headless shell is used instead
# when present (harness detail only).
SHELL = os.path.expanduser(
    "~/.cache/ms-playwright/chromium_headless_shell-1248"
    "/chrome-headless-shell-linux64/chrome-headless-shell"
)
LAUNCH = {"args": ["--use-angle=swiftshader"]}
if os.path.exists(SHELL):
    LAUNCH["executable_path"] = SHELL

ROOT = "/home/hatch/workspace/repos/ourlgcy-demo-tw1076"
OUT = f"{ROOT}/qa/tw1076-squirrel"
PORT = 8951
LENIS_STUB = "export default class Lenis { constructor() {} raf() {} destroy() {} }"
READY_JS = (
    "() => !!(window.__lgcyBuck && window.__lgcyBuck.tier"
    " && window.__lgcyBuck.squirrelRect && window.__lgcyBuck.owlRect"
    " && window.__lgcyBuck.jayRect && window.__lgcyBuck.woodpeckerRect)"
)

server = subprocess.Popen(
    [sys.executable, "-m", "http.server", str(PORT)],
    cwd=ROOT,
    stdout=subprocess.DEVNULL,
    stderr=subprocess.DEVNULL,
)
time.sleep(1.0)
try:
    with urllib.request.urlopen(
        f"http://127.0.0.1:{PORT}/index.html", timeout=10
    ) as resp:
        body = resp.read().decode("utf-8", "replace")
    assert "gl/fauna.js" in body, "port serves a foreign directory; aborting"
    print("@@SERVER@@ ok")

    def wait_ready(page, timeout_s):
        deadline = time.time() + timeout_s
        while time.time() < deadline:
            if page.evaluate(READY_JS):
                return page.evaluate("() => window.__lgcyBuck.tier")
            time.sleep(2)
        return None

    def goto_section(page):
        page.evaluate(
            "() => document.getElementById('buck-break')"
            ".scrollIntoView({behavior: 'instant', block: 'start'})"
        )
        page.wait_for_timeout(2500)

    def crop(page, rect_fn, path, pad=26):
        rect = page.evaluate(f"() => window.__lgcyBuck.{rect_fn}()")
        print(f"@@RECT@@ {rect_fn}", rect)
        clip = {
            "x": max(0, rect["x"] - pad),
            "y": max(0, rect["y"] - pad),
            "width": rect["width"] + 2 * pad,
            "height": rect["height"] + 2 * pad,
        }
        page.screenshot(path=path, clip=clip, timeout=120000)
        print("@@SHOT@@", path)

    with sync_playwright() as p:
        browser = p.chromium.launch(**LAUNCH)

        # ---------- desktop ----------
        ctx = browser.new_context(viewport={"width": 1152, "height": 800})
        page = ctx.new_page()
        page.route(
            "**/gl/vendor/lenis.mjs",
            lambda route: route.fulfill(
                content_type="text/javascript", body=LENIS_STUB
            ),
        )
        page.goto(f"http://127.0.0.1:{PORT}/index.html?gl=force-a")
        tier = wait_ready(page, 300)
        print("@@TIER@@", tier)
        assert tier in ("A", "B"), "buck tier never landed"
        goto_section(page)
        page.screenshot(path=f"{OUT}/composed-1152.png", timeout=120000)
        print("@@SHOT@@ composed-1152.png")
        crop(page, "squirrelRect", f"{OUT}/squirrel-final-size.png")
        crop(page, "owlRect", f"{ROOT}/qa/tw1076-owl/owl-final-size.png")
        crop(page, "jayRect", f"{ROOT}/qa/tw1076-jay/jay-final-size.png")
        crop(
            page,
            "woodpeckerRect",
            f"{ROOT}/qa/tw1076-woodpecker/woodpecker-final-size.png",
        )
        # posed gestures, one per resident
        page.evaluate("() => window.__lgcyBuck.faunaPlay('Squirrel_Nibble')")
        page.wait_for_timeout(2700)
        page.screenshot(path=f"{OUT}/composed-nibble-1152.png", timeout=120000)
        print("@@SHOT@@ composed-nibble-1152.png")
        page.evaluate("() => window.__lgcyBuck.faunaResidents.owl.play('Owl_Turn')")
        page.wait_for_timeout(2600)
        crop(page, "owlRect", f"{ROOT}/qa/tw1076-owl/owl-turn-composed.png")
        page.evaluate(
            "() => window.__lgcyBuck.faunaResidents.woodpecker.play('Woodpecker_Peck')"
        )
        page.wait_for_timeout(1900)
        crop(
            page,
            "woodpeckerRect",
            f"{ROOT}/qa/tw1076-woodpecker/woodpecker-peck-composed.png",
        )
        page.evaluate("() => window.__lgcyBuck.faunaResidents.jay.play('Jay_Look')")
        page.wait_for_timeout(1500)
        crop(page, "jayRect", f"{ROOT}/qa/tw1076-jay/jay-look-composed.png")
        ctx.close()

        # ---------- mobile ----------
        mctx = browser.new_context(viewport={"width": 390, "height": 844})
        mpage = mctx.new_page()
        mpage.route(
            "**/gl/vendor/lenis.mjs",
            lambda route: route.fulfill(
                content_type="text/javascript", body=LENIS_STUB
            ),
        )
        mpage.goto(f"http://127.0.0.1:{PORT}/index.html?gl=force-a")
        mtier = wait_ready(mpage, 300)
        print("@@MTIER@@", mtier)
        assert mtier in ("A", "B"), "mobile buck tier never landed"
        goto_section(mpage)
        for fn in ("squirrelRect", "owlRect", "jayRect", "woodpeckerRect"):
            print(f"@@MRECT@@ {fn}", mpage.evaluate(f"() => window.__lgcyBuck.{fn}()"))
        mpage.screenshot(path=f"{OUT}/composed-390.png", timeout=120000)
        print("@@SHOT@@ composed-390.png")
        mctx.close()
        browser.close()
finally:
    server.terminate()
