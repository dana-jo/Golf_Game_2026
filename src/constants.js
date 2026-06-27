// constants.js
// One place for every number the whole game uses.
// If you want to change something, change it here once.

export const GRAVITY      = 9.81
export const AIR_DENSITY  = 1.225
export const DRAG_COEFF   = 0.47
export const LIFT_COEFF   = 0.21
export const BALL_RADIUS  = 0.0214   // real golf ball radius in metres
export const SCENE_SCALE  = 10       // 1 Three.js unit = 0.1 real metre
export const RESTITUTION  = 0.60     // e from bounce equations
export const FRICTION_K   = 0.35     // kinetic friction coefficient

// Ball radius in scene units (what Three.js actually uses)
export const BALL_R = BALL_RADIUS * SCENE_SCALE   // = 0.214