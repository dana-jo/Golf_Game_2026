// groundY passed from collision.js's getGroundHeight

import { add, scale, cross, dot, length, normalize, v3 } from './vectors.js';
import { ballInertia } from './constants.js';
import { estimateGroundNormal } from './collision.js';

const BOUNCE_LIFTOFF_VY = 0.5; 


export function resolveBounce(state, groundY, ball, physics , getGroundHeight) {
  state.position.y = groundY;
  const preBounceVz = state.velocity.y; // vz1

  // Section 2.4
  state.velocity.y = -physics.e * state.velocity.y;

  // Section 2.6 
  const horizVel = v3(state.velocity.x, 0, state.velocity.z);
  const sh = length(horizVel); 

  if (sh < 1e-6) {
    state.phase = state.velocity.y > BOUNCE_LIFTOFF_VY ? 'flight' : 'sliding';
    return state;
  }

  const dir = normalize(horizVel);
  const up = getGroundHeight ? 
    estimateGroundNormal(getGroundHeight, state.position.x, state.position.z)
   : v3(0, 1, 0);
  const backspinAxis = normalize(cross(up, dir));
  const omega1 = dot(state.angularVelocity, backspinAxis);

  const inertia = ballInertia(ball.m, ball.R);

  // Section 2.6 :
  const jtDesired = -(2 / 7) * ball.m * (sh + ball.R * omega1);

  const jn = ball.m * (1 + physics.e) * Math.abs(preBounceVz);
  const jtMax = physics.muK * jn;
  const jt = Math.sign(jtDesired) * Math.min(Math.abs(jtDesired), jtMax);

  const shNew = Math.max(sh + jt / ball.m, 0);
  const omega2 = omega1 - (ball.R * jt) / inertia; // I*(omega2-omega1) = -R*Jt

  state.velocity.x = dir.x * shNew;
  state.velocity.z = dir.z * shNew;

  const deltaOmega = omega2 - omega1;
  state.angularVelocity = add(state.angularVelocity, scale(backspinAxis, deltaOmega));


  state.phase = state.velocity.y > BOUNCE_LIFTOFF_VY ? 'flight' : 'sliding';
  return state;
}
