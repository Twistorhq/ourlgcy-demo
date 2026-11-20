#!/usr/bin/env python3
"""TW-1232 slice 1 proof harness.

Serves the worktree, drives the overhead world through its QA
hook (window.__lgcyWorld), and captures the founder's visual
check set: reference-matched framings (wide overhead, plaza
closeup), Saturday mode, a still/walk/greeting/follow frame
sequence, and a night frame. Page errors from every page are
collected and asserted empty at the end.

Run: ~/qa-venv/bin/python qa/tw1232/capture.py
"""

import json
import subprocess
import sys
import time
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
OUT = Path(__file__).resolve().parent
PORT = 8908
BASE = f"http://localhost:{PORT}/community.html"
CHROME = (
    "/home/hatch/.cache/ms-playwright/"
    "chromium_headless_shell-1248/chrome-headless-shell-linux64/chrome-headless-shell"
)


def wait_state(page, want, timeout=30.0):
    """Poll the world state until want(state) is true."""
    end = time.time() + timeout
    state = None
    while time.time() < end:
        state = page.evaluate("window.__lgcyWorld.state()")
        if want(state):
            return state
        time.sleep(0.4)
    return state


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

            # --- Wide overhead framing (reference 1's country) ---
            page = new_page(f"{BASE}?village=11&zoom=0.62")
            time.sleep(2.5)
            shot(page, "wide-plaza.png")
            st = page.evaluate("window.__lgcyWorld.state()")
            results["wide"] = {
                "phase": st["phase"],
                "active": sum(1 for n in st["npcs"] if n["active"]),
            }

            # --- Standing still: the neighborhood keeps moving ---
            s0 = page.evaluate("window.__lgcyWorld.state()")
            shot(page, "seq-still-a.png")
            time.sleep(3.0)
            s1 = page.evaluate("window.__lgcyWorld.state()")
            shot(page, "seq-still-b.png")
            moved = [
                n["id"]
                for n in s1["npcs"]
                if abs(n["x"] - npc(s0, n["id"])["x"])
                + abs(n["y"] - npc(s0, n["id"])["y"])
                > 4
            ]
            results["still"] = {
                "player_same": s0["player"] == s1["player"],
                "npcs_moved": moved,
            }

            # --- Walking: camera follows, world scrolls ---
            page.evaluate("window.__lgcyWorld.sendPlayerTo(1350, 1248)")
            time.sleep(1.4)
            shot(page, "seq-walk-a.png")
            time.sleep(1.4)
            shot(page, "seq-walk-b.png")
            sw = wait_state(page, lambda s: not s["player"]["moving"], 40)
            shot(page, "seq-walk-c.png")
            results["walk"] = {
                "cam_delta": [
                    sw["cam"]["x"] - s1["cam"]["x"],
                    sw["cam"]["y"] - s1["cam"]["y"],
                ],
                "player_at": sw["player"],
            }
            page.close()

            # --- Plaza closeup + greeting encounters (reference 2) ---
            page = new_page(f"{BASE}?village=11&zoom=1.9")
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
            }
            page.close()

            # --- Saturday: tailgate lawn framing ---
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
            # --- Saturday: the stadium gates framing ---
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
            results["saturday"] = {"saturday": ss["saturday"]}

            # --- Continuity: follow Troy from the street to the tailgate ---
            page.evaluate("window.__lgcyWorld.placeNpc('troy-wright', 2400, 1660)")
            page.evaluate("window.__lgcyWorld.follow('troy-wright')")
            page.evaluate("window.__lgcyWorld.sendNpcTo('troy-wright', 1940, 470)")
            time.sleep(1.0)
            shot(page, "seq-follow-a.png")
            time.sleep(13)
            shot(page, "seq-follow-b.png")
            sf = wait_state(
                page,
                lambda s: (
                    npc(s, "troy-wright")["state"] == "dwell"
                    and abs(npc(s, "troy-wright")["x"] - 1940) < 60
                ),
                90,
            )
            shot(page, "seq-follow-c.png")
            troy = npc(sf, "troy-wright")
            results["follow"] = {
                "troy_at": [troy["x"], troy["y"]],
                "state": troy["state"],
            }
            page.close()

            # --- Night: density drops, porch lights come on ---
            page = new_page(f"{BASE}?village=23&zoom=0.62")
            time.sleep(2.0)
            shot(page, "wide-night.png")
            sn = page.evaluate("window.__lgcyWorld.state()")
            results["night"] = {
                "phase": sn["phase"],
                "active": sum(1 for n in sn["npcs"] if n["active"]),
            }
            page.close()

            # --- Phone width ---
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
