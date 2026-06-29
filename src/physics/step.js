import { BALL_CONSTANTS, WORLD_CONSTANTS, PHYSICS_CONSTANTS } from './constants.js';
import { checkGroundCollision, flatGroundHeight } from './collision.js';
import { stepFlight } from './flight.js';
import { resolveBounce } from './bounce.js';
import { stepSliding } from './sliding.js';
import { stepRolling } from './rolling.js';
import { PHASES } from './state.js';

export function step(state, dt, options = {}) {
  const ball = { ...BALL_CONSTANTS, ...options.ball };
  const world = { ...WORLD_CONSTANTS, ...options.world };
  const physics = { ...PHYSICS_CONSTANTS, ...options.physics };
  const getGroundHeight = options.getGroundHeight || flatGroundHeight(world);

  switch (state.phase) {
    case PHASES.FLIGHT: {
      stepFlight(state, dt, ball, world, physics);
      const { collided, groundY } = checkGroundCollision(state, getGroundHeight);
      if (collided) resolveBounce(state, groundY, ball, physics , getGroundHeight);
      break;
    }
    case PHASES.SLIDING: {
      const groundY = getGroundHeight(state.position.x, state.position.z);
      stepSliding(state, dt, groundY, ball, world, physics , getGroundHeight);
      break;
    }
    case PHASES.ROLLING: {
      const groundY = getGroundHeight(state.position.x, state.position.z);
      stepRolling(state, dt, groundY, ball, world, physics, getGroundHeight);
      break;
    }
    case PHASES.STOPPED:
    default:
      break;
  }

  state.time += dt;
  return state;
}
