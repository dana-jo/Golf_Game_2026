import * as THREE from 'three'
import { initScene } from './scene.js'
import { loadObjects } from './objects.js'
import { createGroundHeightQuery } from './groundHeight.js'
import { createMouseShotInput } from './input.js'
import { createTrajectoryPrediction } from './trajectoryPrediction.js'
import { createInitialState, step, BALL_CONSTANTS ,
  PHASES, estimateGroundNormal, } from './physics/index.js'
import { createGameLogic } from './gameLogic.js'
import { createHUD } from './ui.js'
import { createDebugOverlay } from './debugOverlay.js'
const { scene, camera, renderer, controls } = initScene()
//const hud = createHUD()

async function init() {
  const { ball, course, club } = await loadObjects(scene)
  window.ball = ball

  // Ground height
  const box = new THREE.Box3().setFromObject(ball)
  const size = new THREE.Vector3()
  box.getSize(size)
  const ballHalfWidth = Math.max(size.x, size.z) / 2
  const getGroundHeightAt = createGroundHeightQuery(course, ballHalfWidth)
  const getPredictionGroundHeight = (x, z) => getGroundHeightAt(x, z) ?? 0

  const R = BALL_CONSTANTS.R
  //لبين مانزبط قصة الحفرة نورا تكتب
  const gameLogic = createGameLogic({
  holePosition: {
    x: 15,
    z: 5,
  },
  maxStrokes: 5,
})

  // starting wherever the ball currently sits 
  const startGroundY = getGroundHeightAt(ball.position.x, ball.position.z) ?? 0
  let physicsState = createInitialState({
    position: { x: ball.position.x, y: startGroundY, z: ball.position.z },
    velocity: { x: 0, y: 0, z: 0 },
    angularVelocity: { x: 0, y: 0, z: 0 },
  })
  const startPosition = {
  x: physicsState.position.x,
  y: physicsState.position.y,
  z: physicsState.position.z,
}
const hud = createHUD({
  onRestart: () => {
    gameLogic.resetGame()
    hud.reset()
    physicsState = createInitialState({
      position: { ...startPosition },
      velocity: { x: 0, y: 0, z: 0 },
      angularVelocity: { x: 0, y: 0, z: 0 },
    })
  }
})

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

  if (!gameLogic.canShoot()) {
    return
  }

  gameLogic.incrementStrokes()
  hud.updateStrokes(gameLogic.getStrokes())
  gameLogic.lockShot()

  launchBall(shotParams)
},
  })

  // Debug
  window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyD') {
      console.log('=== Model debug ===')
      console.log('Ball scale:', ball.scale)
      console.log('Ball pos:', ball.position)
      console.log('Course scale:', course.scale)
      console.log('Physics state:', physicsState)
    }
  })

  // Debug overlay: press 'N' to toggle the ground-normal / velocity arrows
  // Cyan arrow = ground normal ,Yellow = ball velocity
  const debugOverlay = createDebugOverlay(scene)
  window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyN') {
      debugOverlay.setVisible(!debugOverlay.isVisible())
      console.log('Debug overlay:', debugOverlay.isVisible() ? 'ON' : 'OFF')
    }
  })

  const getGroundHeightSafe = safeGroundHeight(getGroundHeightAt)

  // timestep
  const clock = new THREE.Clock()
  const FIXED_DT = 1 / 60
let previousPhase = physicsState.phase
  function animate() {
    requestAnimationFrame(animate)
    controls.update()

    const frameTime = Math.min(clock.getDelta(), 0.05)
    let accumulator = frameTime
    while (accumulator >= FIXED_DT) {
      step(physicsState, FIXED_DT, { getGroundHeight: getGroundHeightSafe })
      accumulator -= FIXED_DT


const currentPhase = physicsState.phase

if (
  previousPhase !== currentPhase &&
  currentPhase === PHASES.STOPPED
) {
 

   if (gameLogic.checkWin(physicsState.position)) {
    gameLogic.setWon()
    hud.showWin()
  }
  else if (gameLogic.checkLose()) {
    gameLogic.setLost()
    hud.showLose()
  }
  else {
  gameLogic.unlockShot()
}}

previousPhase = currentPhase


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
