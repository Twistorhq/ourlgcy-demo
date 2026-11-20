#!/usr/bin/env python3
"""TW-1238 art pass proof harness.

Re-shoots the TW-1232 Slice 1 matched framings (same placements)
under the art pass: wide plaza and the Saturday pair at the new
default zoom (1.45), the two greeting closeups at the maximum
zoom (2.2, the founder's reference-2 hard stop), plus a zoomed-out
full-world shot (0.45) and a zoom-control sequence proving the
buttons and the wheel clamp at both stops while the camera holds
the player. Page errors from every page are asserted empty.

Run: ~/qa-venv/bin/python qa/tw1238/capture.py
"""

import json
import subprocess
import sys
import time
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
OUT = Path(__file__).resolve().parent
PORT = 8912
BASE = f"http://localhost:{PORT}/community.html"
CHROME = (
    "/home/hatch/.cache/ms-playwright/"
    "chromium_headless_shell-1248/chrome-headless-shell-linux64/chrome-headless-shell"
)


def npc(state, nid):
    return next(n for n in state["npcs"] if n["id"] == nid)


def main():
    server = subprocess.Popen(
        [sys.executable, "-m", "http.server", str(PORT)],
        cwd=ROOT,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    errors = []
    results = {}
    try:
        time.sleep(1.0)
        with sync_playwright() as pw:
            browser = pw.chromium.launch(executable_path=CHROME)

            def new_page(url, width=1500, height=950):
                page = browser.new_page(viewport={"width": width, "height": height})
                page.on("pageerror", lambda e: errors.append(f"{url}: {e}"))
                page.on(
                    "console",
                    lambda m: (
                        errors.append(f"{url}: console {m.text}")
                        if m.type == "error"
                        else None
                    ),
                )
                page.goto(url, wait_until="networkidle")
                page.wait_for_function("window.__lgcyWorld !== undefined")
                return page

            def shot(page, name):
                page.locator("#world-stage").screenshot(path=str(OUT / name))

            # --- Wide plaza at the NEW DEFAULT zoom (Slice 1: zoom=1) ---
            page = new_page(f"{BASE}?village=11")
            time.sleep(2.5)
            shot(page, "wide-plaza.png")
            st = page.evaluate("window.__lgcyWorld.state()")
            results["wide_default"] = {
                "zoom": st["zoom"],
                "target_zoom": st["targetZoom"],
                "zoom_min": st["zoomMin"],
                "zoom_max": st["zoomMax"],
                "active": sum(1 for n in st["npcs"] if n["active"]),
            }

            # --- Zoomed-out full world (the wide end) ---
            page.evaluate("window.__lgcyWorld.placePlayer(1600, 1300)")
            for _ in range(6):
                page.click("#world-zoom-out")
                time.sleep(0.22)
            time.sleep(1.2)
            st = page.evaluate("window.__lgcyWorld.state()")
            shot(page, "full-world.png")
            results["full_world"] = {"zoom": st["zoom"], "target_zoom": st["targetZoom"]}

            # --- Zoom-control sequence: buttons to the hard stop,
            #     then the wheel past the wide stop ---
            page.close()
            page = new_page(f"{BASE}?village=11")
            page.evaluate("window.__lgcyWorld.placePlayer(1600, 1660)")
            time.sleep(0.8)
            shot(page, "zoom-seq-a-default.png")
            for _ in range(4):
                page.click("#world-zoom-in")
                time.sleep(0.22)
            time.sleep(1.2)
            st = page.evaluate("window.__lgcyWorld.state()")
            shot(page, "zoom-seq-b-max.png")
            results["zoom_max_stop"] = {
                "zoom": st["zoom"],
                "target_zoom": st["targetZoom"],
                "at_max": abs(st["targetZoom"] - st["zoomMax"]) < 1e-9,
                "cam_player_gap": [
                    st["cam"]["x"] - st["player"]["x"],
                    st["cam"]["y"] - st["player"]["y"],
                ],
            }
            box = page.locator("#world-canvas").bounding_box()
            page.mouse.move(box["x"] + box["width"] / 2, box["y"] + box["height"] / 2)
            for _ in range(16):
                page.mouse.wheel(0, 240)
                time.sleep(0.12)
            time.sleep(1.2)
            st = page.evaluate("window.__lgcyWorld.state()")
            shot(page, "zoom-seq-c-min.png")
            results["zoom_min_stop"] = {
                "zoom": st["zoom"],
                "target_zoom": st["targetZoom"],
                "at_min": abs(st["targetZoom"] - st["zoomMin"]) < 0.01,
                "cam_player_gap": [
                    st["cam"]["x"] - st["player"]["x"],
                    st["cam"]["y"] - st["player"]["y"],
                ],
            }
            # Wheel back up: scale only, the world never tilts.
            for _ in range(5):
                page.mouse.wheel(0, -240)
                time.sleep(0.12)
            time.sleep(1.0)
            st = page.evaluate("window.__lgcyWorld.state()")
            results["zoom_wheel_up"] = {"zoom": st["zoom"], "target_zoom": st["targetZoom"]}
            page.close()

            # --- Greeting closeups at MAX zoom (reference-2 framing;
            #     Slice 1 shot these at 1.9) ---
            page = new_page(f"{BASE}?village=11&zoom=2.2")
            page.evaluate("window.__lgcyWorld.placePlayer(1600, 1660)")
            page.evaluate("window.__lgcyWorld.primeGreet('elouise-morris')")
            page.evaluate("window.__lgcyWorld.placeNpc('elouise-morris', 1508, 1644)")
            page.wait_for_selector(".world-bubble.show", timeout=15000)
            line1 = page.locator(".world-bubble").inner_text()
            shot(page, "closeup-greeting-aunt.png")
            page.wait_for_selector(".world-bubble:not(.show)", timeout=15000)
            speaker1 = page.evaluate(
                "document.getElementById('world-bubble').dataset.speaker"
            )
            page.evaluate("window.__lgcyWorld.placeNpc('elouise-morris', 1300, 510)")
            page.evaluate("window.__lgcyWorld.primeGreet('troy-wright')")
            page.evaluate("window.__lgcyWorld.placeNpc('troy-wright', 1682, 1690)")
            page.wait_for_selector(".world-bubble.show", timeout=15000)
            line2 = page.locator(".world-bubble").inner_text()
            speaker2 = page.evaluate(
                "document.getElementById('world-bubble').dataset.speaker"
            )
            shot(page, "closeup-greeting-cousin.png")
            sg = page.evaluate("window.__lgcyWorld.state()")
            results["greetings"] = {
                "line_aunt": line1,
                "speaker_aunt": speaker1,
                "line_cousin": line2,
                "speaker_cousin": speaker2,
                "greet_count": sg["greetCount"],
                "zoom": sg["zoom"],
            }
            page.close()

            # --- Saturday pair at the default zoom (same placements
            #     as Slice 1) ---
            page = new_page(f"{BASE}?day=sat&village=11")
            page.evaluate("window.__lgcyWorld.placePlayer(1940, 560)")
            page.evaluate(
                "window.__lgcyWorld.placeNpc('oddie-criner-gooden', 1900, 470)"
            )
            page.evaluate("window.__lgcyWorld.placeNpc('dora-weathers', 1850, 770)")
            page.evaluate("window.__lgcyWorld.placeNpc('emma-jean-jackson', 2060, 760)")
            page.evaluate(
                "window.__lgcyWorld.placeNpc('curtis-franklin-hammond', 1968, 612)"
            )
            time.sleep(1.6)
            shot(page, "saturday-tailgate.png")
            page.evaluate("window.__lgcyWorld.placePlayer(2540, 936)")
            page.evaluate("window.__lgcyWorld.placeNpc('elouise-morris', 2540, 752)")
            page.evaluate(
                "window.__lgcyWorld.placeNpc('melvin-andrew-gooden', 2380, 884)"
            )
            page.evaluate(
                "window.__lgcyWorld.placeNpc('andrew-jackson-gooden', 2700, 884)"
            )
            time.sleep(1.6)
            shot(page, "saturday-stadium.png")
            ss = page.evaluate("window.__lgcyWorld.state()")
            results["saturday"] = {"saturday": ss["saturday"], "zoom": ss["zoom"]}
            page.close()

            # --- Phone width at the default zoom ---
            page = new_page(f"{BASE}?village=11", width=390, height=844)
            time.sleep(2.0)
            shot(page, "mobile-390.png")
            page.close()
            browser.close()
    finally:
        server.terminate()

    results["page_errors"] = errors
    (OUT / "results.json").write_text(json.dumps(results, indent=1))
    print(json.dumps(results, indent=1))
    if errors:
        print("FAILED: page errors present", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
