import * as THREE from 'three'
import { BALL_R } from './constants.js'

const _axis = new THREE.Vector3()
const _delta = new THREE.Quaternion()

function createStripeTexture() {
  const size = 512
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')

  ctx.fillStyle = '#e8e8e8'
  ctx.fillRect(0, 0, size, size)

  ctx.fillStyle = '#c62828'
  const band = size * 0.09
  ctx.fillRect(0, size / 2 - band / 2, size, band)
  ctx.fillRect(size / 2 - band / 2, 0, band, size)

  ctx.strokeStyle = '#9e9e9e'
  ctx.lineWidth = 2
  for (let i = 0; i < 12; i += 1) {
    const a = (i / 12) * Math.PI * 2
    ctx.beginPath()
    ctx.arc(size / 2, size / 2, size * 0.38, a, a + 0.35)
    ctx.stroke()
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

function applyStripeMaterial(ball) {
  const map = createStripeTexture()
  ball.traverse((child) => {
    if (!child.isMesh) return
    child.material = new THREE.MeshStandardMaterial({
      map,
      roughness: 0.45,
      metalness: 0.04,
    })
    child.castShadow = true
    child.receiveShadow = false
  })
}

function addSurfaceRings(ball, radius) {
  const tube = radius * 0.07
  const major = radius * 1.04
  const ringMat = new THREE.MeshStandardMaterial({
    color: 0xb71c1c,
    roughness: 0.45,
    metalness: 0.05,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  })

  const markers = new THREE.Group()
  markers.name = 'roll_markers'
  markers.renderOrder = 2

  const ringGeo = new THREE.TorusGeometry(major, tube, 12, 64)

  const equator = new THREE.Mesh(ringGeo, ringMat)
  equator.rotation.x = Math.PI / 2
  equator.renderOrder = 2
  markers.add(equator)

  const meridian = new THREE.Mesh(ringGeo.clone(), ringMat.clone())
  meridian.rotation.z = Math.PI / 2
  meridian.renderOrder = 2
  markers.add(meridian)

  ball.add(markers)
}

export function addBallRollMarkers(ball, radius = BALL_R) {
  applyStripeMaterial(ball)
  addSurfaceRings(ball, radius)
}

export function syncBallRotation(ball, angularVelocity, dt) {
  const wx = angularVelocity.x
  const wy = angularVelocity.y
  const wz = angularVelocity.z
  const speed = Math.hypot(wx, wy, wz)
  if (speed < 1e-5 || dt <= 0) return

  _axis.set(wx / speed, wy / speed, wz / speed)
  _delta.setFromAxisAngle(_axis, speed * dt)
  ball.quaternion.premultiply(_delta)
}

export function resetBallRotation(ball) {
  ball.quaternion.identity()
}
