import { TUNABLE_PARAMETERS } from './constants.js'

const PANEL_STYLES = `
#tuning-panel {
  position: fixed;
  top: 12px;
  right: 12px;
  width: 520px;
  padding: 10px 12px;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.82);
  color: #fff;
  font: 11px/1.3 ui-monospace, Consolas, monospace;
  z-index: 50;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45);
  overflow: hidden;
}
.tuning-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}
.tuning-panel__header h2 {
  margin: 0;
  font-size: 13px;
  font-weight: bold;
}
.tuning-panel__header-actions {
  display: flex;
  gap: 6px;
}
.tuning-panel__header-actions button {
  padding: 3px 7px;
  font: inherit;
  cursor: pointer;
  border: 1px solid rgba(255, 255, 255, 0.35);
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
}
.tuning-panel__list {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 5px 14px;
}
.tuning-panel__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  min-width: 0;
}
.tuning-panel__label {
  flex: 1;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  opacity: 0.92;
}
.tuning-panel__row input {
  width: 76px;
  flex-shrink: 0;
  padding: 2px 4px;
  font: inherit;
  color: #fff;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 3px;
}
.tuning-panel__row input:focus {
  outline: 1px solid rgba(255, 238, 88, 0.8);
  border-color: rgba(255, 238, 88, 0.8);
}
`

function injectPanelStyles() {
  if (document.getElementById('tuning-panel-styles')) return
  const style = document.createElement('style')
  style.id = 'tuning-panel-styles'
  style.textContent = PANEL_STYLES
  document.head.append(style)
}

export function createTuningPanel(constantsStore) {
  injectPanelStyles()

  const root = document.createElement('div')
  root.id = 'tuning-panel'
  root.hidden = true

  const header = document.createElement('div')
  header.className = 'tuning-panel__header'

  const title = document.createElement('h2')
  title.textContent = 'Physics (P)'

  const headerActions = document.createElement('div')
  headerActions.className = 'tuning-panel__header-actions'

  const resetBtn = document.createElement('button')
  resetBtn.type = 'button'
  resetBtn.textContent = 'Reset'

  const closeBtn = document.createElement('button')
  closeBtn.type = 'button'
  closeBtn.textContent = 'Close'

  headerActions.append(resetBtn, closeBtn)
  header.append(title, headerActions)

  const list = document.createElement('div')
  list.className = 'tuning-panel__list'

  const inputs = new Map()

  TUNABLE_PARAMETERS.forEach((spec) => {
    const row = document.createElement('div')
    row.className = 'tuning-panel__row'

    const label = document.createElement('span')
    label.className = 'tuning-panel__label'
    label.title = spec.unit ? `${spec.label} (${spec.unit})` : spec.label
    label.textContent = spec.unit ? `${spec.label}` : spec.label

    const input = document.createElement('input')
    input.type = 'text'
    input.inputMode = 'decimal'
    input.spellcheck = false
    input.autocomplete = 'off'
    input.dataset.key = spec.key

    function commit() {
      const value = Number.parseFloat(input.value)
      if (Number.isNaN(value)) return
      constantsStore.set(spec.key, value)
    }

    input.addEventListener('change', commit)
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        commit()
        input.blur()
      }
    })

    inputs.set(spec.key, input)
    row.append(label, input)
    list.append(row)
  })

  root.append(header, list)
  document.body.append(root)

  function syncFromStore() {
    const values = constantsStore.getAll()
    TUNABLE_PARAMETERS.forEach((spec) => {
      inputs.get(spec.key).value = String(values[spec.key])
    })
  }

  function setVisible(visible) {
    root.hidden = !visible
  }

  function isVisible() {
    return !root.hidden
  }

  function toggle() {
    setVisible(!isVisible())
  }

  resetBtn.addEventListener('click', () => {
    constantsStore.reset()
    syncFromStore()
  })

  closeBtn.addEventListener('click', () => setVisible(false))

  constantsStore.subscribe(syncFromStore)
  syncFromStore()

  return { setVisible, isVisible, toggle }
}
