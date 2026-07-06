import * as THREE from 'three'
import { initScene ,resetCamera} from './scene.js'
import { loadObjects } from './objects.js'
import { createGroundHeightQuery } from './groundHeight.js'
import { createMouseShotInput } from './input.js'
import { createTrajectoryPrediction } from './trajectoryPrediction.js'
import { createInitialState, step, BALL_CONSTANTS,
  PHASES, estimateGroundNormal, } from './physics/index.js'
import { createGameLogic } from './gameLogic.js'
import { createHUD } from './ui.js'
import { createDebugOverlay } from './debugOverlay.js'
import { createHazardChecks, getWorldXZ, getMeshBoundsY } from './hazards.js'

const { scene, camera, renderer, controls } = initScene()

const SINK_DURATION = 1.4
const SINK_SPEED = 1.8

async function init() {
  const { ball, course, ground_water, red_flag } = await loadObjects(scene)
  window.ball = ball

  const box = new THREE.Box3().setFromObject(ball)
  const size = new THREE.Vector3()
  box.getSize(size)
  const ballHalfWidth = Math.max(size.x, size.z) / 2
  const getGroundHeightAt = createGroundHeightQuery(course, ballHalfWidth)
  const getGroundHeightPhysics = (x, z) => getGroundHeightAt(x, z)
  const getPredictionGroundHeight = (x, z) => getGroundHeightAt(x, z) ?? 0

  const holeXZ = getWorldXZ(red_flag)
  const courseBounds = getMeshBoundsY(course)

  const hazards = createHazardChecks({
    courseMesh: course,
    waterMesh: ground_water,
    holePosition: holeXZ,
    getCourseGround: getGroundHeightPhysics,
    outOfBoundsY: courseBounds.minY - 3,
  })

  const gameLogic = createGameLogic({
    holePosition: holeXZ,
    maxStrokes: 5,
  })

  const startGroundY = getGroundHeightAt(ball.position.x, ball.position.z) ?? 0
  let physicsState = createInitialState({
    position: { x: ball.position.x, y: startGroundY, z: ball.position.z },
    velocity: { x: 0, y: 0, z: 0 },
    angularVelocity: { x: 0, y: 0, z: 0 },
  })
  const startPosition = { ...physicsState.position }

  let sinkState = null

  const hud = createHUD({
    onRestart: () => {
      gameLogic.resetGame()
      hud.reset()
      sinkState = null
      ball.visible = true
      physicsState = createInitialState({
        position: { ...startPosition },
        velocity: { x: 0, y: 0, z: 0 },
        angularVelocity: { x: 0, y: 0, z: 0 },
      })
    },
  })

  function freezeBall() {
    physicsState.velocity = { x: 0, y: 0, z: 0 }
    physicsState.angularVelocity = { x: 0, y: 0, z: 0 }
    physicsState.phase = PHASES.STOPPED
  }

  function resetBallToStart() {
    physicsState = createInitialState({
      position: { ...startPosition },
      velocity: { x: 0, y: 0, z: 0 },
      angularVelocity: { x: 0, y: 0, z: 0 },
    })
    previousPhase = PHASES.STOPPED
    ball.visible = true
  }

  function applyHazardPenalty(reason) {
    // gameLogic.incrementStrokes()
    hud.updateStrokes(gameLogic.getStrokes())

    if (gameLogic.checkStrokeLimit()) {
      resetBallToStart()
      gameLogic.setLost('strokes')
      hud.showLose('strokes')
      return
    }

    resetBallToStart()
    gameLogic.unlockShot()
    hud.showPenalty(reason)
  }

  function captureInHole() {
    hazards.snapPositionToHole(physicsState.position)
    freezeBall()
    gameLogic.setWon()
    hud.showWin()
  }

  function beginWaterSink() {
    freezeBall()
    sinkState = {
      elapsed: 0,
      waterY: hazards.getWaterHeight(physicsState.position.x, physicsState.position.z),
    }
  }

  function handleStrokeLimitLose() {
    freezeBall()
    gameLogic.setLost('strokes')
    hud.showLose('strokes')
  }

  function finishWaterSink() {
    sinkState = null
    applyHazardPenalty('water')
  }

  function evaluateHazards() {
    if (!gameLogic.isPlaying() || sinkState) return

    if (hazards.checkHole(physicsState)) {
      captureInHole()
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

  function launchBall({ velocity, angularVelocity }) {
    physicsState = createInitialState({
      position: { ...physicsState.position },
      velocity,
      angularVelocity,
    })
  }

  const trajectoryPrediction = createTrajectoryPrediction(scene)
  let pendingAimShot = null
  let predictionFrame = 0

  function scheduleTrajectoryPrediction(shotParams) {
    pendingAimShot = shotParams
    if (predictionFrame) return

    predictionFrame = requestAnimationFrame(() => {
      predictionFrame = 0
      trajectoryPrediction.update({
        startPosition: physicsState.position,
        shotParams: pendingAimShot,
        getGroundHeight: getPredictionGroundHeight,
      })
    })
  }

  function clearTrajectoryPrediction() {
    pendingAimShot = null
    if (predictionFrame) {
      cancelAnimationFrame(predictionFrame)
      predictionFrame = 0
    }
    trajectoryPrediction.clear()
  }

  createMouseShotInput({
    canvas: renderer.domElement,
    camera,
    controls,
    onAim: scheduleTrajectoryPrediction,
    onAimEnd: clearTrajectoryPrediction,
    onLaunch: (shotParams) => {
      if (!gameLogic.canShoot()) return

      gameLogic.incrementStrokes()
      hud.updateStrokes(gameLogic.getStrokes())
      gameLogic.lockShot()
      launchBall(shotParams)
    },
  })

  window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyD') {
      console.log('Hole:', holeXZ, 'Physics:', physicsState)
    }
  })

  const debugOverlay = createDebugOverlay(scene)
  window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyN') {
      debugOverlay.setVisible(!debugOverlay.isVisible())
    }
  })

  const getGroundHeightSafe = safeGroundHeight(getGroundHeightAt)
  const R = BALL_CONSTANTS.R

  const clock = new THREE.Clock()
  const FIXED_DT = 1 / 60
