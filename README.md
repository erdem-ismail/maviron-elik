# Maviron Çelik — scroll film demo

Static one-page demo for Maviron Çelik Mühendislik (@mavironcelik: çelik merdiven, asma kat,
villa, bungalov, çatı, endüstriyel çelik yapılar). Same idea as the Oha Burger site: the hero is
a film scrubbed by page scroll, followed by stair models, a stair catalogue, railings, services,
projects, process, the configurator and a contact / quote form. No build step: `index.html`,
`catilar.html`, `yangin-merdiveni.html`, `css/site.css`, `js/` and `img/` are the whole site.

- `css/site.css` is shared by all pages; `js/nav.js` (mobile menu, quick-contact buttons) too.
- The sub-pages reuse the home page's header, footer and quick-contact buttons:
  after changing those in `index.html`, run `python _src/make_pages.py` (kept out of git with `_src/`)
  or copy the blocks by hand.
- Quick contact, bottom right: WhatsApp, Instagram and phone are live; Facebook is a disabled
  placeholder until the page exists. Up to 1024 px they fold behind one button.
- `index.html?is=Çatı#teklif` (any job name from the form) preselects that job in the quote form.

## The film

Unlike Oha Burger (a frame sequence of AI video), this film is a live three.js model of an
L-shaped straight-spine staircase with a mezzanine, built in code inside `index.html`:

1. blueprint lines plot in on load, dimension callouts appear (Keşif & proje)
2. the straight steel spine (one sloped beam per flight) arrives piece by piece, glowing like fresh welds and cooling (Üretim)
3. oak treads drop in, the room switches from blueprint navy to daylight, glass goes in (Uygulama)
4. labelled anatomy, then a wide closing shot with the CTA

- three.js 0.180 (core, RoomEnvironment, RoundedBoxGeometry) is served from `js/vendor/` and
  modulepreloaded, so it loads with the page; the desktop-only post-processing addons still come from
  jsDelivr via the import map.
- Speed: every shader is compiled before the film shows (opaque and fading variants, into the AO
  target on desktop), the scene build yields between stages, and the sun's shadow map is redrawn only
  in daylight when the film moves. Phones (≤ 760 px) get pixel ratio 1.25, PCF shadows and no clearcoat.
- Fonts are self-hosted in `fonts/` (SIL OFL, latin + latin-ext for Turkish): Archivo only at 125 %
  width, 700–900; Instrument Sans 400–600; JetBrains Mono 500. `python _src/fonts.py` re-downloads them.
- Realism: rounded-edge parts, a 180 × 140 sloped box spine with a bracket and an 8 mm saddle plate under each 45 mm oak tread,
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

`js/configurator.js`, loaded when the section is ~600 px away. Floor height (240–420 cm), model
(konsol, düz omurgalı, L, Z, U, spiral), tread (meşe, ceviz, çelik, mermer), railing (cam, metal,
separatör) and steel colour rebuild the stair in 3D with the film's materials. Every model arrives on
a 22 cm platform; two dimension lines run from it to the floor, Hmax (platform top = floor height)
and h (platform underside), with HTML tags placed on the 3D points. Spines are straight sloped beams;
landings sit on posts. Risers: n = round(H / 18 cm), kept between 16.5 and 19 cm; going from
2h + g ≈ 63 cm, clamped to 25–30 cm. The plan size is the built model's bounding box. "Teklif al"
opens WhatsApp with the whole configuration. Drag (or arrow keys on the focused view) turns it;
it sways slowly until touched (not with reduced motion). Without WebGL2 a still render shows and
the numbers and message still work. A spiral always gets metal balusters (cam and separatör are disabled for it).

The film also has weld sparks during Üretim (each spark is a function of film time, so scrubbing
backwards works) and a warmer, lower sun over the closing shots.

## Content sources

- Bio, services, phone, e-mail, highlight names (Şile, Ömerli, Gebze, Acıbadem, Beylikdüzü,
  Benesta Center, Ersoy Hastanesi; Keşif, Projelendirme, Üretim) and the five stair models:
  Maviron's Instagram profile and posts (October 2026).
- Project photos in `img/` (Projeler only; the services section uses renders): thumbnails of their own Instagram posts (360–640 px). Each tile links
  to the original post. `img/mark.webp` and the icons come from the 150 px profile picture.
- Stair model diagrams: `python tools/make_models.py` writes `img/models/*.svg` (shown as insets).
- Stair model renders (`img/models/*.webp`): `tools/studio.html?model=konsol|duz|duz-kutu|l|z|u|celik|doner`
  (doner is saved as `spiral.webp`) builds
  each model with the film's materials and light; serve the project root, wait for `window.ready`,
  screenshot the 1500 × 1000 canvas, save at 1200 × 800 WebP.
- Railing renders (`img/korkuluk/`): `?model=kork-cam|kork-metal|kork-separator|kork-lama`; roof
  renders for `catilar.html` (`img/catilar/`): `?model=cati-tek|cati-besik`. Both stand on the sweep.
  `&noao` renders without ambient occlusion.
- Merdiven kataloğu: their own photos (MK-01…06, `img/foto/`); the Projeler grid and the Montaj step use their
  site photos too; sizes say "Yakında" until Maviron
  sends them, and the PDF button is a disabled placeholder. The Çelik merdiven service row has a
  side-scrolling strip of their own photos (`img/foto/`, 900 × 1200 WebP). The cam, metal and
  separatör railings and the yangın merdiveni hero are their photos too; yatay lama is still a render.
- Process images (`img/steps/`) are frames of the film (t = 2.7, 0.4, 5.0 and 9.8), captured with
  the copy overlays hidden.
- Service renders (`img/services/*.webp`, 800 × 800), one per row so the section reads as one set:
  `tools/studio.html?model=merdiven|asmakat|depo|carport|bungalov|cati|yangin&size=1000x1250`,
  then cropped square around the structure. They stand on a seamless studio sweep (floor curving
  into the back wall) under a soft key light, like catalogue shots, to match the stair models.
  Add `&cam=x,y,z` to look at a model from elsewhere while working on it.
- Services: on wide screens the sticky picture shows the row closest to the middle of the screen
  (the list has bottom padding so the picture is still whole at the last row);
  from 1024 px down every row shows its own picture. "Teklif iste" preselects that job in the form.

## Before going live

- Ask Maviron for full-resolution photos and a vector logo; the Instagram thumbnails are small.
- Waiting on Maviron: catalogue sizes / PDF, the yangın merdiveni page
  text, roof photos and the Facebook page address.
- Confirm: service area (İstanbul ve Kocaeli is inferred from project locations), "own workshop /
  own installation team" wording, and the example dimensions in the film (illustrative, 340 cm).
- Live demo: https://erdem-ismail.github.io/maviron-elik/ (GitHub Pages, served from the
  `gh-pages` branch: after committing, `git push origin main main:gh-pages`). The Vercel copy
  (https://maviron-celik-scroll.vercel.app) works but `*.vercel.app` is blocked on some Turkish
  networks. Update the canonical, `og:` and JSON-LD URLs in `index.html` if it moves to a real domain.
- mavironcelik.com currently shows a Squarespace parking page.
