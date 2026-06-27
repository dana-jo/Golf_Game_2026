// main.js
import * as THREE from 'three'
import { initScene } from './scene.js'
import { loadObjects } from './objects.js'

const { scene, camera, renderer, controls } = initScene()

const downRay1 = new THREE.Raycaster()
const downRay2 = new THREE.Raycaster()
const downRay3 = new THREE.Raycaster()
const downRay4 = new THREE.Raycaster()
const downRay5  = new THREE.Raycaster()
const downRay6  = new THREE.Raycaster()
const downRay7  = new THREE.Raycaster()
const downRay8  = new THREE.Raycaster()
const downRay9  = new THREE.Raycaster()


const down    = new THREE.Vector3(0, -1, 0)   // reusable down direction

function getGroundHeightAt(x, z, courseMesh) {
  // Fire from well above the course downward

  const box  = new THREE.Box3().setFromObject(ball)
    const size = new THREE.Vector3()
    box.getSize(size)

  downRay1.set(
    new THREE.Vector3(x, 50, z),   // origin: high above position x,z
    down                            // direction: straight down
  )
  downRay2.set(
    new THREE.Vector3(x, 50, z + size.z / 2),   // origin: high above position x,z
    down                            // direction: straight down
  )
  downRay3.set(
    new THREE.Vector3(x, 50, z - size.z / 2),   // origin: high above position x,z
    down                            // direction: straight down
  )
  downRay4.set(
    new THREE.Vector3(x + size.x / 2, 50, z),   // origin: high above position x,z
    down                            // direction: straight down
  )
  downRay5.set(
    new THREE.Vector3(x - size.x / 2, 50, z),   // origin: high above position x,z
    down                            // direction: straight down
  )
  downRay6.set(
    new THREE.Vector3(x + size.x / 2, 50, z + size.z / 2),   // origin: high above position x,z
    down                            // direction: straight down
  )
  downRay7.set(
    new THREE.Vector3(x - size.x / 2, 50, z - size.z / 2),   // origin: high above position x,z
    down                            // direction: straight down
  )
  downRay8.set(
    new THREE.Vector3(x + size.x / 2, 50, z - size.z / 2),   // origin: high above position x,z
    down                            // direction: straight down
  )
  downRay9.set(
    new THREE.Vector3(x - size.x / 2, 50, z + size.z / 2),   // origin: high above position x,z
    down                            // direction: straight down
  )

  const hits1 = downRay1.intersectObject(courseMesh, true)
  const hits2 = downRay2.intersectObject(courseMesh, true)
  const hits3 = downRay3.intersectObject(courseMesh, true)
  const hits4 = downRay4.intersectObject(courseMesh, true)
  const hits5 = downRay5.intersectObject(courseMesh, true)
  const hits6 = downRay6.intersectObject(courseMesh, true)
  const hits7 = downRay7.intersectObject(courseMesh, true)
  const hits8 = downRay8.intersectObject(courseMesh, true)
  const hits9 = downRay9.intersectObject(courseMesh, true)

  if (hits1.length > 0) {
    return hits1[0].point.y   // return the y of the first surface hit
  }
  if (hits2.length > 0) {
    return hits2[0].point.y   // return the y of the first surface hit
  }
  if (hits3.length > 0) {
    return hits3[0].point.y   // return the y of the first surface hit
  }
  if (hits4.length > 0) {
    return hits4[0].point.y   // return the y of the first surface hit
  }
  if (hits5.length > 0) {
    return hits5[0].point.y   // return the y of the first surface hit
  }
  if (hits6.length > 0) {
    return hits6[0].point.y   // return the y of the first surface hit
  }
  if (hits7.length > 0) {
    return hits7[0].point.y   // return the y of the first surface hit
  }
  if (hits8.length > 0) {
    return hits8[0].point.y   // return the y of the first surface hit
  }
  if (hits9.length > 0) {
    return hits9[0].point.y   // return the y of the first surface hit
  }

  return null   // no ground found (ball is off the course)
}

// async function wrapping everything that needs to wait for models
async function init() {
  const { ball, course, club} = await loadObjects(scene)

  window.ball   = ball
  
  // Debug helper — press D to print all model info to console
  window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyD') {
      console.log('=== Model debug ===')
      console.log('Ball scale:',   ball.scale)
      console.log('Ball pos:',     ball.position)
      console.log('Course scale:', course.scale)
    }
  })

  // console.log('holePosition:', holePosition)

  // Animation loop — starts only after models are loaded
  function animate() {
    requestAnimationFrame(animate)
    controls.update()

    const groundY = getGroundHeightAt(ball.position.x, ball.position.z, course)

    if (groundY !== null) {
    // Keep ball sitting on the surface
    ball.position.y = groundY
    }
    renderer.render(scene, camera)
  }
  animate()
}

// Start everything
init()