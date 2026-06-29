import * as THREE from 'three'
import { initScene } from './scene.js'
import { loadObjects } from './objects.js'
import { createGroundHeightQuery } from './groundHeight.js'
import { createShotControls } from './ui.js'
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

  const R = BALL_CONSTANTS.R

  // starting wherever the ball currently sits 
  const startGroundY = getGroundHeightAt(ball.position.x, ball.position.z) ?? 0
  let physicsState = createInitialState({
    position: { x: ball.position.x, y: startGroundY, z: ball.position.z },
    velocity: { x: 0, y: 0, z: 0 },
    angularVelocity: { x: 0, y: 0, z: 0 },
  })

  // shot panel
  const { getShotParams } = createShotControls(() => {
    const { velocity, angularVelocity } = getShotParams()
    physicsState = createInitialState({
      position: { ...physicsState.position },
      velocity,
      angularVelocity,
    })
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
