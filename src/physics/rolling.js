// Section 3.6 — rolling: uphill brakes, downhill rolls, flat stops.
import { add, sub, scale, cross, dot, length, normalize, v3, projectOnPlane } from './vectors.js';
import { resolveGroundNormal } from './collision.js';
import { PHASES } from './state.js';
import {
  updateSmoothedNormal,
  keepOnSurface,
  groundRollingAccel,
  applyGroundDrag,
  setLastAccel,
  canRestOnSlope,
} from './groundContact.js';

const CRAWL_SPEED = 0.35;

export function stepRolling(state, dt, groundY, ball, world, physics, groundSampling) {
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
  const groundDrag = physics.groundDrag ?? 0.3;
  const slopeAlongMotion = sh > 1e-6 ? dot(gTangential, normalize(state.velocity)) : 0;

  const accel = groundRollingAccel(state.velocity, gTangential, rollingResistAccel);
  setLastAccel(state, accel);

  let newVelocity = add(state.velocity, scale(accel, dt));
  newVelocity = keepOnSurface(newVelocity, n);
  newVelocity = applyGroundDrag(newVelocity, groundDrag, dt, slopeAlongMotion);

  const newSpeed = length(newVelocity);

  if (newSpeed < CRAWL_SPEED || newSpeed < world.stopSpeed) {
    if (canRestOnSlope(gSlope, rollingResistAccel)) {
      state.phase = PHASES.STOPPED;
      state.velocity = v3(0, 0, 0);
      state.angularVelocity = v3(0, 0, 0);
      setLastAccel(state, v3(0, 0, 0));
      return state;
    }

    if (newSpeed < 1e-6 && gSlope > rollingResistAccel) {
      const downhill = normalize(gTangential);
      newVelocity = scale(downhill, 0.4);
    }
  }

  if (length(newVelocity) < world.stopSpeed && canRestOnSlope(gSlope, rollingResistAccel)) {
    state.phase = PHASES.STOPPED;
    state.velocity = v3(0, 0, 0);
    state.angularVelocity = v3(0, 0, 0);
    setLastAccel(state, v3(0, 0, 0));
    return state;
  }

  state.velocity = newVelocity;
  state.position.x += state.velocity.x * dt;
  state.position.z += state.velocity.z * dt;

  const newSh = length(state.velocity);
  if (newSh > 1e-6) {
    const newDir = normalize(state.velocity);
    const backspinAxis = normalize(cross(n, newDir));
    const omega = dot(state.angularVelocity, backspinAxis);
    const newOmegaMag = newSh / contactR;

    state.angularVelocity = add(
      sub(state.angularVelocity, scale(backspinAxis, omega)),
      scale(backspinAxis, newOmegaMag)
    );
  }

  return state;
}
