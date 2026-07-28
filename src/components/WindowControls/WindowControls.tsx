import { Minus, Square, X } from 'lucide-react'
import './WindowControls.css'

const iconProps = { size: 12, strokeWidth: 2 } as const

export function WindowControls() {
  // macOS uses native traffic lights (hiddenInset). Custom buttons for win/linux.
  if (isMac()) return <div className="win-controls win-controls--mac" />

  const api = window.polemica

  return (
    <div className="win-controls">
      <button type="button" className="win-controls__btn" title="Свернуть" onClick={() => void api?.minimize()}>
        <Minus {...iconProps} aria-hidden />
      </button>
      <button type="button" className="win-controls__btn" title="Развернуть" onClick={() => void api?.maximize()}>
        <Square {...iconProps} aria-hidden />
      </button>
      <button
        type="button"
        className="win-controls__btn win-controls__btn--close"
        title="Закрыть"
        onClick={() => void api?.close()}
      >
        <X {...iconProps} aria-hidden />
      </button>
    </div>
  )
}

function isMac(): boolean {
  return navigator.platform.toUpperCase().includes('MAC')
}
