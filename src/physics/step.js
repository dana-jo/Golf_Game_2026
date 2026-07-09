import { BALL_CONSTANTS, WORLD_CONSTANTS, PHYSICS_CONSTANTS } from './constants.js';
import { checkGroundCollision, flatGroundHeight, resolveGroundHeight } from './collision.js';
import { stepFlight } from './flight.js';
import { resolveBounce } from './bounce.js';
import { stepSliding } from './sliding.js';
import { stepRolling } from './rolling.js';
import { PHASES } from './state.js';
import { setLastAccel } from './groundContact.js';

export function step(state, dt, options = {}) {
  const ball = { ...BALL_CONSTANTS, ...options.ball };
  const world = { ...WORLD_CONSTANTS, ...options.world };
  const physics = { ...PHYSICS_CONSTANTS, ...options.physics };
  const getGroundHeight = options.getGroundHeight || flatGroundHeight(world);
  const groundSampling = {
    getGroundHeight,
    getCenterGroundHeight: options.getCenterGroundHeight,
  };
  const sampleGroundHeight = (x, z) => resolveGroundHeight(x, z, groundSampling);

  switch (state.phase) {
    case PHASES.FLIGHT: {
      stepFlight(state, dt, ball, world, physics);
      const { collided, grounded, groundY } = checkGroundCollision(state, sampleGroundHeight);
      if (!grounded || groundY === null) break;

      if (collided) {
        if (options.shouldCaptureHole?.(state, groundY)) {
          break
        }
        resolveBounce(state, groundY, ball, physics, groundSampling);
        break;
      }

      // Skimming / resting on ground without a hard impact.
      state.position.y = groundY;
      state.velocity.y = 0;
      const horizSpeed = Math.hypot(state.velocity.x, state.velocity.z);
      if (horizSpeed < world.stopSpeed) {
        state.velocity = { x: 0, y: 0, z: 0 };
        state.angularVelocity = { x: 0, y: 0, z: 0 };
        state.phase = PHASES.STOPPED;
      } else {
        state.phase = PHASES.SLIDING;
      }
      setLastAccel(state, { x: 0, y: 0, z: 0 });
      break;
    }
    case PHASES.SLIDING: {
      const groundY = resolveGroundHeight(state.position.x, state.position.z, groundSampling);
      if (groundY === null) {
        state.phase = PHASES.FLIGHT;
        stepFlight(state, dt, ball, world, physics);
        break;
      }
      stepSliding(state, dt, groundY, ball, world, physics, groundSampling);
      break;
    }
    case PHASES.ROLLING: {
      const groundY = resolveGroundHeight(state.position.x, state.position.z, groundSampling);
      if (groundY === null) {
        state.phase = PHASES.FLIGHT;
        stepFlight(state, dt, ball, world, physics);
        break;
      }
      stepRolling(state, dt, groundY, ball, world, physics, groundSampling);
      break;
    }
    case PHASES.STOPPED:
    default:
      break;
  }

  state.time += dt;
  return state;
}
