// Game rules, ball state, hazards, and physics orchestration.

import { createInitialState, step, PHASES } from './physics/index.js'

const SINK_DURATION = 1.4
const SINK_SPEED = 1.8

const zeroMotion = () => ({ x: 0, y: 0, z: 0 })

export function createGameController({
  hazards,
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
  let previousPhase = PHASES.STOPPED
  let ballVisible = true

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
    ballVisible = true
  }

  function handleWin() {
    hazards.snapPositionToHole(physicsState.position)
    freezeBall()
    rules.gameState = 'won'
    rules.canShoot = false
    emit('onWin')
  }

  function handleStrokeLimitLose() {
    freezeBall()
    rules.gameState = 'lost'
    rules.loseReason = 'strokes'
    rules.canShoot = false
    emit('onLose', 'strokes')
  }

  function applyHazardPenalty(reason) {
    // rules.strokes++
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
    if (!isPlaying() || sinkState) return

    if (hazards.checkHole(physicsState, previousPosition)) {
      handleWin()
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

  function onBallStopped() {
    if (hazards.checkHole(physicsState)) {
      handleWin()
    } else if (rules.strokes >= maxStrokes) {
      handleStrokeLimitLose()
    } else {
      rules.canShoot = true
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

    isPlaying,
    canShoot: () => rules.canShoot && isPlaying(),
    isBallVisible: () => ballVisible,

    registerShot() {
      rules.strokes++
      emit('onStrokesChange', rules.strokes)
      rules.canShoot = false
    },

    launchShot({ velocity, angularVelocity }) {
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

      if (!isPlaying()) return

      const previousPosition = { ...physicsState.position }

      step(physicsState, dt, {
        getGroundHeight,
        shouldCaptureHole: (state) => hazards.checkHole(state, previousPosition),
        ...getStepOptions(),
      })

      evaluateHazards(previousPosition)

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
      ballVisible = true
      resetBallToStart()
      emit('onStrokesChange', 0)
    },
  }
}
