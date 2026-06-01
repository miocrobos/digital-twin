// @ts-nocheck
/**
 * twin-three.js — Three.js DNA helix renderer for TWIN
 * ES module version for Vite. Exports initThreeJS.
 * Still uses window._dnaHighlight / _dnaClearHighlight / _dnaTooltipSet
 * as the React↔Three.js bridge.
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

/* ── Helix geometry constants ──────────────────────────────────── */
const NUM_PAIRS = 28;
const HELIX_R   = 3.0;
const PAIR_STEP = 1.85;
const TURNS     = 2.6;
const BACKBONE  = 0x6666cc;

/* The 4 base-pair types — cycle through them for each rung */
const BP_TYPES = [
  { name: 'A locks with T  🔵🟡', c1: 0x3b82f6, c2: 0xf59e0b },
  { name: 'T locks with A  🟡🔵', c1: 0xf59e0b, c2: 0x3b82f6 },
  { name: 'G locks with C  🟢🔴', c1: 0x22c55e, c2: 0xef4444 },
  { name: 'C locks with G  🔴🟢', c1: 0xef4444, c2: 0x22c55e },
];

/* ── Shared material helper (Phong — much cheaper than Standard) ─ */
function matOf(color, emissiveFactor = 0.12) {
  return new THREE.MeshPhongMaterial({
    color,
    emissive: new THREE.Color(color).multiplyScalar(emissiveFactor),
    shininess: 55,
  });
}

/* ── Shared geometries (created once, reused for every mesh) ─────── */
const _geoCache = {};
function cachedCylinder(radius) {
  const key = radius.toFixed(3);
  if (!_geoCache[key]) _geoCache[key] = new THREE.CylinderGeometry(radius, radius, 1, 6);
  return _geoCache[key];
}
const _sphereGeoSm = new THREE.SphereGeometry(1, 10, 8);  // backbone & base spheres share these

/* ── Cylinder helper ───────────────────────────────────────────── */
function tube(group, a, b, radius, color) {
  const dir = b.clone().sub(a);
  const len = dir.length();
  // Scale a unit-length cylinder to 'len' instead of creating geometry per tube
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, len, 6),
    matOf(color, 0.07)
  );
  mesh.position.copy(a.clone().add(b).multiplyScalar(0.5));
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  group.add(mesh);
  return mesh;
}

