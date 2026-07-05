// gameLogic.js

import { PHASES } from './physics/index.js'


export function createGameLogic({
    
    
  holePosition,
  maxStrokes = 5,
  
 winRadius = 0.5,
}) {
    if (!holePosition) {
  throw new Error('createGameLogic requires holePosition')
}
  const state = {
    strokes: 0,
    canShootFlag: true,
    gameState: 'playing',
  }

  function canShoot() {
    return state.canShootFlag
  }

  function lockShot() {
    state.canShootFlag = false
  }

  function unlockShot() {
    state.canShootFlag = true
  }

  function incrementStrokes() {
    state.strokes++
  }

  function getStrokes() {
    return state.strokes
  }

  function isBallStopped(physicsState) {
    return physicsState.phase === PHASES.STOPPED
  }

  function checkWin(ballPosition, targetHolePosition = holePosition) {
    const dx = ballPosition.x - targetHolePosition.x
    const dz = ballPosition.z - targetHolePosition.z

    return Math.hypot(dx, dz) < winRadius
  }

  function checkLose(strokes = state.strokes) {
    return strokes >= maxStrokes
  }

  function setWon() {
    state.gameState = 'won'
    state.canShootFlag = false
  }

  function setLost() {
    state.gameState = 'lost'
    state.canShootFlag = false
  }

  function getGameState() {
    return state.gameState
  }

  function resetGame() {
    state.strokes = 0
    state.canShootFlag = true
    state.gameState = 'playing'
  }

  return {
    canShoot,
    lockShot,
    unlockShot,
    incrementStrokes,
    getStrokes,
    isBallStopped,
    checkWin,
    checkLose,
    setWon,
    setLost,
    getGameState,
    resetGame,
  }
}