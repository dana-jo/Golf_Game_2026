import { describe, expect, it } from 'vitest'
import { createInitialState, PHASES, step } from './index.js'
import { checkGroundCollision, estimateGroundNormal } from './collision.js'
import { resolveBounce } from './bounce.js'
import { stepFlight } from './flight.js'
import { stepSliding } from './sliding.js'
import { stepRolling } from './rolling.js'
import { ballInertia } from './constants.js'

const DT = 1 / 60
const FLAT_GROUND = () => 0

const TEST_BALL = { m: 0.0459, R: 0.0214 }
const TEST_WORLD = { g: 9.81, rho: 1.225, stopSpeed: 0.05 }
const NO_AIR_PHYSICS = { Cd: 0, Cl: 0, Ctau: 0, e: 0.6, muK: 0.35, rollingResistance: 0.05 }
const HIGH_FRICTION_PHYSICS = { ...NO_AIR_PHYSICS, muK: 100 }

function stepMany(state, steps, options = {}) {
  for (let i = 0; i < steps; i += 1) {
    step(state, DT, options)
  }
  return state
}

describe('collision', () => {
  it('detects downward ground contact', () => {
    const state = createInitialState({
      position: { x: 0, y: 0, z: 0 },
      velocity: { x: 0, y: -1, z: 0 },
      angularVelocity: { x: 0, y: 0, z: 0 },
    })

    expect(checkGroundCollision(state, FLAT_GROUND)).toEqual({
      collided: true,
      groundY: 0,
    })
  })

  it('ignores upward motion at ground level', () => {
    const state = createInitialState({
      position: { x: 0, y: 0, z: 0 },
      velocity: { x: 0, y: 2, z: 0 },
      angularVelocity: { x: 0, y: 0, z: 0 },
    })

    expect(checkGroundCollision(state, FLAT_GROUND).collided).toBe(false)
  })

  it('estimates a vertical normal on flat terrain', () => {
    const normal = estimateGroundNormal(FLAT_GROUND, 0, 0)

    expect(normal.x).toBeCloseTo(0, 5)
    expect(normal.y).toBeCloseTo(1, 5)
    expect(normal.z).toBeCloseTo(0, 5)
  })

  it('estimates a tilted normal on a sloped height field', () => {
    const slope = (x) => 0.2 * x
    const normal = estimateGroundNormal(slope, 1, 0)

    expect(normal.x).toBeLessThan(0)
    expect(normal.y).toBeGreaterThan(0)
    expect(normal.z).toBeCloseTo(0, 5)
  })
})

describe('flight', () => {
  it('applies gravity when air effects are disabled', () => {
    const state = createInitialState({
      position: { x: 0, y: 10, z: 0 },
      velocity: { x: 0, y: 0, z: 0 },
      angularVelocity: { x: 0, y: 0, z: 0 },
    })

    stepFlight(state, DT, TEST_BALL, TEST_WORLD, NO_AIR_PHYSICS)

    const expectedVy = -TEST_WORLD.g * DT
    expect(state.velocity.y).toBeCloseTo(expectedVy, 5)
    // Position uses the updated velocity in the same Euler step.
    expect(state.position.y).toBeCloseTo(10 + expectedVy * DT, 5)
  })

  it('reduces horizontal speed from quadratic drag', () => {
    const state = createInitialState({
      position: { x: 0, y: 5, z: 0 },
      velocity: { x: 30, y: 0, z: 0 },
      angularVelocity: { x: 0, y: 0, z: 0 },
    })
    const physics = { ...NO_AIR_PHYSICS, Cd: 0.26, Cl: 0, Ctau: 0 }

    const speedBefore = state.velocity.x
    stepFlight(state, DT, TEST_BALL, TEST_WORLD, physics)

    expect(state.velocity.x).toBeLessThan(speedBefore)
    expect(state.velocity.x).toBeGreaterThan(0)
  })
})

describe('bounce', () => {
  it('reverses normal velocity with coefficient of restitution', () => {
    const state = createInitialState({
      position: { x: 0, y: 0, z: 0 },
      velocity: { x: 0, y: -10, z: 0 },
      angularVelocity: { x: 0, y: 0, z: 0 },
    })

    resolveBounce(state, 0, TEST_BALL, { e: 0.6, muK: 0.35 }, FLAT_GROUND)

    expect(state.velocity.y).toBeCloseTo(6, 5)
    expect(state.phase).toBe(PHASES.FLIGHT)
  })

  it('applies the 5/7 tangential speed rule without friction limiting', () => {
    const state = createInitialState({
      position: { x: 0, y: 0, z: 0 },
      velocity: { x: 0, y: -4, z: 14 },
      angularVelocity: { x: 0, y: 0, z: 0 },
    })

    resolveBounce(state, 0, TEST_BALL, HIGH_FRICTION_PHYSICS, FLAT_GROUND)

    expect(state.velocity.z).toBeCloseTo(14 * (5 / 7), 4)
    expect(state.velocity.x).toBeCloseTo(0, 5)
  })

  it('updates backspin from tangential impulse', () => {
    const tangentialSpeed = 10
    const state = createInitialState({
      position: { x: 0, y: 0, z: 0 },
      velocity: { x: 0, y: -4, z: tangentialSpeed },
      angularVelocity: { x: 0, y: 0, z: 0 },
    })

    resolveBounce(state, 0, TEST_BALL, HIGH_FRICTION_PHYSICS, FLAT_GROUND)

    const inertia = ballInertia(TEST_BALL.m, TEST_BALL.R)
    const expectedOmega = (5 / 7) * (tangentialSpeed / TEST_BALL.R)

    expect(state.angularVelocity.x).toBeCloseTo(expectedOmega, 4)
  })
})

