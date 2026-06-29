import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.165.0/build/three.module.js";

if ("scrollRestoration" in history) {
  history.scrollRestoration = "manual";
}

const canvas = document.querySelector("#cube-canvas");
const hero = document.querySelector(".hero");
const heroStage = document.querySelector(".hero-stage");
const darkSection = document.querySelector(".dark-section");
const modeButtons = document.querySelectorAll("[data-scene-mode]");
const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: true,
  powerPreference: "high-performance",
});

renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor(0xffffff, 0);

const cubeGroup = new THREE.Group();
cubeGroup.position.y = 0;
scene.add(cubeGroup);

const pointer = new THREE.Vector2(0, 0);
const raycaster = new THREE.Raycaster();
const clock = new THREE.Clock();
const inverseCubeMatrix = new THREE.Matrix4();
const localRay = new THREE.Ray();
const cameraRight = new THREE.Vector3();
const cameraUp = new THREE.Vector3();
const localMouseVelocity = new THREE.Vector3();

const CUBE_SIZE = 3.15;
const GRID = 24;
const HALF = CUBE_SIZE / 2;
const STEP = CUBE_SIZE / (GRID - 1);
const PARTICLE_COUNT = GRID * GRID * 6;
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
const ORGANIC_ROWS = 48;
const ORGANIC_COLUMNS = 72;

const basePositions = new Float32Array(PARTICLE_COUNT * 3);
const positions = new Float32Array(PARTICLE_COUNT * 3);
const introPositions = new Float32Array(PARTICLE_COUNT * 3);
const scrollScatterPositions = new Float32Array(PARTICLE_COUNT * 3);
const seeds = new Float32Array(PARTICLE_COUNT);
const gradientValues = new Float32Array(PARTICLE_COUNT);
const scatterLife = new Float32Array(PARTICLE_COUNT);
const orbitAxesA = new Float32Array(PARTICLE_COUNT * 3);
const orbitAxesB = new Float32Array(PARTICLE_COUNT * 3);
const orbitOffsets = new Float32Array(PARTICLE_COUNT * 3);
const driftVelocities = new Float32Array(PARTICLE_COUNT * 3);
const idleDirections = new Float32Array(PARTICLE_COUNT * 3);
const orbitRadii = new Float32Array(PARTICLE_COUNT);
const orbitSpeeds = new Float32Array(PARTICLE_COUNT);
const orbitPhases = new Float32Array(PARTICLE_COUNT);

let particleIndex = 0;
let pointerInside = false;
let chaosLevel = 0;
let pointerSpeed = 0;
let pointerDeltaX = 0;
let pointerDeltaY = 0;
let lastPointerX = 0;
let lastPointerY = 0;
let lastPointerTime = 0;
let currentShapeIndex = 0;
let previousShapeIndex = -1;
let morphProgress = 1;
let morphCooldown = 0;
let surfaceFlowBlend = 1;
let surfaceFlowEpoch = 0;
let morphArmed = true;
let morphQueued = false;
let freshInteraction = false;
let animationFrame = 0;
let revealProgress = 0;
let revealTarget = 0;
let scrollScatterProgress = 0;
let scrollScatterTarget = 0;
let introStartTime = 0;
let introActive = true;
let compactLayout = false;
let darkMode = false;
let themeBlendTarget = 0;

const morphFromPositions = new Float32Array(PARTICLE_COUNT * 3);
const morphToPositions = new Float32Array(PARTICLE_COUNT * 3);

function normalize3(x, y, z) {
  const length = Math.hypot(x, y, z) || 1;
  return [x / length, y / length, z / length];
}

function fract(value) {
  return value - Math.floor(value);
}

function hash(index, salt = 0) {
  return fract(Math.sin(index * 127.1 + salt * 311.7) * 43758.5453123);
}

function smooth01(value) {
  return value * value * value * (value * (value * 6 - 15) + 10);
}

function setPoint(target, index, x, y, z) {
  const offset = index * 3;
  target[offset] = x;
  target[offset + 1] = y;
  target[offset + 2] = z;
}

function trianglePoint(a, b, c, u, v) {
  const su = Math.sqrt(u);
  return [
    a[0] * (1 - su) + b[0] * (su * (1 - v)) + c[0] * (su * v),
    a[1] * (1 - su) + b[1] * (su * (1 - v)) + c[1] * (su * v),
    a[2] * (1 - su) + b[2] * (su * (1 - v)) + c[2] * (su * v),
  ];
}

function pushPoint(x, y, z) {
  const offset = particleIndex * 3;
  const seed = Math.random();
  const absX = Math.abs(x);
  const absY = Math.abs(y);
  const absZ = Math.abs(z);
  const idleDirection =
    absX >= absY && absX >= absZ
      ? [Math.sign(x), 0, 0]
      : absY >= absX && absY >= absZ
        ? [0, Math.sign(y), 0]
        : [0, 0, Math.sign(z)];
  const axisA = normalize3(
    Math.sin(seed * 91.7),
    Math.cos(seed * 53.3),
    Math.sin(seed * 37.9)
  );
  let axisB = normalize3(
    axisA[1] * z - axisA[2] * y,
    axisA[2] * x - axisA[0] * z,
    axisA[0] * y - axisA[1] * x
  );

  if (Math.hypot(axisB[0], axisB[1], axisB[2]) < 0.01) {
    axisB = normalize3(axisA[1], -axisA[0], axisA[2] * 0.35);
  }

  basePositions[offset] = x;
  basePositions[offset + 1] = y;
  basePositions[offset + 2] = z;
  positions[offset] = x;
  positions[offset + 1] = y;
  positions[offset + 2] = z;
  seeds[particleIndex] = seed;
  gradientValues[particleIndex] = fract(
    (particleIndex % ORGANIC_COLUMNS) / ORGANIC_COLUMNS * 0.72 +
      Math.floor(particleIndex / ORGANIC_COLUMNS) / ORGANIC_ROWS * 0.28
  );
  orbitAxesA[offset] = axisA[0];
  orbitAxesA[offset + 1] = axisA[1];
  orbitAxesA[offset + 2] = axisA[2];
  orbitAxesB[offset] = axisB[0];
  orbitAxesB[offset + 1] = axisB[1];
  orbitAxesB[offset + 2] = axisB[2];
  idleDirections[offset] = idleDirection[0];
  idleDirections[offset + 1] = idleDirection[1];
  idleDirections[offset + 2] = idleDirection[2];
  orbitSpeeds[particleIndex] = 0.22 + seed * 0.42;
  orbitPhases[particleIndex] = seed * Math.PI * 2;

  particleIndex += 1;
}

function buildCubeSurfacePoints() {
  for (let ix = 0; ix < GRID; ix += 1) {
    for (let iy = 0; iy < GRID; iy += 1) {
      const x = -HALF + ix * STEP;
      const y = -HALF + iy * STEP;

      pushPoint(x, y, HALF);
      pushPoint(x, y, -HALF);
      pushPoint(HALF, x, y);
      pushPoint(-HALF, x, y);
      pushPoint(x, HALF, y);
      pushPoint(x, -HALF, y);
    }
  }
}

buildCubeSurfacePoints();

