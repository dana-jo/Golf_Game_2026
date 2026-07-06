import * as THREE from 'three'
import { initScene } from './scene.js'
import { loadObjects } from './objects.js'
import { createGroundHeightQuery } from './groundHeight.js'
import { createMouseShotInput } from './input.js'
import { createTrajectoryPrediction } from './trajectoryPrediction.js'
import { createConstantsStore } from './constantsStore.js'
import { createTuningPanel } from './tuningPanel.js'
import { estimateGroundNormal } from './physics/index.js'
import { createGameController } from './gameLogic.js'
import { createHUD } from './ui.js'
import { createDebugOverlay } from './debugOverlay.js'
import { createHazardChecks, getWorldXZ, getMeshBoundsY } from './hazards.js'

const { scene, camera, renderer, controls, resetCamera, setFollowTarget, updateFollow } = initScene()

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
  const getGroundHeightSafe = safeGroundHeight(getGroundHeightAt)

  const holeXZ = getWorldXZ(red_flag)
  const courseBounds = getMeshBoundsY(course)

  const hazards = createHazardChecks({
    courseMesh: course,
    waterMesh: ground_water,
    holePosition: holeXZ,
    getCourseGround: getGroundHeightPhysics,
    outOfBoundsY: courseBounds.minY - 3,
  })

  const constantsStore = createConstantsStore()
  const getStepOptions = () => constantsStore.getStepOptions()

  const startGroundY = getGroundHeightAt(ball.position.x, ball.position.z) ?? 0
  const startPosition = {
    x: ball.position.x,
    y: startGroundY,
    z: ball.position.z,
  }

  const ballRadius = constantsStore.getBallConstants().R
  setFollowTarget(new THREE.Vector3(
    startPosition.x,
    startPosition.y + ballRadius,
    startPosition.z,
  ))

  const game = createGameController({
    hazards,
    startPosition,
    getGroundHeight: getGroundHeightPhysics,
    getStepOptions,
    maxStrokes: 5,
  })

  const hud = createHUD({
    onRestart: () => {
      game.reset()
      hud.reset()
      resetCamera()
    },
  })

  game.setListeners({
    onWin: () => hud.showWin(),
    onLose: (reason) => hud.showLose(reason),
    onPenalty: (reason) => hud.showPenalty(reason),
    onStrokesChange: (strokes) => hud.updateStrokes(strokes),
  })

  const trajectoryPrediction = createTrajectoryPrediction(scene)
  let pendingAimShot = null
  let predictionFrame = 0

  function scheduleTrajectoryPrediction(shotParams) {
    pendingAimShot = shotParams
    if (predictionFrame) return

    predictionFrame = requestAnimationFrame(() => {
      predictionFrame = 0
      trajectoryPrediction.update({
        startPosition: game.getPhysicsState().position,
        shotParams: pendingAimShot,
        getGroundHeight: getPredictionGroundHeight,
        getStepOptions,
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
      if (!game.canShoot()) return
      game.registerShot()
      game.launchShot(shotParams)
    },
  })

  window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyD') {
      console.log('Hole:', holeXZ, 'Physics:', game.getPhysicsState())
    }
  })

  const tuningPanel = createTuningPanel(constantsStore)

  window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyP') {
      tuningPanel.toggle()
    }
  })

  const debugOverlay = createDebugOverlay(scene)
  window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyN') {
      debugOverlay.setVisible(!debugOverlay.isVisible())
    }
  })

  const clock = new THREE.Clock()
  const FIXED_DT = 1 / 60
  let accumulator = 0

  function animate() {
    requestAnimationFrame(animate)

    const frameTime = Math.min(clock.getDelta(), 0.05)
    accumulator += frameTime

    while (accumulator >= FIXED_DT) {
      game.update(FIXED_DT)
      accumulator -= FIXED_DT
    }

    const physicsState = game.getPhysicsState()
    const ballRadius = constantsStore.getBallConstants().R
    ball.visible = game.isBallVisible()
    ball.position.set(
      physicsState.position.x,
      physicsState.position.y + ballRadius,
      physicsState.position.z
    )

    updateFollow(ball.position, frameTime)
    controls.update()

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