let previousPhase = physicsState.phase
let accumulator = 0
  function animate() {
    requestAnimationFrame(animate)
    controls.update()

    const frameTime = Math.min(clock.getDelta(), 0.05)
    //let accumulator = frameTime
    accumulator += frameTime
    while (accumulator >= FIXED_DT) {
      if (sinkState) {
        sinkState.elapsed += FIXED_DT
        physicsState.position.y -= SINK_SPEED * FIXED_DT
        if (sinkState.elapsed >= SINK_DURATION) {
          ball.visible = false
          finishWaterSink()
        }
      } else if (gameLogic.isPlaying()) {
        step(physicsState, FIXED_DT, { getGroundHeight: getGroundHeightPhysics })
        evaluateHazards()

        const currentPhase = physicsState.phase

        if (
          gameLogic.isPlaying() &&
          previousPhase !== currentPhase &&
          currentPhase === PHASES.STOPPED
        ) {
          if (hazards.checkHole(physicsState)) {
            captureInHole()
          } else if (gameLogic.checkStrokeLimit()) {
            handleStrokeLimitLose()
          } else {
            gameLogic.unlockShot()
          }
        }

        previousPhase = physicsState.phase
      }

      accumulator -= FIXED_DT
    }

    ball.position.set(
      physicsState.position.x,
      physicsState.position.y + R,
      physicsState.position.z
    )

    if (debugOverlay.isVisible()) {
      const groundNormal = estimateGroundNormal(
        getGroundHeightSafe,
        physicsState.position.x,
        physicsState.position.z
      )
      debugOverlay.update({
        position: ball.position,
        normal: groundNormal,
        velocity: physicsState.velocity,
      })
    }

    renderer.render(scene, camera)
  }

  animate()
}

function safeGroundHeight(getGroundHeightAt) {
  let lastKnown = 0
  return (x, z) => {
    const y = getGroundHeightAt(x, z)
    if (y !== null) lastKnown = y
    return lastKnown
  }
}

init().catch((err) => console.error('Failed to load scene:', err))