function createSpherePositions() {
  const target = new Float32Array(PARTICLE_COUNT * 3);
  const radius = CUBE_SIZE * 0.58;

  for (let i = 0; i < PARTICLE_COUNT; i += 1) {
    const y = 1 - (i / (PARTICLE_COUNT - 1)) * 2;
    const ring = Math.sqrt(1 - y * y);
    const angle = i * GOLDEN_ANGLE;

    setPoint(target, i, Math.cos(angle) * ring * radius, y * radius, Math.sin(angle) * ring * radius);
  }

  return target;
}

function createPyramidPositions() {
  const target = new Float32Array(PARTICLE_COUNT * 3);
  const top = [0, -HALF * 1.18, 0];
  const baseY = HALF * 0.95;
  const corners = [
    [-HALF, baseY, -HALF],
    [HALF, baseY, -HALF],
    [HALF, baseY, HALF],
    [-HALF, baseY, HALF],
  ];

  for (let i = 0; i < PARTICLE_COUNT; i += 1) {
    const face = i % 5;
    const u = hash(i, 1);
    const v = hash(i, 2);
    let point;

    if (face === 4) {
      point = [
        THREE.MathUtils.lerp(-HALF, HALF, u),
        baseY,
        THREE.MathUtils.lerp(-HALF, HALF, v),
      ];
    } else {
      point = trianglePoint(top, corners[face], corners[(face + 1) % 4], u, v);
    }

    setPoint(target, i, point[0], point[1], point[2]);
  }

  return target;
}

function createCylinderPositions() {
  const target = new Float32Array(PARTICLE_COUNT * 3);
  const radius = CUBE_SIZE * 0.43;
  const height = CUBE_SIZE * 0.98;

  for (let i = 0; i < PARTICLE_COUNT; i += 1) {
    const section = i % 4;
    const angle = i * GOLDEN_ANGLE;
    const radial = section < 2 ? radius : Math.sqrt(hash(i, 4)) * radius;
    const y =
      section === 2
        ? height / 2
        : section === 3
          ? -height / 2
          : THREE.MathUtils.lerp(-height / 2, height / 2, hash(i, 3));

    setPoint(target, i, Math.cos(angle) * radial, y, Math.sin(angle) * radial);
  }

  return target;
}

function createOctahedronPositions() {
  const target = new Float32Array(PARTICLE_COUNT * 3);
  const s = CUBE_SIZE * 0.68;
  const vertices = [
    [0, s, 0],
    [0, -s, 0],
    [s, 0, 0],
    [0, 0, s],
    [-s, 0, 0],
    [0, 0, -s],
  ];
  const faces = [
    [0, 2, 3],
    [0, 3, 4],
    [0, 4, 5],
    [0, 5, 2],
    [1, 3, 2],
    [1, 4, 3],
    [1, 5, 4],
    [1, 2, 5],
  ];

  for (let i = 0; i < PARTICLE_COUNT; i += 1) {
    const face = faces[i % faces.length];
    const point = trianglePoint(vertices[face[0]], vertices[face[1]], vertices[face[2]], hash(i, 5), hash(i, 6));

    setPoint(target, i, point[0], point[1], point[2]);
  }

  return target;
}

function createConePositions() {
  const target = new Float32Array(PARTICLE_COUNT * 3);
  const top = [0, HALF * 1.12, 0];
  const baseY = -HALF * 0.9;
  const radius = CUBE_SIZE * 0.55;

  for (let i = 0; i < PARTICLE_COUNT; i += 1) {
    const side = i % 5 !== 0;
    const angle = i * GOLDEN_ANGLE;
    const u = hash(i, 7);
    const v = hash(i, 8);

    if (side) {
      const t = v;
      setPoint(
        target,
        i,
        Math.cos(angle) * radius * (1 - t),
        THREE.MathUtils.lerp(baseY, top[1], t),
        Math.sin(angle) * radius * (1 - t)
      );
    } else {
      const ring = Math.sqrt(u) * radius;
      setPoint(target, i, Math.cos(angle) * ring, baseY, Math.sin(angle) * ring);
    }
  }

  return target;
}

function createTorusPositions() {
  const target = new Float32Array(PARTICLE_COUNT * 3);
  const major = CUBE_SIZE * 0.44;
  const minor = CUBE_SIZE * 0.16;

  for (let i = 0; i < PARTICLE_COUNT; i += 1) {
    const u = i * GOLDEN_ANGLE;
    const v = hash(i, 9) * Math.PI * 2;
    const r = major + minor * Math.cos(v);

    setPoint(target, i, Math.cos(u) * r, minor * Math.sin(v), Math.sin(u) * r);
  }

  return target;
}

function createCapsulePositions() {
  const target = new Float32Array(PARTICLE_COUNT * 3);
  const radius = CUBE_SIZE * 0.34;
  const halfHeight = CUBE_SIZE * 0.52;

  for (let i = 0; i < PARTICLE_COUNT; i += 1) {
    const section = i % 3;
    const angle = i * GOLDEN_ANGLE;
    const ySeed = hash(i, 10);

    if (section === 0) {
      setPoint(
        target,
        i,
        Math.cos(angle) * radius,
        THREE.MathUtils.lerp(-halfHeight, halfHeight, ySeed),
        Math.sin(angle) * radius
      );
    } else {
      const hemisphere = section === 1 ? 1 : -1;
      const y = hash(i, 11);
      const ring = Math.sqrt(1 - y * y) * radius;
      setPoint(
        target,
        i,
        Math.cos(angle) * ring,
        hemisphere * (halfHeight + y * radius),
        Math.sin(angle) * ring
      );
    }
  }

  return target;
}

function createTriangularPrismPositions() {
  const target = new Float32Array(PARTICLE_COUNT * 3);
  const height = CUBE_SIZE * 1.05;
  const r = CUBE_SIZE * 0.56;
  const a = [Math.cos(-Math.PI / 2) * r, Math.sin(-Math.PI / 2) * r];
  const b = [Math.cos(Math.PI / 6) * r, Math.sin(Math.PI / 6) * r];
  const c = [Math.cos((Math.PI * 5) / 6) * r, Math.sin((Math.PI * 5) / 6) * r];
  const edges = [
    [a, b],
    [b, c],
    [c, a],
  ];

  for (let i = 0; i < PARTICLE_COUNT; i += 1) {
    const part = i % 5;
    const u = hash(i, 12);
    const v = hash(i, 13);

    if (part < 3) {
      const edge = edges[part];
      setPoint(
        target,
        i,
        THREE.MathUtils.lerp(edge[0][0], edge[1][0], u),
        THREE.MathUtils.lerp(-height / 2, height / 2, v),
        THREE.MathUtils.lerp(edge[0][1], edge[1][1], u)
      );
    } else {
      const point = trianglePoint(
        [a[0], part === 3 ? height / 2 : -height / 2, a[1]],
        [b[0], part === 3 ? height / 2 : -height / 2, b[1]],
        [c[0], part === 3 ? height / 2 : -height / 2, c[1]],
        u,
        v
      );
      setPoint(target, i, point[0], point[1], point[2]);
    }
  }

  return target;
}

