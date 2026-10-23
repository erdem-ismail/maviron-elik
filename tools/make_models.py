"""Draws the stair-model diagrams in img/models/ (run: python tools/make_models.py).

Line drawings in the site's ink/oak/steel palette: elevations for konsol, düz omurgalı (both
tread types) and çelik profilli, plans for L, Z, U and spiral. No text inside the SVGs — captions live in index.html.
"""
import math
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "img" / "models"
INK, OAK, STEEL, WALL, LINE = "#141b25", "#c88a4a", "#141b25", "#e2ded6", "#8a95a3"
W, H = 480, 320


def svg(body):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" fill="none" '
            f'stroke-linejoin="round" stroke-linecap="round">{body}</svg>\n')


def floor(y=292):
    hatch = "".join(f'<path d="M{x} {y} l-10 12" stroke="{LINE}" stroke-width="1"/>' for x in range(36, 452, 14))
    return f'<path d="M24 {y}H456" stroke="{INK}" stroke-width="2"/>{hatch}'


def treads_elev(x0, y0, n, go, rise, depth=8, nose=0):
    """Oak treads stepping up-right from (x0, y0) floor; returns svg and the tread rects."""
    out, rects = [], []
    for i in range(n):
        x = x0 + i * go - nose
        y = y0 - (i + 1) * rise
        rects.append((x, y))
        out.append(f'<rect x="{x:.1f}" y="{y:.1f}" width="{go + nose:.1f}" height="{depth}" fill="{OAK}" stroke="{INK}" stroke-width="1.5"/>')
    return "".join(out), rects


def spine(x0, y0, n, go, rise, depth=8):
    """Straight sloped steel spine under the tread centres, with a short bracket to each tread."""
    y = lambda x: y0 - (x - x0) / go * rise + depth + 6 - rise / 2
    xa, xb = x0 + 4, x0 + n * go
    brackets = "".join(
        f'<path d="M{x0 + (i + .5) * go:.1f} {y0 - (i + 1) * rise + depth:.1f}V{y(x0 + (i + .5) * go):.1f}" stroke="{STEEL}" stroke-width="5"/>'
        for i in range(n))
    return brackets + f'<path d="M{xa:.1f} {y0:.1f}L{xb:.1f} {y(xb):.1f}" stroke="{STEEL}" stroke-width="11"/>'


def konsol():
    wall = f'<rect x="64" y="34" width="360" height="258" fill="{WALL}"/>'
    t, _ = treads_elev(92, 292, 12, 26, 20)
    anchors = "".join(
        f'<path d="M{92 + i * 26 + 13} {292 - (i + 1) * 20 + 8}v6" stroke="{LINE}" stroke-width="1" stroke-dasharray="2 2"/>'
        for i in range(12))
    return svg(wall + floor() + anchors + t)


def duz(depth=8):
    s = spine(96, 292, 12, 26, 20, depth)
    t, _ = treads_elev(96, 292, 12, 26, 20, depth, nose=6)
    plate = f'<rect x="84" y="286" width="26" height="6" fill="{STEEL}"/>'
    top = f'<path d="M408 52H456" stroke="{INK}" stroke-width="2"/>'
    return svg(floor() + top + s + plate + t)


