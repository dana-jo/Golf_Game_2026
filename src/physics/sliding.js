// Section 3 
import { add, sub, scale, cross, dot, length, normalize, v3, projectOnPlane } from './vectors.js';
import { estimateGroundNormal } from './collision.js';

export function stepSliding(state, dt, groundY, ball, world, physics, getGroundHeight) {
  const n = getGroundHeight
    ? estimateGroundNormal(getGroundHeight, state.position.x, state.position.z)
    : v3(0, 1, 0);

  state.position.y = groundY;

  state.velocity = projectOnPlane(state.velocity, n);

  const sh = length(state.velocity);
  const dir = sh > 1e-6 ? normalize(state.velocity) : v3(0, 0, 0);

  const backspinAxis = normalize(cross(n, sh > 1e-6 ? dir : n));
  const omega = dot(state.angularVelocity, backspinAxis);
  const slip = sh - omega * ball.R;

  if (Math.abs(slip) < 1e-3) {
    state.phase = 'rolling';
    return state;
  }

  const gVec = v3(0, -world.g, 0);
  const gTangential = projectOnPlane(gVec, n); // downhill pull, Section 3.7
  const normalLoad = -dot(gVec, n); // g*cos(slope), Section 3.2

  const sign = Math.sign(slip);
  const frictionAccelMag = physics.muK * normalLoad;
  const frictionDir =
    sh > 1e-6
      ? dir
      : length(gTangential) > 1e-6
        ? normalize(gTangential)
        : v3(0, 0, 0);

  // Section 3.3
  const accel = sub(gTangential, scale(frictionDir, sign * frictionAccelMag));

  let newVelocity = add(state.velocity, scale(accel, dt));
  newVelocity = projectOnPlane(newVelocity, n); 
  state.velocity = newVelocity;

  state.position.x += state.velocity.x * dt;
  state.position.z += state.velocity.z * dt;

  const alpha = sign * (5 * frictionAccelMag) / (2 * ball.R);
  const newOmega = omega + alpha * dt;
  state.angularVelocity = add(
    sub(state.angularVelocity, scale(backspinAxis, omega)),
    scale(backspinAxis, newOmega)
  );

  const newSh = length(state.velocity);
  const newSlip = newSh - newOmega * ball.R;
  if (Math.sign(newSlip) !== sign || Math.abs(newSlip) < 1e-3) {
    state.phase = 'rolling';
  }

  return state;
}
