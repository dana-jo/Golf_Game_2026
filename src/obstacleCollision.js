import * as THREE from 'three'
import { PHASES } from './physics/state.js'

const _box = new THREE.Box3()
const _size = new THREE.Vector3()
const _closest = new THREE.Vector3()
const _delta = new THREE.Vector3()
const _worldPoint = new THREE.Vector3()
const _localPoint = new THREE.Vector3()
const _localNormal = new THREE.Vector3()
const _invFrame = new THREE.Matrix4()
const _scale = new THREE.Vector3()
const _position = new THREE.Vector3()
const _quaternion = new THREE.Quaternion()

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

function isWaterStakeMesh(mesh) {
  _box.setFromObject(mesh)
  _box.getSize(_size)
  const horiz = Math.max(_size.x, _size.z)
  if (horiz < 0.05) return false
  if (_size.y < horiz * 0.45) return false

  const name = mesh.name.toLowerCase()
  if (name.includes('water') && _size.y < horiz) return false
  return true
}

function collectWaterMeshes(root, meshes) {
  if (!root) return

  const parts = []
  root.traverse((child) => {
    if (!child.isMesh) return
    _box.setFromObject(child)
    _box.getSize(_size)
    parts.push({
      mesh: child,
      area: _size.x * _size.z,
      height: _size.y,
    })
  })

  if (!parts.length) return

  parts.sort((a, b) => b.area - a.area)
  for (let i = 0; i < parts.length; i += 1) {
    const { mesh, area, height } = parts[i]
    const isMainWaterPlane = i === 0 && area > height * height * 2.5
    if (isMainWaterPlane) continue
    if (isWaterStakeMesh(mesh) || height > Math.sqrt(area) * 0.35) {
      meshes.push(mesh)
    }
  }
}

function collectMeshes(root, meshes, { waterStakesOnly = false } = {}) {
  if (!root) return
  if (waterStakesOnly) {
    collectWaterMeshes(root, meshes)
    return
  }
  root.traverse((child) => {
    if (!child.isMesh) return
    meshes.push(child)
  })
}

function getMeshWorldBox(mesh, targetBox = _box) {
  const geometry = mesh.geometry
  if (!geometry?.boundingBox) geometry.computeBoundingBox()
  mesh.updateWorldMatrix(true, false)
  targetBox.copy(geometry.boundingBox).applyMatrix4(mesh.matrixWorld)
  return targetBox
}

function getMeshWorldExtents(mesh) {
  getMeshWorldBox(mesh, _box)
  _box.getSize(_size)
  return _size
}

function pickTreeTrunkMeshes(tree) {
  const meshes = []
  collectMeshes(tree, meshes)
  if (!meshes.length) return []

  const ranked = meshes.map((mesh) => {
    const size = getMeshWorldExtents(mesh)
    const horiz = Math.max(size.x, size.z)
    const vert = size.y
    return {
      mesh,
      horiz,
      vert,
      aspect: horiz / Math.max(vert, 0.001),
    }
  })

  const trunks = ranked.filter((entry) => entry.vert >= 0.12 && entry.horiz <= entry.vert * 0.85)
  const pool = trunks.length ? trunks : ranked
  pool.sort((a, b) => a.aspect - b.aspect)

  const chosen = []
  for (const entry of pool) {
    if (chosen.some((item) => item.mesh === entry.mesh)) continue
    chosen.push(entry)
    if (chosen.length >= 2) break
  }
  return chosen.map((entry) => entry.mesh)
}

function buildTreeCylinderCollider(mesh, { radiusScale = 0.38 } = {}) {
  getMeshWorldBox(mesh, _box)
  _box.getSize(_size)

  const horizMin = Math.min(_size.x, _size.z)
  const radius = horizMin * 0.5 * radiusScale
  if (radius < 0.03) return null

  return {
    kind: 'cylinder',
    centerX: (_box.min.x + _box.max.x) * 0.5,
    centerZ: (_box.min.z + _box.max.z) * 0.5,
    minY: _box.min.y,
    maxY: _box.max.y,
    radius,
  }
}

function buildTreeColliders(tree) {
  const trunkMeshes = pickTreeTrunkMeshes(tree)
  const colliders = []

  for (const mesh of trunkMeshes) {
    const collider = buildTreeCylinderCollider(mesh)
    if (collider) colliders.push(collider)
  }

  return colliders
}

