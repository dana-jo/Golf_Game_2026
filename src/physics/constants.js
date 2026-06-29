// if we want to edit constants , edit ../constants.js 

import {
  GRAVITY,
  AIR_DENSITY,
  DRAG_COEFF,
  LIFT_COEFF,
  SPIN_DECAY_COEFF,
  BALL_RADIUS,
  BALL_MASS,
  RESTITUTION,
  FRICTION_K,
  ROLLING_RESISTANCE,
  STOP_SPEED,
} from '../constants.js';

export const BALL_CONSTANTS = Object.freeze({
  m: BALL_MASS,
  R: BALL_RADIUS,
});

export const WORLD_CONSTANTS = Object.freeze({
  g: GRAVITY,
  rho: AIR_DENSITY,
  groundY: 0,       
  stopSpeed: STOP_SPEED,
});

export const PHYSICS_CONSTANTS = Object.freeze({
  Cd: DRAG_COEFF,
  Cl: LIFT_COEFF,
  Ctau: SPIN_DECAY_COEFF,
  e: RESTITUTION,
  muK: FRICTION_K,
  rollingResistance: ROLLING_RESISTANCE,
});

// Derived helpers 
export const ballArea = (R) => Math.PI * R * R;
export const ballInertia = (m, R) => (2 / 5) * m * R * R;
