// Default simulation values. Runtime edits go through createConstantsStore().

export const DEFAULT_CONSTANTS = {
  GRAVITY: 9.81,
  AIR_DENSITY: 1.225,
  DRAG_COEFF: 0.26,
  LIFT_COEFF: 0.21,
  SPIN_DECAY_COEFF: 0.005,
  BALL_RADIUS: 0.0214,
  BALL_MASS: 0.0459,
  RESTITUTION: 0.60,
  FRICTION_K: 0.35,
  ROLLING_RESISTANCE: 0.05,
  STOP_SPEED: 0.05,
  SCENE_SCALE: 10,
}

/** Labels for the tuning UI. */
export const TUNABLE_PARAMETERS = [
  { key: 'GRAVITY', label: 'Gravity', unit: 'm/s²' },
  { key: 'AIR_DENSITY', label: 'Air density', unit: 'kg/m³' },
  { key: 'DRAG_COEFF', label: 'Drag (Cd)', unit: '' },
  { key: 'LIFT_COEFF', label: 'Lift (Cl)', unit: '' },
  { key: 'SPIN_DECAY_COEFF', label: 'Spin decay (Cτ)', unit: '' },
  { key: 'BALL_RADIUS', label: 'Ball radius', unit: 'm' },
  { key: 'BALL_MASS', label: 'Ball mass', unit: 'kg' },
  { key: 'RESTITUTION', label: 'Restitution (e)', unit: '' },
  { key: 'FRICTION_K', label: 'Friction (μk)', unit: '' },
  { key: 'ROLLING_RESISTANCE', label: 'Rolling resist.', unit: '' },
  { key: 'STOP_SPEED', label: 'Stop speed', unit: 'm/s' },
  { key: 'SCENE_SCALE', label: 'Scene scale', unit: '×' },
]

// Initial load values (e.g. ball mesh sizing in objects.js).
export const BALL_RADIUS = DEFAULT_CONSTANTS.BALL_RADIUS
export const BALL_R = BALL_RADIUS * DEFAULT_CONSTANTS.SCENE_SCALE
