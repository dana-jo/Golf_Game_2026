
import { add, scale, cross, length, normalize, v3 } from './vectors.js';
import { ballArea, ballInertia } from './constants.js';

function flightAcceleration(state, ball, world, physics) {
  const Vr = state.velocity; // here if we want to add wind 
  const speed = length(Vr);
  const area = ballArea(ball.R);
  const gravity = v3(0, -world.g, 0);

  if (speed < 1e-6) return gravity;

  // Section 1.2 : drag + magnus force
  const dragForce = scale(Vr, -0.5 * world.rho * physics.Cd * area * speed);

  const omegaCrossV = cross(state.angularVelocity, Vr);
  const eL = normalize(omegaCrossV);
  const magnusForce = scale(eL, 0.5 * world.rho * physics.Cl * area * speed * speed);

  return add(gravity, add(scale(dragForce, 1 / ball.m), scale(magnusForce, 1 / ball.m)));
}

function flightAngularAcceleration(state, ball, world, physics) {
  const speed = length(state.velocity);
  const omegaMag = length(state.angularVelocity);
  if (omegaMag < 1e-6 || speed < 1e-6) return v3(0, 0, 0);

  const area = ballArea(ball.R);
  const inertia = ballInertia(ball.m, ball.R);
  const omegaHat = normalize(state.angularVelocity);

  // Section 1.4:
  const magnitude = (2 * world.rho * physics.Ctau * area * ball.R * speed * speed) / inertia;
  return scale(omegaHat, -magnitude);
}

export function stepFlight(state, dt, ball, world, physics) {
  const accel = flightAcceleration(state, ball, world, physics);
  const alpha = flightAngularAcceleration(state, ball, world, physics);

  state.velocity = add(state.velocity, scale(accel, dt));
  state.position = add(state.position, scale(state.velocity, dt));
  state.angularVelocity = add(state.angularVelocity, scale(alpha, dt));

  return state;
}
