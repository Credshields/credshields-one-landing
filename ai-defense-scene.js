// CredShields — dark hero (attack vs shield) → dive through the padlock keyhole → light security stack
export function initScene(canvas, opts = {}) {
  const THREE = window.THREE;
  const onBlock = opts.onBlock || (() => {});
  const LIME = 0xa8ff45, GREEN = 0x2e7d0e, DEEP = 0x1e3a24;
  const RED = 0xc0392f, AMBER = 0xdfa63c, ORANGE = 0xd07030;
  const SHIELD_R = 7;
  const DARK = new THREE.Color(0x081109), LIGHT = new THREE.Color(0xf3f6fa);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setClearColor(0x000000, 0);
  let soft = false;
  try {
    const gl = renderer.getContext();
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    const rname = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : '';
    soft = /swiftshader|llvmpipe|software/i.test(rname || '');
  } catch (e) { /* ignore */ }
  renderer.setPixelRatio(soft ? 0.5 : Math.min(window.devicePixelRatio, 1.5));
  const scene = new THREE.Scene();
  const bgc = DARK.clone();
  scene.fog = new THREE.FogExp2(0x081109, 0.016);
  const camera = new THREE.PerspectiveCamera(52, 1, 0.1, 300);
  scene.add(camera);
  const v = (x, y, z) => new THREE.Vector3(x, y, z);
  const clamp01 = (x) => Math.min(Math.max(x, 0), 1);
  const smooth = (a, b, x) => { const k = clamp01((x - a) / (b - a)); return k * k * (3 - 2 * k); };

  // glow texture
  const gc = document.createElement('canvas'); gc.width = gc.height = 64;
  const g2 = gc.getContext('2d');
  const grd = g2.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.35, 'rgba(255,255,255,.45)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g2.fillStyle = grd; g2.fillRect(0, 0, 64, 64);
  const glowTex = new THREE.CanvasTexture(gc);
  const sprite = (color, scale, opacity = 1) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending }));
    s.scale.setScalar(scale); return s;
  };
  const spriteN = (color, scale, opacity = 1) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, transparent: true, opacity, depthWrite: false }));
    s.scale.setScalar(scale); return s;
  };
  const segs = (pts, mat) => new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), mat);
  const strip = (pts, mat) => new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mat);
  const pointsOf = (pts, mat) => new THREE.Points(new THREE.BufferGeometry().setFromPoints(pts), mat);
  const dashed = (a, b, mat) => { const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints([a, b]), mat); l.computeLineDistances(); return l; };
  const lineCircle = (r, color, opacity, seg = 64) => {
    const pts = [];
    for (let i = 0; i <= seg; i++) { const a = i / seg * Math.PI * 2; pts.push(v(Math.cos(a) * r, Math.sin(a) * r, 0)); }
    return strip(pts, new THREE.LineBasicMaterial({ color, transparent: true, opacity }));
  };
  const flatRingPts = (r, seg = 36) => {
    const pts = [];
    for (let i = 0; i <= seg; i++) { const a = i / seg * Math.PI * 2; pts.push(v(Math.cos(a) * r, 0, Math.sin(a) * r)); }
    return pts;
  };
  const roundRectGeo = (w, d, r, th) => {
    const s = new THREE.Shape(); const hw = w / 2, hh = d / 2;
    s.moveTo(-hw + r, -hh); s.lineTo(hw - r, -hh); s.quadraticCurveTo(hw, -hh, hw, -hh + r);
    s.lineTo(hw, hh - r); s.quadraticCurveTo(hw, hh, hw - r, hh);
    s.lineTo(-hw + r, hh); s.quadraticCurveTo(-hw, hh, -hw, hh - r);
    s.lineTo(-hw, -hh + r); s.quadraticCurveTo(-hw, -hh, -hw + r, -hh);
    const geo = new THREE.ExtrudeGeometry(s, { depth: th, bevelEnabled: false });
    geo.rotateX(-Math.PI / 2); return geo;
  };
  const gridGeo = (size, div) => {
    const pts = [], h = size / 2, st = size / div;
    for (let i = 0; i <= div; i++) {
      const c = -h + i * st;
      pts.push(v(-h, 0, c), v(h, 0, c), v(c, 0, -h), v(c, 0, h));
    }
    return new THREE.BufferGeometry().setFromPoints(pts);
  };

  // whiteout flood (covers the theme swap while passing through the keyhole)
  const flood = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthTest: false, depthWrite: false }));
  flood.renderOrder = 999; flood.scale.set(12, 6, 1); flood.position.z = -1.5;
  camera.add(flood);

  // ============ DARK HERO WORLD ============
  const heroGroup = new THREE.Group(); scene.add(heroGroup);

  // fresnel rim
  const fresnelMat = new THREE.ShaderMaterial({
    uniforms: { c: { value: new THREE.Color(0x8fe23c) }, op: { value: 0.55 } },
    vertexShader: 'varying float vF; void main(){ vec3 n = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position,1.0); vF = pow(1.0 - abs(dot(n, normalize(-mv.xyz))), 2.6); gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'uniform vec3 c; uniform float op; varying float vF; void main(){ gl_FragColor = vec4(c, vF * op); }',
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });

  // core + holographic shield
  const coreGroup = new THREE.Group(); heroGroup.add(coreGroup);
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(1.7, 1), new THREE.MeshBasicMaterial({ color: LIME, wireframe: true, transparent: true, opacity: 0.9 }));
  const coreInner = new THREE.Group();
  let holeGlow;
  {
    const fillMat = new THREE.MeshBasicMaterial({ color: 0x9be84a, transparent: true, opacity: 0.16, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
    const edgeMat = new THREE.LineBasicMaterial({ color: 0xd8ffb0, transparent: true, opacity: 0.9 });
    const shape = new THREE.Shape();
    shape.moveTo(0, 0.7);
    shape.quadraticCurveTo(0.34, 0.58, 0.6, 0.61);
    shape.quadraticCurveTo(0.74, 0.625, 0.74, 0.5);
    shape.lineTo(0.74, 0.04);
    shape.quadraticCurveTo(0.74, -0.42, 0.08, -0.77);
    shape.quadraticCurveTo(0, -0.82, -0.08, -0.77);
    shape.quadraticCurveTo(-0.74, -0.42, -0.74, 0.04);
    shape.lineTo(-0.74, 0.5);
    shape.quadraticCurveTo(-0.74, 0.625, -0.6, 0.61);
    shape.quadraticCurveTo(-0.34, 0.58, 0, 0.7);
    const bodyGeo = new THREE.ExtrudeGeometry(shape, { depth: 0.24, bevelEnabled: false });
    bodyGeo.translate(0, 0, -0.12);
    const body = new THREE.Mesh(bodyGeo, fillMat);
    const bodyEdges = new THREE.LineSegments(new THREE.EdgesGeometry(bodyGeo, 12), edgeMat);
    const innerPts = shape.getPoints(24).map(p => new THREE.Vector3(p.x * 0.82, p.y * 0.82 - 0.01, 0.125));
    const innerLine = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(innerPts), new THREE.LineBasicMaterial({ color: 0xbdf76e, transparent: true, opacity: 0.55 }));
    const innerBack = innerLine.clone(); innerBack.position.z = -0.25;
    const hole = new THREE.Mesh(new THREE.CircleGeometry(0.15, 20), new THREE.MeshBasicMaterial({ color: 0xeaffd8, transparent: true, opacity: 0.95, depthWrite: false, blending: THREE.AdditiveBlending }));
    hole.position.set(0, 0.02, 0.13);
    const stem = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.3), hole.material);
    stem.position.set(0, -0.22, 0.13);
    holeGlow = sprite(0xc9ff7d, 1.1, 0.55);
    holeGlow.position.set(0, -0.05, 0.16);
    coreInner.add(body, bodyEdges, innerLine, innerBack, hole, stem, holeGlow);
    coreInner.scale.setScalar(0.95);
  }
  const coreGlow = sprite(0x5aaa1e, 8, 0.4);
  const coreRing = lineCircle(2.6, GREEN, 0.6); coreRing.rotation.x = 1.1;
  coreGroup.add(core, coreInner, coreGlow, coreRing);

  // shield membrane
  const shieldGroup = new THREE.Group(); heroGroup.add(shieldGroup);
  const membrane = new THREE.Mesh(new THREE.SphereGeometry(SHIELD_R, 48, 32), new THREE.MeshBasicMaterial({ color: 0x39682f, transparent: true, opacity: 0.1, depthWrite: false }));
  const rim = new THREE.Mesh(new THREE.SphereGeometry(SHIELD_R * 1.01, 48, 32), fresnelMat);
  const boundary = new THREE.Mesh(new THREE.SphereGeometry(SHIELD_R, 26, 18), new THREE.MeshBasicMaterial({ color: DEEP, wireframe: true, transparent: true, opacity: 0.1 }));
  const atmo = new THREE.Mesh(new THREE.SphereGeometry(SHIELD_R * 1.3, 32, 22), new THREE.MeshBasicMaterial({ color: GREEN, transparent: true, opacity: 0.04, depthWrite: false }));
  const hotspot = sprite(LIME, 4.5, 0);
  shieldGroup.add(membrane, rim, boundary, atmo, hotspot);

  // ripples + flashes
  const ripples = [];
  for (let i = 0; i < 8; i++) {
    const r = lineCircle(1, LIME, 0);
    r.visible = false; heroGroup.add(r);
    ripples.push({ mesh: r, t: 1 });
  }
  const flashes = [];
  for (let i = 0; i < 8; i++) {
    const s = sprite(0xfff8e8, 1, 0); s.visible = false; heroGroup.add(s);
    flashes.push({ s, t: 1 });
  }
  let brighten = 0;
  const hotDir = v(0, 1, 0);
  function impactAt(pos, strong) {
    for (const rp of ripples) {
      if (rp.t >= 1) {
        rp.t = 0; rp.mesh.visible = true;
        rp.mesh.position.copy(pos).multiplyScalar(1.01);
        rp.mesh.lookAt(0, 0, 0);
        rp.strong = strong;
        break;
      }
    }
    for (const f of flashes) {
      if (f.t >= 1) { f.t = 0; f.s.visible = true; f.s.position.copy(pos).multiplyScalar(1.03); f.strong = strong; break; }
    }
    brighten = Math.min(brighten + 0.45, 1);
    hotDir.copy(pos).normalize();
    onBlock();
  }

  // attack bots — neon 3D threat objects: chess knight, bomb, skull, virus
  const _Y = new THREE.Vector3(0, 1, 0);
  function rimMatFor(col) {
    return new THREE.ShaderMaterial({
      uniforms: { c: { value: new THREE.Color(col) }, op: { value: 0.9 } },
      vertexShader: 'varying float vF; void main(){ vec3 n = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position,1.0); vF = pow(1.0 - abs(dot(n, normalize(-mv.xyz))), 2.0); gl_Position = projectionMatrix * mv; }',
      fragmentShader: 'uniform vec3 c; uniform float op; varying float vF; void main(){ gl_FragColor = vec4(c, vF * op); }',
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
  }
  function circleLine3(r, x, y, z, lm) {
    const p = [];
    for (let i = 0; i <= 24; i++) { const a = i / 24 * Math.PI * 2; p.push(v(x + Math.cos(a) * r, y + Math.sin(a) * r, z)); }
    return new THREE.Line(new THREE.BufferGeometry().setFromPoints(p), lm);
  }
  function mkKnight(fm, lm, rm, gm) {
    const g = new THREE.Group();
    const s = new THREE.Shape();
    s.moveTo(0.12, -0.16);
    s.quadraticCurveTo(0.16, 0.0, 0.10, 0.16);
    s.quadraticCurveTo(0.07, 0.24, 0.045, 0.27);
    s.lineTo(0.02, 0.33);
    s.lineTo(-0.015, 0.26);
    s.quadraticCurveTo(-0.05, 0.24, -0.09, 0.18);
    s.quadraticCurveTo(-0.16, 0.10, -0.185, 0.045);
    s.quadraticCurveTo(-0.205, 0.015, -0.185, -0.005);
    s.lineTo(-0.12, -0.03);
    s.quadraticCurveTo(-0.10, -0.06, -0.085, -0.09);
    s.quadraticCurveTo(-0.075, -0.13, -0.09, -0.16);
    const head = new THREE.ExtrudeGeometry(s, { depth: 0.13, bevelEnabled: true, bevelThickness: 0.028, bevelSize: 0.026, bevelSegments: 3, curveSegments: 10 });
    head.translate(0, 0, -0.065);
    g.add(new THREE.Mesh(head, fm), new THREE.Mesh(head, rm), new THREE.LineSegments(new THREE.EdgesGeometry(head, 30), lm));
    const m = new THREE.Shape();
    m.moveTo(0.045, 0.28);
    m.quadraticCurveTo(0.115, 0.22, 0.145, 0.09);
    m.quadraticCurveTo(0.165, -0.03, 0.135, -0.16);
    m.lineTo(0.10, -0.16);
    m.quadraticCurveTo(0.13, -0.03, 0.11, 0.08);
    m.quadraticCurveTo(0.085, 0.19, 0.025, 0.25);
    const mane = new THREE.ExtrudeGeometry(m, { depth: 0.05, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.01, bevelSegments: 2, curveSegments: 8 });
    mane.translate(0, 0, -0.025);
    g.add(new THREE.Mesh(mane, fm), new THREE.Mesh(mane, rm), new THREE.LineSegments(new THREE.EdgesGeometry(mane, 30), lm));
    for (const fz of [0.096, -0.096]) {
      const eye = new THREE.Mesh(new THREE.TorusGeometry(0.017, 0.005, 6, 16), gm);
      eye.position.set(-0.055, 0.175, fz);
      const no = new THREE.Mesh(new THREE.TorusGeometry(0.009, 0.004, 6, 12), gm);
      no.position.set(-0.155, 0.03, fz * 0.8);
      const cheek = new THREE.Line(new THREE.BufferGeometry().setFromPoints([v(-0.02, 0.13, fz), v(-0.055, 0.05, fz), v(-0.045, -0.02, fz), v(-0.075, -0.07, fz)]), lm);
      const mouth = new THREE.Line(new THREE.BufferGeometry().setFromPoints([v(-0.18, -0.006, fz * 0.85), v(-0.125, -0.025, fz * 0.85)]), lm);
      g.add(eye, no, cheek, mouth);
    }
    const c0 = new THREE.CylinderGeometry(0.12, 0.15, 0.05, 20); c0.translate(0, -0.185, 0);
    const c1 = new THREE.CylinderGeometry(0.155, 0.175, 0.055, 20); c1.translate(0, -0.235, 0);
    const c2 = new THREE.CylinderGeometry(0.185, 0.2, 0.055, 20); c2.translate(0, -0.29, 0);
    const c3 = new THREE.CylinderGeometry(0.205, 0.21, 0.05, 20); c3.translate(0, -0.34, 0);
    for (const c of [c0, c1, c2, c3]) g.add(new THREE.Mesh(c, fm), new THREE.Mesh(c, rm), new THREE.LineSegments(new THREE.EdgesGeometry(c, 30), lm));
    return g;
  }
  function mkBomb(fm, lm, rm) {
    const g = new THREE.Group();
    const body = new THREE.SphereGeometry(0.2, 24, 18); body.translate(0, -0.06, 0);
    g.add(new THREE.Mesh(body, fm), new THREE.Mesh(body, rm));
    const neck = new THREE.CylinderGeometry(0.06, 0.07, 0.07, 14); neck.translate(0, 0.17, 0);
    g.add(new THREE.Mesh(neck, fm), new THREE.LineSegments(new THREE.EdgesGeometry(neck, 30), lm));
    const star = [];
    for (let i = 0; i <= 16; i++) { const a = i / 16 * Math.PI * 2; const r = i % 2 ? 0.038 : 0.09; star.push(v(0.13 + Math.cos(a) * r, 0.31 + Math.sin(a) * r, 0)); }
    g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(star), lm));
    const fuse = new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(v(0, 0.2, 0), v(0.01, 0.3, 0), v(0.11, 0.29, 0)), 8, 0.016, 6);
    g.add(new THREE.Mesh(fuse, fm));
    return g;
  }
  function mkSkull(fm, lm, rm, gm, km) {
    const g = new THREE.Group();
    const cr = new THREE.SphereGeometry(0.21, 24, 18); cr.scale(1, 1.05, 0.92); cr.translate(0, 0.05, 0);
    g.add(new THREE.Mesh(cr, fm), new THREE.Mesh(cr, rm));
    const jaw = new THREE.SphereGeometry(0.125, 16, 12); jaw.scale(1.0, 0.78, 0.72); jaw.translate(0, -0.14, 0.05);
    g.add(new THREE.Mesh(jaw, fm), new THREE.Mesh(jaw, rm));
    for (const sx of [-0.082, 0.082]) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.054, 0.0065, 8, 28), gm);
      ring.position.set(sx, 0.05, 0.162);
      ring.rotation.y = sx > 0 ? 0.3 : -0.3;
      ring.rotation.x = -0.1;
      const cav = new THREE.Mesh(new THREE.CircleGeometry(0.052, 24), km);
      cav.position.set(sx, 0.05, 0.156);
      cav.rotation.copy(ring.rotation);
      g.add(ring, cav);
    }
    const noseCav = new THREE.Mesh(new THREE.CircleGeometry(0.03, 3), km);
    noseCav.position.set(0, -0.04, 0.183);
    noseCav.rotation.z = Math.PI / 2;
    const np = [v(0, 0.036, 0), v(-0.032, -0.028, 0), v(0.032, -0.028, 0)];
    const noseLine = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(np), lm);
    noseLine.position.set(0, -0.04, 0.187);
    g.add(noseCav, noseLine);
    const toothG = new THREE.SphereGeometry(0.021, 10, 8); toothG.scale(0.85, 1.2, 0.7);
    for (const tx of [-0.072, -0.036, 0, 0.036, 0.072]) {
      const t1 = new THREE.Mesh(toothG, fm), t2 = new THREE.Mesh(toothG, rm);
      const tz = 0.125 - tx * tx * 2.2, ty = -0.212 + tx * tx * 1.4;
      t1.position.set(tx, ty, tz); t2.position.set(tx, ty, tz);
      g.add(t1, t2);
    }
    return g;
  }
  function mkVirus(fm, lm, rm) {
    const g = new THREE.Group();
    const core = new THREE.SphereGeometry(0.16, 22, 16);
    g.add(new THREE.Mesh(core, fm), new THREE.Mesh(core, rm));
    const _Z = v(0, 0, 1);
    for (const cd of [v(0.5, 0.5, 0.75), v(-0.65, 0.15, 0.75), v(0.15, -0.6, 0.79)]) {
      const d = cd.normalize();
      const c = circleLine3(0.05, 0, 0, 0, lm);
      c.position.copy(d).multiplyScalar(0.153);
      c.quaternion.setFromUnitVectors(_Z, d);
      g.add(c);
    }
    const dirs = [], seen = new Set(), pa = new THREE.IcosahedronGeometry(1, 0).attributes.position;
    for (let i = 0; i < pa.count; i++) {
      const d = v(pa.getX(i), pa.getY(i), pa.getZ(i)).normalize();
      const key = d.toArray().map(x => x.toFixed(2)).join(',');
      if (!seen.has(key)) { seen.add(key); dirs.push(d); }
    }
    const stemG = new THREE.CylinderGeometry(0.022, 0.032, 0.1, 8); stemG.translate(0, 0.2, 0);
    const knobG = new THREE.SphereGeometry(0.048, 10, 8); knobG.translate(0, 0.265, 0);
    const q = new THREE.Quaternion();
    for (const d of dirs) {
      q.setFromUnitVectors(_Y, d);
      const stem = new THREE.Mesh(stemG, fm); stem.quaternion.copy(q);
      const knob = new THREE.Mesh(knobG, fm); knob.quaternion.copy(q);
      const kr = new THREE.Mesh(knobG, rm); kr.quaternion.copy(q);
      g.add(stem, knob, kr);
    }
    return g;
  }
  const botMakers = [mkKnight, mkBomb, mkSkull, mkVirus];
  const botCols = [0x57a8ff, 0xff8a2a, 0xff3d8a, 0x8b5cf6];
  const sparkOffsets = [v(0, 0, 0), v(0.16, 0.42, 0), v(0, 0, 0), v(0, 0, 0)];
  const NB = soft ? 6 : 11, TRAIL = 26;
  const bots = [];
  const groupTargets = [];
  for (let g = 0; g < 6; g++) groupTargets.push(new THREE.Vector3().randomDirection());
  const rnd = (a, b) => a + Math.random() * (b - a);
  function makeBot(i) {
    const gp = new THREE.Group();
    const ci = i % botMakers.length;
    const fillMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(botCols[ci]).multiplyScalar(0.2), transparent: true, opacity: 0.96, depthWrite: true });
    const lineMat = new THREE.LineBasicMaterial({ color: botCols[ci], transparent: true, opacity: 0.95 });
    const rimMat = rimMatFor(botCols[ci]);
    const glowMat = new THREE.MeshBasicMaterial({ color: botCols[ci], transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
    const darkMat = new THREE.MeshBasicMaterial({ color: 0x050d06, transparent: true, opacity: 1, depthWrite: false });
    const body = botMakers[ci](fillMat, lineMat, rimMat, glowMat, darkMat);
    body.traverse(o => {
      if (!o.material) return;
      if (o.material === darkMat) o.renderOrder = 1;
      else if (o.material === rimMat) o.renderOrder = 2;
      else if (o.material === lineMat || o.material === glowMat) o.renderOrder = 3;
    });
    body.scale.setScalar(2.0);
    const eye = sprite(botCols[ci], rnd(0.9, 1.3), 0.4);
    const hot = sprite(0xffe8d0, rnd(0.35, 0.5), 0.9);
    hot.position.copy(sparkOffsets[ci]).multiplyScalar(2.0 / 1.35);
    gp.add(body, eye, hot);
    heroGroup.add(gp);
    const tgeo = new THREE.BufferGeometry();
    const tpos = new Float32Array(TRAIL * 3);
    tgeo.setAttribute('position', new THREE.BufferAttribute(tpos, 3));
    const cols = new Float32Array(TRAIL * 3);
    const c = new THREE.Color(botCols[ci]);
    for (let j = 0; j < TRAIL; j++) {
      const f = (1 - j / (TRAIL - 1)) ** 1.5;
      cols[j * 3] = c.r * f; cols[j * 3 + 1] = c.g * f; cols[j * 3 + 2] = c.b * f;
    }
    tgeo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    const trail = new THREE.Line(tgeo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
    heroGroup.add(trail);
    const b = { gp, fillMat, lineMat, rimMat, glowMat, darkMat, eye, hot, trail, trailPos: tpos, trailReset: true, group: (Math.random() * 6) | 0 };
    resetBot(b, true);
    return b;
  }
  function resetBot(b, initial) {
    b.state = 'approach';
    b.mode = ['direct', 'spiral', 'orbit', 'flank', 'swarm', 'pulse'][(Math.random() * 6) | 0];
    b.dir = (b.mode === 'swarm' || b.mode === 'pulse')
      ? groupTargets[b.group].clone().add(new THREE.Vector3().randomDirection().multiplyScalar(0.12)).normalize()
      : new THREE.Vector3().randomDirection();
    b.axis = new THREE.Vector3().randomDirection();
    b.spawnR = rnd(26, 52);
    b.theta = b.mode === 'spiral' ? rnd(2, 4) : b.mode === 'orbit' ? rnd(3, 6) : b.mode === 'flank' ? rnd(1, 2.5) : rnd(0, 0.3);
    b.dur = b.mode === 'pulse' ? rnd(5, 6) : rnd(7, 15);
    b.k = initial ? Math.random() : b.mode === 'pulse' ? -((b.group * 0.8 + rnd(0, 0.4)) / b.dur) : rnd(-0.6, 0);
    b.tumble = rnd(0.5, 2.2);
    b.deflectT = 0;
    b.trailReset = true;
  }
  const _q = new THREE.Quaternion();
  function botPos(b, k, out) {
    let r;
    if (b.mode === 'orbit') r = k < 0.62 ? b.spawnR * 0.42 : b.spawnR * 0.42 - (b.spawnR * 0.42 - SHIELD_R) * ((k - 0.62) / 0.38) ** 1.6;
    else r = b.spawnR - (b.spawnR - SHIELD_R) * (k * k * (3 - 2 * k));
    _q.setFromAxisAngle(b.axis, b.theta * k);
    return out.copy(b.dir).applyQuaternion(_q).multiplyScalar(Math.max(r, SHIELD_R));
  }
  for (let i = 0; i < NB; i++) bots.push(makeBot(i));

  // background particles + far rings (dark world)
  {
    const n = soft ? 150 : 500, pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const p = new THREE.Vector3().randomDirection().multiplyScalar(rnd(30, 90));
      pos[i * 3] = p.x; pos[i * 3 + 1] = p.y; pos[i * 3 + 2] = p.z;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    heroGroup.add(new THREE.Points(geo, new THREE.PointsMaterial({ color: 0x4a6650, size: 0.18, transparent: true, opacity: 0.5, depthWrite: false })));
    const far1 = lineCircle(46, DEEP, 0.3, 96); far1.rotation.x = 1.3; heroGroup.add(far1);
    const far2 = lineCircle(64, DEEP, 0.2, 96); far2.rotation.x = 1.1; heroGroup.add(far2);
  }

  // ============ LIGHT SECURITY STACK (inside the padlock) ============
  const stack = new THREE.Group(); scene.add(stack);
  const SP = 14, TOPY = -60;
  const layers = [];
  function addLayer(i, color, build) {
    const g = new THREE.Group();
    const baseY = TOPY - i * SP;
    g.position.y = baseY;
    const mats = [];
    const reg = (m, base) => { m.transparent = true; m.opacity = 0; m.depthWrite = false; mats.push({ m, base }); return m; };
    const plate = new THREE.PlaneGeometry(13, 13); plate.rotateX(-Math.PI / 2);
    const white = new THREE.Mesh(plate, reg(new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide }), 0.9));
    white.position.y = -0.03; g.add(white);
    g.add(new THREE.Mesh(plate, reg(new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }), 0.05)));
    g.add(new THREE.LineSegments(gridGeo(13, 10), reg(new THREE.LineBasicMaterial({ color }), 0.18)));
    g.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints([v(-6.5, 0, -6.5), v(6.5, 0, -6.5), v(6.5, 0, 6.5), v(-6.5, 0, 6.5)]), reg(new THREE.LineBasicMaterial({ color }), 0.6)));
    const under = spriteN(color, 13, 0); reg(under.material, 0.16); under.position.y = -1; g.add(under);
    build(g, reg);
    stack.add(g);
    layers.push({ g, mats, baseY, i });
  }
  const bobbers = [];
  const bob = (obj, amp, ph) => { bobbers.push({ obj, amp, ph, by: obj.position.y }); };
  const mkTile = (w, d, th, r, color, reg, edgeOp = 0.85) => {
    const grp = new THREE.Group();
    const geo = roundRectGeo(w, d, r, th);
    grp.add(new THREE.Mesh(geo, reg(new THREE.MeshBasicMaterial({ color: 0xffffff }), 0.95)));
    grp.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo, 30), reg(new THREE.LineBasicMaterial({ color }), edgeOp)));
    return grp;
  };

  // L0 — THREAT SURFACE (red): solid faux-shaded attack cubes, dashed strike lines, bold X impact marks
  addLayer(0, 0xe14b3f, (g, reg) => {
    const C = 0xe14b3f;
    const dashMat = reg(new THREE.LineDashedMaterial({ color: C, dashSize: 0.2, gapSize: 0.16 }), 0.55);
    const edgeMat = reg(new THREE.LineBasicMaterial({ color: 0xb02c22 }), 0.85);
    const solid = (color, base = 1) => { const m = reg(new THREE.MeshBasicMaterial({ color }), base); m.depthWrite = true; return m; };
    const faceMats = [solid(0xe8584c), solid(0xc7352a), solid(0xf28a7f), solid(0xc7352a), solid(0xdd4437), solid(0xc7352a)]; // +x,-x,+y,-y,+z,-z
    const dotMat = reg(new THREE.PointsMaterial({ color: 0x8f1f16, size: 0.08 }), 0.95);
    const xMat = solid(C, 0.92); xMat.side = THREE.DoubleSide;
    const cgeo = new THREE.BoxGeometry(0.85, 0.85, 0.85);
    const cedge = new THREE.EdgesGeometry(cgeo);
    const xbar = new THREE.PlaneGeometry(0.52, 0.1); xbar.rotateX(-Math.PI / 2);
    const spots = [[-4.4, 4.6, -3.4], [-1.7, 3.5, -4.5], [1.5, 4.8, -3.9], [4.1, 3.7, -2.5], [-4.0, 3.1, 0.7], [4.4, 4.3, 1.3], [-1.3, 5.0, 2.3], [2.5, 3.3, 3.7], [0.3, 3.9, -0.5]];
    for (const [x, y, z] of spots) {
      const sc = rnd(0.7, 1.15);
      const cg = new THREE.Group();
      cg.position.set(x, y, z); cg.scale.setScalar(sc); cg.rotation.y = rnd(0, 0.5);
      cg.add(new THREE.Mesh(cgeo, faceMats));
      cg.add(new THREE.LineSegments(cedge, edgeMat));
      const dts = [];
      for (let k = 0; k < 3; k++) dts.push(v(rnd(-0.28, 0.28), 0.44, rnd(-0.28, 0.28)));
      cg.add(pointsOf(dts, dotMat));
      g.add(cg); bob(cg, rnd(0.08, 0.18), rnd(0, 6));
      const ex = x * 0.34, ez = z * 0.34;
      g.add(dashed(v(x, y - 0.55 * sc, z), v(ex, 0.08, ez), dashMat));
      const x1 = new THREE.Mesh(xbar, xMat); x1.position.set(ex, 0.06, ez); x1.rotation.y = 0.785; g.add(x1);
      const x2 = new THREE.Mesh(xbar, xMat); x2.position.set(ex, 0.06, ez); x2.rotation.y = -0.785; g.add(x2);
    }
  });

  // L1 — SHIELD BOUNDARY (blue): wireframe dome + shield-check emblem on pedestal
  addLayer(1, 0x3f6be0, (g, reg) => {
    const C = 0x3f6be0;
    g.add(new THREE.Mesh(new THREE.SphereGeometry(4.8, 18, 9, 0, Math.PI * 2, 0, Math.PI / 2), reg(new THREE.MeshBasicMaterial({ color: C, wireframe: true }), 0.2)));
    const dpts = [];
    for (let la = 1; la <= 3; la++) for (let lo = 0; lo < 14; lo++) {
      const ph = la / 4 * Math.PI / 2, th2 = lo / 14 * Math.PI * 2;
      dpts.push(v(Math.sin(ph) * Math.cos(th2) * 4.8, Math.cos(ph) * 4.8, Math.sin(ph) * Math.sin(th2) * 4.8));
    }
    g.add(pointsOf(dpts, reg(new THREE.PointsMaterial({ color: C, size: 0.12 }), 0.75)));
    const ped = mkTile(3.1, 3.1, 0.3, 0.4, C, reg); g.add(ped);
    const ped2 = mkTile(2.2, 2.2, 0.26, 0.3, C, reg); ped2.position.y = 0.3; g.add(ped2);
    const shp = new THREE.Shape();
    shp.moveTo(-0.62, 0.5); shp.lineTo(0.62, 0.5); shp.lineTo(0.62, 0.02);
    shp.quadraticCurveTo(0.62, -0.5, 0, -0.8);
    shp.quadraticCurveTo(-0.62, -0.5, -0.62, 0.02);
    shp.closePath();
    // beveled 3D shield body (solid blue) + inner white outline + bold check
    const sgeo = new THREE.ExtrudeGeometry(shp, { depth: 0.22, bevelEnabled: true, bevelThickness: 0.14, bevelSize: 0.1, bevelSegments: 3, curveSegments: 16 });
    sgeo.translate(0, 0, -0.11);
    const emblem = new THREE.Group();
    const shieldFill = reg(new THREE.MeshBasicMaterial({ color: C }), 0.97); shieldFill.depthWrite = true;
    emblem.add(new THREE.Mesh(sgeo, shieldFill));
    emblem.add(new THREE.LineSegments(new THREE.EdgesGeometry(sgeo, 28), reg(new THREE.LineBasicMaterial({ color: 0x2748a8 }), 0.55)));
    const inPts = shp.getPoints(24).map(p => v(p.x * 0.74, p.y * 0.74 - 0.02, 0));
    inPts.push(inPts[0].clone());
    const inLine = strip(inPts, reg(new THREE.LineBasicMaterial({ color: 0xffffff }), 0.95));
    inLine.position.z = 0.255; emblem.add(inLine);
    const ckMat = reg(new THREE.MeshBasicMaterial({ color: 0xffffff }), 0.99); ckMat.depthWrite = true;
    const ck1 = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.12, 0.08), ckMat);
    ck1.position.set(-0.18, -0.17, 0.26); ck1.rotation.z = -0.74; emblem.add(ck1);
    const ck2 = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.12, 0.08), ckMat);
    ck2.position.set(0.14, -0.05, 0.26); ck2.rotation.z = 0.855; emblem.add(ck2);
    emblem.scale.setScalar(1.7); emblem.position.y = 2.15; emblem.rotation.y = 0.785;
    g.add(emblem); bob(emblem, 0.1, 1.2);
    const gl = spriteN(C, 4.5, 0); reg(gl.material, 0.3); gl.position.y = 2.1; g.add(gl);
  });

  // L2 — DETECTION & ANALYSIS (purple): double-stacked solid sensor tiles, sculpted icons, dot funnels
  addLayer(2, 0x7a4fd8, (g, reg) => {
    const C = 0x7a4fd8, INK = 0x5b36b0;
    const solid = (color, base = 1) => { const m = reg(new THREE.MeshBasicMaterial({ color }), base); m.depthWrite = true; return m; };
    const inkMat = solid(INK);
    const whiteMat = solid(0xffffff, 0.97);
    const tileEdge = reg(new THREE.LineBasicMaterial({ color: C }), 0.85);
    const linkMat = reg(new THREE.LineBasicMaterial({ color: INK }), 0.95);
    const dotMat = reg(new THREE.PointsMaterial({ color: C, size: 0.11 }), 0.85);
    const coneMat = reg(new THREE.MeshBasicMaterial({ color: C, side: THREE.DoubleSide }), 0.09);
    const coneGeo = new THREE.ConeGeometry(0.68, 2.3, 14, 1, true);
    const topGeo = roundRectGeo(1.7, 1.7, 0.3, 0.16);
    const botGeo = roundRectGeo(2.05, 2.05, 0.34, 0.1);
    const topEdges = new THREE.EdgesGeometry(topGeo, 30), botEdges = new THREE.EdgesGeometry(botGeo, 30);
    const dpts = [];
    [-3.4, 0, 3.4].forEach((x, xi) => {
      const tl = new THREE.Group(); tl.position.set(x, 2.7, 0); g.add(tl); bob(tl, 0.05, xi);
      const under = new THREE.Mesh(botGeo, whiteMat); under.position.y = -0.24; tl.add(under);
      const ue = new THREE.LineSegments(botEdges, tileEdge); ue.position.y = -0.24; tl.add(ue);
      tl.add(new THREE.Mesh(topGeo, whiteMat));
      tl.add(new THREE.LineSegments(topEdges, tileEdge));
      const iy = 0.22;
      if (xi === 0) { // fingerprint: concentric solid rings + center dot
        for (const r of [0.14, 0.26, 0.38]) {
          const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.022, 6, 28), inkMat);
          ring.rotation.x = -Math.PI / 2; ring.position.y = iy; tl.add(ring);
        }
        const cdot = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), inkMat); cdot.position.y = iy; tl.add(cdot);
      } else if (xi === 1) { // sliders: solid rails + knobs
        [-0.26, 0, 0.26].forEach((dx, di) => {
          const rail = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.03, 0.7), inkMat);
          rail.position.set(dx, iy, 0); tl.add(rail);
          const knob = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.07, 0.13), inkMat);
          knob.position.set(dx, iy + 0.02, -0.2 + di * 0.2); tl.add(knob);
        });
      } else { // graph: solid node spheres + links
        const nd = [v(-0.3, iy, -0.22), v(0.32, iy, -0.26), v(0.06, iy, 0.32), v(-0.12, iy, 0.02)];
        tl.add(segs([nd[0], nd[3], nd[1], nd[3], nd[2], nd[3], nd[0], nd[1]], linkMat));
        for (const p of nd) { const s = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), inkMat); s.position.copy(p); tl.add(s); }
      }
      const cone = new THREE.Mesh(coneGeo, coneMat);
      cone.position.set(x, 1.4, 0); cone.rotation.x = Math.PI; g.add(cone);
      for (let j = 0; j < 7; j++) {
        const yj = 2.4 - j * 0.34, rj = 0.6 * (1 - j / 6.5) + 0.06;
        for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2 + j * 0.4; dpts.push(v(x + Math.cos(a) * rj, yj, Math.sin(a) * rj)); }
      }
      for (let k = 0; k < 10; k++) dpts.push(v(x, -0.4 - k * 0.55, 0));
    });
    g.add(pointsOf(dpts, dotMat));
  });

  // L3 — PROTECTED ASSETS (teal): 3x3 vault cube on rings
  addLayer(3, 0x17b3c4, (g, reg) => {
    const C = 0x17b3c4;
    const cube = new THREE.Group(); cube.position.y = 2.1; g.add(cube);
    g.userData.spin = cube;
    // 3x3 rubik-style vault: 26 solid cubelets, faux-shaded faces, white seams
    const cell = 0.74, pitch = 0.8;
    const cgeo = new THREE.BoxGeometry(cell, cell, cell);
    const cedge = new THREE.EdgesGeometry(cgeo);
    const mTop = reg(new THREE.MeshBasicMaterial({ color: 0x63dee8 }), 1); mTop.depthWrite = true;
    const mR = reg(new THREE.MeshBasicMaterial({ color: 0x2cc5d4 }), 1); mR.depthWrite = true;
    const mF = reg(new THREE.MeshBasicMaterial({ color: 0x23b9c9 }), 1); mF.depthWrite = true;
    const mDk = reg(new THREE.MeshBasicMaterial({ color: 0x17a2b4 }), 1); mDk.depthWrite = true;
    const faceMats = [mR, mDk, mTop, mDk, mF, mDk]; // +x,-x,+y,-y,+z,-z
    const seamMat = reg(new THREE.LineBasicMaterial({ color: 0xffffff }), 0.85);
    for (let ix = -1; ix <= 1; ix++) for (let iy = -1; iy <= 1; iy++) for (let iz = -1; iz <= 1; iz++) {
      if (ix === 0 && iy === 0 && iz === 0) continue;
      const cm = new THREE.Mesh(cgeo, faceMats);
      cm.position.set(ix * pitch, iy * pitch, iz * pitch);
      cube.add(cm);
      const ce = new THREE.LineSegments(cedge, seamMat);
      ce.position.copy(cm.position);
      cube.add(ce);
    }
    const ringMat = reg(new THREE.LineBasicMaterial({ color: C }), 0.7);
    const r1 = strip(flatRingPts(3.3, 64), ringMat); r1.position.y = 0.08; g.add(r1);
    const dashRingMat = reg(new THREE.LineDashedMaterial({ color: C, dashSize: 0.3, gapSize: 0.22 }), 0.55);
    const r2 = strip(flatRingPts(4.2, 72), dashRingMat); r2.computeLineDistances(); r2.position.y = 0.08; g.add(r2);
    const gl = spriteN(C, 6, 0); reg(gl.material, 0.28); gl.position.y = 2.1; g.add(gl);
    const dotMat = reg(new THREE.PointsMaterial({ color: C, size: 0.11 }), 0.8);
    const dpts = [];
    for (const dx of [-0.55, 0.55]) for (let k = 0; k < 9; k++) dpts.push(v(dx, 7.6 - k * 0.48, 0));
    for (let k = 0; k < 10; k++) dpts.push(v(0, -0.4 - k * 0.55, 0));
    g.add(pointsOf(dpts, dotMat));
  });

  // L4 — RESPONSE & REPORTING (green): solid shaded hex tiles with upright sculpted icons (report, monitor, bell)
  addLayer(4, 0x43bb58, (g, reg) => {
    const C = 0x43bb58, INK = 0x2a8f42;
    const solid = (color, base = 1) => { const m = reg(new THREE.MeshBasicMaterial({ color }), base); m.depthWrite = true; return m; };
    const hexGeo = new THREE.CylinderGeometry(1.15, 1.15, 0.24, 6);
    const hexEdges = new THREE.EdgesGeometry(hexGeo, 30);
    const hexMats = [solid(0xd9f4e0, 0.97), solid(0xffffff, 0.97), solid(0xc4ecd0, 0.97)]; // side, top, bottom
    const edgeMat = reg(new THREE.LineBasicMaterial({ color: C }), 0.85);
    const inkMat = solid(INK);
    const whiteMat = solid(0xffffff, 0.99);
    const trendMat = reg(new THREE.LineBasicMaterial({ color: INK }), 0.95);
    const dotMat = reg(new THREE.PointsMaterial({ color: C, size: 0.1 }), 0.85);
    [-3.5, 0, 3.5].forEach((x, xi) => {
      const hx = new THREE.Group(); hx.position.set(x, 0.35, 0); hx.rotation.y = Math.PI / 6; g.add(hx);
      hx.add(new THREE.Mesh(hexGeo, hexMats));
      hx.add(new THREE.LineSegments(hexEdges, edgeMat));
      const ic = new THREE.Group(); ic.position.y = 0.64; ic.rotation.y = -Math.PI / 6 + 0.785; hx.add(ic); bob(ic, 0.05, xi * 1.3);
      if (xi === 0) { // report: green doc panel + white text bars
        ic.add(new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.74, 0.07), inkMat));
        const bars = [[0.34, 0.2], [0.34, 0.04], [0.2, -0.12]];
        for (const [bw, by] of bars) { const b = new THREE.Mesh(new THREE.BoxGeometry(bw, 0.05, 0.02), whiteMat); b.position.set(-(0.34 - bw) / 2, by, 0.045); ic.add(b); }
      } else if (xi === 1) { // monitor: screen + white glass + trend line + stand
        const scr = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.56, 0.07), inkMat); scr.position.y = 0.12; ic.add(scr);
        const glass = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.44, 0.02), whiteMat); glass.position.set(0, 0.12, 0.04); ic.add(glass);
        ic.add(strip([v(-0.3, 0.02, 0.056), v(-0.12, 0.22, 0.056), v(0.04, 0.1, 0.056), v(0.3, 0.3, 0.056)], trendMat));
        const stem = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.14, 0.06), inkMat); stem.position.y = -0.22; ic.add(stem);
        const foot = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.05, 0.1), inkMat); foot.position.y = -0.31; ic.add(foot);
      } else { // alert bell: dome + lip + nub + clapper
        const dome = new THREE.Mesh(new THREE.SphereGeometry(0.3, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), inkMat); dome.position.y = 0.02; ic.add(dome);
        const lip = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.05, 14), inkMat); ic.add(lip);
        const clap = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), inkMat); clap.position.y = -0.08; ic.add(clap);
        const nub = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), inkMat); nub.position.y = 0.34; ic.add(nub);
      }
    });
    const dpts = [];
    for (const sgn of [-1, 1]) for (let k = 0; k < 6; k++) dpts.push(v(sgn * (1.4 + k * 0.16), 0.48, 0));
    for (let k = 0; k < 12; k++) dpts.push(v(0, 7.4 - k * 0.55, 0));
    g.add(pointsOf(dpts, dotMat));
  });

  // ============ SCROLL / RENDER LOOP ============
  let mx = 0, my = 0, smx = 0, smy = 0, motion = 1;
  let sDiv = 0, sF = -1.2, cDiv = 0, cF = -1.2;
  let t = 0, raf = 0, last = performance.now(), adaptT = 0;
  const _v = new THREE.Vector3(), _v2 = new THREE.Vector3(), _l = new THREE.Vector3(), _l2 = new THREE.Vector3();

  function resize() {
    const w = canvas.clientWidth || window.innerWidth, h = canvas.clientHeight || window.innerHeight;
    if (canvas.width !== Math.floor(w * renderer.getPixelRatio()) || canvas.height !== Math.floor(h * renderer.getPixelRatio())) {
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      const off = w > 760 ? w * 0.16 : 0; // scene sits right of the copy
      camera.setViewOffset(w, h, -off, 0, w, h);
      camera.updateProjectionMatrix();
    }
  }
  window.addEventListener('resize', resize);
  resize();

  let slowFrames = 0, frameSkip = 0, skipCounter = 0;
  function loop(now) {
    raf = requestAnimationFrame(loop);
    const rawDt = (now - last) / 1000; last = now;
    if (rawDt > 0.12) { slowFrames++; } else if (slowFrames > 0) { slowFrames--; }
    if (slowFrames > 8) {
      slowFrames = 0;
      if (renderer.getPixelRatio() > 0.5) { renderer.setPixelRatio(renderer.getPixelRatio() - 0.25); resize(); }
      else if (frameSkip < 3) frameSkip++;
    }
    if (frameSkip > 0 && (skipCounter = (skipCounter + 1) % (frameSkip + 1)) !== 0) return;
    const dt = Math.min(rawDt, 0.05);
    t += dt * motion;
    cDiv += (sDiv - cDiv) * Math.min(1, dt * 5);
    cF += (sF - cF) * Math.min(1, dt * 6);
    smx += (mx - smx) * Math.min(1, dt * 2.5);
    smy += (my - smy) * Math.min(1, dt * 2.5);

    const divP = cDiv;
    const s = smooth(0, 0.6, divP);                 // dive-to-keyhole ease
    const inside = smooth(0.3, 0.4, divP);          // passing the shield membrane
    const theme = smooth(0.53, 0.6, divP);          // dark -> light flip (under whiteout)
    const bell = Math.sin(Math.PI * clamp01((divP - 0.45) / 0.25)); // keyhole whiteout
    flood.material.opacity = bell;
    bgc.copy(DARK).lerp(LIGHT, theme);
    scene.fog.color.copy(DARK).lerp(LIGHT, theme);
    scene.fog.density = (0.016 + inside * 0.014) * (1 - theme) + 0.003 * theme;

    heroGroup.visible = theme < 0.98;
    stack.visible = theme > 0.02;

    if (heroGroup.visible) {
      adaptT += dt * motion;
      if (adaptT > 7) { adaptT = 0; groupTargets[(Math.random() * 6) | 0].randomDirection(); }
      const breathe = 1 + 0.018 * Math.sin(t * 0.55);
      shieldGroup.scale.setScalar(breathe);
      brighten = Math.max(0, brighten - dt * 0.9);
      const shieldFade = 1 - inside;
      membrane.material.opacity = (0.1 + brighten * 0.08) * shieldFade;
      fresnelMat.uniforms.op.value = (0.55 + brighten * 0.35) * shieldFade;
      boundary.material.opacity = 0.1 * shieldFade;
      atmo.material.opacity = 0.04 * shieldFade;
      hotspot.position.copy(hotDir).multiplyScalar(SHIELD_R * breathe);
      hotspot.material.opacity += ((brighten * 0.5 * shieldFade) - hotspot.material.opacity) * Math.min(1, dt * 4);

      const passFade = 1 - smooth(0.42, 0.55, divP); // clear the wireframes as the camera slips inside
      core.rotation.y = t * 0.1; core.rotation.x = Math.sin(t * 0.07) * 0.25;
      core.material.opacity = 0.9 * passFade;
      coreInner.rotation.y = Math.sin(t * 0.35) * 0.55 * (1 - s); // shield settles to face the camera
      coreInner.position.y = Math.sin(t * 0.6) * 0.06 * (1 - s);
      coreRing.rotation.z = t * 0.08;
      coreRing.material.opacity = 0.6 * passFade;
      coreGlow.material.opacity = (0.35 + 0.1 * Math.sin(t * 0.8)) * passFade;
      holeGlow.scale.setScalar(1.1 + s * 2.6);
      holeGlow.material.opacity = 0.55 + 0.45 * s;

      for (const rp of ripples) {
        if (rp.t < 1) {
          rp.t = Math.min(rp.t + dt * motion * 0.9, 1);
          const e = rp.t;
          rp.mesh.scale.setScalar(0.3 + e * (rp.strong ? 3.2 : 2.2));
          rp.mesh.material.opacity = (1 - e) * 0.85 * shieldFade;
          if (rp.t >= 1) rp.mesh.visible = false;
        }
      }
      for (const f of flashes) {
        if (f.t < 1) {
          f.t = Math.min(f.t + dt * motion * 2.2, 1);
          const e = f.t;
          f.s.scale.setScalar(0.8 + e * (f.strong ? 6 : 4));
          f.s.material.opacity = (1 - e) ** 1.6 * 0.9 * shieldFade;
          if (f.t >= 1) f.s.visible = false;
        }
      }

      const botFade = 1 - smooth(0.28, 0.42, divP);
      for (const b of bots) {
        if (b.state === 'approach') {
          b.k += dt * motion / b.dur;
          if (b.k >= 1) {
            botPos(b, 1, _v);
            impactAt(_v, b.mode === 'swarm' || b.mode === 'pulse');
            b.state = 'deflect';
            b.deflectT = 0;
            b.vel = _v2.copy(_v).normalize().multiplyScalar(rnd(4, 7)).clone();
            b.vel.add(new THREE.Vector3().randomDirection().multiplyScalar(2));
            b.gp.position.copy(_v);
          } else if (b.k >= 0) {
            botPos(b, b.k, b.gp.position);
          }
        } else {
          b.deflectT += dt * motion;
          b.gp.position.addScaledVector(b.vel, dt * motion);
          if (b.deflectT > 1.3) resetBot(b, false);
        }
        const visK = b.k < 0 ? 0 : Math.min(1, (b.k) * 8);
        const dfade = b.state === 'deflect' ? Math.max(0, 1 - b.deflectT / 1.3) : 1;
        const op = visK * dfade * botFade;
        b.fillMat.opacity = 0.95 * op;
        b.lineMat.opacity = 0.95 * op;
        b.rimMat.uniforms.op.value = 0.9 * op;
        b.glowMat.opacity = 0.9 * op;
        b.darkMat.opacity = op;
        b.eye.material.opacity = 0.45 * op;
        b.hot.material.opacity = 0.95 * op;
        b.gp.quaternion.copy(camera.quaternion);
        b.gp.rotateZ(Math.sin(t * b.tumble + b.group * 1.7) * 0.3);
        b.gp.rotateY(Math.sin(t * b.tumble * 0.55 + b.group * 2.4) * 0.55);
        if (b.k >= 0 || b.state === 'deflect') {
          const p = b.trailPos, gp = b.gp.position;
          if (b.trailReset) {
            for (let j = 0; j < TRAIL; j++) { p[j * 3] = gp.x; p[j * 3 + 1] = gp.y; p[j * 3 + 2] = gp.z; }
            b.trailReset = false;
          } else {
            for (let j = TRAIL - 1; j > 0; j--) { p[j * 3] = p[(j - 1) * 3]; p[j * 3 + 1] = p[(j - 1) * 3 + 1]; p[j * 3 + 2] = p[(j - 1) * 3 + 2]; }
          }
          p[0] = gp.x; p[1] = gp.y; p[2] = gp.z;
          b.trail.geometry.attributes.position.needsUpdate = true;
        }
        b.trail.material.opacity = 0.85 * op;
      }
    }

    // ---- light stack ----
    const fc = Math.min(Math.max(cF, -1.2), 5.2);
    const ov = smooth(4.15, 4.95, fc); // finale: pull back to see the whole stack
    if (stack.visible) {
      for (const bb of bobbers) bb.obj.position.y = bb.by + Math.sin(t * 1.1 + bb.ph) * bb.amp;
      for (const L of layers) {
        const d = fc - L.i;
        const u = smooth(-0.95, 0.05, d);
        const past = clamp01(d - 0.6);
        let vis = u * (1 - 0.62 * past);
        vis += (0.92 - vis) * ov;
        const sc = (0.8 + 0.2 * u) * (1 - 0.12 * ov);
        L.g.scale.setScalar(sc);
        const rise = L.baseY - 2.8 * (1 - u);
        const compY = -88 + (2 - L.i) * 6.5;
        L.g.position.y = rise + (compY - rise) * ov;
        L.g.rotation.y = (1 - u) * 0.5 + Math.sin(t * 0.1 + L.i) * 0.015;
        if (L.g.userData.spin) L.g.userData.spin.rotation.y = Math.sin(t * 0.25) * 0.22;
        const tv = vis * theme;
        for (const { m, base } of L.mats) m.opacity = base * tv;
      }
    }

    // ---- camera ----
    // dive path: orbit -> straight into the keyhole (shield front is +z)
    const az = (t * 0.04 + smx * 0.35) * (1 - s * 0.92);
    const rad = 24 - 23.45 * s;
    const el = (4.5 + smy * -1.2) * (1 - s) - 0.02 * s;
    _v.set(Math.sin(az) * rad, el, Math.cos(az) * rad);
    _l.set(0, -0.03 * s, 0.12 * s);
    // stack path: fixed isometric-ish descent, exactly one layer per section
    const saz = 0.785 + Math.sin(t * 0.05) * 0.04 + smx * 0.18;
    const fcl = Math.min(Math.max(fc, -0.8), 4);
    const ly = TOPY - SP * fcl;
    // per-layer vertical framing: layer 01 content flies high, the rest sit low
    const LOOKOFF = [1.5, 0.3, 0.2, 0.3, 0.4];
    const li = Math.max(0, Math.min(3, Math.floor(fcl)));
    const loff = LOOKOFF[li] + (LOOKOFF[li + 1] - LOOKOFF[li]) * clamp01(fcl - li);
    const lookY = (ly + loff) + ((-88) - (ly + loff)) * ov;
    const D = 13 + 25 * ov, H = 8.5 + 21 * ov;
    _v2.set(Math.sin(saz) * D, lookY + H, Math.cos(saz) * D);
    _l2.set(0, lookY, 0);
    const cb = smooth(0.55, 0.63, divP); // swap happens under the whiteout
    camera.position.lerpVectors(_v, _v2, cb);
    _l.lerp(_l2, cb);
    camera.lookAt(_l);

    resize();
    renderer.render(scene, camera);
  }
  raf = requestAnimationFrame(loop);

  return {
    setScroll(divP, f) {
      sDiv = clamp01(divP);
      if (typeof f === 'number' && !isNaN(f)) sF = Math.min(Math.max(f, -1.5), 5.2);
    },
    setMouse(x, y) { mx = x; my = y; },
    setMotion(m) { motion = Math.max(0, m); },
    dispose() {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      renderer.dispose();
    },
  };
}
