// Section 3.6: 
import { add, sub, scale, cross, dot, length, normalize, v3 } from './vectors.js';
import { estimateGroundNormal } from './collision.js';


export function stepRolling(state, dt, groundY, ball, world, physics, getGroundHeight) {
  state.velocity.y = 0;
  state.position.y = groundY;

  const horizVel = v3(state.velocity.x, 0, state.velocity.z);
  const sh = length(horizVel);

  if (sh < world.stopSpeed) {
    state.phase = 'stopped';
    state.velocity = v3(0, 0, 0);
    state.angularVelocity = v3(0, 0, 0);
    return state;
  }

  const dir = normalize(horizVel);
  const up = getGroundHeight
    ? estimateGroundNormal(getGroundHeight, state.position.x, state.position.z)
    : v3(0, 1, 0);
  const backspinAxis = normalize(cross(up, dir));
  const omega = dot(state.angularVelocity, backspinAxis);

  const decel = physics.rollingResistance * world.g;
  const newSh = Math.max(sh - decel * dt, 0);

  state.velocity.x = dir.x * newSh;
  state.velocity.z = dir.z * newSh;
  state.position.x += state.velocity.x * dt;
  state.position.z += state.velocity.z * dt;

  const newOmegaMag = newSh / ball.R;
  state.angularVelocity = add(
    sub(state.angularVelocity, scale(backspinAxis, omega)),
    scale(backspinAxis, newOmegaMag)
  );

  return state;
}
