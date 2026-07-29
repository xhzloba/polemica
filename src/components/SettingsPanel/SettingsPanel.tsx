import { useEffect, useState } from 'react'
import { ChevronLeft, VideoOff, Zap } from 'lucide-react'
import type { ClientPrefs } from '@shared/ipc'
import {
  getCachedPrefs,
  loadClientPrefs,
  setCachedPrefs
} from '../../lib/clientPrefsCache'
import './SettingsPanel.css'

interface Props {
  open: boolean
  onBack: () => void
  onClose: () => void
}

export function SettingsPanel({ open, onBack, onClose }: Props) {
  const [prefs, setPrefs] = useState<ClientPrefs | null>(() => getCachedPrefs())
  const [busyKey, setBusyKey] = useState<keyof ClientPrefs | null>(null)

  useEffect(() => {
    if (!open) return
    const api = window.polemica
    void loadClientPrefs().then(setPrefs)
    return api?.onPrefs?.((next) => {
      setCachedPrefs(next)
      setPrefs(next)
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

  const toggle = (key: keyof ClientPrefs): void => {
    if (!prefs || busyKey || !window.polemica?.setPrefs) return
    setBusyKey(key)
    const next = !prefs[key]
    const optimistic = { ...prefs, [key]: next }
    setPrefs(optimistic)
    setCachedPrefs(optimistic)
    void window.polemica
      .setPrefs({ [key]: next })
      .then((saved) => {
        setCachedPrefs(saved)
        setPrefs(saved)
      })
      .catch(() => {
        const reverted = { ...prefs, [key]: !next }
        setPrefs(reverted)
        setCachedPrefs(reverted)
      })
      .finally(() => setBusyKey(null))
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

      {prefs ? (
        <div className="settings-panel__list">
          <button
            type="button"
            className="settings-panel__row"
            onClick={() => toggle('autoAccept')}
            disabled={busyKey !== null}
            aria-pressed={prefs.autoAccept}
          >
            <span className="settings-panel__row-icon" aria-hidden>
              <Zap size={18} strokeWidth={2} />
            </span>
            <span className="settings-panel__row-text">
              <span className="settings-panel__row-label">Автопринятие матча</span>
              <span className="settings-panel__row-hint">
                По умолчанию выкл. Когда вкл — сразу Accept в кнопке «Играть»
              </span>
            </span>
            <span
              className={`settings-panel__switch${prefs.autoAccept ? ' settings-panel__switch--on' : ''}`}
              aria-hidden
            >
              <span className="settings-panel__switch-knob" />
            </span>
          </button>

          <button
            type="button"
            className="settings-panel__row"
            onClick={() => toggle('cameraOffOnLobbyEnter')}
            disabled={busyKey !== null}
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
      ) : (
        <div className="settings-panel__list settings-panel__list--loading" aria-hidden>
          <div className="settings-panel__row settings-panel__row--skeleton" />
          <div className="settings-panel__row settings-panel__row--skeleton" />
        </div>
      )}
    </aside>
  )
}