describe('sliding and rolling', () => {
  it('transitions from sliding to rolling when slip vanishes', () => {
    const speed = 3
    const state = createInitialState({
      position: { x: 0, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: speed },
      angularVelocity: { x: speed / TEST_BALL.R, y: 0, z: 0 },
    })
    state.phase = PHASES.SLIDING

    stepSliding(state, DT, 0, TEST_BALL, TEST_WORLD, NO_AIR_PHYSICS, FLAT_GROUND)

    expect(state.phase).toBe(PHASES.ROLLING)
  })

  it('stops rolling on flat ground after enough steps', () => {
    const state = createInitialState({
      position: { x: 0, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: 2 },
      angularVelocity: { x: -2 / TEST_BALL.R, y: 0, z: 0 },
    })
    state.phase = PHASES.ROLLING

    const physics = {
      ...NO_AIR_PHYSICS,
      rollingResistance: 0.4,
    }

    stepMany(state, 600, {
      getGroundHeight: FLAT_GROUND,
      ball: TEST_BALL,
      world: TEST_WORLD,
      physics,
    })

    expect(state.phase).toBe(PHASES.STOPPED)
    expect(state.velocity.z).toBe(0)
  })

  it('accelerates downhill while rolling', () => {
    const slope = (x) => 0.15 * x
    const state = createInitialState({
      position: { x: 0, y: slope(0), z: 0 },
      velocity: { x: 0, y: 0, z: 0 },
      angularVelocity: { x: 0, y: 0, z: 0 },
    })
    state.phase = PHASES.ROLLING

    stepRolling(state, DT, slope(0), TEST_BALL, TEST_WORLD, {
      ...NO_AIR_PHYSICS,
      rollingResistance: 0,
    }, slope)

    expect(state.velocity.x).toBeLessThan(0)
  })
})

describe('step integration', () => {
  it('bounces a dropped ball on flat ground', () => {
    const state = createInitialState({
      position: { x: 0, y: 2, z: 0 },
      velocity: { x: 0, y: 0, z: 0 },
      angularVelocity: { x: 0, y: 0, z: 0 },
    })
    const options = {
      getGroundHeight: FLAT_GROUND,
      ball: TEST_BALL,
      world: TEST_WORLD,
      physics: NO_AIR_PHYSICS,
    }

    let bounced = false
    for (let i = 0; i < 200 && !bounced; i += 1) {
      step(state, DT, options)
      if (state.position.y <= 0 && state.velocity.y > 0) {
        bounced = true
      }
    }

    expect(bounced).toBe(true)
    expect(state.position.y).toBeGreaterThanOrEqual(0)
  })

  it('captures the ball when shouldCaptureHole returns true', () => {
    const state = createInitialState({
      position: { x: 0, y: 0.2, z: 0 },
      velocity: { x: 0, y: -8, z: 0 },
      angularVelocity: { x: 0, y: 0, z: 0 },
    })
    const options = {
      getGroundHeight: FLAT_GROUND,
      ball: TEST_BALL,
      world: TEST_WORLD,
      physics: NO_AIR_PHYSICS,
      shouldCaptureHole: () => true,
    }

    let captured = false
    for (let i = 0; i < 50 && !captured; i += 1) {
      step(state, DT, options)
      if (state.phase === PHASES.STOPPED) captured = true
    }

    expect(captured).toBe(true)
    expect(state.velocity).toEqual({ x: 0, y: 0, z: 0 })
    expect(state.position.y).toBe(0)
  })

  it('eventually comes to rest after a low horizontal shot', () => {
    const state = createInitialState({
      position: { x: 0, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: 6 },
      angularVelocity: { x: 0, y: 0, z: 0 },
    })
    state.phase = PHASES.SLIDING

    stepMany(state, 2000, {
      getGroundHeight: FLAT_GROUND,
      ball: TEST_BALL,
      world: TEST_WORLD,
      physics: {
        ...NO_AIR_PHYSICS,
        rollingResistance: 0.2,
      },
    })

    expect(state.phase).toBe(PHASES.STOPPED)
    expect(Math.hypot(state.velocity.x, state.velocity.z)).toBeLessThan(TEST_WORLD.stopSpeed)
  })
})
