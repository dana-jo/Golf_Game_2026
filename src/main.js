import * as THREE from 'three'
import { initScene } from './scene.js'
import { loadObjects } from './objects.js'
import { createGroundHeightQuery } from './groundHeight.js'
import { createMouseShotInput } from './input.js'
import { createTrajectoryPrediction } from './trajectoryPrediction.js'
import { createInitialState, step, BALL_CONSTANTS } from './physics/index.js'

const { scene, camera, renderer, controls } = initScene()

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

  // starting wherever the ball currently sits 
  const startGroundY = getGroundHeightAt(ball.position.x, ball.position.z) ?? 0
  let physicsState = createInitialState({
    position: { x: ball.position.x, y: startGroundY, z: ball.position.z },
    velocity: { x: 0, y: 0, z: 0 },
    angularVelocity: { x: 0, y: 0, z: 0 },
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
    onLaunch: launchBall,
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

  const getGroundHeightSafe = safeGroundHeight(getGroundHeightAt)

  // timestep
  const clock = new THREE.Clock()
  const FIXED_DT = 1 / 60

  function animate() {
    requestAnimationFrame(animate)
    controls.update()

    const frameTime = Math.min(clock.getDelta(), 0.05)
    let accumulator = frameTime
    while (accumulator >= FIXED_DT) {
      step(physicsState, FIXED_DT, { getGroundHeight: getGroundHeightSafe })
      accumulator -= FIXED_DT
    }

    ball.position.set(
      physicsState.position.x,
      physicsState.position.y + R,
      physicsState.position.z
    )

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