def plan(runs, go=28, wid=64):
    """Plan of straight flights joined by square landings. runs: list of (steps, dx, dy) unit steps."""
    out = [f'<rect x="24" y="24" width="432" height="272" fill="{WALL}" stroke="none"/>']
    x, y = runs[0][3], runs[0][4]
    path = []
    for k, (n, dx, dy, *_rest) in enumerate(runs):
        for i in range(n):
            if dx: out.append(f'<rect x="{x + (i * go if dx > 0 else -(i + 1) * go)}" y="{y - wid / 2}" width="{go}" height="{wid}" fill="{OAK}" stroke="{INK}" stroke-width="1.5"/>')
            else: out.append(f'<rect x="{x - wid / 2}" y="{y + (i * go if dy > 0 else -(i + 1) * go)}" width="{wid}" height="{go}" fill="{OAK}" stroke="{INK}" stroke-width="1.5"/>')
        path.append((x, y))
        x, y = x + dx * n * go, y + dy * n * go
        if k < len(runs) - 1:
            ndx, ndy = runs[k + 1][1], runs[k + 1][2]
            lx = x if dx > 0 else x - wid if dx < 0 else x - wid / 2
            ly = y if dy > 0 else y - wid if dy < 0 else y - wid / 2
            out.append(f'<rect x="{lx}" y="{ly}" width="{wid}" height="{wid}" fill="{OAK}" stroke="{INK}" stroke-width="1.5"/>')
            cx, cy = lx + wid / 2, ly + wid / 2
            path.append((cx, cy))
            x, y = cx + ndx * wid / 2, cy + ndy * wid / 2
            if ndx and dx: y = cy
    path.append((x, y))
    d = "M" + " L".join(f"{a:.0f} {b:.0f}" for a, b in path)
    out.append(f'<path d="{d}" stroke="{STEEL}" stroke-width="3" stroke-dasharray="10 6"/>')
    out.append(f'<circle cx="{path[0][0]:.0f}" cy="{path[0][1]:.0f}" r="5" fill="{STEEL}"/>')
    return svg("".join(out))


def zmodel():
    # right, quarter turn up (away), quarter turn right again
    return plan([(5, 1, 0, 40, 240), (3, 0, -1), (5, 1, 0)])


def umodel():
    # right to a wide landing, then back left beside the first flight
    out = [f'<rect x="24" y="24" width="432" height="272" fill="{WALL}" stroke="none"/>']
    go, wid, x0 = 28, 64, 80
    for i in range(9):
        out.append(f'<rect x="{x0 + i * go}" y="190" width="{go}" height="{wid}" fill="{OAK}" stroke="{INK}" stroke-width="1.5"/>')
        out.append(f'<rect x="{x0 + (8 - i) * go}" y="{190 - wid - 6}" width="{go}" height="{wid}" fill="{OAK}" stroke="{INK}" stroke-width="1.5" opacity=".75"/>')
    lx = x0 + 9 * go
    out.append(f'<rect x="{lx}" y="{190 - wid - 6}" width="{wid}" height="{2 * wid + 6}" fill="{OAK}" stroke="{INK}" stroke-width="1.5"/>')
    cy1, cy2, cx = 190 + wid / 2, 190 - 6 - wid / 2, lx + wid / 2
    out.append(f'<path d="M{x0 + 8} {cy1}H{cx}V{cy2}H{x0 + 10}" stroke="{STEEL}" stroke-width="3" stroke-dasharray="10 6"/>')
    out.append(f'<path d="M{x0 + 24} {cy2 - 8}L{x0 + 10} {cy2}L{x0 + 24} {cy2 + 8}" stroke="{STEEL}" stroke-width="3"/>')
    out.append(f'<circle cx="{x0 + 8}" cy="{cy1}" r="5" fill="{STEEL}"/>')
    return svg("".join(out))


def celik():
    # side channel stringer, treads between, metal railing
    n, go, rise, x0 = 12, 26, 20, 96
    t, _ = treads_elev(x0, 292, n, go, rise)
    str_ = f'<path d="M{x0 - 6} 292L{x0 + n * go + 4} {292 - n * rise - 14}L{x0 + n * go + 4} {292 - n * rise + 8}L{x0 + 18} 292Z" fill="{STEEL}" stroke="{STEEL}" stroke-width="2"/>'
    posts = "".join(f'<path d="M{x0 + i * go} {292 - i * rise - 10}v-62" stroke="{INK}" stroke-width="3"/>' for i in range(0, n + 1, 3))
    rail = f'<path d="M{x0} {292 - 72}L{x0 + n * go} {292 - n * rise - 72}M{x0} {292 - 42}L{x0 + n * go} {292 - n * rise - 42}" stroke="{INK}" stroke-width="3"/>'
    top = f'<path d="M408 52H456" stroke="{INK}" stroke-width="2"/>'
    return svg(floor() + top + t + str_ + posts + rail)


