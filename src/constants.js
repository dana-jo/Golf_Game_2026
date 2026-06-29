
export const GRAVITY      = 9.81
export const AIR_DENSITY  = 1.225
export const DRAG_COEFF   = 0.47
export const LIFT_COEFF   = 0.21
export const SPIN_DECAY_COEFF = 0.005  // Ctau 
export const BALL_RADIUS  = 0.0214     // metres
export const BALL_MASS    = 0.0459     // kg
export const RESTITUTION  = 0.60       // e, bounce equations
export const FRICTION_K   = 0.35       // kinetic friction coefficient
export const ROLLING_RESISTANCE = 0.05 
export const STOP_SPEED   = 0.05       // m/s


export const SCENE_SCALE  = 10   // 1 Three.js unit = 0.1 real metre

export const BALL_R = BALL_RADIUS * SCENE_SCALE   // = 0.214