import * as THREE from 'three'
import {
  createInitialState,
} from './physics/index.js'
import { stepFlight } from './physics/flight.js'

const MAX_POINTS = 160
const MAX_TIME = 8
const PREDICT_DT = 1 / 60
const RECORD_EVERY_STEPS = 3
const LANDING_SEARCH_STEPS = 6

function cloneVector(vector) {
  return { x: vector.x, y: vector.y, z: vector.z }
}

function crossedGround(state, getGroundHeight) {
  return state.velocity.y < 0 && state.position.y <= getGroundHeight(state.position.x, state.position.z)
}

function refineLandingPoint(previous, current, getGroundHeight) {
  let low = 0
  let high = 1

  for (let i = 0; i < LANDING_SEARCH_STEPS; i += 1) {
    const t = (low + high) * 0.5
    const x = previous.x + (current.x - previous.x) * t
    const y = previous.y + (current.y - previous.y) * t
    const z = previous.z + (current.z - previous.z) * t

    if (y <= getGroundHeight(x, z)) high = t
    else low = t
  }

  const t = high
  const x = previous.x + (current.x - previous.x) * t
  const z = previous.z + (current.z - previous.z) * t

  return { x, y: getGroundHeight(x, z), z }
}

export function createTrajectoryPrediction(scene) {
  const positions = new Float32Array(MAX_POINTS * 3)
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setDrawRange(0, 0)

  const line = new THREE.Line(
    geometry,
    new THREE.LineBasicMaterial({
      color: 0xffee58,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
    })
  )
  line.frustumCulled = false
  line.visible = false
  scene.add(line)

  const marker = new THREE.Mesh(
    new THREE.RingGeometry(0.18, 0.28, 32),
    new THREE.MeshBasicMaterial({
      color: 0xff7043,
      transparent: true,
      opacity: 0.95,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  )
  marker.rotation.x = -Math.PI * 0.5
  marker.visible = false
  scene.add(marker)

  function writePoint(index, point, ballRadius) {
    const offset = index * 3
    positions[offset] = point.x
    positions[offset + 1] = point.y + ballRadius
    positions[offset + 2] = point.z
  }

  function clear() {
    line.visible = false
    marker.visible = false
    geometry.setDrawRange(0, 0)
  }

  function update({ startPosition, shotParams, getGroundHeight, getStepOptions }) {
    const { ball, world, physics } = getStepOptions()
    const state = createInitialState({
      position: cloneVector(startPosition),
      velocity: shotParams.velocity,
      angularVelocity: shotParams.angularVelocity,
    })

    let pointCount = 0
    let previousPosition = cloneVector(state.position)

    writePoint(pointCount, state.position, ball.R)
    pointCount += 1

    const maxSteps = Math.ceil(MAX_TIME / PREDICT_DT)
    for (let stepIndex = 1; stepIndex <= maxSteps && pointCount < MAX_POINTS; stepIndex += 1) {
      previousPosition = cloneVector(state.position)
      stepFlight(state, PREDICT_DT, ball, world, physics)

      if (stepIndex % RECORD_EVERY_STEPS === 0) {
        writePoint(pointCount, state.position, ball.R)
        pointCount += 1
      }

      if (crossedGround(state, getGroundHeight)) {
        const landing = refineLandingPoint(previousPosition, state.position, getGroundHeight)
        writePoint(pointCount - 1, landing, ball.R)
        marker.position.set(landing.x, landing.y + ball.R, landing.z)
        marker.visible = true
        break
      }
    }

    geometry.setDrawRange(0, pointCount)
    geometry.attributes.position.needsUpdate = true
    line.visible = pointCount > 1
  }

  return { update, clear }
}
