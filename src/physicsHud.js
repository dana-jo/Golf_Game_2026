export function createPhysicsHud() {
  const panel = document.createElement('div')
  panel.id = 'physics-hud'

  Object.assign(panel.style, {
    position: 'fixed',
    left: '20px',
    bottom: '20px',
    minWidth: '260px',
    padding: '10px 12px',
    color: '#e8f5e9',
    fontFamily: 'monospace',
    fontSize: '12px',
    lineHeight: '1.55',
    background: 'rgba(0, 0, 0, 0.72)',
    border: '1px solid rgba(255,255,255,0.25)',
    borderRadius: '8px',
    zIndex: '25',
    pointerEvents: 'none',
    whiteSpace: 'pre',
  })

  panel.textContent = 'Physics HUD'
  document.body.appendChild(panel)

  function reset() {}

  function update({
    velocity,
    lastAccel,
    phase,
    canShoot,
    groundSlopeDeg = 0,
  }) {
    const speed = Math.hypot(velocity.x, velocity.y, velocity.z)
    const horizSpeed = Math.hypot(velocity.x, velocity.z)
    const accel = lastAccel
      ? Math.hypot(lastAccel.x, lastAccel.y, lastAccel.z)
      : 0
    const accelX = lastAccel?.x ?? 0
    const accelY = lastAccel?.y ?? 0
    const accelZ = lastAccel?.z ?? 0

    panel.textContent = [
      '── Physics ──',
      `phase:      ${phase}`,
      `speed:      ${speed.toFixed(2)} m/s`,
      `horiz:      ${horizSpeed.toFixed(2)} m/s`,
      `velocity:   ${velocity.x.toFixed(2)}, ${velocity.y.toFixed(2)}, ${velocity.z.toFixed(2)}`,
      `accel:      ${accel.toFixed(2)} m/s²`,
      `accel xyz:  ${accelX.toFixed(2)}, ${accelY.toFixed(2)}, ${accelZ.toFixed(2)}`,
      `slope:      ${groundSlopeDeg.toFixed(1)}°`,
      `can shoot:  ${canShoot ? 'yes' : 'no'}`,
    ].join('\n')
  }

  return { update, reset }
}
