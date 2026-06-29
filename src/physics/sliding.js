// Section 3 
import { add, sub, scale, cross, dot, length, normalize, v3 } from './vectors.js';
import { estimateGroundNormal } from './collision.js';

export function stepSliding(state, dt, groundY, ball, world, physics , getGroundHeight) {
  state.velocity.y = 0;
  state.position.y = groundY;

  const horizVel = v3(state.velocity.x, 0, state.velocity.z);
  const sh = length(horizVel);

  const dir = sh > 1e-6 ? normalize(horizVel) : v3(0, 0, 0);
  const up = getGroundHeight
    ? estimateGroundNormal(getGroundHeight, state.position.x, state.position.z)
    : v3(0, 1, 0);
  const backspinAxis = normalize(cross(up, dir.x || dir.z ? dir : up));
  const omega = dot(state.angularVelocity, backspinAxis);

  const slip = sh - omega * ball.R; 

  if (Math.abs(slip) < 1e-3) {
    state.phase = 'rolling';
    return state;
  }

  const sign = Math.sign(slip);
  // Section 3.10: 
  const a = -sign * physics.muK * world.g;
  const alpha = sign * (5 * physics.muK * world.g) / (2 * ball.R);

  const newSh = Math.max(sh + a * dt, 0);
  state.velocity.x = dir.x * newSh;
  state.velocity.z = dir.z * newSh;
  state.position.x += state.velocity.x * dt;
  state.position.z += state.velocity.z * dt;

  const newOmega = omega + alpha * dt;
  state.angularVelocity = add(
    sub(state.angularVelocity, scale(backspinAxis, omega)),
    scale(backspinAxis, newOmega)
  );

  if (Math.sign(newSh - newOmega * ball.R) !== sign || Math.abs(newSh - newOmega * ball.R) < 1e-3) {
    state.phase = 'rolling';
  }

  return state;
}