function buildMeshObbCollider(mesh, { pad = 0, minWorldSize = 0.04 } = {}) {
  const geometry = mesh.geometry
  if (!geometry?.boundingBox) geometry.computeBoundingBox()

  const worldSize = getMeshWorldExtents(mesh)
  const maxWorld = Math.max(worldSize.x, worldSize.y, worldSize.z)
  if (maxWorld < minWorldSize) return null

  const localBox = geometry.boundingBox.clone()
  if (pad > 0) {
    mesh.updateWorldMatrix(true, false)
    mesh.matrixWorld.decompose(_position, _quaternion, _scale)
    localBox.min.x -= pad / Math.max(_scale.x, 1e-4)
    localBox.min.y -= pad / Math.max(_scale.y, 1e-4)
    localBox.min.z -= pad / Math.max(_scale.z, 1e-4)
    localBox.max.x += pad / Math.max(_scale.x, 1e-4)
    localBox.max.y += pad / Math.max(_scale.y, 1e-4)
    localBox.max.z += pad / Math.max(_scale.z, 1e-4)
  }

  return { frame: mesh, localBox }
}

function buildObjectObbColliders(root, options = {}) {
  const meshes = []
  collectMeshes(root, meshes)

  const colliders = []
  for (const mesh of meshes) {
    const collider = buildMeshObbCollider(mesh, options)
    if (collider) colliders.push(collider)
  }
  return colliders
}

function resolveSphereBox(center, velocity, radius, box, restitution) {
  _closest.set(
    clamp(center.x, box.min.x, box.max.x),
    clamp(center.y, box.min.y, box.max.y),
    clamp(center.z, box.min.z, box.max.z),
  )

  _delta.set(
    center.x - _closest.x,
    center.y - _closest.y,
    center.z - _closest.z,
  )

  let distSq = _delta.lengthSq()
  if (distSq >= radius * radius) return false

  let nx
  let ny
  let nz
  let penetration

  if (distSq < 1e-8) {
    const penX = Math.min(center.x - box.min.x, box.max.x - center.x)
    const penY = Math.min(center.y - box.min.y, box.max.y - center.y)
    const penZ = Math.min(center.z - box.min.z, box.max.z - center.z)
    const minPen = Math.min(penX, penY, penZ)

    if (minPen === penX) {
      nx = center.x < (box.min.x + box.max.x) * 0.5 ? -1 : 1
      ny = 0
      nz = 0
      penetration = radius + minPen
    } else if (minPen === penY) {
      nx = 0
      ny = center.y < (box.min.y + box.max.y) * 0.5 ? -1 : 1
      nz = 0
      penetration = radius + minPen
    } else {
      nx = 0
      ny = 0
      nz = center.z < (box.min.z + box.max.z) * 0.5 ? -1 : 1
      penetration = radius + minPen
    }
  } else {
    const dist = Math.sqrt(distSq)
    nx = _delta.x / dist
    ny = _delta.y / dist
    nz = _delta.z / dist
    penetration = radius - dist
  }

  center.x += nx * penetration
  center.y += ny * penetration
  center.z += nz * penetration

  const vn = velocity.x * nx + velocity.y * ny + velocity.z * nz
  if (vn < 0) {
    const impulse = -(1 + restitution) * vn
    velocity.x += impulse * nx
    velocity.y += impulse * ny
    velocity.z += impulse * nz
  }

  return true
}

function resolveSphereObb(center, velocity, radius, collider, restitution) {
  const { frame, localBox } = collider
  frame.updateWorldMatrix(true, false)
  _invFrame.copy(frame.matrixWorld).invert()

  _worldPoint.set(center.x, center.y, center.z)
  _localPoint.copy(_worldPoint).applyMatrix4(_invFrame)

  const localCenter = {
    x: _localPoint.x,
    y: _localPoint.y,
    z: _localPoint.z,
  }

  _closest.set(
    clamp(localCenter.x, localBox.min.x, localBox.max.x),
    clamp(localCenter.y, localBox.min.y, localBox.max.y),
    clamp(localCenter.z, localBox.min.z, localBox.max.z),
  )

  _delta.set(
    localCenter.x - _closest.x,
    localCenter.y - _closest.y,
    localCenter.z - _closest.z,
  )

  let distSq = _delta.lengthSq()
  if (distSq >= radius * radius) return false

  let penetration
  if (distSq < 1e-8) {
    const penX = Math.min(localCenter.x - localBox.min.x, localBox.max.x - localCenter.x)
    const penY = Math.min(localCenter.y - localBox.min.y, localBox.max.y - localCenter.y)
    const penZ = Math.min(localCenter.z - localBox.min.z, localBox.max.z - localCenter.z)
    const minPen = Math.min(penX, penY, penZ)

    if (minPen === penX) {
      _localNormal.set(
        localCenter.x < (localBox.min.x + localBox.max.x) * 0.5 ? -1 : 1,
        0,
        0,
      )
      penetration = radius + minPen
    } else if (minPen === penY) {
      _localNormal.set(
        0,
        localCenter.y < (localBox.min.y + localBox.max.y) * 0.5 ? -1 : 1,
        0,
      )
      penetration = radius + minPen
    } else {
      _localNormal.set(
        0,
        0,
        localCenter.z < (localBox.min.z + localBox.max.z) * 0.5 ? -1 : 1,
      )
      penetration = radius + minPen
    }
  } else {
    const dist = Math.sqrt(distSq)
    _localNormal.set(_delta.x / dist, _delta.y / dist, _delta.z / dist)
    penetration = radius - dist
  }

  localCenter.x += _localNormal.x * penetration
  localCenter.y += _localNormal.y * penetration
  localCenter.z += _localNormal.z * penetration

  _localPoint.set(localCenter.x, localCenter.y, localCenter.z)
  _localPoint.applyMatrix4(frame.matrixWorld)
  center.x = _localPoint.x
  center.y = _localPoint.y
  center.z = _localPoint.z

  _localNormal.transformDirection(frame.matrixWorld)
  const nx = _localNormal.x
  const ny = _localNormal.y
  const nz = _localNormal.z

  const vn = velocity.x * nx + velocity.y * ny + velocity.z * nz
  if (vn < 0) {
    const impulse = -(1 + restitution) * vn
    velocity.x += impulse * nx
    velocity.y += impulse * ny
    velocity.z += impulse * nz
  }

  return true
}

