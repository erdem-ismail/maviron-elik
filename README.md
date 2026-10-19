# Maviron Çelik — scroll film demo

Static one-page demo for Maviron Çelik Mühendislik (@mavironcelik: çelik merdiven, asma kat,
villa, bungalov, çatı, endüstriyel çelik yapılar). Same idea as the Oha Burger site: the hero is
a film scrubbed by page scroll, followed by stair models, services, projects, process and a quote
form. No build step: `index.html` + `img/` is the whole site.

## The film

Unlike Oha Burger (a frame sequence of AI video), this film is a live three.js model of an
L-shaped spine staircase with a mezzanine, built in code inside `index.html`:

1. blueprint lines plot in on load, dimension callouts appear (Keşif & proje)
2. the zigzag steel spine arrives piece by piece, glowing like fresh welds and cooling (Üretim)
3. oak treads drop in, the room switches from blueprint navy to daylight, glass goes in (Uygulama)
4. labelled anatomy, then a wide closing shot with the CTA

- three.js 0.180 comes from jsDelivr via the import map; it is only downloaded when the film runs.
- Realism: rounded-edge parts, 140 × 120 spine with 8 mm saddle plates under 45 mm oak treads,
  base plates with nuts, an IPE 270 mezzanine beam, 17.52 mm glass (green edges) on stainless point
  fixings, a steel-framed window as the light source, soft shadows and, on screens wider than 760 px,
  ground-truth ambient occlusion (GTAO). Render resolution is capped at 1.5× for performance.
- Textures in `img/tex/` (~250 KB): CC0 `oak_veneer_01` and `concrete_floor_worn_001` from
  Poly Haven, converted to WebP, mapped in real metres.
- `data-map` on `#film` maps scroll progress → film seconds; scenes use `data-from`/`data-to`
  in film seconds. Build timings (`p.t0`) and the camera path (`shots`) are in the module script.
- Annotations use `data-at` (a 3D point in metres) and are projected every frame; tags flip
  inward automatically so they stay on screen.
- `prefers-reduced-motion`, no WebGL2, or `?still` in the URL show a still hero (no pinned scroll,
  three.js not loaded).
- `img/film-poster.webp` / `film-poster-m.webp` show until the model is ready. They are renders of
  the film at t=0; re-capture them (and `img/og.jpg`, t=12) after changing the model. Open the
  page with `?capture` and `__film.seek(t)` in the console jumps the film to any second.

## Tasarla (configurator)

`js/configurator.js`, loaded when the section is ~600 px away. Floor height (240–420 cm), model,
tread (meşe, ceviz, çelik, beton), railing (cam, dikme) and steel colour rebuild the stair in 3D with
the film's materials. Risers: n = round(H / 18 cm), kept between 16.5 and 19 cm; going from
2h + g ≈ 63 cm, clamped to 25–30 cm. The plan size is the built model's bounding box. "Teklif al"
opens WhatsApp with the whole configuration. Drag (or arrow keys on the focused view) turns it;
it sways slowly until touched (not with reduced motion). Without WebGL2 a still render shows and
the numbers and message still work. A spiral always gets steel balusters.

The film also has weld sparks during Üretim (each spark is a function of film time, so scrubbing
backwards works) and a warmer, lower sun over the closing shots.

## Content sources

- Bio, services, phone, e-mail, highlight names (Şile, Ömerli, Gebze, Acıbadem, Beylikdüzü,
  Benesta Center, Ersoy Hastanesi; Keşif, Projelendirme, Üretim) and the five stair models:
  Maviron's Instagram profile and posts (October 2026).
- Project photos in `img/`: thumbnails of their own Instagram posts (360–640 px). Each tile links
  to the original post. `img/mark.webp` and the icons come from the 150 px profile picture.
- Stair model diagrams: `python tools/make_models.py` writes `img/models/*.svg` (shown as insets).
- Stair model renders (`img/models/*.webp`): `tools/studio.html?model=konsol|duz|l|z|doner` builds
  each model with the film's materials and light; serve the project root, wait for `window.ready`,
  screenshot the 1500 × 1000 canvas, save at 1200 × 800 WebP.
- Process images (`img/steps/`) and `img/asma-kat.webp` are frames of the film (t = 2.7, 0.4,
  5.0, 9.8 and 12), captured with the copy overlays hidden.
- Service renders (`img/services/*.webp`, 640 × 800): `tools/studio.html?model=bungalov|cati|carport|depo&size=1000x1250`.
  These are shot on location: a Poly Haven HDRI is projected onto the ground (three.js
  GroundedSkybox) and lights the scene, its sun disc is clamped out and replaced by a
  shadow-casting lamp turned to the front left, a shadow catcher puts the shadows on the photo
  ground, and a light vignette and grain finish the frame. The tool expects these CC0 files
  (not in the repo) in `_src/env/`:
  `meadow_2.hdr` and `rural_asphalt_road.hdr` (4k), and 2k `asphalt_02` and `gravel_concrete_03`
  maps saved as `<name>_diff.jpg`, `<name>_rough.jpg`, `<name>_nor_gl.jpg`.
  Add `&cam=x,y,z` to look at a model from elsewhere while working on it.
- Services: on wide screens the sticky picture swaps as each row passes the middle of the screen;
  from 1024 px down every row shows its own picture. "Teklif iste" preselects that job in the form.

## Before going live

- Ask Maviron for full-resolution photos and a vector logo; the Instagram thumbnails are small.
- Confirm: service area (İstanbul ve Kocaeli is inferred from project locations), "own workshop /
  own installation team" wording, and the example dimensions in the film (illustrative, 340 cm).
- Live demo: https://maviron-celik-scroll.vercel.app (Vercel project `maviron-celik-scroll`). Update the
  canonical, `og:` and JSON-LD URLs in `index.html` if it moves to a real domain.
- mavironcelik.com currently shows a Squarespace parking page.
