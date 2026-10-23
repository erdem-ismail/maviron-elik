// Stair configurator ("Tasarla"): the visitor sets a floor height, picks a model and finishes,
// and the stair is rebuilt in 3D with the film's materials while the numbers update. Every model
// arrives on a 22 cm platform, marked Hmax (its top) and h (its underside) above the floor.
// Risers follow the comfort rule 2h + g ≈ 63 cm. Without WebGL2 the numbers and the
// WhatsApp message still work; a still render stands in for the view.

const PHONE = '905363773370';
const NAMES = {
  model: { konsol: 'Konsol merdiven', duz: 'Düz omurgalı merdiven', l: 'L merdiven', z: 'Z merdiven', u: 'U merdiven', spiral: 'Spiral merdiven' },
  tread: { mese: 'meşe basamak', ceviz: 'ceviz basamak', celik: 'çelik basamak', mermer: 'mermer basamak' },
  rail: { cam: 'cam korkuluk', metal: 'metal korkuluk', separator: 'separatör metal korkuluk' },
  color: { siyah: 'siyah', antrasit: 'antrasit', beyaz: 'beyaz' },
};

export function stairPlan(height) {
  let n = Math.round(height / .18);
  while (height / n > .19) n++;
  while (height / n < .165) n--;
  const h = height / n;
  return { n, h, g: Math.min(.3, Math.max(.25, .63 - 2 * h)) };
}

const cm = v => (v * 100).toLocaleString('tr-TR', { maximumFractionDigits: 1 });