function createDiamondPositions() {
  const target = new Float32Array(PARTICLE_COUNT * 3);
  const top = [0, HALF * 1.15, 0];
  const lower = [0, -HALF * 1.05, 0];
  const beltY = HALF * 0.16;
  const r = CUBE_SIZE * 0.58;
  const belt = [
    [r, beltY, 0],
    [0, beltY, r],
    [-r, beltY, 0],
    [0, beltY, -r],
  ];

  for (let i = 0; i < PARTICLE_COUNT; i += 1) {
    const face = i % 8;
    const fromTop = face < 4;
    const edge = face % 4;
    const point = trianglePoint(
      fromTop ? top : lower,
      belt[edge],
      belt[(edge + 1) % 4],
      hash(i, 14),
      hash(i, 15)
    );

    setPoint(target, i, point[0], point[1], point[2]);
  }

  return target;
}

const shapePositions = [
  basePositions.slice(),
  createSpherePositions(),
  createPyramidPositions(),
  createCylinderPositions(),
  createOctahedronPositions(),
  createConePositions(),
  createTorusPositions(),
  createCapsulePositions(),
  createTriangularPrismPositions(),
  createDiamondPositions(),
];
const ORGANIC_SHAPE_INDEX = shapePositions.length;

function updateOrganicSurface(elapsed) {
  const time = elapsed * 0.66;
  const radius = CUBE_SIZE * 0.51;
  const squash = Math.sin(time * 0.58);
  const stretchX = 1 + squash * 0.11;
  const stretchY = 0.92 - squash * 0.085;
  const stretchZ = 1 + Math.sin(time * 0.58 + Math.PI * 0.68) * 0.095;

  for (let i = 0; i < PARTICLE_COUNT; i += 1) {
    const row = Math.floor(i / ORGANIC_COLUMNS);
    const column = i % ORGANIC_COLUMNS;
    const theta = ((row + 0.5) / ORGANIC_ROWS) * Math.PI;
    const phi = (column / ORGANIC_COLUMNS) * Math.PI * 2;
    const sinTheta = Math.sin(theta);
    const cosTheta = Math.cos(theta);
    const twistedPhi =
      phi +
      Math.sin(theta * 2.4 - time * 0.88) * 0.24 +
      Math.sin(phi * 3.0 + time * 0.42) * 0.055;
    const surfaceWeight = 0.34 + sinTheta * 0.66;
    const broadWave =
      Math.sin(twistedPhi * 3.0 + Math.cos(theta * 2.0) * 2.1 + time * 1.18) * 0.235;
    const crossingWave =
      Math.sin(theta * 5.0 - twistedPhi * 2.0 - time * 0.94) * 0.145;
    const fineWave =
      Math.sin(twistedPhi * 7.0 + theta * 3.0 + time * 0.57) * 0.072;
    const rollingWave =
      Math.sin(theta * 3.0 + twistedPhi * 2.0 - time * 1.34) * 0.075;
    const pulse = 1 + Math.sin(time * 0.46 + theta * 2.0) * 0.038;
    const localRadius =
      radius *
      pulse *
      (1 + (broadWave + crossingWave + fineWave + rollingWave) * surfaceWeight);
    const verticalRipple =
      Math.sin(twistedPhi * 2.0 + theta * 3.0 + time * 0.72) *
      sinTheta *
      radius *
      0.055;

    setPoint(
      basePositions,
      i,
      Math.cos(twistedPhi) * sinTheta * localRadius * stretchX,
      cosTheta * localRadius * stretchY + verticalRipple,
      Math.sin(twistedPhi) * sinTheta * localRadius * stretchZ
    );
  }
}

function flowRectangle(u, v, index, elapsed, salt = 0, activation = 1) {
  const phase = elapsed * (0.24 + hash(index, salt + 40) * 0.08);
  const offsetU =
    Math.sin(phase + v * Math.PI * 2 + hash(index, salt + 41) * Math.PI) *
    Math.sin(u * Math.PI) *
    0.038 *
    activation;
  const offsetV =
    Math.cos(phase * 0.83 + u * Math.PI * 2 + hash(index, salt + 42) * Math.PI) *
    Math.sin(v * Math.PI) *
    0.038 *
    activation;

  return [u + offsetU, v + offsetV];
}

function flowingTrianglePoint(a, b, c, index, elapsed, salt = 0, activation = 1) {
  const su = Math.sqrt(hash(index, salt));
  const v = hash(index, salt + 1);
  let weightA = 1 - su;
  let weightB = su * (1 - v);
  let weightC = su * v;
  const safeRadius = Math.min(weightA, weightB, weightC) * 0.26 * activation;
  const phase =
    elapsed * (0.23 + hash(index, salt + 50) * 0.09) +
    hash(index, salt + 51) * Math.PI * 2;
  const deltaA = Math.cos(phase) * safeRadius;
  const deltaB = Math.sin(phase) * safeRadius;
  const deltaC = -deltaA - deltaB;

  weightA += deltaA;
  weightB += deltaB;
  weightC += deltaC;

  return [
    a[0] * weightA + b[0] * weightB + c[0] * weightC,
    a[1] * weightA + b[1] * weightB + c[1] * weightC,
    a[2] * weightA + b[2] * weightB + c[2] * weightC,
  ];
}

