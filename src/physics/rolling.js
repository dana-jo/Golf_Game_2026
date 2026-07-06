// Section 3.6 :
import { add, sub, scale, cross, dot, length, normalize, v3, projectOnPlane } from './vectors.js';
import { estimateGroundNormal } from './collision.js';

export function stepRolling(state, dt, groundY, ball, world, physics, getGroundHeight) {
  const n = getGroundHeight
    ? estimateGroundNormal(getGroundHeight, state.position.x, state.position.z)
    : v3(0, 1, 0);

  state.position.y = groundY;
  state.velocity = projectOnPlane(state.velocity, n);

  const sh = length(state.velocity);

  const gVec = v3(0, -world.g, 0);
  const gTangential = projectOnPlane(gVec, n); // downhill pull
  const normalLoad = -dot(gVec, n); // g*cos(slope)

  const dir =
    sh > 1e-6
      ? normalize(state.velocity)
      : length(gTangential) > 1e-6
        ? normalize(gTangential)
        : v3(0, 0, 0);

  const rollingResistAccel = physics.rollingResistance * normalLoad;
  const accel = sub(gTangential, scale(dir, rollingResistAccel));

  let newVelocity = add(state.velocity, scale(accel, dt));
  newVelocity = projectOnPlane(newVelocity, n);

  const canRestOnSlope = rollingResistAccel >= length(gTangential);

  if (length(newVelocity) < world.stopSpeed && canRestOnSlope) {
    state.phase = 'stopped';
    state.velocity = v3(0, 0, 0);
    state.angularVelocity = v3(0, 0, 0);
    return state;
  }

  state.velocity = newVelocity;
  state.position.x += state.velocity.x * dt;
  state.position.z += state.velocity.z * dt;

  const newSh = length(state.velocity);
  const newDir = newSh > 1e-6 ? normalize(state.velocity) : dir;
  const backspinAxis = normalize(cross(n, newDir));
  const omega = dot(state.angularVelocity, backspinAxis);
  const newOmegaMag = newSh / ball.R;

  state.angularVelocity = add(
    sub(state.angularVelocity, scale(backspinAxis, omega)),
    scale(backspinAxis, newOmegaMag)
  );

  return state;
}
