// ui.js
// here is only shot control panel

const rpmToRadPerSec = (rpm) => (rpm * 2 * Math.PI) / 60

export function createShotControls(onHit) {
  const panel = document.createElement('div')
  panel.id = 'shot-controls'
  panel.innerHTML = `
    <h3 style="margin:0 0 8px 0;font-size:14px;">Shot Setup</h3>

    <label>Speed: <span data-out="speed">35</span> m/s</label>
    <input type="range" data-in="speed" min="5" max="70" step="1" value="35" />

    <label>Launch angle: <span data-out="launch">20</span>°</label>
    <input type="range" data-in="launch" min="0" max="80" step="1" value="20" />

    <label>Direction (azimuth): <span data-out="azimuth">0</span>°</label>
    <input type="range" data-in="azimuth" min="-90" max="90" step="1" value="0" />

    <button data-action="hit" style="margin-top:10px;width:100%;padding:6px;font-weight:bold;cursor:pointer;">
      Hit Ball
    </button>
  `
  /*    <label>Backspin: <span data-out="backspin">350</span> rpm</label>
    <input type="range" data-in="backspin" min="0" max="6000" step="50" value="350" />

    <label>Sidespin: <span data-out="sidespin">0</span> rpm</label>
    <input type="range" data-in="sidespin" min="-3000" max="3000" step="50" value="0" />
  */

  Object.assign(panel.style, {
    position: 'absolute', top: '10px', right: '10px', width: '240px',
    color: '#fff', fontFamily: 'monospace', fontSize: '13px',
    background: 'rgba(0,0,0,0.6)', padding: '12px 14px', borderRadius: '8px',
    zIndex: 10,
  })
  document.body.appendChild(panel)

  panel.querySelectorAll('input[type="range"]').forEach((slider) => {
    const key = slider.dataset.in
    const out = panel.querySelector(`[data-out="${key}"]`)
    slider.addEventListener('input', () => { out.textContent = slider.value })
  })

  panel.querySelector('[data-action="hit"]').addEventListener('click', () => onHit())

  function read(key) {
    return parseFloat(panel.querySelector(`input[data-in="${key}"]`).value)
  }

  // this func is used in createInitialState()

  function getShotParams() {
    const speed = read('speed')
    const launchDeg = read('launch')
    const azimuthDeg = read('azimuth')
    const backspinRpm = 2800 // read('backspin')
    const sidespinRpm = 0 // read('sidespin')

    const launchRad = (launchDeg * Math.PI) / 180
    const azimuthRad = (azimuthDeg * Math.PI) / 180

    const horizSpeed = speed * Math.cos(launchRad)
    const vx = -horizSpeed * Math.cos(azimuthRad)
    const vz = horizSpeed * Math.sin(azimuthRad)
    const vy = speed * Math.sin(launchRad)

    const backspinMag = rpmToRadPerSec(backspinRpm)
    const sidespinMag = rpmToRadPerSec(sidespinRpm)

    // Backspin axis must rotate with azimuth so it always lifts, never
    // sideways-curves on its own (sidespin handles the sideways curve).
    const omegaX = backspinMag * Math.sin(azimuthRad)
    const omegaZ = -backspinMag * Math.cos(azimuthRad)

    return {
      velocity: { x: vx, y: vy, z: vz },
      angularVelocity: { x: omegaX, y: sidespinMag, z: omegaZ },
    }
  }

  return { getShotParams }
}
export function createHUD({ onRestart } = {}) {
  const strokes = document.createElement('div')
  const message = document.createElement('div')
const restartBtn = document.createElement('button')
  Object.assign(strokes.style, {
    position: 'fixed',
    top: '20px',
    left: '20px',
    color: '#fff',
    fontFamily: 'monospace',
    fontSize: '20px',
    zIndex: 20,
  })

  Object.assign(message.style, {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    color: '#ffd54f',
    fontFamily: 'monospace',
    fontSize: '42px',
    fontWeight: 'bold',
    display: 'none',
    zIndex: 30,
  })
  Object.assign(restartBtn.style, {
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    padding: '10px 14px',
    fontFamily: 'monospace',
    fontSize: '14px',
    cursor: 'pointer',
    zIndex: 40,
  })
restartBtn.textContent = 'Restart'
 restartBtn.addEventListener('click', () => {
    if (onRestart) onRestart()
  })

  document.body.appendChild(strokes)
  document.body.appendChild(message)
document.body.appendChild(restartBtn)
  function updateStrokes(value) {
    strokes.textContent = `Strokes: ${value}`
  }

  function showWin() {
    message.style.display = 'block'
    message.textContent = 'You Win!'
  }

  function showLose(reason = 'strokes') {
    message.style.display = 'block'
    message.textContent = 'Game Over!'
  }

  let penaltyTimeout = null

  function showPenalty(reason) {
    const labels = {
      water: 'Water hazard — +1 stroke',
      oob: 'Out of bounds — +1 stroke',
    }
    message.style.display = 'block'
    message.style.fontSize = '28px'
    message.textContent = labels[reason] ?? '+1 stroke'
    if (penaltyTimeout) clearTimeout(penaltyTimeout)
    penaltyTimeout = setTimeout(() => {
      message.style.display = 'none'
      message.style.fontSize = '42px'
      penaltyTimeout = null
    }, 1800)
  }

  function hideMessage() {
    message.style.display = 'none'
    message.style.fontSize = '42px'
    if (penaltyTimeout) {
      clearTimeout(penaltyTimeout)
      penaltyTimeout = null
    }
    resetCamera()
  }

  function reset() {
    hideMessage()
    updateStrokes(0)
  }

  updateStrokes(0)

  return {
    updateStrokes,
    showWin,
    showLose,
    showPenalty,
    hideMessage,
    reset,
  }
}