function updateLightSurfaceFlow(elapsed) {
  const activation = smooth01(clamp01(elapsed / 2.2));

  for (let i = 0; i < PARTICLE_COUNT; i += 1) {
    if (currentShapeIndex === 0) {
      const face = i % 6;
      const gridIndex = Math.floor(i / 6);
      const u = Math.floor(gridIndex / GRID) / (GRID - 1);
      const v = (gridIndex % GRID) / (GRID - 1);
      const [flowU, flowV] = flowRectangle(u, v, i, elapsed, face * 4, activation);
      const a = THREE.MathUtils.lerp(-HALF, HALF, flowU);
      const b = THREE.MathUtils.lerp(-HALF, HALF, flowV);

      if (face === 0) setPoint(basePositions, i, a, b, HALF);
      if (face === 1) setPoint(basePositions, i, a, b, -HALF);
      if (face === 2) setPoint(basePositions, i, HALF, a, b);
      if (face === 3) setPoint(basePositions, i, -HALF, a, b);
      if (face === 4) setPoint(basePositions, i, a, HALF, b);
      if (face === 5) setPoint(basePositions, i, a, -HALF, b);
      continue;
    }

    if (currentShapeIndex === 1) {
      const radius = CUBE_SIZE * 0.58;
      const y = 1 - (i / (PARTICLE_COUNT - 1)) * 2;
      const ring = Math.sqrt(1 - y * y);
      const angle =
        i * GOLDEN_ANGLE +
        elapsed * (0.19 + Math.sin(y * Math.PI * 2 + seeds[i] * 4) * 0.035);
      setPoint(basePositions, i, Math.cos(angle) * ring * radius, y * radius, Math.sin(angle) * ring * radius);
      continue;
    }

    if (currentShapeIndex === 2) {
      const top = [0, -HALF * 1.18, 0];
      const baseY = HALF * 0.95;
      const corners = [
        [-HALF, baseY, -HALF],
        [HALF, baseY, -HALF],
        [HALF, baseY, HALF],
        [-HALF, baseY, HALF],
      ];
      const face = i % 5;

      if (face === 4) {
        const [u, v] = flowRectangle(hash(i, 1), hash(i, 2), i, elapsed, 60, activation);
        setPoint(
          basePositions,
          i,
          THREE.MathUtils.lerp(-HALF, HALF, u),
          baseY,
          THREE.MathUtils.lerp(-HALF, HALF, v)
        );
      } else {
        const point = flowingTrianglePoint(
          top,
          corners[face],
          corners[(face + 1) % 4],
          i,
          elapsed,
          1,
          activation
        );
        setPoint(basePositions, i, point[0], point[1], point[2]);
      }
      continue;
    }

    if (currentShapeIndex === 3) {
      const radius = CUBE_SIZE * 0.43;
      const height = CUBE_SIZE * 0.98;
      const section = i % 4;
      const angle = i * GOLDEN_ANGLE + elapsed * (0.2 + seeds[i] * 0.055);

      if (section < 2) {
        const ySeed = hash(i, 3);
        const movingY =
          ySeed +
          Math.sin(elapsed * (0.22 + seeds[i] * 0.07) + seeds[i] * 8) *
            Math.sin(ySeed * Math.PI) *
            0.045 *
            activation;
        setPoint(
          basePositions,
          i,
          Math.cos(angle) * radius,
          THREE.MathUtils.lerp(-height / 2, height / 2, movingY),
          Math.sin(angle) * radius
        );
      } else {
        const radial = Math.sqrt(hash(i, 4)) * radius;
        setPoint(
          basePositions,
          i,
          Math.cos(angle) * radial,
          section === 2 ? height / 2 : -height / 2,
          Math.sin(angle) * radial
        );
      }
      continue;
    }

    if (currentShapeIndex === 4) {
      const s = CUBE_SIZE * 0.68;
      const vertices = [
        [0, s, 0],
        [0, -s, 0],
        [s, 0, 0],
        [0, 0, s],
        [-s, 0, 0],
        [0, 0, -s],
      ];
      const faces = [
        [0, 2, 3],
        [0, 3, 4],
        [0, 4, 5],
        [0, 5, 2],
        [1, 3, 2],
        [1, 4, 3],
        [1, 5, 4],
        [1, 2, 5],
      ];
      const face = faces[i % faces.length];
      const point = flowingTrianglePoint(
        vertices[face[0]],
        vertices[face[1]],
        vertices[face[2]],
        i,
        elapsed,
        5,
        activation
      );
      setPoint(basePositions, i, point[0], point[1], point[2]);
      continue;
    }

    if (currentShapeIndex === 5) {
      const topY = HALF * 1.12;
      const baseY = -HALF * 0.9;
      const radius = CUBE_SIZE * 0.55;
      const side = i % 5 !== 0;
      const angle = i * GOLDEN_ANGLE + elapsed * (0.18 + seeds[i] * 0.06);

      if (side) {
        const heightSeed = hash(i, 8);
        const movingHeight =
          heightSeed +
          Math.sin(elapsed * (0.2 + seeds[i] * 0.07) + seeds[i] * 10) *
            Math.sin(heightSeed * Math.PI) *
            0.04 *
            activation;
        const ring = radius * (1 - movingHeight);
        setPoint(
          basePositions,
          i,
          Math.cos(angle) * ring,
          THREE.MathUtils.lerp(baseY, topY, movingHeight),
          Math.sin(angle) * ring
        );
      } else {
        const radial = Math.sqrt(hash(i, 7)) * radius;
        setPoint(basePositions, i, Math.cos(angle) * radial, baseY, Math.sin(angle) * radial);
      }
      continue;
    }

    if (currentShapeIndex === 6) {
      const major = CUBE_SIZE * 0.44;
      const minor = CUBE_SIZE * 0.16;
      const u = i * GOLDEN_ANGLE + elapsed * (0.15 + seeds[i] * 0.04);
      const v = hash(i, 9) * Math.PI * 2 + elapsed * (0.21 + seeds[i] * 0.05);
      const r = major + minor * Math.cos(v);
      setPoint(basePositions, i, Math.cos(u) * r, minor * Math.sin(v), Math.sin(u) * r);
      continue;
    }

    if (currentShapeIndex === 7) {
      const radius = CUBE_SIZE * 0.34;
      const halfHeight = CUBE_SIZE * 0.52;
      const section = i % 3;
      const angle = i * GOLDEN_ANGLE + elapsed * (0.19 + seeds[i] * 0.05);

      if (section === 0) {
        const ySeed = hash(i, 10);
        const movingY =
          ySeed +
          Math.sin(elapsed * (0.21 + seeds[i] * 0.05) + seeds[i] * 9) *
            Math.sin(ySeed * Math.PI) *
            0.04 *
            activation;
        setPoint(
          basePositions,
          i,
          Math.cos(angle) * radius,
          THREE.MathUtils.lerp(-halfHeight, halfHeight, movingY),
          Math.sin(angle) * radius
        );
      } else {
        const hemisphere = section === 1 ? 1 : -1;
        const y = hash(i, 11);
        const ring = Math.sqrt(1 - y * y) * radius;
        setPoint(
          basePositions,
          i,
          Math.cos(angle) * ring,
          hemisphere * (halfHeight + y * radius),
          Math.sin(angle) * ring
        );
      }
      continue;
    }

    if (currentShapeIndex === 8) {
      const height = CUBE_SIZE * 1.05;
      const r = CUBE_SIZE * 0.56;
      const a = [Math.cos(-Math.PI / 2) * r, Math.sin(-Math.PI / 2) * r];
      const b = [Math.cos(Math.PI / 6) * r, Math.sin(Math.PI / 6) * r];
      const c = [Math.cos((Math.PI * 5) / 6) * r, Math.sin((Math.PI * 5) / 6) * r];
      const edges = [
        [a, b],
        [b, c],
        [c, a],
      ];
      const part = i % 5;

      if (part < 3) {
        const [u, v] = flowRectangle(
          hash(i, 12),
          hash(i, 13),
          i,
          elapsed,
          80 + part * 3,
          activation
        );
        const edge = edges[part];
        setPoint(
          basePositions,
          i,
          THREE.MathUtils.lerp(edge[0][0], edge[1][0], u),
          THREE.MathUtils.lerp(-height / 2, height / 2, v),
          THREE.MathUtils.lerp(edge[0][1], edge[1][1], u)
        );
      } else {
        const y = part === 3 ? height / 2 : -height / 2;
        const point = flowingTrianglePoint(
          [a[0], y, a[1]],
          [b[0], y, b[1]],
          [c[0], y, c[1]],
          i,
          elapsed,
          12,
          activation
        );
        setPoint(basePositions, i, point[0], point[1], point[2]);
      }
      continue;
    }

    if (currentShapeIndex === 9) {
      const top = [0, HALF * 1.15, 0];
      const lower = [0, -HALF * 1.05, 0];
      const beltY = HALF * 0.16;
      const r = CUBE_SIZE * 0.58;
      const belt = [
        [r, beltY, 0],
        [0, beltY, r],
        [-r, beltY, 0],
        [0, beltY, -r],
      ];
      const face = i % 8;
      const fromTop = face < 4;
      const edge = face % 4;
      const point = flowingTrianglePoint(
        fromTop ? top : lower,
        belt[edge],
        belt[(edge + 1) % 4],
        i,
        elapsed,
        14,
        activation
      );
      setPoint(basePositions, i, point[0], point[1], point[2]);
    }
  }
}

