import { add, scale, dot, sub, normalize, length, v3 } from './vectors.js';

// Ignore mesh noise below ~0.9°.
const FLAT_SLOPE_THRESHOLD = 0.15;

export function lerpNormal(current, target, alpha) {
  return normalize(v3(
    current.x + (target.x - current.x) * alpha,
    current.y + (target.y - current.y) * alpha,
    current.z + (target.z - current.z) * alpha,
  ));
}

export function keepOnSurface(velocity, normal) {
  const intoSurface = dot(velocity, normal);
  return intoSurface < 0 ? sub(velocity, scale(normal, intoSurface)) : velocity;
}

export function updateSmoothedNormal(state, rawNormal, alpha = 0.12) {
  if (!state.groundNormal) {
    state.groundNormal = { ...rawNormal };
    return state.groundNormal;
  }
  const alignment = dot(state.groundNormal, rawNormal);
  const blend = alignment < 0.995 ? Math.min(0.55, alpha * 4) : alpha;
  state.groundNormal = lerpNormal(state.groundNormal, rawNormal, blend);
  return state.groundNormal;
}

export function canRestOnSlope(gSlope, resistAccel) {
  return gSlope < FLAT_SLOPE_THRESHOLD || gSlope <= resistAccel * 0.98;
}

function enforceFlatDecel(accel, dir, minDecel, slopeAlongMotion) {
  if (Math.abs(slopeAlongMotion) > FLAT_SLOPE_THRESHOLD) return accel;

  const along = dot(accel, dir);
  if (along > -minDecel) {
    return scale(dir, -minDecel);
  }
  return accel;
}

export function groundRollingAccel(velocity, gTangential, rollingResistAccel) {
  const gSlope = length(gTangential);
  const sh = length(velocity);

  if (sh < 1e-6) {
    if (gSlope > rollingResistAccel + FLAT_SLOPE_THRESHOLD) {
      const downhill = normalize(gTangential);
      return scale(downhill, gSlope - rollingResistAccel);
    }
    return v3(0, 0, 0);
  }

  const dir = normalize(velocity);
  const slopeAlongMotion = dot(gTangential, dir);

  // Rolling resistance + gravity along the surface; extra drag at high downhill speed.
  let resist = rollingResistAccel;
  if (slopeAlongMotion > FLAT_SLOPE_THRESHOLD) {
    resist += sh * 0.06;
  }

  const accel = add(scale(dir, -resist), gTangential);
  return enforceFlatDecel(accel, dir, rollingResistAccel, slopeAlongMotion);
}

export function groundSlidingAccel(velocity, gTangential, frictionAccelMag, rollingResistAccel) {
  const gSlope = length(gTangential);
  const sh = length(velocity);
  const minDecel = Math.max(rollingResistAccel, frictionAccelMag * 0.25);

  if (sh < 1e-6) {
    if (gSlope > minDecel + FLAT_SLOPE_THRESHOLD) {
      const downhill = normalize(gTangential);
      return scale(downhill, gSlope - minDecel);
    }
    return v3(0, 0, 0);
  }

  const dir = normalize(velocity);
  const slopeAlongMotion = dot(gTangential, dir);
  const downhill = slopeAlongMotion > FLAT_SLOPE_THRESHOLD;

  // Full mu_k on flat/uphill; reduced while skidding downhill so gravity can win.
  const linearResist = downhill
    ? Math.max(rollingResistAccel, frictionAccelMag * 0.22)
    : frictionAccelMag;

  const accel = add(scale(dir, -linearResist), gTangential);
  return enforceFlatDecel(accel, dir, minDecel, slopeAlongMotion);
}

export function applyGroundDrag(velocity, groundDrag, dt, slopeAlongMotion = 0) {
  let drag = groundDrag;
  if (slopeAlongMotion > FLAT_SLOPE_THRESHOLD) {
    drag *= 0.12;
  } else if (slopeAlongMotion < -FLAT_SLOPE_THRESHOLD) {
    drag *= 0.5;
  }
  const factor = Math.max(0, 1 - drag * dt);
  return scale(velocity, factor);
}

export function setLastAccel(state, accel) {
  state.lastAccel = { x: accel.x, y: accel.y, z: accel.z };
}
