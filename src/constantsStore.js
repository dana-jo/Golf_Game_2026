import { DEFAULT_CONSTANTS } from './constants.js'

export function createConstantsStore(initial = DEFAULT_CONSTANTS) {
  const state = { ...initial }
  const listeners = new Set()

  function notify() {
    listeners.forEach((fn) => fn(state))
  }

  function getBallConstants() {
    return { m: state.BALL_MASS, R: state.BALL_RADIUS }
  }

  function getWorldConstants() {
    return {
      g: state.GRAVITY,
      rho: state.AIR_DENSITY,
      groundY: 0,
      stopSpeed: state.STOP_SPEED,
    }
  }

  function getPhysicsConstants() {
    return {
      Cd: state.DRAG_COEFF,
      Cl: state.LIFT_COEFF,
      Ctau: state.SPIN_DECAY_COEFF,
      e: state.RESTITUTION,
      muK: state.FRICTION_K,
      rollingResistance: state.ROLLING_RESISTANCE,
      groundDrag: state.GROUND_DRAG,
    }
  }

  return {
    getAll() {
      return { ...state }
    },

    get(key) {
      return state[key]
    },

    set(key, value) {
      state[key] = value
      notify()
    },

    reset() {
      Object.assign(state, DEFAULT_CONSTANTS)
      notify()
    },

    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },

    getBallConstants,
    getWorldConstants,
    getPhysicsConstants,

    getStepOptions() {
      return {
        ball: getBallConstants(),
        world: getWorldConstants(),
        physics: getPhysicsConstants(),
      }
    },

    getBallSceneRadius() {
      return state.BALL_RADIUS * state.SCENE_SCALE
    },
  }
}
