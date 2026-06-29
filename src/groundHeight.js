import * as THREE from 'three'

const DOWN = new THREE.Vector3(0, -1, 0)
const RAY_ORIGIN_HEIGHT = 50 

export function createGroundHeightQuery(courseMesh, ballHalfWidth) {

  const rays = Array.from({ length: 9 }, () => new THREE.Raycaster())

  // Precompute 
  const h = ballHalfWidth
  const offsets = [
    [0, 0],
    [0, h], [0, -h],
    [h, 0], [-h, 0],
    [h, h], [-h, -h],
    [h, -h], [-h, h],
  ]

  return function getGroundHeightAt(x, z) {
    let best = null

    for (let i = 0; i < offsets.length; i++) {
      const [dx, dz] = offsets[i]
      rays[i].set(
        new THREE.Vector3(x + dx, RAY_ORIGIN_HEIGHT, z + dz),
        DOWN
      )
      const hits = rays[i].intersectObject(courseMesh, true)
      if (hits.length > 0) {
        const y = hits[0].point.y

        if (best === null || y > best) best = y
      }
    }

    return best // null if no hits
  }
}
