#!/usr/bin/env python3
"""TW-1241 proof harness.

Bug 1 (click routing): clicks at least four different figures
MID-WALK, following their live positions with the camera, and
asserts each lands on that figure's own card (URL id + the
rendered H1), plus a buggy driver clicked on foot mid-walk
and a dwelling figure re-verified.

Bug 2 (era transport): follows a buggy mid-round on the road,
catches the filling-station stop with its speech bubble
(speaker + line asserted), and on Saturday waits for both
rigs to park at the stadium gates.

Page errors from every page are asserted empty.

Run: ~/qa-venv/bin/python qa/tw1241/capture.py
"""

import json
import subprocess
import sys
import time
from pathlib import Path

from playwright.sync_api import TimeoutError as PlaywrightTimeout
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
OUT = Path(__file__).resolve().parent
PORT = 8913
BASE = f"http://localhost:{PORT}/community.html"
CHROME = (
    "/home/hatch/.cache/ms-playwright/"
    "chromium_headless_shell-1248/chrome-headless-shell-linux64/chrome-headless-shell"
)
GAS_LINES = [
    "What is that?",
    "It runs with no horse at all?",
    "They feed it from a pump?",
    "Well, I never in my days.",
    "Is it safe to stand near?",
]
NAMES = {
    "troy-wright": "Troy Wright",
    "oddie-criner-gooden": "Oddie Lee Criner Gooden",
    "curtis-franklin-hammond": "Curtis Franklin Hammond",
    "melvin-andrew-gooden": "Melvin Andrew Gooden",
    "dora-weathers": "Dora Weathers",
    "emma-jean-jackson": "Emma Jean Jackson",
    "james-j-hammond": "James J Hammond",
}


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
    results = {"clicks": []}
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

            def state_or_none(page):
                return page.evaluate(
                    "window.__lgcyWorld ? window.__lgcyWorld.state() : null"
                )

            def click_figure_midwalk(page, nid, want_states, timeout=240):
                """Follow the figure; once it is in a wanted state
                and provably moving, click its live position."""
                page.evaluate(f"window.__lgcyWorld.follow('{nid}')")
                page.evaluate("window.__lgcyWorld.placePlayer(120, 2300)")
                deadline = time.time() + timeout
                attempts = 0
                clicked_state = None
                while time.time() < deadline:
                    if "person.html" in page.url:
                        break  # a click landed; navigation in flight
                    st1 = state_or_none(page)
                    if st1 is None:
                        time.sleep(0.3)
                        continue
                    f1 = npc(st1, nid)
                    if f1["state"] not in want_states:
                        time.sleep(0.25)
                        continue
                    time.sleep(0.35)
                    if "person.html" in page.url:
                        break
                    st2 = state_or_none(page)
                    if st2 is None:
                        continue
                    f2 = npc(st2, nid)
                    moved = (f1["x"] - f2["x"]) ** 2 + (f1["y"] - f2["y"]) ** 2
                    if f2["state"] not in want_states or moved < 4:
                        continue
                    box = page.locator("#world-canvas").bounding_box()
                    sx = (
                        box["x"]
                        + (f2["x"] - st2["cam"]["x"]) * st2["zoom"]
                        + box["width"] / 2
                    )
                    sy = (
                        box["y"]
                        + (f2["y"] - st2["cam"]["y"]) * st2["zoom"]
                        + box["height"] / 2
                    )
                    attempts += 1
                    clicked_state = f2["state"]
                    page.mouse.click(sx, sy)
                    try:
                        page.wait_for_url("**/person.html*", timeout=2500)
                        break
                    except PlaywrightTimeout:
                        continue  # the click missed; keep following
                if "person.html" in page.url:
                    page.wait_for_selector("h1")
                    time.sleep(0.5)
                    return {
                        "id": nid,
                        "state_at_click": clicked_state,
                        "attempts": attempts,
                        "landed_url": page.url.split("/")[-1],
                        "h1": page.locator("h1").first.inner_text(),
                    }
                return {"id": nid, "error": "click never landed", "attempts": attempts}

            # --- Bug 1: four walking figures, each to their own card ---
            for nid in [
                "troy-wright",
                "oddie-criner-gooden",
                "curtis-franklin-hammond",
                "melvin-andrew-gooden",
            ]:
                page = new_page(f"{BASE}?village=11")
                got = click_figure_midwalk(page, nid, ["walk"])
                got["ok"] = (
                    got.get("landed_url") == f"person.html?id={nid}"
                    and got.get("h1") == NAMES[nid]
                )
                results["clicks"].append(got)
                page.close()

            # --- Bug 1: a buggy driver on foot, mid-walk from her rig ---
            page = new_page(f"{BASE}?village=11")
            page.evaluate("window.__lgcyWorld.placeNpc('dora-weathers', 380, 1910)")
            page.evaluate("window.__lgcyWorld.sendNpcToPlace('dora-weathers', 'store')")
            got = click_figure_midwalk(page, "dora-weathers", ["walkFromRig"])
            got["ok"] = (
                got.get("landed_url") == "person.html?id=dora-weathers"
                and got.get("h1") == NAMES["dora-weathers"]
            )
            results["clicks"].append(got)
            page.close()

            # --- Bug 1: a dwelling figure re-verified ---
            page = new_page(f"{BASE}?village=11")
            page.evaluate(
                "window.__lgcyWorld.placeNpc('emma-jean-jackson', 1600, 1660)"
            )
            page.evaluate("window.__lgcyWorld.placePlayer(1900, 1660)")
            time.sleep(1.2)
            st = page.evaluate("window.__lgcyWorld.state()")
            f = npc(st, "emma-jean-jackson")
            box = page.locator("#world-canvas").bounding_box()
            sx = box["x"] + (f["x"] - st["cam"]["x"]) * st["zoom"] + box["width"] / 2
            sy = box["y"] + (f["y"] - st["cam"]["y"]) * st["zoom"] + box["height"] / 2
            page.mouse.click(sx, sy)
            time.sleep(1.6)
            page.wait_for_selector("h1")
            results["dwelling"] = {
                "id": "emma-jean-jackson",
                "state_at_click": f["state"],
                "landed_url": page.url.split("/")[-1],
                "h1": page.locator("h1").first.inner_text(),
            }
            results["dwelling"]["ok"] = (
                results["dwelling"]["landed_url"] == "person.html?id=emma-jean-jackson"
                and results["dwelling"]["h1"] == NAMES["emma-jean-jackson"]
            )
            page.close()

            # --- Bug 1: the roster link under the world routes too ---
            page = new_page(f"{BASE}?village=11")
            page.click("a.roster-btn[href='person.html?id=troy-wright']")
            page.wait_for_selector("h1")
            time.sleep(0.5)
            results["roster"] = {
                "landed_url": page.url.split("/")[-1],
                "h1": page.locator("h1").first.inner_text(),
            }
            results["roster"]["ok"] = (
                results["roster"]["landed_url"] == "person.html?id=troy-wright"
                and results["roster"]["h1"] == "Troy Wright"
            )
            page.close()

            # --- Bug 2: a buggy mid-round, then the station stop ---
            page = new_page(f"{BASE}?village=11")
            page.evaluate("window.__lgcyWorld.placeNpc('james-j-hammond', 380, 1910)")
            page.evaluate("window.__lgcyWorld.primeStation('james-j-hammond')")
            page.evaluate(
                "window.__lgcyWorld.sendNpcToPlace('james-j-hammond', 'church')"
            )
            page.evaluate("window.__lgcyWorld.follow('james-j-hammond')")
            deadline = time.time() + 300
            midround = None
            station = None
            while time.time() < deadline:
                st = page.evaluate("window.__lgcyWorld.state()")
                f = npc(st, "james-j-hammond")
                if (
                    midround is None
                    and f["state"] == "ride"
                    and f["rig"]["state"] == "rolling"
                    and not f["rig"]["paused"]
                    and abs(f["rig"]["y"] - 1140) < 30
                ):
                    page.locator("#world-stage").screenshot(
                        path=str(OUT / "buggy-mid-round.png")
                    )
                    midround = {"rig": f["rig"], "fig_state": f["state"]}
                if f["rig"] and f["rig"]["paused"]:
                    page.wait_for_selector(".world-bubble.show", timeout=8000)
                    station = {
                        "speaker": page.evaluate(
                            "document.getElementById('world-bubble').dataset.speaker"
                        ),
                        "line": page.locator(".world-bubble").inner_text(),
                        "rig": f["rig"],
                    }
                    page.locator("#world-stage").screenshot(
                        path=str(OUT / "buggy-station-stop.png")
                    )
                    break
                time.sleep(0.4)
            results["buggy"] = {"mid_round": midround, "station_stop": station}
            if station:
                results["buggy"]["station_ok"] = (
                    station["speaker"] == "James J Hammond"
                    and station["line"] in GAS_LINES
                )
            page.close()

            # --- Bug 2: Saturday, both rigs park at the gates ---
            page = new_page(f"{BASE}?day=sat&village=11")
            deadline = time.time() + 420
            rigs = None
            while time.time() < deadline:
                st = page.evaluate("window.__lgcyWorld.state()")
                parked = [
                    n for n in st["npcs"] if n["rig"] and n["rig"]["stop"] == "gate"
                ]
                if len(parked) == 2 and all(
                    n["rig"]["state"] == "parked" for n in parked
                ):
                    rigs = {n["id"]: n["rig"] for n in parked}
                    break
                time.sleep(1.0)
            results["saturday_rigs"] = rigs
            page.evaluate("window.__lgcyWorld.placePlayer(2540, 1080)")
            time.sleep(1.6)
            page.locator("#world-stage").screenshot(
                path=str(OUT / "saturday-gates.png")
            )
            page.close()
            browser.close()
    finally:
        server.terminate()

    results["page_errors"] = errors
    (OUT / "results.json").write_text(json.dumps(results, indent=1))
    print(json.dumps(results, indent=1))
    ok = (
        all(c.get("ok") for c in results["clicks"])
        and results["dwelling"]["ok"]
        and results["roster"]["ok"]
        and results["buggy"].get("station_ok")
        and results["buggy"].get("mid_round") is not None
        and results["saturday_rigs"] is not None
        and not errors
    )
    if not ok:
        print("FAILED: see results.json", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
