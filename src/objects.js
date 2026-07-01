// objects.js
// One job: load all GLB models and return them ready to use.
// No physics, no input, no game logic here.

import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { BALL_R } from './constants.js'

// Create one loader instance, reused for all models
const loader = new GLTFLoader()

// ── loadModel helper ─────────────────────────────────────────────────────────
// GLTFLoader uses callbacks (old style). This wraps it in a Promise
// so we can use the modern await syntax instead.
function loadModel(path) {
  return new Promise((resolve, reject) => {
    loader.load(
      path,
      (gltf) => resolve(gltf.scene),   // success
      undefined,                         // progress (not needed)
      (error) => reject(error)           // failure
    )
  })
}

function scaleToSize(model, targetSize) {
  // Step 1 — measure the model at its current scale
  const box  = new THREE.Box3().setFromObject(model)
  const size = new THREE.Vector3()
  box.getSize(size)

  // Step 2 — figure out the largest dimension
  // For a sphere width = height = depth, but for other models
  // we use the largest dimension to avoid squishing
  const currentSize = Math.max(size.x, size.y, size.z)

  // Step 3 — calculate the exact scale factor needed
  const scaleFactor = targetSize / currentSize

  // Step 4 — apply it
  model.scale.setScalar(scaleFactor)
}

// ── Main export ───────────────────────────────────────────────────────────────
// async because it needs to wait for files to load from disk.
// Takes the scene so it can add models directly to it.
export async function loadObjects(scene) {

  console.log('Loading models...')

  // ── Ball ────────────────────────────────────────────────
  const ball = await loadModel('/models/golf_ball_low_poly.glb')
  scaleToSize(ball, BALL_R * 2)   // BALL_R * 2 = diameter     
  console.log('Ball scale after fix:', ball.scale.x)
  ball.position.set(0, 10, 0)     // sit on ground surface
  ball.traverse((child) => {
    if (child.isMesh) {
      child.castShadow    = true
      child.receiveShadow = false
    }
  })
  ball.name = 'ball'
  scene.add(ball)
  console.log('Ball loaded')

  // ── Course ──────────────────────────────────────────────
  const course = await loadModel('/models/flat_ground_1.glb')
  course.scale.setScalar(11)
  course.position.set(0, 0, 0)
  course.traverse((child) => {
    if (child.isMesh) {
      child.castShadow    = false
      child.receiveShadow = true
      console.log(`Course mesh: ${child.name}`)
    }
  })
  course.name = 'course'
  scene.add(course)
  console.log('Course loaded')

//   // ── Hole ────────────────────────────────────────────────
//   const hole = await loadModel('/models/hole.glb')
//   hole.scale.setScalar(0.5)
//   hole.position.set(0, 0, -20)        // placeholder — fix after course loads
//   hole.traverse((child) => {
//     if (child.isMesh) {
//       child.castShadow    = true
//       child.receiveShadow = true
//     }
//   })
//   hole.name = 'hole'
//   scene.add(hole)
//   console.log('Hole loaded')

  // ── Club ────────────────────────────────────────────────
  const club = await loadModel('/models/club.glb')
  club.scale.setScalar(0.1)
  club.position.set(0.5, 0, 0.3)
  club.traverse((child) => {
    if (child.isMesh) {
      child.castShadow    = true
      child.receiveShadow = false
    }
  })
  club.name = 'club'
  scene.add(club)
  console.log('Club loaded')

  console.log('All models loaded')

//   // Extract hole world position for win detection
//   const holePosition = new THREE.Vector3()
//   hole.getWorldPosition(holePosition)

  return { ball, course, club}
}