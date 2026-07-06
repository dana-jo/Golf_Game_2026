// local ground normal (cyan arrow) , ball's current velocity (yellow arrow)
// Toggle with 'N' key 

import * as THREE from 'three'

export function createDebugOverlay(scene, { normalLength = 0.6, velocityScale = 0.05 } = {}) {
  const normalArrow = new THREE.ArrowHelper(
    new THREE.Vector3(0, 1, 0),
    new THREE.Vector3(0, 0, 0),
    normalLength,
    0x00e5ff, // cyan = ground normal
    normalLength * 0.35,
    normalLength * 0.25
  )

  const velocityArrow = new THREE.ArrowHelper(
    new THREE.Vector3(1, 0, 0),
    new THREE.Vector3(0, 0, 0),
    0.4,
    0xffee58, // yellow = velocity
    0.15,
    0.1
  )

  normalArrow.visible = false
  velocityArrow.visible = false
  normalArrow.name = 'debug-ground-normal'
  velocityArrow.name = 'debug-velocity'
  scene.add(normalArrow)
  scene.add(velocityArrow)

  function update({ position, normal, velocity }) {
    if (!normalArrow.visible) return

    normalArrow.position.set(position.x, position.y, position.z)
    if (normal) {
      const n = new THREE.Vector3(normal.x, normal.y, normal.z)
      if (n.lengthSq() > 1e-9) normalArrow.setDirection(n.normalize())
    }

    velocityArrow.position.set(position.x, position.y, position.z)
    if (velocity) {
      const v = new THREE.Vector3(velocity.x, velocity.y, velocity.z)
      const speed = v.length()
      if (speed > 1e-3) {
        velocityArrow.visible = true
        velocityArrow.setDirection(v.clone().normalize())
        const len = Math.min(2.5, 0.3 + speed * velocityScale)
        velocityArrow.setLength(len, len * 0.25, len * 0.15)
      } else {
        velocityArrow.visible = false
      }
    }
  }

  function setVisible(visible) {
    normalArrow.visible = visible
    velocityArrow.visible = visible && velocityArrow.visible
    if (visible) velocityArrow.visible = true
  }

  function isVisible() {
    return normalArrow.visible
  }

  return { update, setVisible, isVisible }
}
