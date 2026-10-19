// Stair configurator ("Tasarla"): the visitor sets a floor height, picks a model and finishes,
// and the stair is rebuilt in 3D with the film's materials while the numbers update.
// Risers follow the comfort rule 2h + g ≈ 63 cm. Without WebGL2 the numbers and the
// WhatsApp message still work; a still render stands in for the view.

const PHONE = '905363773370';
const NAMES = {
  model: { konsol: 'Konsol merdiven', duz: 'Düz omurgalı merdiven', l: 'L merdiven', z: 'Z merdiven', doner: 'Döner merdiven' },
  tread: { mese: 'meşe basamak', ceviz: 'ceviz basamak', celik: 'çelik basamak', beton: 'beton basamak' },
  rail: { cam: 'cam korkuluk', dikme: 'dikme korkuluk' },
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
    // a spiral always gets steel balusters
    form.querySelectorAll('input[name="rail"]').forEach(i => { i.disabled = s.model === 'doner' && i.value === 'cam'; });
    if (s.model === 'doner' && s.rail === 'cam') form.querySelector('input[name="rail"][value="dikme"]').checked = true;
    view.rebuild(state(), p);
    const f = view.footprint, m = v => v.toLocaleString('tr-TR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    out('footprint').textContent = f ? `${m(f[0])} × ${m(f[1])} m` : '—';
  }

  form.addEventListener('input', update);
  form.addEventListener('submit', e => {
    e.preventDefault();
    const s = state(), p = stairPlan(+s.height / 100);
    const text = `Merhaba Maviron Çelik, sitenizdeki tasarlayıcıda şu merdiveni hazırladım: ${NAMES.model[s.model]} · kat yüksekliği ${s.height} cm · ${p.n} rıht × ${cm(p.h)} cm · ${NAMES.tread[s.tread]} · ${NAMES.rail[s.rail]} · ${NAMES.color[s.color]} çelik. Teklif almak istiyorum.`;
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
  const conc = { map: tex('floor-diff', true), roughnessMap: tex('floor-rough'), normalMap: tex('floor-nor') };
  const floorMaps = { map: tex('floor-diff', true, 9), roughnessMap: tex('floor-rough', false, 9), normalMap: tex('floor-nor', false, 9) };
  const steelColors = { siyah: '#1c1e21', antrasit: '#3b4047', beyaz: '#e8e8e5' };
  const steelMat = new THREE.MeshPhysicalMaterial({ metalness: .3, roughness: .48, clearcoat: .3, clearcoatRoughness: .35 });
  const treadMats = {
    mese: new THREE.MeshStandardMaterial({ ...oak, color: '#f2e2cc', roughness: .95, normalScale: new THREE.Vector2(.5, .5) }),
    ceviz: new THREE.MeshStandardMaterial({ ...oak, color: '#7d5f4a', roughness: .85, normalScale: new THREE.Vector2(.5, .5) }),
    celik: steelMat,
    beton: new THREE.MeshStandardMaterial({ ...conc, color: '#f4f2ee', roughness: 1, normalScale: new THREE.Vector2(.4, .4) }),
  };
  const glassFace = new THREE.MeshPhysicalMaterial({ color: '#eef7f3', roughness: .03, envMapIntensity: 1.6, clearcoat: 1, clearcoatRoughness: .02, transparent: true, opacity: .14, depthWrite: false, side: THREE.DoubleSide });
  const glassEdge = new THREE.MeshStandardMaterial({ color: '#7fb5a1', roughness: .1, transparent: true, opacity: .92 });
  const inox = new THREE.MeshStandardMaterial({ color: '#dfe3e8', metalness: 1, roughness: .16 });
  const slabMat = new THREE.MeshStandardMaterial({ color: '#d9d6cf', roughness: .92 });
  const wallMat = new THREE.MeshStandardMaterial({ color: '#e4e3e0', roughness: .94 });
  const darkMat = new THREE.MeshStandardMaterial({ color: '#141517', roughness: .55, envMapIntensity: .4 });

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
  const W = .9, P = .008, S = .12, B = .14, GT = .0175, GAP = .03;
  let stair = new THREE.Group(), env = new THREE.Group();
  scene.add(stair, env);

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

  function build(s, { n, h, g }) {
    for (const grp of [stair, env]) {
      grp.traverse(o => o.geometry && o.geometry.dispose());
      scene.remove(grp);
    }
    stair = new THREE.Group();
    env = new THREE.Group();
    scene.add(stair, env);
    steelMat.color.set(steelColors[s.color]);
    steelMat.clearcoat = s.color === 'beyaz' ? .15 : .3;

    const N = n - 1;                                  // treads; the last rise lands on the upper floor
    const T = s.tread === 'celik' ? .03 : s.tread === 'beton' ? .06 : .045;
    const treadMat = treadMats[s.tread];
    const steel = (w, hh, d, x, y, z) => put(stair, rbox(w, hh, d, .006), steelMat, x, y, z);
    const tread = (depth, thick, len, x, y, z, rotY = 0) => {
      const geo = rbox(depth, thick, len, .005);
      return put(stair, s.tread === 'celik' ? geo : boxUV(geo), treadMat, x, y, z, rotY);
    };
    const plate = (x, z, sz = .24) => {
      steel(sz, .012, sz, x, .006, z);
      for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) put(stair, new THREE.CylinderGeometry(.011, .011, .014, 6), steelMat, x + a * sz * .36, .019, z + b * sz * .36);
    };
    const spineRun = (x0, z, count, k0, dir) => {
      for (let i = 0; i < count; i++) {
        const k = k0 + i + 1, top = k * h - T - P, bottom = i || k0 ? (k - 1) * h - T - P - S : .012, xa = x0 + dir * i * g;
        steel(S, top - bottom, B, xa + dir * S / 2, (top + bottom) / 2, z);
        steel(g + S, S, B, xa + dir * (g + S) / 2, top - S / 2, z);
        steel(g * .8, P, W * .5, xa + dir * g / 2, top + P / 2, z);
        tread(g + .03, T, W, xa + dir * (g / 2 - .015), k * h - T / 2, z);
      }
    };
    // a railing along a run, in a frame at (x, z) turned by rotY; local x runs along the flight
    // flat = length in metres for a level run (a landing edge) instead of a sloped flight
    const railing = (count, base, x, z, rotY, out = 1, flat = 0) => {
      const frame = new THREE.Group();
      frame.position.set(x, 0, z);
      frame.rotation.y = rotY;
      stair.add(frame);
      const slope = flat ? 0 : h / g;
      const low = u => base + u * slope - .2, high = u => base + u * slope + .95;
      if (s.rail === 'cam') {
        const per = flat ? 99 : 4, span = flat ? [0, flat] : null;
        for (let a = 0; a < (flat ? 1 : count); a += per) {
          const u0 = flat ? span[0] + .01 : a * g + .02, u1 = flat ? span[1] - .01 : Math.min(count, a + per) * g - .02;
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
      } else if (flat) {
        const k = Math.max(2, Math.round(flat / .25));
        for (let i = 0; i <= k; i++) put(frame, rbox(.02, .95, .02, .003), steelMat, .03 + i * (flat - .06) / k, base + .95 / 2, 0);
        put(frame, rbox(flat, .012, .05, .004), steelMat, flat / 2, base + .95, 0);
      } else {
        // 20 × 20 balusters, one per tread, under a 50 × 12 flat handrail
        for (let i = 0; i < count; i++) {
          const u = i * g + g / 2, y0 = base + i * h;
          put(frame, rbox(.02, .95, .02, .003), steelMat, u, y0 + .95 / 2, 0);
        }
        const len = Math.hypot(count * g, count * h);
        const rail = put(frame, rbox(len + .1, .012, .05, .004), steelMat, count * g / 2, base + count * h / 2 + .95 - h / 2, 0);
        rail.rotation.z = Math.atan2(h, g);
      }
    };
    const slab = (x0, x1, z0, z1, top) => put(env, new THREE.BoxGeometry(x1 - x0, .22, z1 - z0), slabMat, (x0 + x1) / 2, top - .11, (z0 + z1) / 2);
    const wall = z => {
      const m = put(env, new THREE.PlaneGeometry(30, 8), wallMat, 1.5, 4, z);
      m.castShadow = false;
      put(env, new THREE.PlaneGeometry(30, .05), darkMat, 1.5, .025, z + .002).castShadow = false;
    };
    const H = n * h;

    if (s.model === 'konsol') {
      const KT = s.tread === 'celik' ? .03 : .08;
      wall(-W / 2 - .001);
      for (let i = 0; i < N; i++) tread(g + .03, KT, W, i * g + g / 2 - .015, (i + 1) * h - KT / 2, 0);
      railing(N, h, 0, W / 2 + GAP, 0);
      slab(N * g, N * g + 2.6, -W / 2, 2, H);
    } else if (s.model === 'duz') {
      wall(-1.3);
      plate(S / 2, 0);
      spineRun(0, 0, N, 0, 1);
      railing(N, h, 0, W / 2 + GAP, 0);
      slab(N * g, N * g + 2.6, -1.3, 1.3, H);
    } else if (s.model === 'l') {
      const n1 = Math.ceil((N - 1) / 2), n2 = N - 1 - n1, X2 = n1 * g + W / 2, Z0 = -W / 2;
      wall(Z0 - n2 * g - 1.4);
      plate(S / 2, 0);
      spineRun(0, 0, n1, 0, 1);
      const k = n1 + 1, top = k * h - T - P;
      steel(S, S + h, B, n1 * g + S / 2, top - (S + h) / 2, 0);
      steel(W / 2 + S / 2, S, B, n1 * g + (W / 2 + S / 2) / 2, top - S / 2, 0);
      steel(B, S, W / 2 + B / 2, X2, top - S / 2, (B / 2 + Z0) / 2);
      steel(.1, top - S - .012, .1, X2, (top - S + .012) / 2, 0);
      plate(X2, 0, .22);
      tread(W, T, W, X2, k * h - T / 2, 0);
      for (let j = 0; j < n2; j++) {
        const kk = k + 1 + j, zs = Z0 - j * g, t2 = kk * h - T - P;
        steel(B, S + h, S, X2, t2 - (S + h) / 2, zs - S / 2);
        steel(B, S, g + S, X2, t2 - S / 2, zs - (g + S) / 2);
        steel(W * .5, P, g * .8, X2, t2 + P / 2, zs - g / 2);
        tread(g + .03, T, W, X2, kk * h - T / 2, zs - g / 2 + .015, Math.PI / 2);
      }
      slab(-1.6, n1 * g + W, Z0 - n2 * g - 1.4, Z0 - n2 * g, H);
      railing(n1, h, 0, W / 2 + GAP, 0);
      railing(0, k * h, n1 * g, W / 2 + GAP, 0, 1, W);
      railing(n2, (k + 1) * h, n1 * g - GAP, Z0, Math.PI / 2, -1);
    } else if (s.model === 'z') {
      const n1 = Math.ceil((N - 1) / 2), n2 = N - 1 - n1, zb = -(W + .06), XL = n1 * g, k = n1 + 1;
      wall(zb - W / 2 - .9);
      plate(S / 2, 0);
      spineRun(0, 0, n1, 0, 1);
      const top = k * h - T - P;
      steel(S, S + h, B, XL + S / 2, top - (S + h) / 2, 0);
      steel(W * .55, S, B, XL + W * .55 / 2, top - S / 2, 0);
      steel(B, S, W + .06 + B, XL + W / 2, top - S / 2, zb / 2);
      steel(W * .55, S, B, XL + W * .55 / 2, top - S / 2, zb);
      for (const z of [0, zb]) { steel(.1, top - S - .012, .1, XL + W - .1, (top - S + .012) / 2, z); plate(XL + W - .1, z, .22); }
      tread(W, T, 2 * W + .06, XL + W / 2, k * h - T / 2, zb / 2);
      spineRun(XL, zb, n2, k, -1);
      const xa = XL - n2 * g;
      slab(xa - 2.6, xa, zb - W / 2 - .9, zb + W / 2, H);
      railing(n1, h, 0, W / 2 + GAP, 0);
      railing(0, k * h, XL, W / 2 + GAP, 0, 1, W);
      railing(0, k * h, XL + W + GAP, zb - W / 2, -Math.PI / 2, -1, 2 * W + .06);
      railing(n2, (k + 1) * h, XL, zb - W / 2 - GAP, Math.PI, 1);
    } else {
      // spiral: wedge treads around a column, a baluster per tread, helical handrail
      const step = Math.PI * 2 / 13, r0 = .07, r1 = .8;
      wall(-1.3);
      put(stair, new THREE.CylinderGeometry(.06, .06, H + .3, 40), steelMat, 0, (H + .3) / 2, 0);
      plate(0, 0, .3);
      const pts = [];
      for (let i = 0; i < N; i++) {
        const a0 = i * step, y = (i + 1) * h, shape = new THREE.Shape();
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
    }

    // frame the result and aim the sun at it
    const bounds = new THREE.Box3().setFromObject(stair);
    const size = bounds.getSize(new THREE.Vector3());
    view.footprint = [size.x, size.z];
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
