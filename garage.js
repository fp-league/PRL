/* PRL Garage — a spinnable 3D F1 car built from primitives with three.js (loaded on demand). */
(() => {
const THREE_URL = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
let loading = null;
const loadThree = () => window.THREE ? Promise.resolve() : (loading = loading || new Promise((res, rej) => {
  const s = document.createElement('script'); s.src = THREE_URL; s.onload = res; s.onerror = rej; document.head.appendChild(s);
}));

const P = (x, y) => [(x - 200) * .01, (104 - y) * .01];   // side-profile SVG coords -> world
function shapeFrom(cmds){
  const sh = new THREE.Shape();
  cmds.forEach(([c, ...a]) => {
    const pts = []; for (let i = 0; i < a.length; i += 2) pts.push(...P(a[i], a[i + 1]));
    if (c === 'M') sh.moveTo(...pts); else if (c === 'L') sh.lineTo(...pts); else if (c === 'C') sh.bezierCurveTo(...pts);
  });
  return sh;
}

function buildCar(livery){
  const T = THREE, car = new T.Group();
  const lin = h => new T.Color(h).convertSRGBToLinear();
  const paint = new T.MeshStandardMaterial({ color: new T.Color(livery).convertSRGBToLinear(), metalness: .5, roughness: .25 });
  const carbon = new T.MeshStandardMaterial({ color: lin(0x0a0a0a), metalness: 0, roughness: 1 });
  const rubber = new T.MeshStandardMaterial({ color: lin(0x0b0b0b), roughness: .9 });
  const rim = new T.MeshStandardMaterial({ color: lin(0x3a3a3a), metalness: .8, roughness: .3 });
  const red = new T.MeshStandardMaterial({ color: lin(0xe10600), roughness: .5 });
  const white = new T.MeshStandardMaterial({ color: lin(0xf2f2f2), roughness: .3, metalness: .2 });
  const ex = (shape, depth, bevel, mat) => {
    const g = new T.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 4, curveSegments: 24 });
    g.translate(0, 0, -depth / 2); const m = new T.Mesh(g, mat); m.castShadow = true; return m;
  };
  const box = (w, h, d, mat, x, y, z) => { const m = new T.Mesh(new T.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.castShadow = true; return m; };

  // monocoque / engine cover / nose
  car.add(ex(shapeFrom([['M',46,86],['L',50,64],['C',92,58,122,40,148,29],['L',170,26],['L',174,39],['L',178,45],['L',214,47],['C',254,52,300,63,342,74],['L',382,84],['L',376,90],['L',300,90],['L',120,92]]), .34, .05, paint));
  // sidepods
  car.add(ex(shapeFrom([['M',122,90],['C',126,64,150,57,198,61],['L',262,68],['C',274,76,274,84,266,90]]), .92, .07, paint));
  // sidepod inlets
  [-1, 1].forEach(s => car.add(box(.03, .1, .16, carbon, -.02, .38, s * .44)));
  // livery stripe along the spine
  const stripe = box(2.4, .012, .06, white, -.1, .5, 0); stripe.rotation.z = -.06; car.add(stripe);
  // floor + plank
  car.add(box(2.92, .025, 1.36, carbon, .06, .115, 0));
  // airbox intake
  car.add(box(.05, .1, .14, carbon, -.27, .7, 0));
  // driver + halo
  const helmet = new T.Mesh(new T.SphereGeometry(.1, 24, 16), white); helmet.position.set(-.04, .62, 0); car.add(helmet);
  const visor = new T.Mesh(new T.SphereGeometry(.102, 24, 8, -.9, 1.8, 1.2, .45), carbon); visor.position.copy(helmet.position); visor.rotation.y = Math.PI / 2; car.add(visor);
  const halo = new T.Mesh(new T.TorusGeometry(.2, .022, 10, 30, Math.PI), carbon); halo.rotation.x = -Math.PI / 2; halo.rotation.z = Math.PI / 2; halo.position.set(-.02, .66, 0); car.add(halo);
  const pillar = box(.24, .025, .03, carbon, .26, .62, 0); pillar.rotation.z = -.35; car.add(pillar);
  [-1, 1].forEach(s => { const m = box(.06, .04, .1, carbon, .2, .56, s * .3); car.add(m); });
  // front wing
  car.add(box(.56, .025, 1.5, carbon, 1.64, .12, 0));
  const fw = box(.42, .025, 1.46, paint, 1.6, .17, 0); fw.rotation.z = .12; car.add(fw);
  [-1, 1].forEach(s => car.add(box(.18, .16, .02, carbon, 1.72, .16, s * .76)));
  // rear wing
  const rw = box(.42, .05, .96, paint, -1.65, .8, 0); car.add(rw);
  const flap = box(.34, .035, .96, carbon, -1.62, .7, 0); flap.rotation.z = .25; car.add(flap);
  [-1, 1].forEach(s => car.add(box(.48, .52, .02, carbon, -1.66, .58, s * .49)));
  car.add(box(.05, .32, .04, carbon, -1.5, .48, 0));
  const beam = box(.3, .03, .7, carbon, -1.5, .3, 0); car.add(beam);
  const rain = box(.02, .05, .08, red, -1.88, .3, 0); rain.material = new T.MeshStandardMaterial({ color: 0xff2020, emissive: 0xff0000, emissiveIntensity: 1.2 }); car.add(rain);
  // wheels
  const wheels = [];
  [[-1.22, .27, .36], [1.18, .245, .3]].forEach(([x, r, w]) => [-1, 1].forEach(s => {
    const g = new T.Group(); g.position.set(x, r, s * .66);
    const tyre = new T.Mesh(new T.CylinderGeometry(r, r, w, 40), rubber); tyre.rotation.x = Math.PI / 2; tyre.castShadow = true; g.add(tyre);
    const stripeR = new T.Mesh(new T.TorusGeometry(r * .86, .008, 6, 40), red); stripeR.position.z = s * (w / 2 + .001); g.add(stripeR);
    const hub = new T.Mesh(new T.CylinderGeometry(r * .6, r * .6, w + .01, 24), rim); hub.rotation.x = Math.PI / 2; g.add(hub);
    for (let i = 0; i < 6; i++) { const sp = box(.025, r * 1.1, .01, carbon, 0, 0, s * (w / 2 + .006)); sp.rotation.z = i * Math.PI / 6; g.add(sp); }
    const cap = new T.Mesh(new T.CylinderGeometry(r * .14, r * .14, w + .03, 16), paint); cap.rotation.x = Math.PI / 2; g.add(cap);
    car.add(g); wheels.push(g);
    // suspension arms
    [[.08, .06], [-.06, -.04]].forEach(([dy]) => {
      const arm = box(.03, .015, .5, carbon, x + (x > 0 ? -.12 : .12), r + dy, s * .38); arm.rotation.y = s * (x > 0 ? .3 : -.3); car.add(arm);
    });
  }));
  car.userData = { paint, wheels };
  return car;
}

function groundTexture(){
  const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d');
  const r = g.createRadialGradient(256, 256, 10, 256, 256, 256);
  r.addColorStop(0, 'rgba(255,106,0,.35)'); r.addColorStop(.35, 'rgba(255,106,0,.08)'); r.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = r; g.fillRect(0, 0, 512, 512);
  g.strokeStyle = 'rgba(255,255,255,.08)'; g.lineWidth = 2;
  for (let i = 1; i < 6; i++) { g.beginPath(); g.arc(256, 256, i * 44, 0, Math.PI * 2); g.stroke(); }
  return new THREE.CanvasTexture(c);
}

window.PRLGarage = {
  async mount(el, colours){
    try { await loadThree(); } catch (_) { el.classList.add('no3d'); return; }
    if (!el.isConnected) return;
    const T = THREE, canvas = el.querySelector('canvas');
    const renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(2, devicePixelRatio)); renderer.shadowMap.enabled = true;
    renderer.outputEncoding = T.sRGBEncoding; renderer.toneMapping = T.ACESFilmicToneMapping;
    const scene = new T.Scene();
    const cam = new T.PerspectiveCamera(32, 1, .1, 100); cam.position.set(4.6, 2.1, 5.2); cam.lookAt(0, .35, 0);
    scene.add(new T.HemisphereLight(0xffffff, 0x221100, .7));
    const key = new T.DirectionalLight(0xffffff, 1.25); key.position.set(4, 7, 3); key.castShadow = true; key.shadow.mapSize.set(1024, 1024);
    Object.assign(key.shadow.camera, { left: -3, right: 3, top: 3, bottom: -3 }); scene.add(key);
    const rimL = new T.PointLight(0xff6a00, 3, 12); rimL.position.set(-3, 1.5, -3); scene.add(rimL);
    const rimR = new T.PointLight(0xffffff, 1.2, 12); rimR.position.set(3, 1, -4); scene.add(rimR);
    const ground = new T.Mesh(new T.CircleGeometry(3.4, 64), new T.MeshBasicMaterial({ map: groundTexture(), transparent: true, depthWrite: false }));
    ground.rotation.x = -Math.PI / 2; scene.add(ground);
    const shadow = new T.Mesh(new T.PlaneGeometry(8, 8), new T.ShadowMaterial({ opacity: .45 })); shadow.rotation.x = -Math.PI / 2; shadow.position.y = .001; shadow.receiveShadow = true; scene.add(shadow);
    const car = buildCar(colours[0]); scene.add(car);

    let rotY = -.6, vel = .004, drag = null, target = new T.Color(colours[0]).convertSRGBToLinear();
    const size = () => { const w = el.clientWidth, h = canvas.clientHeight || 380; renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); };
    size(); addEventListener('resize', size);
    canvas.addEventListener('pointerdown', e => { drag = { x: e.clientX, r: rotY }; canvas.setPointerCapture(e.pointerId); el.classList.add('grab'); });
    canvas.addEventListener('pointermove', e => { if (!drag) return; const nr = drag.r + (e.clientX - drag.x) * .01; vel = (nr - rotY) * .5; rotY = nr; });
    const up = () => { drag = null; el.classList.remove('grab'); };
    canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
    el.querySelectorAll('[data-livery]').forEach(b => b.addEventListener('click', () => {
      target = new T.Color(b.dataset.livery).convertSRGBToLinear();
      el.querySelectorAll('[data-livery]').forEach(x => x.classList.toggle('on', x === b));
      const n = el.querySelector('.garage-name'); if (n) n.textContent = b.title;
    }));
    (function loop(){
      if (!canvas.isConnected) { renderer.dispose(); removeEventListener('resize', size); return; }
      if (!drag) { vel += (.004 - vel) * .02; rotY += vel; }
      car.rotation.y = rotY;
      car.userData.wheels.forEach(w => w.rotation.z -= Math.abs(vel) * 6 + .01);
      car.userData.paint.color.lerp(target, .08);
      renderer.render(scene, cam);
      requestAnimationFrame(loop);
    })();
  }
};
})();
