#!/usr/bin/env python3
"""TW-1242 proof harness.

Houses and parks: matched framings of the filled
neighborhood, the main park playground at max zoom (with a
relative dwelling in it and the swings provably in motion),
the west park, and the parks lit at night.

Terrain: the river and the mountains. The player walks from
the plaza to the south bank; every sampled position inside
the river band must sit inside the bridge span, and the
walk must arrive. A relative is sent to the bank the same
way. Relatives are also sent to both parks and must arrive
and dwell at the park places.

Page errors from every page are asserted empty.

Run: ~/qa-venv/bin/python qa/tw1242/capture.py
"""

import json
import math
import subprocess
import sys
import time
from pathlib import Path

from playwright.sync_api import TimeoutError as PlaywrightTimeout
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
OUT = Path(__file__).resolve().parent
PORT = 8914
BASE = f"http://localhost:{PORT}/community.html"
CHROME = (
    "/home/hatch/.cache/ms-playwright/"
    "chromium_headless_shell-1248/chrome-headless-shell-linux64/chrome-headless-shell"
)
PARK = (2050, 1451)
PARKW = (300, 820)
BANK = (760, 2348)


def npc(state, nid):
    return next(n for n in state["npcs"] if n["id"] == nid)


def near(p, q, tol):
    return (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2 <= tol * tol


def river_y(x):
    return 2230 + 24 * math.sin(x / 460 + 0.6)


def in_water(p):
    """True water: inside the band the grid actually blocks.
    The wider shore band is bank, and walking the bank is
    allowed; only water samples must sit on the bridge."""
    return abs(p[1] - river_y(p[0])) < 48


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

            def wait_npc_at(page, nid, point, timeout=240):
                deadline = time.time() + timeout
                while time.time() < deadline:
                    st = page.evaluate("window.__lgcyWorld.state()")
                    f = npc(st, nid)
                    if f["state"] == "dwell" and near((f["x"], f["y"]), point, 95):
                        return {"x": f["x"], "y": f["y"], "state": f["state"]}
                    time.sleep(0.8)
                return None

            # --- Framing: the filled neighborhood, wide ---
            page = new_page(f"{BASE}?village=11&zoom=0.45")
            page.evaluate("window.__lgcyWorld.placePlayer(1600, 1400)")
            time.sleep(1.6)
            shot(page, "wide-neighborhood.png")
            page.close()

            # --- Framing: the main park at max zoom, in use ---
            page = new_page(f"{BASE}?village=11&zoom=2.2")
            page.evaluate("window.__lgcyWorld.placePlayer(1980, 1420)")
            page.evaluate("window.__lgcyWorld.placeNpc('troy-wright', 2050, 1451)")
            page.evaluate("window.__lgcyWorld.primeGreet('troy-wright')")
            try:
                page.wait_for_selector(".world-bubble.show", timeout=20000)
                results["park_greet_shown"] = True
            except PlaywrightTimeout:
                results["park_greet_shown"] = False
            time.sleep(0.6)
            shot(page, "park-closeup.png")
            shot(page, "park-motion-a.png")
            time.sleep(0.9)
            shot(page, "park-motion-b.png")
            results["swing_motion"] = (OUT / "park-motion-a.png").read_bytes() != (
                OUT / "park-motion-b.png"
            ).read_bytes()
            page.close()

            # --- Framing: the west park by the church ---
            page = new_page(f"{BASE}?village=11&zoom=1.45")
            page.evaluate("window.__lgcyWorld.placePlayer(330, 700)")
            page.evaluate(
                "window.__lgcyWorld.placeNpc('willie-bethsaida-anderson', 300, 820)"
            )
            time.sleep(1.4)
            shot(page, "west-park.png")
            page.close()

            # --- Framing: river and bridge ---
            page = new_page(f"{BASE}?village=11&zoom=1.45")
            page.evaluate("window.__lgcyWorld.placePlayer(940, 2030)")
            time.sleep(1.4)
            shot(page, "river-bridge.png")
            page.close()

            # --- Framing: the mountain horizon ---
            page = new_page(f"{BASE}?village=11&zoom=1.45")
            page.evaluate("window.__lgcyWorld.placePlayer(1600, 200)")
            time.sleep(1.4)
            shot(page, "mountains-horizon.png")
            page.close()

            # --- Framing: the main park at night, lamps lit ---
            page = new_page(f"{BASE}?village=23&zoom=1.45")
            page.evaluate("window.__lgcyWorld.placePlayer(2060, 1420)")
            time.sleep(1.4)
            shot(page, "night-park.png")
            results["night_active"] = page.evaluate("window.__lgcyWorld.state()")[
                "npcs"
            ]
            results["night_active"] = sum(
                1 for n in results["night_active"] if n["active"]
            )
            page.close()

            # --- Framing: mobile ---
            page = new_page(f"{BASE}?village=11", width=390, height=844)
            page.evaluate("window.__lgcyWorld.placePlayer(1980, 1420)")
            time.sleep(1.4)
            shot(page, "mobile-390.png")
            page.close()

            # --- Behavior: the player crosses only at the bridge ---
            page = new_page(f"{BASE}?village=11")
            page.evaluate("window.__lgcyWorld.sendPlayerTo(760, 2348)")
            samples = []
            arrived = False
            deadline = time.time() + 120
            while time.time() < deadline:
                st = page.evaluate("window.__lgcyWorld.state()")
                p = st["player"]
                samples.append((p["x"], p["y"]))
                if near((p["x"], p["y"]), BANK, 70) and not p["moving"]:
                    arrived = True
                    break
                time.sleep(0.25)
            in_band = [s for s in samples if in_water(s)]
            results["player_bank"] = {
                "arrived": arrived,
                "samples": len(samples),
                "in_band_samples": len(in_band),
                "band_all_on_bridge": all(830 < s[0] < 1050 for s in in_band)
                and len(in_band) > 0,
            }
            page.close()

            # --- Behavior: relatives reach the new destinations ---
            page = new_page(f"{BASE}?village=11")
            page.evaluate(
                "window.__lgcyWorld.sendNpcToPlace('oddie-criner-gooden', 'park')"
            )
            results["oddie_park"] = wait_npc_at(page, "oddie-criner-gooden", PARK)
            page.evaluate(
                "window.__lgcyWorld.sendNpcToPlace("
                "'willie-bethsaida-anderson', 'parkW')"
            )
            results["willie_parkw"] = wait_npc_at(
                page, "willie-bethsaida-anderson", PARKW
            )
            # Willie walks to the bank: watch her river crossing.
            page.evaluate(
                "window.__lgcyWorld.sendNpcToPlace('willie-bethsaida-anderson', 'bank')"
            )
            band_x = []
            willie_bank = None
            deadline = time.time() + 300
            while time.time() < deadline:
                st = page.evaluate("window.__lgcyWorld.state()")
                f = npc(st, "willie-bethsaida-anderson")
                if in_water((f["x"], f["y"])):
                    band_x.append(f["x"])
                if f["state"] == "dwell" and near((f["x"], f["y"]), BANK, 95):
                    willie_bank = {"x": f["x"], "y": f["y"], "state": f["state"]}
                    break
                time.sleep(0.4)
            results["willie_bank"] = willie_bank
            results["willie_crossing"] = {
                "in_band_samples": len(band_x),
                "band_all_on_bridge": len(band_x) > 0
                and all(830 < x < 1050 for x in band_x),
            }
            page.close()
            browser.close()
    finally:
        server.terminate()

    results["page_errors"] = errors
    (OUT / "results.json").write_text(json.dumps(results, indent=1))
    print(json.dumps(results, indent=1))
    ok = (
        results.get("swing_motion")
        and results["night_active"] == 3
        and results["player_bank"]["arrived"]
        and results["player_bank"]["band_all_on_bridge"]
        and results["oddie_park"] is not None
        and results["willie_parkw"] is not None
        and results["willie_bank"] is not None
        and results["willie_crossing"]["band_all_on_bridge"]
        and not errors
    )
    if not ok:
        print("FAILED: see results.json", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