function initializeRandomOpeningShape() {
  currentShapeIndex = Math.floor(Math.random() * shapePositions.length);
  previousShapeIndex = -1;
  morphProgress = 1;
  morphCooldown = 1.4;
  basePositions.set(shapePositions[currentShapeIndex]);
  morphFromPositions.set(basePositions);
  morphToPositions.set(basePositions);

  for (let i = 0; i < PARTICLE_COUNT; i += 1) {
    const offset = i * 3;
    const angle = hash(i, 16) * Math.PI * 2;
    const height = hash(i, 17) * 2 - 1;
    const ring = Math.sqrt(1 - height * height);
    const distance = CUBE_SIZE * THREE.MathUtils.lerp(0.9, 2.25, hash(i, 18));
    const randomX = Math.cos(angle) * ring * distance;
    const randomY = height * distance;
    const randomZ = Math.sin(angle) * ring * distance;

    orbitOffsets[offset] = randomX - basePositions[offset];
    orbitOffsets[offset + 1] = randomY - basePositions[offset + 1];
    orbitOffsets[offset + 2] = randomZ - basePositions[offset + 2];
    driftVelocities[offset] = Math.sin(seeds[i] * 41.0) * 0.012;
    driftVelocities[offset + 1] = Math.cos(seeds[i] * 53.0) * 0.012;
    driftVelocities[offset + 2] = Math.sin(seeds[i] * 67.0) * 0.012;
    scatterLife[i] = THREE.MathUtils.lerp(0.82, 1, hash(i, 19));
    orbitRadii[i] = CUBE_SIZE * THREE.MathUtils.lerp(0.08, 0.32, hash(i, 20));
  }
}

initializeRandomOpeningShape();

const geometry = new THREE.BufferGeometry();
geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
geometry.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
geometry.setAttribute("aGradient", new THREE.BufferAttribute(gradientValues, 1));

