// Section 3 — sliding: friction opposes motion, spin handled separately.
import { add, sub, scale, cross, dot, length, normalize, v3, projectOnPlane } from './vectors.js';
import { resolveGroundNormal } from './collision.js';
import { PHASES } from './state.js';
import {
  updateSmoothedNormal,
  keepOnSurface,
  groundSlidingAccel,
  applyGroundDrag,
  setLastAccel,
  canRestOnSlope,
} from './groundContact.js';

const CRAWL_SPEED = 0.35;
const SLIP_TO_ROLLING = 0.25;

export function stepSliding(state, dt, groundY, ball, world, physics, groundSampling) {
  const contactR = ball.sceneR ?? ball.R;
  const rawNormal = groundSampling
    ? resolveGroundNormal(state.position.x, state.position.z, groundSampling)
    : v3(0, 1, 0);
  const n = updateSmoothedNormal(state, rawNormal);

  state.position.y = groundY;
  state.velocity = keepOnSurface(state.velocity, n);

  const sh = length(state.velocity);
  const gVec = v3(0, -world.g, 0);
  const gTangential = projectOnPlane(gVec, rawNormal);
  const gSlope = length(gTangential);
  const normalLoad = Math.max(-dot(gVec, rawNormal), 0);
  const rollingResistAccel = physics.rollingResistance * normalLoad;
  const frictionAccelMag = physics.muK * normalLoad;
  const groundDrag = physics.groundDrag ?? 0.3;
  const slopeAlongMotion = sh > 1e-6 ? dot(gTangential, normalize(state.velocity)) : 0;

  // Downhill: roll instead of skidding to a halt under full kinetic friction.
  if (slopeAlongMotion > rollingResistAccel * 0.9 && sh > world.stopSpeed * 0.4) {
    state.phase = PHASES.ROLLING;
    return state;
  }

  if (sh < CRAWL_SPEED && canRestOnSlope(gSlope, rollingResistAccel)) {
    state.phase = PHASES.STOPPED;
    state.velocity = v3(0, 0, 0);
    state.angularVelocity = v3(0, 0, 0);
    setLastAccel(state, v3(0, 0, 0));
    return state;
  }

  if (sh < 1e-6) {
    const accel = groundSlidingAccel(state.velocity, gTangential, frictionAccelMag, rollingResistAccel);
    setLastAccel(state, accel);
    const kick = add(state.velocity, scale(accel, dt));
    if (length(kick) > world.stopSpeed) {
      state.velocity = kick;
      state.phase = PHASES.ROLLING;
    }
    return state;
  }

  const dir = normalize(state.velocity);
  const backspinAxis = normalize(cross(n, dir));
  const omega = dot(state.angularVelocity, backspinAxis);
  const slip = sh - omega * contactR;
  const slipRatio = Math.abs(slip) / sh;

  if (slipRatio < SLIP_TO_ROLLING || Math.abs(slip) < 0.4) {
    state.phase = PHASES.ROLLING;
    return state;
  }

  const sign = Math.sign(slip) || 1;
  const accel = groundSlidingAccel(state.velocity, gTangential, frictionAccelMag, rollingResistAccel);
  setLastAccel(state, accel);

  let newVelocity = add(state.velocity, scale(accel, dt));
  newVelocity = keepOnSurface(newVelocity, n);
  newVelocity = applyGroundDrag(newVelocity, groundDrag, dt, slopeAlongMotion);
  state.velocity = newVelocity;

  state.position.x += state.velocity.x * dt;
  state.position.z += state.velocity.z * dt;

  const alpha = sign * (5 * frictionAccelMag) / (2 * contactR);
  const newOmega = omega + alpha * dt;
  state.angularVelocity = add(
    sub(state.angularVelocity, scale(backspinAxis, omega)),
    scale(backspinAxis, newOmega)
  );

  const newSh = length(state.velocity);
  const newSlip = newSh - newOmega * contactR;
  if (Math.abs(newSlip) / Math.max(newSh, 0.1) < SLIP_TO_ROLLING) {
    if (newSh > world.stopSpeed || !canRestOnSlope(gSlope, rollingResistAccel)) {
      state.phase = PHASES.ROLLING;
    }
  }

  if (newSh < world.stopSpeed && canRestOnSlope(gSlope, rollingResistAccel)) {
    state.phase = PHASES.STOPPED;
    state.velocity = v3(0, 0, 0);
    state.angularVelocity = v3(0, 0, 0);
    setLastAccel(state, v3(0, 0, 0));
  }

  return state;
}
