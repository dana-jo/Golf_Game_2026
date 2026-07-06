import * as THREE from 'three'

const DOWN = new THREE.Vector3(0, -1, 0)
const RAY_ORIGIN_HEIGHT = 50

const _winBox = new THREE.Box3()
const _ballCenter = new THREE.Vector3()
const _prevCenter = new THREE.Vector3()
const _winCenter = new THREE.Vector3()
const _sample = new THREE.Vector3()

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

function createWinZoneCheck(winMesh, getBallRadius) {
  return function checkHole({ position }, previousPosition) {
    if (!winMesh) return false

    winMesh.updateWorldMatrix(true, true)
    _winBox.setFromObject(winMesh)
    const ballRadius = getBallRadius?.() ?? 0.02
    _winBox.expandByScalar(ballRadius)

    // Physics y is ball bottom; test against ball centre.
    _ballCenter.set(position.x, position.y + ballRadius, position.z)
    if (_winBox.containsPoint(_ballCenter)) return true

    if (!previousPosition) return false

    _prevCenter.set(
      previousPosition.x,
      previousPosition.y + ballRadius,
      previousPosition.z
    )

    // Sub-step along the path in case the ball moves fast through a thin volume.
    for (let i = 1; i <= 8; i++) {
      const t = i / 8
      _sample.set(
        _prevCenter.x + (_ballCenter.x - _prevCenter.x) * t,
        _prevCenter.y + (_ballCenter.y - _prevCenter.y) * t,
        _prevCenter.z + (_ballCenter.z - _prevCenter.z) * t
      )
      if (_winBox.containsPoint(_sample)) return true
    }

    return false
  }
}

export function createHazardChecks({
  waterMesh,
  winMesh,
  getCourseGround,
  getBallRadius,
  lipClearance = 0.08,
  outOfBoundsY = -20,
}) {
  const getWaterHeight = waterMesh ? createSurfaceHeightQuery(waterMesh) : () => null
  const checkHole = createWinZoneCheck(winMesh, getBallRadius)

  function checkWater({ position }) {
    const waterY = getWaterHeight(position.x, position.z)
    if (waterY === null) return false
    return position.y <= waterY + lipClearance
  }

  function checkOutOfBounds({ position }) {
    const groundY = getCourseGround(position.x, position.z)
    if (groundY !== null) return false
    return position.y < outOfBoundsY
  }

  function snapPositionToHole(position) {
    if (!winMesh) return

    winMesh.updateWorldMatrix(true, true)
    _winBox.setFromObject(winMesh)
    _winBox.getCenter(_winCenter)
    const ballRadius = getBallRadius?.() ?? 0.02

    position.x = _winCenter.x
    position.z = _winCenter.z
    position.y = _winBox.min.y - ballRadius
  }

  return {
    checkWater,
    checkOutOfBounds,
    checkHole,
    snapPositionToHole,
    getWaterHeight,
  }
}

export function getMeshBoundsY(mesh) {
  const box = new THREE.Box3().setFromObject(mesh)
  return { minY: box.min.y, maxY: box.max.y }
}
