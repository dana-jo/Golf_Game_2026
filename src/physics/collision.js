import { v3 } from './vectors.js';
import { WORLD_CONSTANTS } from './constants.js';

const MAX_SLOPE_ANGLE = 25 * (Math.PI / 180);
const MIN_NORMAL_Y = Math.cos(MAX_SLOPE_ANGLE);
const NORMAL_SAMPLE_EPS = 1.0;

export function flatGroundHeight(world = WORLD_CONSTANTS) {
  return () => world.groundY;
}

export function checkGroundCollision(state, getGroundHeight, epsilon = 0.04) {
  const groundY = getGroundHeight(state.position.x, state.position.z);
  if (groundY === null) return { collided: false, grounded: false, groundY: null };
  const grounded = state.position.y <= groundY + epsilon;
  const collided = grounded && state.velocity.y < -0.35;
  return { collided, grounded, groundY };
}

export function clampNormalSlope(normal) {
  if (normal.y >= MIN_NORMAL_Y) return normal;

  const horiz = Math.hypot(normal.x, normal.z);
  if (horiz < 1e-6) return v3(0, 1, 0);

  const horizScale = Math.sqrt(1 - MIN_NORMAL_Y * MIN_NORMAL_Y) / horiz;
  return {
    x: normal.x * horizScale,
    y: MIN_NORMAL_Y,
    z: normal.z * horizScale,
  };
}

export function estimateGroundNormal(getGroundHeight, x, z, eps = NORMAL_SAMPLE_EPS) {
  const hL = getGroundHeight(x - eps, z);
  const hR = getGroundHeight(x + eps, z);
  const hD = getGroundHeight(x, z - eps);
  const hU = getGroundHeight(x, z + eps);

  if (hL === null || hR === null || hD === null || hU === null) {
    return v3(0, 1, 0);
  }

  const dHdx = (hR - hL) / (2 * eps);
  const dHdz = (hU - hD) / (2 * eps);
  const n = { x: -dHdx, y: 1, z: -dHdz };
  const len = Math.sqrt(n.x * n.x + n.y * n.y + n.z * n.z);
  if (len < 1e-6) return v3(0, 1, 0);
  return clampNormalSlope({ x: n.x / len, y: n.y / len, z: n.z / len });
}

export function resolveGroundNormal(x, z, {
  getCenterGroundHeight = null,
  getGroundHeight = null,
} = {}) {
  const heightSampler = getCenterGroundHeight || getGroundHeight;
  if (heightSampler) {
    return estimateGroundNormal(heightSampler, x, z);
  }
  return v3(0, 1, 0);
}

export function resolveGroundHeight(x, z, {
  getCenterGroundHeight = null,
  getGroundHeight = null,
} = {}) {
  if (getCenterGroundHeight) {
    const centerY = getCenterGroundHeight(x, z);
    if (centerY !== null) return centerY;
  }
  return getGroundHeight ? getGroundHeight(x, z) : null;
}

export function slopeDegreesFromNormal(normal) {
  return Math.acos(Math.min(1, Math.max(-1, normal.y))) * (180 / Math.PI);
}
