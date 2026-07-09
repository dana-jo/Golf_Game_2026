// Fallback defaults for physics when step() is called without overrides.
// Live tuning uses constantsStore.getStepOptions() from main.js.

import { DEFAULT_CONSTANTS } from '../constants.js';

export const BALL_CONSTANTS = Object.freeze({
  m: DEFAULT_CONSTANTS.BALL_MASS,
  R: DEFAULT_CONSTANTS.BALL_RADIUS,
});

export const WORLD_CONSTANTS = Object.freeze({
  g: DEFAULT_CONSTANTS.GRAVITY,
  rho: DEFAULT_CONSTANTS.AIR_DENSITY,
  groundY: 0,
  stopSpeed: DEFAULT_CONSTANTS.STOP_SPEED,
});

export const PHYSICS_CONSTANTS = Object.freeze({
  Cd: DEFAULT_CONSTANTS.DRAG_COEFF,
  Cl: DEFAULT_CONSTANTS.LIFT_COEFF,
  Ctau: DEFAULT_CONSTANTS.SPIN_DECAY_COEFF,
  e: DEFAULT_CONSTANTS.RESTITUTION,
  muK: DEFAULT_CONSTANTS.FRICTION_K,
  rollingResistance: DEFAULT_CONSTANTS.ROLLING_RESISTANCE,
  groundDrag: DEFAULT_CONSTANTS.GROUND_DRAG,
});

// Derived helpers
export const ballArea = (R) => Math.PI * R * R;
export const ballInertia = (m, R) => (2 / 5) * m * R * R;