const material = new THREE.ShaderMaterial({
  transparent: true,
  depthWrite: false,
  uniforms: {
    uTime: { value: 0 },
    uPixelRatio: { value: renderer.getPixelRatio() },
    uDarkMode: { value: 0 },
  },
  vertexShader: `
    attribute float aSeed;
    attribute float aGradient;
    uniform float uTime;
    uniform float uPixelRatio;
    uniform float uDarkMode;
    varying float vAlpha;
    varying float vGradient;

    void main() {
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);

      float depthFade = smoothstep(-6.2, -2.1, mvPosition.z);
      float breathing = 0.5 + 0.5 * sin(uTime * 1.35 + aSeed * 6.28318);

      vAlpha = mix(0.32, 1.0, depthFade) * mix(0.86, 1.0, breathing);
      vGradient = position.y * 0.18 + position.x * 0.085 + position.z * 0.065;
      float pointSize = mix(3.15 + breathing * 1.25, 4.15 + breathing * 1.35, uDarkMode);
      gl_PointSize = pointSize * uPixelRatio * (6.5 / -mvPosition.z);
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  fragmentShader: `
    uniform float uTime;
    uniform float uDarkMode;
    varying float vAlpha;
    varying float vGradient;

    void main() {
      vec2 centered = gl_PointCoord - vec2(0.5);
      float dist = length(centered);
      float dotMask = smoothstep(0.5, 0.32, dist);

      if (dotMask <= 0.01) discard;

      float gradientAngle = (vGradient + uTime * 0.03) * 6.2831853;
      float violetWeight = pow(0.5 + 0.5 * cos(gradientAngle), 3.0);
      float blueWeight = pow(0.5 + 0.5 * cos(gradientAngle - 2.0943951), 3.0);
      float cyanWeight = pow(0.5 + 0.5 * cos(gradientAngle - 4.1887902), 3.0);
      float weightSum = violetWeight + blueWeight + cyanWeight;
      vec3 violet = vec3(0.54, 0.15, 1.0);
      vec3 blue = vec3(0.04, 0.46, 1.0);
      vec3 cyan = vec3(0.34, 0.86, 1.0);
      vec3 gradientColor =
        (violet * violetWeight + blue * blueWeight + cyan * cyanWeight) / weightSum;
      vec3 lightColor = vec3(0.012, 0.013, 0.015);
      vec3 finalColor = mix(lightColor, gradientColor, uDarkMode);
      float finalAlpha = mix(vAlpha, min(1.0, vAlpha * 1.14), uDarkMode);

      gl_FragColor = vec4(finalColor, finalAlpha * dotMask);
    }
  `,
});

const pointCloud = new THREE.Points(geometry, material);
cubeGroup.add(pointCloud);

function renderLiquidGlass() {
  const sourceRect = canvas.getBoundingClientRect();
  if (sourceRect.width <= 0 || sourceRect.height <= 0) return;

  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  const sourceScaleX = canvas.width / sourceRect.width;
  const sourceScaleY = canvas.height / sourceRect.height;
  const theme = material.uniforms.uDarkMode.value;
  const backgroundChannel = Math.round(255 * (1 - theme));

  for (const surface of liquidGlassSurfaces) {
    const rect = surface.element.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) continue;

    const targetWidth = Math.max(1, Math.round(rect.width * pixelRatio));
    const targetHeight = Math.max(1, Math.round(rect.height * pixelRatio));

    if (surface.lens.width !== targetWidth || surface.lens.height !== targetHeight) {
      surface.lens.width = targetWidth;
      surface.lens.height = targetHeight;
    }

    const context = surface.context;
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    context.clearRect(0, 0, rect.width, rect.height);
    context.fillStyle = `rgb(${backgroundChannel}, ${backgroundChannel}, ${backgroundChannel})`;
    context.fillRect(0, 0, rect.width, rect.height);

    const tile = 5;
    const centerX = rect.left - sourceRect.left + rect.width / 2;
    const centerY = rect.top - sourceRect.top + rect.height / 2;

    for (let y = 0; y < rect.height; y += tile) {
      const drawHeight = Math.min(tile + 0.7, rect.height - y);

      for (let x = 0; x < rect.width; x += tile) {
        const drawWidth = Math.min(tile + 0.7, rect.width - x);
        const localX = x + drawWidth / 2;
        const localY = y + drawHeight / 2;
        const nx = (localX - rect.width / 2) / (rect.width / 2);
        const ny = (localY - rect.height / 2) / (rect.height / 2);
        const normalLength = Math.hypot(nx, ny) || 1;
        const lensBulge = Math.max(0, 1 - nx * nx * 0.84 - ny * ny * 1.34);
        const edge = Math.pow(Math.min(1, Math.max(Math.abs(nx), Math.abs(ny))), 5);
        const refraction = edge * 11 + lensBulge * 3.2;
        const zoom = 0.925 - lensBulge * 0.025;
        const sourceX =
          centerX +
          (localX - rect.width / 2) * zoom -
          (nx / normalLength) * refraction;
        const sourceY =
          centerY +
          (localY - rect.height / 2) * zoom -
          (ny / normalLength) * refraction * 0.72;
        const sampleWidth = Math.max(1, drawWidth * zoom * sourceScaleX);
        const sampleHeight = Math.max(1, drawHeight * zoom * sourceScaleY);
        const sampleX = Math.min(
          canvas.width - sampleWidth,
          Math.max(0, sourceX * sourceScaleX - sampleWidth / 2)
        );
        const sampleY = Math.min(
          canvas.height - sampleHeight,
          Math.max(0, sourceY * sourceScaleY - sampleHeight / 2)
        );

        context.drawImage(
          canvas,
          sampleX,
          sampleY,
          sampleWidth,
          sampleHeight,
          x,
          y,
          drawWidth,
          drawHeight
        );
      }
    }

    const highlight = context.createLinearGradient(0, 0, 0, rect.height);
    highlight.addColorStop(0, `rgba(255, 255, 255, ${0.18 - theme * 0.08})`);
    highlight.addColorStop(0.42, "rgba(255, 255, 255, 0)");
    highlight.addColorStop(1, `rgba(90, 150, 255, ${theme * 0.035})`);
    context.fillStyle = highlight;
    context.fillRect(0, 0, rect.width, rect.height);
  }
}

function resize() {
  const { width, height } = canvas.getBoundingClientRect();
  const compact = width < 720;
  compactLayout = compact;

  renderer.setSize(width, height, false);
  camera.position.set(0, 0, compact ? 9.55 : 8.6);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  cubeGroup.position.y = compact ? 0.16 : 0.3;
  cubeGroup.scale.setScalar(compact ? 0.86 : 1.02);
  material.uniforms.uPixelRatio.value = renderer.getPixelRatio();
  updateHeroProgress();
}

function initializeScreenScatter() {
  const viewHalfHeight =
    Math.tan(THREE.MathUtils.degToRad(camera.fov * 0.5)) * camera.position.z;
  const viewHalfWidth = viewHalfHeight * camera.aspect;

  for (let i = 0; i < PARTICLE_COUNT; i += 1) {
    const introX = (hash(i, 101) * 2 - 1) * viewHalfWidth * 1.08;
    const introY = (hash(i, 102) * 2 - 1) * viewHalfHeight * 1.08;
    const introZ = (hash(i, 103) * 2 - 1) * 2.1;
    const scrollX = (hash(i, 111) * 2 - 1) * viewHalfWidth * 1.16;
    const scrollY = (hash(i, 112) * 2 - 1) * viewHalfHeight * 1.16;
    const scrollZ = (hash(i, 113) * 2 - 1) * 2.4;

    setPoint(introPositions, i, introX, introY, introZ);
    setPoint(scrollScatterPositions, i, scrollX, scrollY, scrollZ);
  }

  introStartTime = clock.elapsedTime;
  introActive = true;
  positions.set(introPositions);
  geometry.attributes.position.needsUpdate = true;
}

function clamp01(value) {
  return Math.min(Math.max(value, 0), 1);
}

function updateHeroProgress() {
  if (!heroStage || !hero) return;

  const scrollable = Math.max(hero.offsetHeight - window.innerHeight, 1);
  const raw = clamp01(-hero.getBoundingClientRect().top / scrollable);
  const revealStart = compactLayout ? 0.12 : 0.08;
  const revealDuration = compactLayout ? 0.58 : 0.3;
  const reveal = smooth01(clamp01((raw - revealStart) / revealDuration));
  scrollScatterTarget = smooth01(clamp01((raw - 0.7) / 0.3));

  revealTarget = reveal;
}

function updatePointerFromEvent(event) {
  const rect = canvas.getBoundingClientRect();
  const x = (event.clientX - rect.left) / rect.width;
  const y = (event.clientY - rect.top) / rect.height;

  pointerInside = x >= 0 && x <= 1 && y >= 0 && y <= 1;

  if (!pointerInside) return;

  const now = performance.now();
  if (lastPointerTime > 0) {
    const seconds = Math.max((now - lastPointerTime) / 1000, 0.016);
    const distance = Math.hypot(x - lastPointerX, y - lastPointerY);
    const instantSpeed = Math.min(distance / seconds, 8);
    pointerSpeed += (instantSpeed - pointerSpeed) * 0.55;
    pointerDeltaX = (x - lastPointerX) / seconds;
    pointerDeltaY = (y - lastPointerY) / seconds;
  }

  lastPointerX = x;
  lastPointerY = y;
  lastPointerTime = now;
  pointer.x = x * 2 - 1;
  pointer.y = -(y * 2 - 1);
}

function deactivatePointer(resetMotion = false) {
  pointerInside = false;
  lastPointerTime = 0;

  if (!resetMotion) return;

  pointerSpeed = 0;
  pointerDeltaX = 0;
  pointerDeltaY = 0;
  localMouseVelocity.set(0, 0, 0);
}

function releaseTouchPointer(event) {
  if (event.pointerType === "mouse") return;
  deactivatePointer(true);
}

function applyMouseImpulse() {
  if (!pointerInside) return;

  let impactedParticles = 0;
  cubeGroup.updateMatrixWorld();
  raycaster.setFromCamera(pointer, camera);
  inverseCubeMatrix.copy(cubeGroup.matrixWorld).invert();
  localRay.copy(raycaster.ray).applyMatrix4(inverseCubeMatrix);

  const speedImpact = THREE.MathUtils.smoothstep(pointerSpeed, 0.24, 3.7);
  const radius = THREE.MathUtils.lerp(0.36, 0.92, speedImpact);
  const radiusSq = radius * radius;
  const orbitLift = THREE.MathUtils.lerp(0.03, 0.78, speedImpact);
  const orbitRadius = THREE.MathUtils.lerp(0.12, CUBE_SIZE * 0.55, speedImpact);
  const driftPower = THREE.MathUtils.lerp(0.006, 0.21, speedImpact);

  cameraRight.set(1, 0, 0).applyQuaternion(camera.quaternion);
  cameraUp.set(0, 1, 0).applyQuaternion(camera.quaternion);
  localMouseVelocity
    .copy(cameraRight)
    .multiplyScalar(pointerDeltaX)
    .addScaledVector(cameraUp, -pointerDeltaY)
    .transformDirection(inverseCubeMatrix);

  if (localMouseVelocity.lengthSq() < 0.0001) {
    localMouseVelocity.set(localRay.direction.x, localRay.direction.y, localRay.direction.z).multiplyScalar(-1);
  } else {
    localMouseVelocity.normalize();
  }

  for (let i = 0; i < PARTICLE_COUNT; i += 1) {
    const offset = i * 3;
    const px = positions[offset];
    const py = positions[offset + 1];
    const pz = positions[offset + 2];

    const toX = px - localRay.origin.x;
    const toY = py - localRay.origin.y;
    const toZ = pz - localRay.origin.z;
    const depth = toX * localRay.direction.x + toY * localRay.direction.y + toZ * localRay.direction.z;

    if (depth < 0) continue;

    const closestX = localRay.origin.x + localRay.direction.x * depth;
    const closestY = localRay.origin.y + localRay.direction.y * depth;
    const closestZ = localRay.origin.z + localRay.direction.z * depth;
    const awayX = px - closestX;
    const awayY = py - closestY;
    const awayZ = pz - closestZ;
    const distanceSq = awayX * awayX + awayY * awayY + awayZ * awayZ;

    if (distanceSq > radiusSq) continue;

    const distance = Math.sqrt(distanceSq) || 0.0001;
    const hit = 1 - distance / radius;
    const seed = seeds[i];
    const directHit = hit * hit;
    const outward = orbitRadius * 0.22 * directHit;
    const inheritedMotion = driftPower * directHit * (0.65 + seed * 0.7);

    if (directHit > 0.025) {
      impactedParticles += 1;
    }

    scatterLife[i] = Math.min(1, scatterLife[i] + directHit * orbitLift);
    orbitRadii[i] = Math.max(orbitRadii[i], orbitRadius * directHit * (0.76 + seed * 0.45));
    orbitOffsets[offset] += (awayX / distance) * outward;
    orbitOffsets[offset + 1] += (awayY / distance) * outward;
    orbitOffsets[offset + 2] += (awayZ / distance) * outward;
    driftVelocities[offset] +=
      (localMouseVelocity.x * 1.25 + (awayX / distance) * 0.55) * inheritedMotion;
    driftVelocities[offset + 1] +=
      (localMouseVelocity.y * 1.25 + (awayY / distance) * 0.55) * inheritedMotion;
    driftVelocities[offset + 2] +=
      (localMouseVelocity.z * 1.25 + (awayZ / distance) * 0.55) * inheritedMotion;
  }

  if (impactedParticles > 0 && pointerSpeed > 0.035 && morphProgress >= 1) {
    freshInteraction = true;
  }

  chaosLevel = Math.min(1, chaosLevel + speedImpact * 0.07);
}

function startShapeMorph() {
  const availableShapes = shapePositions
    .map((_, index) => index)
    .filter((index) => index !== currentShapeIndex && index !== previousShapeIndex);
  const nextShapeIndex =
    availableShapes[Math.floor(Math.random() * availableShapes.length)] ??
    (currentShapeIndex + 1) % shapePositions.length;

  morphFromPositions.set(basePositions);
  morphToPositions.set(shapePositions[nextShapeIndex]);
  previousShapeIndex = currentShapeIndex;
  currentShapeIndex = nextShapeIndex;
  morphProgress = 0;
  morphCooldown = 3.2;
  surfaceFlowBlend = 0;
  morphArmed = false;
  morphQueued = false;
  freshInteraction = false;
}

function updateShapeMorph(delta) {
  if (morphCooldown > 0) {
    morphCooldown = Math.max(0, morphCooldown - delta);
  }

  if (morphProgress >= 1) return;

  morphProgress = Math.min(1, morphProgress + delta * 0.26);
  const eased = smooth01(morphProgress);

  for (let i = 0; i < basePositions.length; i += 1) {
    basePositions[i] = THREE.MathUtils.lerp(morphFromPositions[i], morphToPositions[i], eased);
  }
}

function updateParticles(delta, elapsed) {
  let activeChaos = 0;
  let displacedCount = 0;
  const scrollEase = 1 - Math.exp(-delta * 6.2);
  const revealEase = 1 - Math.exp(-delta * (compactLayout ? 3.8 : 7.2));

  revealProgress += (revealTarget - revealProgress) * revealEase;
  scrollScatterProgress +=
    (scrollScatterTarget - scrollScatterProgress) * scrollEase;
  const copyExit = smooth01(clamp01(scrollScatterProgress));
  const copyOpacity = revealProgress * (1 - copyExit);
  const copyY = Math.round(64 - revealProgress * 64 - copyExit * 140);
  const copyScale = 0.96 + revealProgress * 0.04 - copyExit * 0.015;
  heroStage.style.setProperty("--copy-opacity", copyOpacity.toFixed(3));
  heroStage.style.setProperty("--copy-y", `${copyY}px`);
  heroStage.style.setProperty("--copy-scale", copyScale.toFixed(3));
  heroStage.style.setProperty("--copy-events", copyOpacity > 0.92 ? "auto" : "none");

  const wasMorphing = morphProgress < 1;
  updateShapeMorph(delta);
  const morphCompleted = wasMorphing && morphProgress >= 1;

  if (morphCompleted) {
    morphArmed = true;
    morphQueued = false;
    freshInteraction = false;
  }

  if (morphProgress >= 1) {
    if (currentShapeIndex === ORGANIC_SHAPE_INDEX) {
      updateOrganicSurface(elapsed);
    } else {
      if (wasMorphing) {
        surfaceFlowBlend = 0;
        surfaceFlowEpoch = elapsed;
      }

      surfaceFlowBlend = Math.min(1, surfaceFlowBlend + delta * 0.52);
      updateLightSurfaceFlow(Math.max(0, elapsed - surfaceFlowEpoch));
      const flowBlend = smooth01(surfaceFlowBlend);
      const staticShape = shapePositions[currentShapeIndex];

      for (let i = 0; i < basePositions.length; i += 1) {
        basePositions[i] = THREE.MathUtils.lerp(staticShape[i], basePositions[i], flowBlend);
      }
    }
  }

  const introRaw = introActive
    ? clamp01((elapsed - introStartTime - 0.18) / 3.2)
    : 1;
  const introBlend = smooth01(introRaw);

  if (introRaw >= 1) {
    introActive = false;
  }

  for (let i = 0; i < PARTICLE_COUNT; i += 1) {
    const offset = i * 3;
    const life = scatterLife[i];
    const settle = smooth01(clamp01(life));
    const returnPull = 0.00032 + (1 - settle) * 0.00028;
    const breathing = 1 + Math.sin(elapsed * 0.9) * 0.055;
    const restX = basePositions[offset] * breathing;
    const restY = basePositions[offset + 1] * breathing;
    const restZ = basePositions[offset + 2] * breathing;

    driftVelocities[offset] += -orbitOffsets[offset] * returnPull;
    driftVelocities[offset + 1] += -orbitOffsets[offset + 1] * returnPull;
    driftVelocities[offset + 2] += -orbitOffsets[offset + 2] * returnPull;
    orbitOffsets[offset] += driftVelocities[offset] * delta * 60;
    orbitOffsets[offset + 1] += driftVelocities[offset + 1] * delta * 60;
    orbitOffsets[offset + 2] += driftVelocities[offset + 2] * delta * 60;
    driftVelocities[offset] *= 0.985;
    driftVelocities[offset + 1] *= 0.985;
    driftVelocities[offset + 2] *= 0.985;

    const radius = orbitRadii[i] * settle;
    const phase =
      orbitPhases[i] +
      elapsed * orbitSpeeds[i] +
      Math.sin(elapsed * 0.12 + seeds[i] * 12.0) * 0.18;
    const ellipse = 0.55 + seeds[i] * 0.38;

    const assembledX =
      restX +
      orbitOffsets[offset] * settle +
      orbitAxesA[offset] * Math.cos(phase) * radius +
      orbitAxesB[offset] * Math.sin(phase) * radius * ellipse;
    const assembledY =
      restY +
      orbitOffsets[offset + 1] * settle +
      orbitAxesA[offset + 1] * Math.cos(phase) * radius +
      orbitAxesB[offset + 1] * Math.sin(phase) * radius * ellipse;
    const assembledZ =
      restZ +
      orbitOffsets[offset + 2] * settle +
      orbitAxesA[offset + 2] * Math.cos(phase) * radius +
      orbitAxesB[offset + 2] * Math.sin(phase) * radius * ellipse;
    const introX = THREE.MathUtils.lerp(introPositions[offset], assembledX, introBlend);
    const introY = THREE.MathUtils.lerp(introPositions[offset + 1], assembledY, introBlend);
    const introZ = THREE.MathUtils.lerp(introPositions[offset + 2], assembledZ, introBlend);

    positions[offset] = THREE.MathUtils.lerp(
      introX,
      scrollScatterPositions[offset],
      scrollScatterProgress
    );
    positions[offset + 1] = THREE.MathUtils.lerp(
      introY,
      scrollScatterPositions[offset + 1],
      scrollScatterProgress
    );
    positions[offset + 2] = THREE.MathUtils.lerp(
      introZ,
      scrollScatterPositions[offset + 2],
      scrollScatterProgress
    );

    scatterLife[i] *= Math.pow(0.9965, delta * 60);
    orbitRadii[i] *= Math.pow(0.9982, delta * 60);
    activeChaos += scatterLife[i];

    const effectiveDisplacement =
      Math.hypot(orbitOffsets[offset], orbitOffsets[offset + 1], orbitOffsets[offset + 2]) *
        settle +
      radius;

    if (
      settle > 0.045 ||
      effectiveDisplacement > 0.085
    ) {
      displacedCount += 1;
    }

  }

  const displacedRatio = displacedCount / PARTICLE_COUNT;

  if (
    morphArmed &&
    freshInteraction &&
    morphProgress >= 1 &&
    displacedRatio > 0.42
  ) {
    morphArmed = false;
    morphQueued = true;
    freshInteraction = false;
  }

  if (
    morphQueued &&
    morphCooldown <= 0 &&
    morphProgress >= 1 &&
    pointerSpeed < 0.16
  ) {
    morphQueued = false;
    startShapeMorph();
  }

  chaosLevel += (activeChaos / PARTICLE_COUNT - chaosLevel) * 0.025;
  pointerSpeed *= Math.pow(0.82, delta * 60);
  pointerDeltaX *= Math.pow(0.68, delta * 60);
  pointerDeltaY *= Math.pow(0.68, delta * 60);
  geometry.attributes.position.needsUpdate = true;
}

function setSceneMode(mode, initialize = false) {
  darkMode = mode === "dark";
  themeBlendTarget = darkMode ? 1 : 0;
  document.documentElement.dataset.sceneMode = darkMode ? "dark" : "light";

  modeButtons.forEach((button) => {
    button.setAttribute(
      "aria-pressed",
      button.dataset.sceneMode === (darkMode ? "dark" : "light") ? "true" : "false"
    );
  });

  if (!initialize) return;

  material.uniforms.uDarkMode.value = themeBlendTarget;
  orbitOffsets.fill(0);
  driftVelocities.fill(0);
  scatterLife.fill(0);
  orbitRadii.fill(CUBE_SIZE * 0.08);
  currentShapeIndex = ORGANIC_SHAPE_INDEX;
  previousShapeIndex = -1;
  morphProgress = 1;
  morphCooldown = 0.8;
  surfaceFlowBlend = 1;
  surfaceFlowEpoch = clock.elapsedTime;
  morphArmed = true;
  morphQueued = false;
  freshInteraction = false;
  updateOrganicSurface(clock.elapsedTime);

  positions.set(basePositions);
  geometry.attributes.position.needsUpdate = true;
}

function animate() {
  const delta = clock.getDelta();
  const elapsed = clock.elapsedTime;

  applyMouseImpulse();
  updateParticles(delta, elapsed);
  material.uniforms.uTime.value = elapsed;
  const themeEase = 1 - Math.exp(-delta * 5.5);
  material.uniforms.uDarkMode.value +=
    (themeBlendTarget - material.uniforms.uDarkMode.value) * themeEase;

  cubeGroup.rotation.x += 0.075 * delta;
  cubeGroup.rotation.y += 0.13 * delta;
  cubeGroup.rotation.z = Math.sin(elapsed * 0.18) * 0.06;

  const targetY = revealProgress * (compactLayout ? 0.16 : 0.22);
  const targetScale = (compactLayout ? 0.86 : 1.02) - revealProgress * 0.03;
  cubeGroup.position.y += (targetY - cubeGroup.position.y) * 0.08;
  const nextScale = cubeGroup.scale.x + (targetScale - cubeGroup.scale.x) * 0.08;
  cubeGroup.scale.setScalar(nextScale);

  renderer.render(scene, camera);
  animationFrame = requestAnimationFrame(animate);
}

function destroy() {
  cancelAnimationFrame(animationFrame);
  geometry.dispose();
  material.dispose();
  renderer.dispose();
}

function resetInitialScroll() {
  if (window.location.hash) {
    history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
  }

  const previousScrollBehavior = document.documentElement.style.scrollBehavior;
  document.documentElement.style.scrollBehavior = "auto";
  window.scrollTo(0, 0);

  requestAnimationFrame(() => {
    window.scrollTo(0, 0);
    updateHeroProgress();
    document.documentElement.style.scrollBehavior = previousScrollBehavior;
  });
}

window.addEventListener("resize", resize);
window.addEventListener("scroll", updateHeroProgress, { passive: true });
window.addEventListener("pointermove", updatePointerFromEvent, { passive: true });
window.addEventListener("pointerup", releaseTouchPointer, { passive: true });
window.addEventListener("pointercancel", releaseTouchPointer, { passive: true });
window.addEventListener("pointerleave", () => deactivatePointer(true));
window.addEventListener("blur", () => deactivatePointer(true));
window.addEventListener("pagehide", destroy, { once: true });
window.addEventListener("pageshow", resetInitialScroll, { once: true });

resetInitialScroll();

modeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setSceneMode(button.dataset.sceneMode);
  });
});

const revealObserver = new IntersectionObserver(
  (entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
    });
  },
  {
    threshold: 0.12,
    rootMargin: "0px 0px -8% 0px",
  }
);

document.querySelectorAll("[data-stagger]").forEach((group) => {
  group.querySelectorAll("[data-reveal]").forEach((element, index) => {
    element.style.setProperty("--reveal-delay", `${index * 85}ms`);
  });
});

document.querySelectorAll("[data-reveal]").forEach((element, index) => {
  if (!element.style.getPropertyValue("--reveal-delay")) {
    element.style.setProperty("--reveal-delay", `${Math.min(index % 3, 2) * 60}ms`);
  }
  revealObserver.observe(element);
});

document.querySelector("[data-contact-form]")?.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  const subject = encodeURIComponent(`Новый проект — ${data.get("name")}`);
  const body = encodeURIComponent(
    `Имя: ${data.get("name")}\nКонтакт: ${data.get("contact")}\n\nО проекте:\n${data.get("message")}`
  );
  window.location.href = `mailto:hello@byte.studio?subject=${subject}&body=${body}`;
});

resize();
setSceneMode("dark", true);
initializeScreenScatter();
updateHeroProgress();
animate();
