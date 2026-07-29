import { useEffect, useState } from 'react'
import { ChevronLeft, VideoOff } from 'lucide-react'
import type { ClientPrefs } from '@shared/ipc'
import './SettingsPanel.css'

interface Props {
  open: boolean
  onBack: () => void
  onClose: () => void
}

export function SettingsPanel({ open, onBack, onClose }: Props) {
  const [prefs, setPrefs] = useState<ClientPrefs>({ cameraOffOnLobbyEnter: false })
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    const api = window.polemica
    if (!api?.getPrefs) return
    void api.getPrefs().then(setPrefs).catch(() => {
      /* keep defaults */
    })
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const toggleCameraOff = (): void => {
    if (busy || !window.polemica?.setPrefs) return
    setBusy(true)
    const next = !prefs.cameraOffOnLobbyEnter
    setPrefs((p) => ({ ...p, cameraOffOnLobbyEnter: next }))
    void window.polemica
      .setPrefs({ cameraOffOnLobbyEnter: next })
      .then(setPrefs)
      .catch(() => {
        setPrefs((p) => ({ ...p, cameraOffOnLobbyEnter: !next }))
      })
      .finally(() => setBusy(false))
  }

  return (
    <aside className="settings-panel" aria-label="Настройки">
      <div className="settings-panel__traffic-spacer" aria-hidden />

      <div className="settings-panel__head">
        <button
          type="button"
          className="settings-panel__back"
          onClick={onBack}
          aria-label="Назад в меню"
        >
          <ChevronLeft size={20} strokeWidth={2.2} aria-hidden />
        </button>
        <h1 className="settings-panel__title">Настройки</h1>
      </div>

      <div className="settings-panel__list">
        <button
          type="button"
          className="settings-panel__row"
          onClick={toggleCameraOff}
          disabled={busy}
          aria-pressed={prefs.cameraOffOnLobbyEnter}
        >
          <span className="settings-panel__row-icon" aria-hidden>
            <VideoOff size={18} strokeWidth={2} />
          </span>
          <span className="settings-panel__row-text">
            <span className="settings-panel__row-label">Камера выкл в лобби</span>
            <span className="settings-panel__row-hint">
              В лобби камера сразу выкл; тумблер сразу жмёт кнопку камеры
            </span>
          </span>
          <span
            className={`settings-panel__switch${prefs.cameraOffOnLobbyEnter ? ' settings-panel__switch--on' : ''}`}
            aria-hidden
          >
            <span className="settings-panel__switch-knob" />
          </span>
        </button>
      </div>
    </aside>
  )
}