/* ── Main init function ────────────────────────────────────────── */
export function initThreeJS(container) {
  /* Scene */
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x040d06);
  scene.fog = new THREE.FogExp2(0x040d06, 0.022);

  /* Camera */
  const camera = new THREE.PerspectiveCamera(
    55, container.clientWidth / container.clientHeight, 0.1, 200
  );
  camera.position.set(0, 0, 22);

  /* Renderer */
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setSize(container.clientWidth, container.clientHeight);
  // Cap pixel ratio at 1.5 — uncapped retina/4K multiplies workload 4-9×
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  container.appendChild(renderer.domElement);

  /* Controls */
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping  = true;
  controls.dampingFactor  = 0.06;
  controls.autoRotate     = true;
  controls.autoRotateSpeed = 0.7;
  controls.minDistance    = 5;
  controls.maxDistance    = 60;

  /* Lights */
  scene.add(new THREE.AmbientLight(0x1a3322, 3));
  [
    [0x00e5ff, [12,  12,  8], 5],
    [0xff4d8d, [-12, -10, 6], 4],
    [0x39ff87, [0,   0, -14], 3],
  ].forEach(([c, p, intensity]) => {
    const light = new THREE.PointLight(c, intensity, 80);
    light.position.set(...p);
    scene.add(light);
  });

  /* ── Build DNA helix ─────────────────────────────────────────── */
  const dnaGroup    = new THREE.Group();
  scene.add(dnaGroup);

  const interactives  = [];
  const basePairData  = [];
  const prev1         = [];
  const prev2         = [];

  for (let i = 0; i < NUM_PAIRS; i++) {
    const ang = (i / (NUM_PAIRS - 1)) * Math.PI * 2 * TURNS;
    const y   = (i - (NUM_PAIRS - 1) / 2) * PAIR_STEP;

    /* Backbone positions on opposite sides of the helix */
    const p1 = new THREE.Vector3( HELIX_R * Math.cos(ang), y,  HELIX_R * Math.sin(ang));
    const p2 = new THREE.Vector3(-HELIX_R * Math.cos(ang), y, -HELIX_R * Math.sin(ang));

    const bp  = BP_TYPES[i % BP_TYPES.length];
    const pg  = new THREE.Group();

    /* Backbone spheres (purple) */
    const s1 = new THREE.Mesh(new THREE.SphereGeometry(0.46, 10, 8), matOf(BACKBONE));
    const s2 = new THREE.Mesh(new THREE.SphereGeometry(0.46, 10, 8), matOf(BACKBONE));
    s1.position.copy(p1);
    s2.position.copy(p2);
    pg.add(s1, s2);

    /* Base spheres (A/T/G/C colour) — inset toward centre */
    const b1 = new THREE.Mesh(new THREE.SphereGeometry(0.38, 10, 8), matOf(bp.c1));
    const b2 = new THREE.Mesh(new THREE.SphereGeometry(0.38, 10, 8), matOf(bp.c2));
    b1.position.set(p1.x * 0.55, y, p1.z * 0.55);
    b2.position.set(p2.x * 0.55, y, p2.z * 0.55);
    pg.add(b1, b2);

    /* Rung connecting the two base spheres */
    const rung = tube(pg, b1.position.clone(), b2.position.clone(), 0.13, 0xccccff);

    /* Backbone tubes connecting adjacent rungs */
    if (i > 0) {
      tube(dnaGroup, prev1[i - 1], p1, 0.22, BACKBONE);
      tube(dnaGroup, prev2[i - 1], p2, 0.22, BACKBONE);
    }
    prev1[i] = p1.clone();
    prev2[i] = p2.clone();

    dnaGroup.add(pg);

    /* Register for raycasting and highlights */
    const meshes = [s1, s2, b1, b2, rung];
    const origC  = [BACKBONE, BACKBONE, bp.c1, bp.c2, 0xccccff];
    meshes.forEach(m => {
      m.userData.pairIndex = i;
      m.userData.pairName  = bp.name;
      interactives.push(m);
    });
    basePairData.push({ meshes, origC, name: bp.name });
  }

  /* ── Background particles ────────────────────────────────────── */
  const pts = [];
  for (let i = 0; i < 600; i++) {
    pts.push((Math.random() - 0.5) * 80, (Math.random() - 0.5) * 80, (Math.random() - 0.5) * 80);
  }
  const ptGeo = new THREE.BufferGeometry();
  ptGeo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  scene.add(new THREE.Points(ptGeo, new THREE.PointsMaterial({ color: 0x1a3d20, size: 0.12 })));

  /* ── Raycasting / hover ──────────────────────────────────────── */
  const raycaster    = new THREE.Raycaster();
  const mouse        = new THREE.Vector2(-9999, -9999);
  let   hoveredIndex = null;
  let   mouseDirty   = false;  // only raycast when mouse actually moved

  function setHL(idx, on) {
    const { meshes, origC } = basePairData[idx];
    meshes.forEach((m, mi) => {
      if (on) {
        m.material.emissive.set(0xffffff);
        m.material.emissiveIntensity = 0.8;
        m.scale.setScalar(1.4);
      } else {
        m.material.emissive.set(new THREE.Color(origC[mi]).multiplyScalar(0.12));
        m.material.emissiveIntensity = 1;
        m.scale.setScalar(1);
      }
    });
  }

  /* Bridge: React → Three.js highlight */
  window._dnaHighlight = function (idx) {
    if (hoveredIndex !== null) setHL(hoveredIndex, false);
    if (idx >= 0 && idx < basePairData.length) {
      setHL(idx, true);
      hoveredIndex = idx;
    }
  };
  window._dnaClearHighlight = function () {
    if (hoveredIndex !== null) { setHL(hoveredIndex, false); hoveredIndex = null; }
  };

  renderer.domElement.addEventListener('mousemove', e => {
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.set(
      ((e.clientX - rect.left) / rect.width)  *  2 - 1,
      ((e.clientY - rect.top)  / rect.height) * -2 + 1
    );
    mouseDirty = true;
  });

  /* Responsive resize */
  const ro = new ResizeObserver(() => {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
  });
  ro.observe(container);

  /* ── Render loop ─────────────────────────────────────────────── */
  function animate() {
    requestAnimationFrame(animate);
    controls.update();

    // Only raycast when the mouse has moved — saves ~1ms per frame when idle
    if (mouseDirty) {
      mouseDirty = false;
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(interactives);

      if (hits.length) {
        const idx = hits[0].object.userData.pairIndex;
        if (hoveredIndex !== idx) {
          if (hoveredIndex !== null) setHL(hoveredIndex, false);
          hoveredIndex = idx;
          setHL(idx, true);
          if (window._dnaTooltipSet) {
            window._dnaTooltipSet({ show: true, text: `Rung ${idx + 1}  ·  ${basePairData[idx].name}` });
          }
        }
      } else {
        if (hoveredIndex !== null) { setHL(hoveredIndex, false); hoveredIndex = null; }
        if (window._dnaTooltipSet) window._dnaTooltipSet({ show: false, text: '' });
      }
    }

    renderer.render(scene, camera);
  }
  animate();
}
