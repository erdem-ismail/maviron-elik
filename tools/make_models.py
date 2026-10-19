"""Draws the five stair-model diagrams in img/models/ (run: python tools/make_models.py).

Line drawings in the site's ink/oak/steel palette: elevations for konsol, düz omurgalı and Z,
plans for L and döner. No text inside the SVGs — captions live in index.html.
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


def spine(x0, y0, n, go, rise, depth=8, sx=1):
    """Zigzag steel spine under the treads (sx=-1 runs right-to-left)."""
    pts = [(x0, y0)]
    for i in range(n):
        x = x0 + sx * i * go
        top = y0 - (i + 1) * rise + depth
        pts += [(x, top), (x + sx * go, top)]
    d = "M" + " L".join(f"{x:.1f} {y:.1f}" for x, y in pts)
    return f'<path d="{d}" stroke="{STEEL}" stroke-width="9" stroke-linejoin="miter"/>'


def konsol():
    wall = f'<rect x="64" y="34" width="360" height="258" fill="{WALL}"/>'
    t, _ = treads_elev(92, 292, 12, 26, 20)
    anchors = "".join(
        f'<path d="M{92 + i * 26 + 13} {292 - (i + 1) * 20 + 8}v6" stroke="{LINE}" stroke-width="1" stroke-dasharray="2 2"/>'
        for i in range(12))
    return svg(wall + floor() + anchors + t)


def duz():
    s = spine(96, 292, 12, 26, 20)
    t, _ = treads_elev(96, 292, 12, 26, 20, nose=6)
    plate = f'<rect x="84" y="286" width="26" height="6" fill="{STEEL}"/>'
    top = f'<path d="M408 52H456" stroke="{INK}" stroke-width="2"/>'
    return svg(floor() + top + s + plate + t)


def zmodel():
    # first flight up-right to a landing, second flight back up-left above it
    r = 17
    s1 = spine(70, 292, 7, 26, r)
    t1, _ = treads_elev(70, 292, 7, 26, r, nose=6)
    ly = 292 - 8 * r
    landing = f'<rect x="252" y="{ly}" width="84" height="8" fill="{OAK}" stroke="{INK}" stroke-width="1.5"/>'
    post = f'<path d="M318 {ly + 8}V292" stroke="{STEEL}" stroke-width="8"/>'
    t2 = []
    for i in range(7):
        x = 226 - i * 26
        y = ly - (i + 1) * r
        t2.append(f'<rect x="{x}" y="{y}" width="32" height="8" fill="{OAK}" stroke="{INK}" stroke-width="1.5" opacity=".72"/>')
    pts = [(260, ly)]
    for i in range(7):
        x = 252 - i * 26
        top = ly - (i + 1) * r + 8
        pts += [(x, top), (x - 26, top)]
    s2 = '<path d="M' + " L".join(f"{x} {y}" for x, y in pts) + f'" stroke="{STEEL}" stroke-width="9" stroke-linejoin="miter" opacity=".72"/>'
    top = f'<path d="M24 {ly - 7 * r}H70" stroke="{INK}" stroke-width="2"/>'
    return svg(floor() + top + s2 + "".join(t2) + post + s1 + landing + t1)


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


def doner():
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
    for name, fn in {"konsol": konsol, "duz-omurgali": duz, "l": lmodel, "z": zmodel, "doner": doner}.items():
        (OUT / f"{name}.svg").write_text(fn(), encoding="utf-8")
        print(name)
