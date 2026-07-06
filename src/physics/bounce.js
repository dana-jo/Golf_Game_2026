// groundY passed from collision.js's getGroundHeight


import { add, sub, scale, cross, dot, length, normalize, v3, projectOnPlane } from './vectors.js';
import { ballInertia } from './constants.js';
import { estimateGroundNormal } from './collision.js';

const BOUNCE_LIFTOFF_VN = 0.5; 

export function resolveBounce(state, groundY, ball, physics, getGroundHeight) {
  state.position.y = groundY;

  const n = getGroundHeight
    ? estimateGroundNormal(getGroundHeight, state.position.x, state.position.z)
    : v3(0, 1, 0);

  // Split velocity 
  const vn1 = dot(state.velocity, n); // negative: ball moving into the surface
  const vTangential = projectOnPlane(state.velocity, n);

  // Section 2.4: e acts on the normal component of velocity.
  const vn2 = -physics.e * vn1;

  const sh = length(vTangential);

  // Normal impulse magnitude, used to cap how much friction can act (Coulomb limit).
  const jn = ball.m * (1 + physics.e) * Math.abs(vn1);

  if (sh < 1e-6) {
    state.velocity = scale(n, vn2);
    state.phase = vn2 > BOUNCE_LIFTOFF_VN ? 'flight' : 'sliding';
    return state;
  }

  const dir = normalize(vTangential);
  const backspinAxis = normalize(cross(n, dir));
  const omega1 = dot(state.angularVelocity, backspinAxis);

  const inertia = ballInertia(ball.m, ball.R);

  // Section 2.6: vx2 = 5/7 vx1 - 2/7 R*omega1, derived here via the tangential impulse.
  const jtDesired = -(2 / 7) * ball.m * (sh + ball.R * omega1);
  const jtMax = physics.muK * jn;
  const jt = Math.sign(jtDesired) * Math.min(Math.abs(jtDesired), jtMax);

  const shNew = Math.max(sh + jt / ball.m, 0);
  const omega2 = omega1 - (ball.R * jt) / inertia; // I*(omega2-omega1) = -R*Jt

  const newTangential = scale(dir, shNew);
  state.velocity = add(scale(n, vn2), newTangential);

  const deltaOmega = omega2 - omega1;
  state.angularVelocity = add(state.angularVelocity, scale(backspinAxis, deltaOmega));

  state.phase = vn2 > BOUNCE_LIFTOFF_VN ? 'flight' : 'sliding';
  return state;
}
