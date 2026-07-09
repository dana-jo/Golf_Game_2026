import * as THREE from 'three'

const DOWN = new THREE.Vector3(0, -1, 0)
const _origin = new THREE.Vector3()
const _ray = new THREE.Raycaster()
const _size = new THREE.Vector3()
const _center = new THREE.Vector3()

export function createHoleInterior({ winMesh, courseMesh, getBallRadius }) {
  winMesh.updateWorldMatrix(true, true)
  courseMesh?.updateWorldMatrix(true, true)

  const cupBox = new THREE.Box3().setFromObject(winMesh)
  cupBox.getCenter(_center)
  cupBox.getSize(_size)
  const cupRadius = Math.min(_size.x, _size.z) * 0.46
  const targets = [courseMesh, winMesh].filter(Boolean)

  const pillar = detectPillar(winMesh, cupBox, _center)

  function sampleFloorY(x, z) {
    _origin.set(x, cupBox.max.y + 40, z)
    _ray.set(_origin, DOWN)
    const hits = _ray.intersectObjects(targets, true)
    const lipY = cupBox.max.y - _size.y * 0.12
    const midY = (cupBox.min.y + cupBox.max.y) * 0.5
    let floorY = null
    const _normal = new THREE.Vector3()

    for (const hit of hits) {
      if (hit.point.y > lipY) continue
      if (hit.point.y > midY) continue
      if (hit.face) {
        _normal.copy(hit.face.normal).transformDirection(hit.object.matrixWorld)
        if (_normal.y < 0.45) continue
      }
      if (floorY === null || hit.point.y > floorY) {
        floorY = hit.point.y
      }
    }

    if (floorY === null) {
      floorY = cupBox.min.y + _size.y * 0.08
    }
    return floorY
  }

  function pushOffPillar(x, z, ballRadius, clearance = 0.03) {
    const dx = x - pillar.x
    const dz = z - pillar.z
    const dist = Math.hypot(dx, dz)
    const minDist = pillar.radius + ballRadius + clearance
    if (dist >= minDist) return { x, z }

    if (dist > 1e-5) {
      const scale = minDist / dist
      return { x: pillar.x + dx * scale, z: pillar.z + dz * scale }
    }
    return { x: pillar.x + minDist, z: pillar.z }
  }

  function snapRestPosition(position) {
    const ballRadius = getBallRadius?.() ?? 0.02
    let { x, z } = pushOffPillar(_center.x, _center.z, ballRadius)
    const floorY = sampleFloorY(x, z)
    const pushed = pushOffPillar(x, z, ballRadius)
    x = pushed.x
    z = pushed.z

    position.x = x
    position.z = z
    position.y = sampleFloorY(x, z) ?? floorY
  }

  return {
    cupBox,
    cupCenter: { x: _center.x, y: _center.y, z: _center.z },
    cupRadius,
    pillar,
    sampleFloorY,
    pushOffPillar,
    snapRestPosition,
  }
}

function detectPillar(winMesh, cupBox, cupCenter) {
  let best = null
  let bestScore = -Infinity

  winMesh.traverse((child) => {
    if (!child.isMesh) return

    const box = new THREE.Box3().setFromObject(child)
    const size = new THREE.Vector3()
    const center = new THREE.Vector3()
    box.getSize(size)
    box.getCenter(center)

    const horiz = Math.max(size.x, size.z)
    const vertical = size.y
    if (vertical < horiz * 1.2) return

    cupBox.getSize(_size)
    if (horiz > _size.x * 0.42) return

    const offset = Math.hypot(center.x - cupCenter.x, center.z - cupCenter.z)
    if (offset > _size.x * 0.18) return

    const score = vertical / Math.max(horiz, 0.01) - offset
    if (score > bestScore) {
      bestScore = score
      best = {
        x: center.x,
        z: center.z,
        radius: horiz * 0.52 + 0.04,
        y0: box.min.y,
        y1: box.max.y,
      }
    }
  })

  if (best) return best

  cupBox.getSize(_size)
  return {
    x: cupCenter.x,
    z: cupCenter.z,
    radius: Math.min(_size.x, _size.z) * 0.09,
    y0: cupBox.min.y,
    y1: cupBox.max.y,
  }
}

export function stepHoleCapture(state, dt, interior, ballRadius, {
  gravity = 9.81,
  floorRestitution = 0.32,
  pillarRestitution = 0.28,
  wallRestitution = 0.22,
} = {}) {
  const { position, velocity } = state
  const { cupCenter, cupRadius, pillar } = interior

  velocity.y -= gravity * dt

  position.x += velocity.x * dt
  position.y += velocity.y * dt
  position.z += velocity.z * dt

  const floorY = interior.sampleFloorY(position.x, position.z)
  if (floorY !== null && position.y < floorY) {
    position.y = floorY
    if (velocity.y < 0) velocity.y = -velocity.y * floorRestitution
  }

  const pushed = interior.pushOffPillar(position.x, position.z, ballRadius)
  const pdx = position.x - pillar.x
  const pdz = position.z - pillar.z
  const pdist = Math.hypot(pdx, pdz)
  const minPillar = pillar.radius + ballRadius
  if (pdist < minPillar && pdist > 1e-5) {
    const pnx = pdx / pdist
    const pnz = pdz / pdist
    const vn = velocity.x * pnx + velocity.z * pnz
    if (vn < 0) {
      velocity.x -= (1 + pillarRestitution) * vn * pnx
      velocity.z -= (1 + pillarRestitution) * vn * pnz
    }
  }
  position.x = pushed.x
  position.z = pushed.z

  const cdx = position.x - cupCenter.x
  const cdz = position.z - cupCenter.z
  const cupDist = Math.hypot(cdx, cdz)
  const maxDist = Math.max(cupRadius - ballRadius, pillar.radius + ballRadius * 1.5)
  if (cupDist > maxDist && cupDist > 1e-5) {
    const cnx = cdx / cupDist
    const cnz = cdz / cupDist
    position.x = cupCenter.x + cnx * maxDist
    position.z = cupCenter.z + cnz * maxDist
    const vn = velocity.x * cnx + velocity.z * cnz
    if (vn > 0) {
      velocity.x -= (1 + wallRestitution) * vn * cnx
      velocity.z -= (1 + wallRestitution) * vn * cnz
    }
  }

  const damp = Math.max(0, 1 - 2.8 * dt)
  velocity.x *= damp
  velocity.y *= damp
  velocity.z *= damp
}

export function isHoleCaptureSettled(state, interior, ballRadius) {
  const speed = Math.hypot(state.velocity.x, state.velocity.y, state.velocity.z)
  const floorY = interior.sampleFloorY(state.position.x, state.position.z)
  if (floorY === null) return false

  const onFloor = Math.abs(state.position.y - floorY) < 0.04
  const offPillar = Math.hypot(
    state.position.x - interior.pillar.x,
    state.position.z - interior.pillar.z,
  ) > interior.pillar.radius + ballRadius * 0.85

  return speed < 0.18 && onFloor && offPillar
}
