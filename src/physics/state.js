import { v3 } from './vectors.js';

export const PHASES = Object.freeze({
  FLIGHT: 'flight',
  SLIDING: 'sliding',
  ROLLING: 'rolling',
  STOPPED: 'stopped',
});


export function createInitialState({
  position = v3(0, 0.05, 0),
  velocity = v3(20, 15, 0),
  angularVelocity = v3(0, 0, -60),
} = {}) {
  return {
    position: { ...position },
    velocity: { ...velocity },
    angularVelocity: { ...angularVelocity },
    phase: PHASES.FLIGHT,
    time: 0,
  };
}
