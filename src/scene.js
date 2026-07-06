// scene.js
// One job: create and return the scene, camera, renderer, lights and controls.
// Nothing else. No objects, no physics, no game logic.

import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

export function initScene() {

  // ── Scene ────────────────────────────────────────────────
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x87ceeb)

  // ── Camera ───────────────────────────────────────────────
  const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  )
  camera.position.set(0, 8, 16)
  camera.lookAt(0, 0, 0)

  // ── Renderer ─────────────────────────────────────────────
  const renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.shadowMap.enabled = true
  document.body.appendChild(renderer.domElement)

  // ── Lights ───────────────────────────────────────────────
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5)
  scene.add(ambientLight)

  const sunLight = new THREE.DirectionalLight(0xffffff, 1.0)
  sunLight.position.set(20, 30, 10)
  sunLight.castShadow = true
  sunLight.shadow.mapSize.width  = 2048
  sunLight.shadow.mapSize.height = 2048
  scene.add(sunLight)

  // ── Controls ─────────────────────────────────────────────
  const controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.05
  controls.mouseButtons.LEFT = THREE.MOUSE.ROTATE
  controls.mouseButtons.MIDDLE = THREE.MOUSE.DOLLY
  controls.mouseButtons.RIGHT = null

  const initialCameraPosition = camera.position.clone()
  const initialCameraTarget = new THREE.Vector3(0, 0, 0)

  function resetCamera() {
    camera.position.copy(initialCameraPosition)
    controls.target.copy(initialCameraTarget)
    controls.update()
  }

  renderer.domElement.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return
    controls.mouseButtons.LEFT = event.shiftKey ? THREE.MOUSE.PAN : THREE.MOUSE.ROTATE
  })

  renderer.domElement.addEventListener('pointerup', () => {
    controls.mouseButtons.LEFT = THREE.MOUSE.ROTATE
  })

  renderer.domElement.addEventListener('pointercancel', () => {
    controls.mouseButtons.LEFT = THREE.MOUSE.ROTATE
  })

  // ── Resize handler ───────────────────────────────────────
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()
    renderer.setSize(window.innerWidth, window.innerHeight)
  })

  // ── Return everything the rest of the game needs ─────────
  return { scene, camera, renderer, controls, resetCamera }
}