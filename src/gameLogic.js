// Game rules, ball state, hazards, and physics orchestration.

import { createInitialState, step, PHASES } from './physics/index.js'
import { stepHoleCapture, isHoleCaptureSettled } from './holeInterior.js'

const SINK_DURATION = 1.4
const SINK_SPEED = 1.8
const HOLE_SETTLE_FRAMES = 18

const zeroMotion = () => ({ x: 0, y: 0, z: 0 })

export function createGameController({
  hazards,
  holeInterior,
  obstacleCollider = null,
  getBallRadius,
  startPosition,
  getGroundHeight,
  getStepOptions,
  maxStrokes = 5,
}) {
  const rules = {
    strokes: 0,
    gameState: 'playing',
    canShoot: true,
    loseReason: null,
  }

  let physicsState = createInitialState({
    position: { ...startPosition },
    velocity: zeroMotion(),
    angularVelocity: zeroMotion(),
  })
  physicsState.phase = PHASES.STOPPED

  let sinkState = null
  let holeCapture = null
  let previousPhase = PHASES.STOPPED
  let ballVisible = true
  let crawlFrames = 0

  const CRAWL_SPEED = 0.4
  const CRAWL_FRAME_LIMIT = 30

  const listeners = {
    onWin: null,
    onLose: null,
    onPenalty: null,
    onStrokesChange: null,
  }

  function emit(event, ...args) {
    listeners[event]?.(...args)
  }

  function isPlaying() {
    return rules.gameState === 'playing'
  }

  function freezeBall() {
    physicsState.velocity = zeroMotion()
    physicsState.angularVelocity = zeroMotion()
    physicsState.phase = PHASES.STOPPED
  }

  function resetBallToStart() {
    physicsState = createInitialState({
      position: { ...startPosition },
      velocity: zeroMotion(),
      angularVelocity: zeroMotion(),
    })
    physicsState.phase = PHASES.STOPPED
    previousPhase = PHASES.STOPPED
    crawlFrames = 0
    ballVisible = true
    holeCapture = null
  }

  function handleWin() {
    hazards.snapPositionToHole(physicsState.position)
    freezeBall()
    rules.gameState = 'won'
    rules.canShoot = false
    holeCapture = null
    emit('onWin')
  }

  function beginHoleCapture() {
    if (holeCapture || !holeInterior) {
      handleWin()
      return
    }

    holeCapture = { settleFrames: 0 }
    physicsState.phase = PHASES.FLIGHT
    rules.canShoot = false
  }

  function handleStrokeLimitLose() {
    freezeBall()
    rules.gameState = 'lost'
    rules.loseReason = 'strokes'
    rules.canShoot = false
    emit('onLose', 'strokes')
  }

  function applyHazardPenalty(reason) {
    rules.strokes += 1
    emit('onStrokesChange', rules.strokes)

    if (rules.strokes >= maxStrokes) {
      resetBallToStart()
      rules.gameState = 'lost'
      rules.loseReason = 'strokes'
      rules.canShoot = false
      emit('onLose', 'strokes')
      return
    }

    resetBallToStart()
    rules.canShoot = true
    emit('onPenalty', reason)
  }

  function beginWaterSink() {
    freezeBall()
    sinkState = { elapsed: 0 }
  }

  function finishWaterSink() {
    sinkState = null
    ballVisible = false
    applyHazardPenalty('water')
  }

  function evaluateHazards(previousPosition) {
    if (!isPlaying() || sinkState || holeCapture) return

    if (hazards.checkHole(physicsState, previousPosition)) {
      beginHoleCapture()
      return
    }

    if (hazards.checkWater(physicsState)) {
      beginWaterSink()
      return
    }

    if (hazards.checkOutOfBounds(physicsState)) {
      freezeBall()
      applyHazardPenalty('oob')
    }
  }

  function settleIfCrawling() {
    if (holeCapture) return

    const { velocity, phase } = physicsState
    const speed = Math.hypot(velocity.x, velocity.y, velocity.z)
    const onGround = phase === PHASES.ROLLING || phase === PHASES.SLIDING

    if (!onGround || speed >= CRAWL_SPEED) {
      crawlFrames = 0
      return
    }

    crawlFrames += 1
    if (crawlFrames < CRAWL_FRAME_LIMIT) return

    crawlFrames = 0
    freezeBall()
    if (isPlaying() && !rules.canShoot) {
      onBallStopped()
    }
  }

  function onBallStopped() {
    if (holeCapture) return

    if (hazards.checkHole(physicsState)) {
      beginHoleCapture()
    } else if (rules.strokes >= maxStrokes) {
      handleStrokeLimitLose()
    } else {
      rules.canShoot = true
    }
  }

  function updateHoleCapture(dt) {
    const ballRadius = getBallRadius?.() ?? 0.02
    stepHoleCapture(physicsState, dt, holeInterior, ballRadius)

    if (isHoleCaptureSettled(physicsState, holeInterior, ballRadius)) {
      holeCapture.settleFrames += 1
    } else {
      holeCapture.settleFrames = 0
    }

    if (holeCapture.settleFrames >= HOLE_SETTLE_FRAMES) {
      handleWin()
    }
  }

  return {
    setListeners(handlers) {
      Object.assign(listeners, handlers)
    },

    getPhysicsState() {
      return physicsState
    },

    getStrokes() {
      return rules.strokes
    },

    isPlaying: () => isPlaying() || holeCapture !== null,
    canShoot: () => rules.canShoot && isPlaying() && !holeCapture,
    isBallVisible: () => ballVisible,
    isHoleCapturing: () => holeCapture !== null,

    registerShot() {
      rules.strokes++
      emit('onStrokesChange', rules.strokes)
      rules.canShoot = false
    },

    launchShot({ velocity, angularVelocity }) {
      crawlFrames = 0
      holeCapture = null
      physicsState = createInitialState({
        position: { ...physicsState.position },
        velocity,
        angularVelocity,
      })
      previousPhase = physicsState.phase
    },

    update(dt) {
      if (sinkState) {
        sinkState.elapsed += dt
        physicsState.position.y -= SINK_SPEED * dt
        if (sinkState.elapsed >= SINK_DURATION) {
          finishWaterSink()
        }
        return
      }

      if (holeCapture) {
        updateHoleCapture(dt)
        return
      }

      if (!isPlaying()) return

      const previousPosition = { ...physicsState.position }

      step(physicsState, dt, {
        getGroundHeight,
        shouldCaptureHole: (state) => hazards.checkHole(state, previousPosition),
        ...getStepOptions(),
      })

      if (obstacleCollider) {
        obstacleCollider.resolve(physicsState, getBallRadius?.() ?? 0.02)
      }

      evaluateHazards(previousPosition)
      settleIfCrawling()

      const currentPhase = physicsState.phase
      if (
        isPlaying() &&
        previousPhase !== currentPhase &&
        currentPhase === PHASES.STOPPED
      ) {
        onBallStopped()
      }

      previousPhase = physicsState.phase
    },

    reset() {
      rules.strokes = 0
      rules.gameState = 'playing'
      rules.canShoot = true
      rules.loseReason = null
      sinkState = null
      holeCapture = null
      crawlFrames = 0
      ballVisible = true
      resetBallToStart()
      emit('onStrokesChange', 0)
    },
  }
}
