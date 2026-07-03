import * as THREE from 'three'

const MIN_SPEED = 5
const MAX_SPEED = 70
const MIN_LAUNCH = 0
const MAX_LAUNCH = 80
const MAX_DRAG_PIXELS = 360
const WHEEL_LAUNCH_STEP = 2
const AIM_BUTTON = 2
const BACKSPIN_RPM = 350
const SIDESPIN_RPM = 0

const DEG_TO_RAD = Math.PI / 180
const RPM_TO_RAD_PER_SEC = (2 * Math.PI) / 60

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))
const round = (value) => Math.round(value)

function normalizeXZ(vector) {
  vector.y = 0
  const length = Math.hypot(vector.x, vector.z)

  if (length < 1e-6) {
    vector.x = 0
    vector.z = -1
    return vector
  }

  vector.x /= length
  vector.z /= length
  return vector
}

function getCameraBasis(camera, forward, right) {
  camera.getWorldDirection(forward)
  normalizeXZ(forward)

  right.crossVectors(forward, camera.up)
  normalizeXZ(right)
}

function buildShotParams(direction, speed, launchDeg) {
  const launchRad = launchDeg * DEG_TO_RAD
  const horizontalSpeed = speed * Math.cos(launchRad)
  const backspin = BACKSPIN_RPM * RPM_TO_RAD_PER_SEC
  const sidespin = SIDESPIN_RPM * RPM_TO_RAD_PER_SEC

  return {
    velocity: {
      x: direction.x * horizontalSpeed,
      y: speed * Math.sin(launchRad),
      z: direction.z * horizontalSpeed,
    },
    angularVelocity: {
      x: direction.z * backspin,
      y: sidespin,
      z: direction.x * backspin,
    },
  }
}

function createForceMeter() {
  const meter = document.createElement('div')
  const fill = document.createElement('div')
  const label = document.createElement('div')

  meter.style.cssText = [
    'position:fixed',
    'left:24px',
    'bottom:24px',
    'width:220px',
    'height:18px',
    'border:1px solid rgba(255,255,255,0.85)',
    'background:rgba(0,0,0,0.45)',
    'z-index:20',
    'display:none',
    'pointer-events:none',
  ].join(';')

  fill.style.cssText = [
    'height:100%',
    'width:0%',
    'background:linear-gradient(90deg,#66bb6a,#ffeb3b,#ef5350)',
  ].join(';')

  label.style.cssText = [
    'position:absolute',
    'left:0',
    'right:0',
    'top:-22px',
    'color:#fff',
    'font:13px monospace',
    'text-shadow:0 1px 2px #000',
  ].join(';')

  meter.appendChild(fill)
  meter.appendChild(label)
  document.body.appendChild(meter)

  return {
    show() {
      meter.style.display = 'block'
    },
    hide() {
      meter.style.display = 'none'
    },
    update(forceRatio, speed, launchDeg) {
      const percent = round(forceRatio * 100)
      fill.style.width = `${percent}%`
      label.textContent = `Force ${percent}% | Speed ${speed.toFixed(1)} m/s | Angle ${round(launchDeg)} deg`
    },
  }
}

export function createMouseShotInput({ canvas, camera, controls, onLaunch, onAim, onAimEnd }) {
  const drag = {
    active: false,
    pointerId: -1,
    startX: 0,
    startY: 0,
    x: 0,
    y: 0,
  }

  const forward = new THREE.Vector3(0, 0, -1)
  const right = new THREE.Vector3(1, 0, 0)
  const direction = new THREE.Vector3(0, 0, -1)

  let launchDeg = 20
  let controlsWereEnabled = true
  const forceMeter = createForceMeter()

  function claimEvent(event) {
    event.preventDefault()
    event.stopImmediatePropagation()
  }

  function updateDirectionAndSpeed() {
    const dx = drag.x - drag.startX
    const dy = drag.y - drag.startY
    const dragPixels = Math.min(Math.hypot(dx, dy), MAX_DRAG_PIXELS)
    const forceRatio = dragPixels / MAX_DRAG_PIXELS
    const speed = MIN_SPEED + forceRatio * (MAX_SPEED - MIN_SPEED)

    getCameraBasis(camera, forward, right)

    direction.x = right.x * dx + forward.x * -dy
    direction.z = right.z * dx + forward.z * -dy
    normalizeXZ(direction)

    return { direction, speed, forceRatio }
  }

  function updateAim() {
    const shot = updateDirectionAndSpeed()
    const shotParams = buildShotParams(shot.direction, shot.speed, launchDeg)

    forceMeter.update(shot.forceRatio, shot.speed, launchDeg)
    if (onAim) onAim(shotParams)

    return { ...shot, shotParams }
  }

  function onPointerDown(event) {
    if (event.target !== canvas || event.button !== AIM_BUTTON) return

    drag.active = true
    drag.pointerId = event.pointerId
    drag.startX = event.clientX
    drag.startY = event.clientY
    drag.x = event.clientX
    drag.y = event.clientY

    controlsWereEnabled = controls.enabled
    controls.enabled = false
    canvas.setPointerCapture(event.pointerId)
    forceMeter.show()
    updateAim()
    claimEvent(event)
  }

  function onPointerMove(event) {
    if (!drag.active || event.pointerId !== drag.pointerId) return

    drag.x = event.clientX
    drag.y = event.clientY
    updateAim()
    claimEvent(event)
  }

  function finishDrag(event, shouldLaunch) {
    if (!drag.active || event.pointerId !== drag.pointerId) return

    if (canvas.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId)
    }

    const shot = updateAim()
    drag.active = false
    drag.pointerId = -1
    controls.enabled = controlsWereEnabled
    forceMeter.hide()
    if (onAimEnd) onAimEnd()

    if (shouldLaunch) {
      onLaunch(shot.shotParams)
    }

    claimEvent(event)
  }

  function onWheel(event) {
    if (!drag.active || event.target !== canvas) return

    launchDeg = clamp(
      launchDeg - Math.sign(event.deltaY) * WHEEL_LAUNCH_STEP,
      MIN_LAUNCH,
      MAX_LAUNCH
    )
    updateAim()
    claimEvent(event)
  }

  function onContextMenu(event) {
    if (event.target === canvas) claimEvent(event)
  }

  canvas.addEventListener('pointerdown', onPointerDown, true)
  canvas.addEventListener('pointermove', onPointerMove, true)
  canvas.addEventListener('pointerup', (event) => finishDrag(event, true), true)
  canvas.addEventListener('pointercancel', (event) => finishDrag(event, false), true)
  canvas.addEventListener('lostpointercapture', () => {
    if (!drag.active) return
    drag.active = false
    drag.pointerId = -1
    controls.enabled = controlsWereEnabled
    forceMeter.hide()
    if (onAimEnd) onAimEnd()
  })
  canvas.addEventListener('wheel', onWheel, { passive: false, capture: true })
  canvas.addEventListener('contextmenu', onContextMenu, true)
}
