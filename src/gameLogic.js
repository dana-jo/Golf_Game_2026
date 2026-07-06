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
    loseReason: null,
  }

  function isPlaying() {
    return state.gameState === 'playing'
  }

  function canShoot() {
    return state.canShootFlag && isPlaying()
  }

  function lockShot() {
    state.canShootFlag = false
  }

  function unlockShot() {
    if (isPlaying()) state.canShootFlag = true
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

  function checkStrokeLimit(strokes = state.strokes) {
    return strokes >= maxStrokes
  }

  function setWon() {
    state.gameState = 'won'
    state.canShootFlag = false
  }

  function setLost(reason = 'strokes') {
    state.gameState = 'lost'
    state.loseReason = reason
    state.canShootFlag = false
  }

  function getGameState() {
    return state.gameState
  }

  function getLoseReason() {
    return state.loseReason
  }

  function resetGame() {
    state.strokes = 0
    state.canShootFlag = true
    state.gameState = 'playing'
    state.loseReason = null
  }

  return {
    isPlaying,
    canShoot,
    lockShot,
    unlockShot,
    incrementStrokes,
    getStrokes,
    isBallStopped,
    checkWin,
    checkStrokeLimit,
    setWon,
    setLost,
    getGameState,
    getLoseReason,
    resetGame,
  }
}
