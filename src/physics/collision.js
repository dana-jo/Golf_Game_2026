import { WORLD_CONSTANTS } from './constants.js';

export function flatGroundHeight(world = WORLD_CONSTANTS) {
  return () => world.groundY;
}

export function checkGroundCollision(state, getGroundHeight) {
  const groundY = getGroundHeight(state.position.x, state.position.z);
  if (groundY === null) return { collided: false, groundY: null };
  const collided = state.position.y <= groundY && state.velocity.y < 0;
  return { collided, groundY };
}

export function estimateGroundNormal(getGroundHeight, x, z, eps = 0.05) {
  const hL = getGroundHeight(x - eps, z);
  const hR = getGroundHeight(x + eps, z);
  const hD = getGroundHeight(x, z - eps);
  const hU = getGroundHeight(x, z + eps);
  const dHdx = (hR - hL) / (2 * eps);
  const dHdz = (hU - hD) / (2 * eps);
  const n = { x: -dHdx, y: 1, z: -dHdz };
  const len = Math.sqrt(n.x * n.x + n.y * n.y + n.z * n.z);
  return { x: n.x / len, y: n.y / len, z: n.z / len };
}