def lmodel():
    # plan: flight along the bottom going right, square landing, flight going up
    out = [f'<rect x="40" y="36" width="400" height="248" fill="{WALL}" stroke="none"/>']
    go, wid = 28, 70
    x0, y0 = 60, 196
    for i in range(9):
        out.append(f'<rect x="{x0 + i * go}" y="{y0}" width="{go}" height="{wid}" fill="{OAK}" stroke="{INK}" stroke-width="1.5"/>')
    lx = x0 + 9 * go
    out.append(f'<rect x="{lx}" y="{y0}" width="{wid}" height="{wid}" fill="{OAK}" stroke="{INK}" stroke-width="1.5"/>')
    for j in range(5):
        out.append(f'<rect x="{lx}" y="{y0 - (j + 1) * go}" width="{wid}" height="{go}" fill="{OAK}" stroke="{INK}" stroke-width="1.5"/>')
    cx, cy = lx + wid / 2, y0 + wid / 2
    out.append(f'<path d="M{x0 + 8} {cy}H{cx}V{y0 - 5 * go + 10}" stroke="{STEEL}" stroke-width="3" stroke-dasharray="10 6"/>')
    out.append(f'<path d="M{cx - 8} {y0 - 5 * go + 22}L{cx} {y0 - 5 * go + 8}L{cx + 8} {y0 - 5 * go + 22}" stroke="{STEEL}" stroke-width="3"/>')
    out.append(f'<circle cx="{x0 + 8}" cy="{cy}" r="5" fill="{STEEL}"/>')
    return svg("".join(out))


def spiral():
    cx, cy, r, r0 = 240, 162, 132, 14
    out = [f'<circle cx="{cx}" cy="{cy}" r="{r + 10}" stroke="{LINE}" stroke-width="1.5" stroke-dasharray="4 5"/>']
    n, sweep = 13, 330
    for i in range(n):
        a0 = math.radians(-90 + i * sweep / n)
        a1 = math.radians(-90 + (i + 1) * sweep / n)
        p = [(cx + r0 * math.cos(a0), cy + r0 * math.sin(a0)), (cx + r * math.cos(a0), cy + r * math.sin(a0)),
             (cx + r * math.cos(a1), cy + r * math.sin(a1)), (cx + r0 * math.cos(a1), cy + r0 * math.sin(a1))]
        d = f"M{p[0][0]:.1f} {p[0][1]:.1f}L{p[1][0]:.1f} {p[1][1]:.1f}A{r} {r} 0 0 1 {p[2][0]:.1f} {p[2][1]:.1f}L{p[3][0]:.1f} {p[3][1]:.1f}Z"
        out.append(f'<path d="{d}" fill="{OAK}" fill-opacity="{0.55 + 0.45 * i / n:.2f}" stroke="{INK}" stroke-width="1.5"/>')
    out.append(f'<circle cx="{cx}" cy="{cy}" r="{r0}" fill="{STEEL}"/>')
    a = math.radians(-90 + sweep + 8)
    out.append(f'<path d="M{cx + 40 * math.cos(math.radians(-80)):.1f} {cy + 40 * math.sin(math.radians(-80)):.1f}A40 40 0 1 1 {cx + 40 * math.cos(a):.1f} {cy + 40 * math.sin(a):.1f}" stroke="{STEEL}" stroke-width="3" stroke-dasharray="8 6"/>')
    return svg("".join(out))


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    models = {"konsol": konsol, "duz-omurgali": duz, "duz-kutu": lambda: duz(16), "l": lmodel, "z": zmodel,
              "u": umodel, "celik": celik, "spiral": spiral}
    for name, fn in models.items():
        (OUT / f"{name}.svg").write_text(fn(), encoding="utf-8")
        print(name)