function resolveSphereVerticalCylinder(center, velocity, radius, cylinder, restitution) {
  const dx = center.x - cylinder.centerX
  const dz = center.z - cylinder.centerZ
  const horizDist = Math.hypot(dx, dz)

  const closestY = clamp(center.y, cylinder.minY, cylinder.maxY)
  const dy = center.y - closestY
  const surfaceDist = Math.hypot(horizDist, dy)

  if (surfaceDist >= cylinder.radius + radius) return false

  let nx
  let ny
  let nz
  let penetration

  if (surfaceDist < 1e-8) {
    if (horizDist > 1e-6) {
      nx = dx / horizDist
      ny = 0
      nz = dz / horizDist
      penetration = cylinder.radius + radius
    } else if (center.y > (cylinder.minY + cylinder.maxY) * 0.5) {
      nx = 0
      ny = 1
      nz = 0
      penetration = cylinder.radius + radius
    } else {
      nx = 0
      ny = -1
      nz = 0
      penetration = cylinder.radius + radius
    }
  } else {
    nx = (horizDist > 1e-6 ? (dx / horizDist) * (horizDist / surfaceDist) : 0)
    ny = dy / surfaceDist
    nz = (horizDist > 1e-6 ? (dz / horizDist) * (horizDist / surfaceDist) : 0)
    penetration = cylinder.radius + radius - surfaceDist
  }

  center.x += nx * penetration
  center.y += ny * penetration
  center.z += nz * penetration

  const vn = velocity.x * nx + velocity.y * ny + velocity.z * nz
  if (vn < 0) {
    const impulse = -(1 + restitution) * vn
    velocity.x += impulse * nx
    velocity.y += impulse * ny
    velocity.z += impulse * nz
  }

  return true
}

function setMeshWorldBox(mesh, targetBox) {
  return getMeshWorldBox(mesh, targetBox)
}

export function createObstacleCollider({
  golf_car,
  trees = [],
  ground_water,
}) {
  const obbColliders = buildObjectObbColliders(golf_car, {
    pad: 0.04,
    minWorldSize: 0.03,
  })

  const treeColliders = []
  trees.forEach((tree) => {
    treeColliders.push(...buildTreeColliders(tree))
  })

  const meshBoxes = []
  collectMeshes(ground_water, meshBoxes, { waterStakesOnly: true })

  return {
    meshCount: obbColliders.length + treeColliders.length + meshBoxes.length,
    resolve(state, ballRadius, { restitution = 0.42 } = {}) {
      if (!obbColliders.length && !treeColliders.length && !meshBoxes.length) return false

      const center = {
        x: state.position.x,
        y: state.position.y + ballRadius,
        z: state.position.z,
      }
      const { velocity } = state
      let hit = false

      for (let pass = 0; pass < 3; pass += 1) {
        for (const collider of obbColliders) {
          if (resolveSphereObb(center, velocity, ballRadius, collider, restitution)) {
            hit = true
          }
        }

        for (const collider of treeColliders) {
          if (resolveSphereVerticalCylinder(center, velocity, ballRadius, collider, restitution)) {
            hit = true
          }
        }

        for (const mesh of meshBoxes) {
          setMeshWorldBox(mesh, _box)
          _box.expandByScalar(0.015)
          if (resolveSphereBox(center, velocity, ballRadius, _box, restitution)) {
            hit = true
          }
        }
      }

      state.position.x = center.x
      state.position.y = center.y - ballRadius
      state.position.z = center.z

      if (hit) {
        const speed = Math.hypot(velocity.x, velocity.y, velocity.z)
        if (speed > 0.2 && state.phase === PHASES.STOPPED) {
          state.phase = Math.abs(velocity.y) > 0.6 ? PHASES.FLIGHT : PHASES.ROLLING
        }
      }

      return hit
    },
  }
}
