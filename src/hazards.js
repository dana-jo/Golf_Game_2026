import * as THREE from 'three'

const DOWN = new THREE.Vector3(0, -1, 0)
const RAY_ORIGIN_HEIGHT = 50

function createSurfaceHeightQuery(mesh) {
  const raycaster = new THREE.Raycaster()
  const origin = new THREE.Vector3()

  return function getSurfaceHeight(x, z) {
    origin.set(x, RAY_ORIGIN_HEIGHT, z)
    raycaster.set(origin, DOWN)
    const hits = raycaster.intersectObject(mesh, true)
    return hits.length > 0 ? hits[0].point.y : null
  }
}

export function getWorldXZ(object) {
  const position = new THREE.Vector3()
  object.getWorldPosition(position)
  return { x: position.x, z: position.z }
}

export function createHazardChecks({
  courseMesh,
  waterMesh,
  holePosition,
  getCourseGround,
  cupRadius = 0.38,
  cupCatchAbove = 3.0,
  cupCatchBelow = 0.25,
  lipClearance = 0.08,
  outOfBoundsY = -20,
}) {
  const getWaterHeight = waterMesh ? createSurfaceHeightQuery(waterMesh) : () => null

  function getHoleGroundY(x, z) {
    return getCourseGround(x, z)
  }

  function isOverWater(x, z) {
    return getWaterHeight(x, z) !== null
  }

  function checkWater({ position }) {
    const waterY = getWaterHeight(position.x, position.z)
    if (waterY === null) return false
    // Ball bottom at or below the water surface
    return position.y <= waterY + lipClearance
  }

  function checkOutOfBounds({ position }) {
    const groundY = getCourseGround(position.x, position.z)
    if (groundY !== null) return false
    return position.y < outOfBoundsY
  }

  function checkHole({ position }) {
    const dx = position.x - holePosition.x
    const dz = position.z - holePosition.z
    if (Math.hypot(dx, dz) > cupRadius) return false

    const groundY = getHoleGroundY(holePosition.x, holePosition.z)
    if (groundY === null) return false

    const relY = position.y - groundY
    return relY <= cupCatchAbove && relY >= -cupCatchBelow
  }

  function snapPositionToHole(position) {
    const groundY = getHoleGroundY(holePosition.x, holePosition.z) ?? position.y
    position.x = holePosition.x
    position.z = holePosition.z
    position.y = groundY - 0.04
  }

  return {
    checkWater,
    checkOutOfBounds,
    checkHole,
    snapPositionToHole,
    isOverWater,
    getWaterHeight,
    getHoleGroundY,
  }
}

export function getMeshBoundsY(mesh) {
  const box = new THREE.Box3().setFromObject(mesh)
  return { minY: box.min.y, maxY: box.max.y }
}
