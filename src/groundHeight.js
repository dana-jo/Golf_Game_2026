import * as THREE from 'three'

const DOWN = new THREE.Vector3(0, -1, 0)
const RAY_ORIGIN_HEIGHT = 50

export function createGroundHeightQuery(courseMesh, ballHalfWidth) {
  const rays = Array.from({ length: 9 }, () => new THREE.Raycaster())
  const centerRay = new THREE.Raycaster()
  const origin = new THREE.Vector3()
  const worldNormal = new THREE.Vector3()

  const h = ballHalfWidth
  const offsets = [
    [0, 0],
    [0, h], [0, -h],
    [h, 0], [-h, 0],
    [h, h], [-h, -h],
    [h, -h], [-h, h],
  ]

  function getCenterHit(x, z) {
    origin.set(x, RAY_ORIGIN_HEIGHT, z)
    centerRay.set(origin, DOWN)
    const hits = centerRay.intersectObject(courseMesh, true)
    return hits.length > 0 ? hits[0] : null
  }

  function getCenterGroundHeight(x, z) {
    const hit = getCenterHit(x, z)
    return hit ? hit.point.y : null
  }

  function getGroundNormalAt(x, z) {
    const hit = getCenterHit(x, z)
    if (!hit?.face) return null

    worldNormal.copy(hit.face.normal)
    worldNormal.transformDirection(hit.object.matrixWorld)
    if (worldNormal.y < 0) worldNormal.negate()

    const len = worldNormal.length()
    if (len < 1e-6) return null

    return {
      x: worldNormal.x / len,
      y: worldNormal.y / len,
      z: worldNormal.z / len,
    }
  }

  function getGroundHeightAt(x, z) {
    let best = null

    for (let i = 0; i < offsets.length; i++) {
      const [dx, dz] = offsets[i]
      origin.set(x + dx, RAY_ORIGIN_HEIGHT, z + dz)
      rays[i].set(origin, DOWN)
      const hits = rays[i].intersectObject(courseMesh, true)
      if (hits.length > 0) {
        const y = hits[0].point.y
        if (best === null || y > best) best = y
      }
    }

    return best
  }

  return {
    getGroundHeightAt,
    getCenterGroundHeight,
    getGroundNormalAt,
  }
}