export async function initConfigurator(root) {
  const form = root.querySelector('form');
  const out = name => root.querySelector(`[data-out="${name}"]`);
  const state = () => Object.fromEntries(new FormData(form));
  const view = { rebuild: () => {}, footprint: null };

  function update() {
    const s = state(), H = +s.height / 100, p = stairPlan(H);
    out('height').textContent = `${s.height} cm`;
    out('risers').textContent = `${p.n}`;
    out('rise').textContent = `${cm(p.h)} cm`;
    out('going').textContent = `${cm(p.g)} cm`;
    out('hmax').textContent = `${s.height} cm`;
    out('hlow').textContent = `${s.height - 22} cm`;
    // a spiral always gets metal balusters
    form.querySelectorAll('input[name="rail"]').forEach(i => { i.disabled = s.model === 'spiral' && i.value !== 'metal'; });
    if (s.model === 'spiral' && s.rail !== 'metal') form.querySelector('input[name="rail"][value="metal"]').checked = true;
    view.rebuild(state(), p);
    const f = view.footprint, m = v => v.toLocaleString('tr-TR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    out('footprint').textContent = f ? `${m(f[0])} × ${m(f[1])} m` : '—';
  }

  form.addEventListener('input', update);
  form.addEventListener('submit', e => {
    e.preventDefault();
    const s = state(), p = stairPlan(+s.height / 100);
    const text = `Merhaba Maviron Çelik, sitenizdeki tasarlayıcıda şu merdiveni hazırladım: ${NAMES.model[s.model]} · kat yüksekliği (Hmax) ${s.height} cm · platform altı (h) ${s.height - 22} cm · ${p.n} rıht × ${cm(p.h)} cm · ${NAMES.tread[s.tread]} · ${NAMES.rail[s.rail]} · ${NAMES.color[s.color]} çelik. Teklif almak istiyorum.`;
    window.open(`https://wa.me/${PHONE}?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
  });

  const hasGL = (() => { try { return !!document.createElement('canvas').getContext('webgl2'); } catch { return false; } })();
  if (hasGL) {
    try { await mount3D(root, view); } catch (err) { console.warn('Configurator 3D unavailable', err); }
  }
  update();
}

async function mount3D(root, view) {
  const post = innerWidth > 760;
  const [THREE, { RoomEnvironment }, { RoundedBoxGeometry }, ...pp] = await Promise.all([
    import('three'),
    import('three/addons/environments/RoomEnvironment.js'),
    import('three/addons/geometries/RoundedBoxGeometry.js'),
    ...(post ? ['EffectComposer', 'RenderPass', 'GTAOPass', 'OutputPass'].map(n => import(`three/addons/postprocessing/${n}.js`)) : []),
  ]);
  const canvas = root.querySelector('canvas');
  const box = root.querySelector('.config__view');
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#e7e4de');
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = .6;
  const camera = new THREE.PerspectiveCamera(34, 1, .1, 80);

  // ---- materials (shared; parts are rebuilt, materials are not) ----
  const loader = new THREE.TextureLoader();
  const tex = (name, srgb, rep = 1) => {
    const t = loader.load(`img/tex/${name}.webp`, () => render());
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 8;
    t.repeat.set(rep, rep);
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };
  const oak = { map: tex('oak-diff', true), roughnessMap: tex('oak-rough'), normalMap: tex('oak-nor') };
  // white marble: soft grey veins drawn once on a canvas
  const marble = (() => {
    const c = document.createElement('canvas'), k = c.getContext('2d');
    c.width = c.height = 512;
    k.fillStyle = '#f3f1ed';
    k.fillRect(0, 0, 512, 512);
    let seed = 7;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let v = 0; v < 14; v++) {
      k.strokeStyle = `rgba(120, 118, 115, ${.08 + rnd() * .22})`;
      k.lineWidth = .6 + rnd() * 2.2;
      k.beginPath();
      let x = rnd() * 512, y = 0;
      k.moveTo(x, y);
      while (y < 512) { x += (rnd() - .45) * 60; y += 20 + rnd() * 40; k.lineTo(x, y); }
      k.stroke();
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.colorSpace = THREE.SRGBColorSpace;
    t.rotation = .6;
    return t;
  })();
  const floorMaps = { map: tex('floor-diff', true, 9), roughnessMap: tex('floor-rough', false, 9), normalMap: tex('floor-nor', false, 9) };
  const steelColors = { siyah: '#1c1e21', antrasit: '#3b4047', beyaz: '#e8e8e5' };
  const steelMat = new THREE.MeshPhysicalMaterial({ metalness: .3, roughness: .48, clearcoat: .3, clearcoatRoughness: .35 });
  const treadMats = {
    mese: new THREE.MeshStandardMaterial({ ...oak, color: '#f2e2cc', roughness: .95, normalScale: new THREE.Vector2(.5, .5) }),
    ceviz: new THREE.MeshStandardMaterial({ ...oak, color: '#7d5f4a', roughness: .85, normalScale: new THREE.Vector2(.5, .5) }),
    celik: steelMat,
    mermer: new THREE.MeshPhysicalMaterial({ map: marble, roughness: .22, clearcoat: .4, clearcoatRoughness: .2 }),
  };
  const glassFace = new THREE.MeshPhysicalMaterial({ color: '#eef7f3', roughness: .03, envMapIntensity: 1.6, clearcoat: 1, clearcoatRoughness: .02, transparent: true, opacity: .14, depthWrite: false, side: THREE.DoubleSide });
  const glassEdge = new THREE.MeshStandardMaterial({ color: '#7fb5a1', roughness: .1, transparent: true, opacity: .92 });
  const inox = new THREE.MeshStandardMaterial({ color: '#dfe3e8', metalness: 1, roughness: .16 });
  const slabMat = new THREE.MeshStandardMaterial({ color: '#d9d6cf', roughness: .92 });
  const wallMat = new THREE.MeshStandardMaterial({ color: '#e4e3e0', roughness: .94 });
  const darkMat = new THREE.MeshStandardMaterial({ color: '#141517', roughness: .55, envMapIntensity: .4 });
  const dimMat = new THREE.MeshBasicMaterial({ color: '#9a5f2b' });

  // ---- fixed set: floor and light ----
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(24, 24), new THREE.MeshStandardMaterial({ ...floorMaps, color: '#ffffff', roughness: 1, normalScale: new THREE.Vector2(.6, .6) }));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);
  scene.add(new THREE.HemisphereLight('#e6eef8', '#4a4036', .5));
  const sun = new THREE.DirectionalLight('#fff6ec', 3.1);
  sun.castShadow = true;
  sun.shadow.mapSize.set(post ? 2048 : 1024, post ? 2048 : 1024);
  Object.assign(sun.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5, near: .5, far: 25 });
  sun.shadow.bias = -.0003;
  sun.shadow.normalBias = .015;
  scene.add(sun, sun.target);

  let composer = null;
  if (post) {
    const [{ EffectComposer }, { RenderPass }, { GTAOPass }, { OutputPass }] = pp;
    composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 }));
    composer.addPass(new RenderPass(scene, camera));
    const gtao = new GTAOPass(scene, camera, 1, 1);
    gtao.updateGtaoMaterial({ radius: .3, distanceExponent: 1.5, thickness: 1, scale: 1.2, samples: 16 });
    composer.addPass(gtao);
    composer.addPass(new OutputPass());
  }

  // ---- builders ----
  const W = .9, P = .008, B = .14, SB = .18, GT = .0175, GAP = .03, SLAB = .22;
  let stair = new THREE.Group(), env = new THREE.Group(), dims = new THREE.Group();
  scene.add(stair, env, dims);

  const rbox = (w, h, d, r) => new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 3, h / 3, d / 3));
  const boxUV = geo => {
    const p = geo.attributes.position, n = geo.attributes.normal, uv = geo.attributes.uv;
    const du = Math.random(), dv = Math.random();
    for (let i = 0; i < p.count; i++) {
      const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
      const [u, v] = ay >= ax && ay >= az ? [p.getX(i), p.getZ(i)] : ax >= az ? [p.getY(i), p.getZ(i)] : [p.getX(i), p.getY(i)];
      uv.setXY(i, u / .9 + du, v / .9 + dv);
    }
    return geo;
  };
  const put = (parent, geo, mat, x, y, z, rotY = 0) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.rotation.y = rotY;
    m.castShadow = mat !== glassFace;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  };
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  // a straight box member from a to b, w wide and hh deep
  const member = (parent, a, b, w, hh, mat = steelMat) => {
    const len = a.distanceTo(b), geo = rbox(w, hh, len, .004);
    geo.translate(0, 0, len / 2);
    const m = put(parent, geo, mat, a.x, a.y, a.z);
    m.lookAt(b);
    return m;
  };
  // dimension tags are HTML laid over the canvas, placed at their 3D point on every render
  const tagLayer = document.createElement('div');
  tagLayer.className = 'config__tags';
  tagLayer.setAttribute('aria-hidden', 'true');
  box.append(tagLayer);
  const tags = [];
  const tag = (html, x, y, z) => {
    const el = document.createElement('span');
    el.className = 'config__tag';
    el.innerHTML = html;
    tagLayer.append(el);
    tags.push({ el, p: V(x, y, z) });
  };
  // a vertical dimension line from the floor up to top at (x, z), ticked at both ends
  const dimLine = (x, z, top, text, at = .5) => {
    put(dims, new THREE.BoxGeometry(.012, top, .012), dimMat, x, top / 2, z).castShadow = false;
    for (const y of [.006, top - .006]) put(dims, new THREE.BoxGeometry(.16, .012, .012), dimMat, x, y, z).castShadow = false;
    tag(text, x, top * at, z);
  };

  function build(s, { n, h, g }) {
    for (const grp of [stair, env, dims]) {
      grp.traverse(o => o.geometry && o.geometry.dispose());
      scene.remove(grp);
    }
    tags.length = 0;
    tagLayer.replaceChildren();
    stair = new THREE.Group();
    env = new THREE.Group();
    dims = new THREE.Group();
    scene.add(stair, env, dims);
    steelMat.color.set(steelColors[s.color]);
    steelMat.clearcoat = s.color === 'beyaz' ? .15 : .3;

    const N = n - 1;                                  // treads; the last rise lands on the platform
    const T = s.tread === 'celik' || s.tread === 'mermer' ? .03 : .045;
    const treadMat = treadMats[s.tread];
    const H = n * h, hmax = `H<sub>max</sub> ${Math.round(H * 100)} cm`, hlow = `h ${Math.round((H - SLAB) * 100)} cm`;
    const tread = (depth, thick, len, x, y, z, rotY = 0) => {
      const geo = rbox(depth, thick, len, .005);
      return put(stair, s.tread === 'celik' ? geo : boxUV(geo), treadMat, x, y, z, rotY);
    };
    const plate = (x, z, sz = .24) => {
      put(stair, rbox(sz, .012, sz, .006), steelMat, x, .006, z);
      for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) put(stair, new THREE.CylinderGeometry(.011, .011, .014, 6), steelMat, x + a * sz * .36, .019, z + b * sz * .36);
    };
    const ROT = d => d.x ? (d.x > 0 ? 0 : Math.PI) : (d.z < 0 ? Math.PI / 2 : -Math.PI / 2);
    const along = (o, d, sd, y) => V(o.x + d.x * sd, y, o.z + d.z * sd);
    // straight spine: one sloped box beam under the tread centres, a short bracket and an 8 mm
    // saddle plate under each tread. o = where the run starts, d = its horizontal direction,
    // count treads, the first on riser k0 + 1. Returns the beam's top end.
    const run = (o, d, count, k0, end = count * g + .02) => {
      const slope = h / g, half = SB / 2 / Math.cos(Math.atan(slope)), toFloor = k0 === 0;
      const yb = sd => (k0 + .5) * h + sd * slope - T - P - .05 - half;
      const s0 = toFloor ? (SB / 2 - yb(0)) / slope : -.04;
      member(stair, along(o, d, s0, yb(s0)), along(o, d, end, yb(end)), B, SB);
      if (toFloor) { const p = along(o, d, s0 + .08, 0); plate(p.x, p.z); }
      for (let i = 0; i < count; i++) {
        const k = k0 + i + 1, sd = (i + .5) * g, under = k * h - T - P, beamTop = yb(sd) + half - .02, c = along(o, d, sd, 0);
        put(stair, rbox(g * .45, under - beamTop, B * .9, .004), steelMat, c.x, (under + beamTop) / 2, c.z, ROT(d));
        put(stair, rbox(g * .8, P, W * .5, .002), steelMat, c.x, under + P / 2, c.z, ROT(d));
        const t = along(o, d, sd - .015, 0);
        tread(g + .03, T, W, t.x, k * h - T / 2, t.z, ROT(d));
      }
      return along(o, d, end, yb(end) + half);
    };
    // a level landing on riser k: edge beams, posts to the floor, the tread on top;
    // hang = beam ends that tie up into the frame
    const landing = (cx, cz, dx, dz, k, posts, hang = []) => {
      const top = k * h, y = top - T - P - .06;
      for (const z of [cz - dz / 2 + .06, cz + dz / 2 - .06]) member(stair, V(cx - dx / 2, y, z), V(cx + dx / 2, y, z), .1, .12);
      for (const x of [cx - dx / 2 + .06, cx + dx / 2 - .06]) member(stair, V(x, y, cz - dz / 2), V(x, y, cz + dz / 2), .1, .12);
      for (const [px, pz] of posts) { member(stair, V(px, .012, pz), V(px, y - .06, pz), .1, .1); plate(px, pz, .22); }
      for (const p of hang) member(stair, p, V(p.x, y - .06, p.z), B, .1);
      tread(dx, T, dz, cx, top - T / 2, cz);
    };
    // a railing along a run, in a frame at (x, z) turned by rotY; local x runs along the flight
    // flat = length in metres for a level run (a landing edge) instead of a sloped flight
    const railing = (count, base, x, z, rotY, out = 1, flat = 0) => {
      const frame = new THREE.Group();
      frame.position.set(x, 0, z);
      frame.rotation.y = rotY;
      stair.add(frame);
      const slope = flat ? 0 : h / g, len = flat || count * g;
      const low = u => base + u * slope - .2, high = u => base + u * slope + .95;
      if (s.rail === 'cam') {
        const per = flat ? 99 : 4;
        for (let a = 0; a < (flat ? 1 : count); a += per) {
          const u0 = flat ? .01 : a * g + .02, u1 = flat ? flat - .01 : Math.min(count, a + per) * g - .02;
          const geo = new THREE.ExtrudeGeometry(new THREE.Shape([[u0, low(u0)], [u1, low(u1)], [u1, high(u1)], [u0, high(u0)]].map(([u, v]) => new THREE.Vector2(u, v))), { depth: GT, bevelEnabled: false });
          const m = new THREE.Mesh(geo, [glassFace, glassEdge]);
          m.position.z = out > 0 ? 0 : -GT;
          frame.add(m);
          for (const u of [u0 + .12, u1 - .12]) {
            const disc = put(frame, new THREE.CylinderGeometry(.025, .025, .012, 28), inox, u, low(u) + .13, out > 0 ? GT + .006 : -GT - .006);
            disc.rotation.x = Math.PI / 2;
            const rod = put(frame, new THREE.CylinderGeometry(.009, .009, GAP, 16), inox, u, low(u) + .13, -out * GAP / 2);
            rod.rotation.x = Math.PI / 2;
          }
        }
      } else if (s.rail === 'separator') {
        // floor-to-top bars every 12 cm, tied by a flat bar at handrail height where the run ends
        const top = base + (flat ? 0 : count * h - h) + .95, k = Math.max(2, Math.round(len / .12));
        for (let i = 0; i <= k; i++) put(frame, rbox(.025, top, .025, .003), steelMat, .03 + i * (len - .06) / k, top / 2, 0);
        put(frame, rbox(len, .04, .05, .004), steelMat, len / 2, top, 0);
      } else if (flat) {
        const k = Math.max(2, Math.round(flat / .25));
        for (let i = 0; i <= k; i++) put(frame, rbox(.02, .95, .02, .003), steelMat, .03 + i * (flat - .06) / k, base + .95 / 2, 0);
        put(frame, rbox(flat, .012, .05, .004), steelMat, flat / 2, base + .95, 0);
      } else {
        // 20 × 20 balusters, one per tread, under a 50 × 12 flat handrail
        for (let i = 0; i < count; i++) put(frame, rbox(.02, .95, .02, .003), steelMat, i * g + g / 2, base + i * h + .95 / 2, 0);
        const rail = put(frame, rbox(Math.hypot(count * g, count * h) + .1, .012, .05, .004), steelMat, count * g / 2, base + count * h / 2 + .95 - h / 2, 0);
        rail.rotation.z = Math.atan2(h, g);
      }
    };
    const slab = (x0, x1, z0, z1) => put(env, new THREE.BoxGeometry(x1 - x0, SLAB, z1 - z0), slabMat, (x0 + x1) / 2, H - SLAB / 2, (z0 + z1) / 2);
    const wall = z => {
      const m = put(env, new THREE.PlaneGeometry(30, 8), wallMat, 1.5, 4, z);
      m.castShadow = false;
      put(env, new THREE.PlaneGeometry(30, .05), darkMat, 1.5, .025, z + .002).castShadow = false;
    };
    // Hmax: platform top to the floor; h: platform underside to the floor (both on the slab's +z face)
    const dimsAt = (x, z, dx = .45) => {
      dimLine(x, z + .03, H, hmax, .7);
      dimLine(x + dx, z + .03, H - SLAB, hlow, .35);
    };

    if (s.model === 'konsol') {
      const KT = s.tread === 'celik' ? .03 : .08;
      wall(-W / 2 - .001);
      for (let i = 0; i < N; i++) tread(g + .03, KT, W, i * g + g / 2 - .015, (i + 1) * h - KT / 2, 0);
      railing(N, h, 0, W / 2 + GAP, 0);
      slab(N * g, N * g + 2.6, -W / 2, 2);
      dimsAt(N * g + .35, 2);
    } else if (s.model === 'duz') {
      wall(-1.3);
      run(V(0, 0, 0), V(1, 0, 0), N, 0);
      railing(N, h, 0, W / 2 + GAP, 0);
      slab(N * g, N * g + 2.6, -1.3, 1.3);
      dimsAt(N * g + .35, 1.3);
    } else if (s.model === 'l') {
      const n1 = Math.ceil((N - 1) / 2), n2 = N - 1 - n1, X2 = n1 * g + W / 2, Z0 = -W / 2, k = n1 + 1, ze = Z0 - n2 * g;
      wall(ze - 1.4);
      const top1 = run(V(0, 0, 0), V(1, 0, 0), n1, 0, n1 * g + .06);
      landing(X2, 0, W, W, k, [[X2, 0]], [top1]);
      run(V(X2, 0, Z0), V(0, 0, -1), n2, k);
      slab(-1.6, n1 * g + W, ze - 1.4, ze);
      railing(n1, h, 0, W / 2 + GAP, 0);
      railing(0, k * h, n1 * g, W / 2 + GAP, 0, 1, W);
      railing(n2, (k + 1) * h, n1 * g - GAP, Z0, Math.PI / 2, -1);
      dimsAt(-1.15, ze);
    } else if (s.model === 'u') {
      // up along +x to a wide landing, then back along -x beside the first flight
      const n1 = Math.ceil((N - 1) / 2), n2 = N - 1 - n1, zb = -(W + .06), XL = n1 * g, k = n1 + 1, xa = XL - n2 * g;
      wall(zb - W / 2 - .9);
      const top1 = run(V(0, 0, 0), V(1, 0, 0), n1, 0, XL + .06);
      landing(XL + W / 2, zb / 2, W, 2 * W + .06, k, [[XL + W - .1, W / 2 - .1], [XL + W - .1, zb - W / 2 + .1]], [top1]);
      run(V(XL, 0, zb), V(-1, 0, 0), n2, k);
      slab(xa - 2.6, xa, zb - W / 2 - .9, zb + W / 2);
      railing(n1, h, 0, W / 2 + GAP, 0);
      railing(0, k * h, XL, W / 2 + GAP, 0, 1, W);
      railing(0, k * h, XL + W + GAP, zb - W / 2, -Math.PI / 2, -1, 2 * W + .06);
      railing(n2, (k + 1) * h, XL, zb - W / 2 - GAP, Math.PI, 1);
      dimsAt(xa - 1.15, zb + W / 2);
    } else if (s.model === 'z') {
      // two quarter turns: +x, landing, -z, landing, +x again
      const rest = N - 2, n2 = Math.max(2, Math.round(rest * .3)), n1 = Math.ceil((rest - n2) / 2), n3 = rest - n2 - n1;
      const X2 = n1 * g + W / 2, Zl = -W / 2 - n2 * g - W / 2, k1 = n1 + 1, k2 = k1 + n2 + 1, xe = X2 + W / 2 + n3 * g;
      wall(Zl - W / 2 - 1);
      const top1 = run(V(0, 0, 0), V(1, 0, 0), n1, 0, n1 * g + .06);
      landing(X2, 0, W, W, k1, [[X2, 0]], [top1]);
      const top2 = run(V(X2, 0, -W / 2), V(0, 0, -1), n2, k1, n2 * g + .06);
      landing(X2, Zl, W, W, k2, [[X2, Zl]], [top2]);
      run(V(X2 + W / 2, 0, Zl), V(1, 0, 0), n3, k2);
      slab(xe, xe + 2.6, Zl - W / 2 - 1, Zl + W / 2 + .3);
      railing(n1, h, 0, W / 2 + GAP, 0);
      railing(0, k1 * h, n1 * g, W / 2 + GAP, 0, 1, W);
      railing(0, k1 * h, X2 + W / 2 + GAP, W / 2, Math.PI / 2, -1, W);
      railing(n2, (k1 + 1) * h, X2 + W / 2 + GAP, -W / 2, Math.PI / 2, -1);
      railing(n3, (k2 + 1) * h, X2 + W / 2, Zl + W / 2 + GAP, 0);
      dimsAt(xe + .35, Zl + W / 2 + .3);
    } else {
      // spiral: wedge treads around a column, a baluster per tread, helical handrail, arrival platform
      const step = Math.PI * 2 / 13, r0 = .07, r1 = .8, a00 = Math.PI / 2 - N * step;
      wall(-2.1);
      put(stair, new THREE.CylinderGeometry(.06, .06, H, 40), steelMat, 0, H / 2, 0);
      plate(0, 0, .3);
      const pts = [];
      for (let i = 0; i < N; i++) {
        const a0 = a00 + i * step, y = (i + 1) * h, shape = new THREE.Shape();
        shape.moveTo(r0, 0);
        shape.absarc(0, 0, r1, 0, step * 1.06, false);
        shape.lineTo(r0 * Math.cos(step * 1.06), r0 * Math.sin(step * 1.06));
        shape.closePath();
        const geo = new THREE.ExtrudeGeometry(shape, { depth: T, bevelEnabled: true, bevelThickness: .004, bevelSize: .004, bevelSegments: 2, curveSegments: 24 });
        geo.rotateX(-Math.PI / 2);
        put(stair, geo, treadMat, 0, y - T, 0, a0);
        put(stair, new THREE.CylinderGeometry(.085, .085, .1, 32), steelMat, 0, y - T - .05, 0);
        const ab = a0 + step * .5, bx = (r1 - .06) * Math.cos(ab), bz = -(r1 - .06) * Math.sin(ab);
        put(stair, new THREE.CylinderGeometry(.011, .011, .95, 12), steelMat, bx, y + .95 / 2, bz);
        pts.push(new THREE.Vector3(bx, y + .95, bz));
      }
      put(stair, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 200, .022, 16, false), steelMat, 0, 0, 0);
      // the platform starts on the radial line where the last rise lands and runs on round the column
      const deck = new THREE.Group();
      deck.rotation.y = Math.PI / 2;
      env.add(deck);
      put(deck, new THREE.BoxGeometry(1.9, SLAB, 1.8), slabMat, .75, H - SLAB / 2, -.9);
      deck.updateMatrixWorld();
      const at = (u, w) => new THREE.Vector3(u, 0, w).applyMatrix4(deck.matrixWorld);
      const a = at(.35, -1.83), b = at(.8, -1.83);
      dimLine(a.x, a.z, H, hmax, .7);
      dimLine(b.x, b.z, H - SLAB, hlow, .35);
    }

    // frame the result and aim the sun at it
    const bounds = new THREE.Box3().setFromObject(stair);
    const size = bounds.getSize(new THREE.Vector3());
    view.footprint = [size.x, size.z];
    bounds.expandByObject(dims);
    bounds.getCenter(focus);
    radius = bounds.getBoundingSphere(new THREE.Sphere()).radius;
    sun.position.set(focus.x - 4.5, 6, focus.z + 6.5);
    sun.target.position.copy(focus);
  }

  // ---- camera: turntable around the stair; drag to turn, a slow sway until then ----
  const focus = new THREE.Vector3();
  let radius = 3, yaw = .55, dragging = false, touched = false, lastX = 0, visible = false, cw = 1, ch = 1;
  function render() {
    const el = .2, dist = radius / Math.sin(THREE.MathUtils.degToRad(camera.fov / 2)) * (cw / ch < 1 ? 1.15 : .82);
    camera.position.set(focus.x + Math.sin(yaw) * Math.cos(el) * dist, focus.y + Math.sin(el) * dist, focus.z + Math.cos(yaw) * Math.cos(el) * dist);
    camera.lookAt(focus);
    composer ? composer.render() : renderer.render(scene, camera);
    camera.updateMatrixWorld();
    for (const { el, p } of tags) {
      const v = p.clone().project(camera);
      el.style.transform = `translate(${((v.x + 1) / 2 * cw).toFixed(1)}px, ${((1 - v.y) / 2 * ch).toFixed(1)}px) translate(-50%, -50%)`;
    }
  }
  const resize = () => {
    cw = box.clientWidth; ch = box.clientHeight;
    renderer.setSize(cw, ch, false);
    if (composer) { composer.setPixelRatio(renderer.getPixelRatio()); composer.setSize(cw, ch); }
    camera.aspect = cw / ch;
    camera.updateProjectionMatrix();
    render();
  };
  canvas.addEventListener('pointerdown', e => { dragging = touched = true; lastX = e.clientX; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointermove', e => {
    if (!dragging) return;
    yaw = THREE.MathUtils.clamp(yaw - (e.clientX - lastX) * .006, -1.25, 1.25);
    lastX = e.clientX;
    render();
  });
  for (const ev of ['pointerup', 'pointercancel']) canvas.addEventListener(ev, () => { dragging = false; });
  canvas.addEventListener('keydown', e => {
    const d = { ArrowLeft: .12, ArrowRight: -.12 }[e.key];
    if (!d) return;
    e.preventDefault();
    touched = true;
    yaw = THREE.MathUtils.clamp(yaw + d, -1.25, 1.25);
    render();
  });
  new IntersectionObserver(([en]) => { visible = en.isIntersecting; }).observe(box);
  const t0 = performance.now();
  (function sway(now) {
    if (!touched && visible && !calm) { yaw = .55 + Math.sin((now - t0) / 4000) * .35; render(); }
    if (!touched) requestAnimationFrame(sway);
  })(t0);

  view.rebuild = (s, p) => { build(s, p); render(); };
  addEventListener('resize', resize);
  resize();
  root.classList.add('is-3d');
}
