import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ChevronDown, LoaderCircle, X } from 'lucide-react'
import type { SearchStatus } from '@shared/ipc'
import {
  getCachedPrefs,
  loadClientPrefs,
  setCachedPrefs
} from '../../lib/clientPrefsCache'
import './SearchBanner.css'

/** Replay match-found sound once when accept timer drops to this many seconds. */
const ACCEPT_REMIND_AT_SEC = 5

function parseAcceptClockSeconds(value: string): number | null {
  const m = String(value || '')
    .trim()
    .match(/^(\d+):(\d{2})$/)
  if (!m) return null
  return Number(m[1]) * 60 + Number(m[2])
}

interface Props {
  search: SearchStatus
}

export function SearchBanner({ search }: Props) {
  const hasNotice = Boolean(search.noticeTitle || search.noticeText)
  const splitRef = useRef<HTMLDivElement>(null)
  const autoFiredKey = useRef<string>('')
  const remindFiredKey = useRef<string>('')
  const [autoAccept, setAutoAccept] = useState(() => Boolean(getCachedPrefs()?.autoAccept))
  const [menuOpenLocal, setMenuOpenLocal] = useState(false)

  useEffect(() => {
    const api = window.polemica
    void loadClientPrefs().then((p) => setAutoAccept(Boolean(p.autoAccept)))
    return api?.onPrefs?.((p) => {
      setCachedPrefs(p)
      setAutoAccept(Boolean(p.autoAccept))
    })
  }, [])

  useEffect(() => {
    if (!autoAccept) return
    if (search.phase !== 'accept' || search.acceptAccepted || search.loading) return
    const matchKey = `${search.title}|${search.acceptMode}|${search.delay}`
    if (autoFiredKey.current === matchKey) return
    autoFiredKey.current = matchKey
    void window.polemica.acceptGameSearch()
  }, [
    autoAccept,
    search.phase,
    search.acceptAccepted,
    search.loading,
    search.title,
    search.acceptMode,
    search.delay
  ])

  useEffect(() => {
    if (search.phase !== 'accept') {
      autoFiredKey.current = ''
      remindFiredKey.current = ''
    }
  }, [search.phase])

  useEffect(() => {
    if (autoAccept) return
    if (search.phase !== 'accept' || search.acceptAccepted) return
    const secs = parseAcceptClockSeconds(search.time)
    if (secs == null || secs > ACCEPT_REMIND_AT_SEC) return
    const foundKey = `${search.title}|${search.acceptMode}|${search.delay}`
    if (remindFiredKey.current === foundKey) return
    remindFiredKey.current = foundKey
    void window.polemica?.playAcceptReminderSound()
  }, [
    autoAccept,
    search.phase,
    search.acceptAccepted,
    search.time,
    search.title,
    search.acceptMode,
    search.delay
  ])

  if (!search.visible && !search.playVisible && !hasNotice) return null

  const phase = search.phase
  const showModes = (phase === 'idle' || phase === 'searching') && search.modes.length > 0
  const canPlay = search.modes.some((m) => m.selected && m.available)
  const showIdleControls = phase === 'idle'

  const openActionMenu = (): void => {
    if (!window.polemica) return
    const rect = splitRef.current?.getBoundingClientRect()
    if (!rect) return
    setMenuOpenLocal(true)
    void window.polemica
      .openPlayActionMenu(
        {
          x: rect.x,
          y: rect.y,
          right: rect.right,
          bottom: rect.bottom
        },
        { autoAccept }
      )
      .then((result) => {
        if (!result) return
        setAutoAccept(result.autoAccept)
        void window.polemica.setPrefs({ autoAccept: result.autoAccept }).then((prefs) => {
          setCachedPrefs(prefs)
        })
      })
      .finally(() => setMenuOpenLocal(false))
  }

  const playSplit = (opts: { disabled?: boolean; onPlay: () => void }): ReactNode => (
    <div
      ref={splitRef}
      className={`search-banner__play-split${opts.disabled ? ' search-banner__play-split--disabled' : ''}${
        autoAccept ? ' search-banner__play-split--auto' : ''
      }`}
    >
      <button
        type="button"
        className="search-banner__play search-banner__play--main"
        disabled={opts.disabled}
        onClick={opts.onPlay}
      >
        Играть
        {autoAccept ? <span className="search-banner__play-auto-tag">авто</span> : null}
      </button>
      <button
        type="button"
        className="search-banner__play search-banner__play--caret"
        disabled={opts.disabled}
        aria-label="Настройки поиска"
        aria-haspopup="menu"
        aria-expanded={menuOpenLocal}
        onClick={(e) => {
          e.stopPropagation()
          openActionMenu()
        }}
      >
        <ChevronDown size={16} strokeWidth={2.4} aria-hidden />
      </button>
    </div>
  )

  return (
    <div
      className="search-banner search-banner--play"
      role={search.visible || hasNotice ? 'status' : 'region'}
      aria-label="Поиск игры"
      aria-live={search.visible || hasNotice ? 'polite' : undefined}
    >
      <div className="search-banner__card search-banner__card--play">
        {showModes ? (
          <div className="search-banner__modes-block">
            <div className="search-banner__modes" role="group" aria-label="Режимы поиска">
              {search.modes.map((mode) => (
                <button
                  key={mode.mode}
                  type="button"
                  className={[
                    'search-banner__mode',
                    mode.selected && 'search-banner__mode--on',
                    !mode.available && 'search-banner__mode--off'
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  disabled={!mode.available}
                  title={mode.description || mode.title}
                  onClick={() => void window.polemica.toggleSearchMode(mode.mode)}
                >
                  <span className="search-banner__mode-check" aria-hidden />
                  <span className="search-banner__mode-name">{mode.title}</span>
                  <span className="search-banner__mode-count">
                    {mode.count}/{mode.countTarget}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {phase === 'launching' || (phase === 'searching' && search.loading) ? (
          <div className="search-banner__status search-banner__status--loading">
            <LoaderCircle
              size={18}
              strokeWidth={2.2}
              className="search-banner__spinner"
              aria-label="Загрузка"
            />
            {phase === 'launching' ? (
              <div className="search-banner__center">
                <div className="search-banner__title">{search.title || 'Игра запускается'}</div>
              </div>
            ) : null}
          </div>
        ) : phase === 'accept' ? (
          search.acceptAccepted ? (
            <div className="search-banner__status">
              {search.time ? <div className="search-banner__time">{search.time}</div> : null}
              <div className="search-banner__center">
                <div className="search-banner__title">{search.title}</div>
                {search.delay || search.acceptMode ? (
                  <div className="search-banner__delay">{search.delay || search.acceptMode}</div>
                ) : null}
              </div>
              <span className="search-banner__close-spacer" aria-hidden />
            </div>
          ) : autoAccept ? (
            <div className="search-banner__status search-banner__status--loading">
              <LoaderCircle
                size={18}
                strokeWidth={2.2}
                className="search-banner__spinner"
                aria-label="Автопринятие"
              />
              <div className="search-banner__center">
                <div className="search-banner__title">Автопринятие…</div>
                {search.delay || search.acceptMode ? (
                  <div className="search-banner__delay">{search.delay || search.acceptMode}</div>
                ) : null}
              </div>
            </div>
          ) : (
            <button
              type="button"
              className="search-banner__accept"
              onClick={() => void window.polemica.acceptGameSearch()}
            >
              {search.time ? <span className="search-banner__accept-time">{search.time}</span> : null}
              <span className="search-banner__accept-text">
                <span className="search-banner__accept-title">{search.title || 'Принять игру'}</span>
                {search.delay || search.acceptMode ? (
                  <span className="search-banner__accept-mode">
                    {search.delay || search.acceptMode}
                  </span>
                ) : null}
              </span>
            </button>
          )
        ) : phase === 'inGame' ? (
          <div className="search-banner__decide">
            <button
              type="button"
              className="search-banner__play"
              onClick={() => void window.polemica.returnToGame()}
            >
              Продолжить игру
            </button>
            <button
              type="button"
              className="search-banner__quit"
              onClick={() => void window.polemica.quitActiveGame()}
            >
              Покинуть игру
            </button>
          </div>
        ) : phase === 'searching' ? (
          <div className="search-banner__status">
            {search.time ? <div className="search-banner__time">{search.time}</div> : null}
            <div className="search-banner__center">
              <div className="search-banner__title">
                {search.title}
                {autoAccept ? <span className="search-banner__auto-inline"> · авто</span> : null}
              </div>
              {search.delay ? <div className="search-banner__delay">{search.delay}</div> : null}
            </div>
            {search.canCancel ? (
              <button
                type="button"
                className="search-banner__close"
                aria-label="Отменить поиск"
                title="Отменить поиск"
                onClick={() => void window.polemica.cancelGameSearch()}
              >
                <X size={14} strokeWidth={2.4} aria-hidden />
              </button>
            ) : (
              <span className="search-banner__close-spacer" aria-hidden />
            )}
          </div>
        ) : showIdleControls ? (
          canPlay ? (
            playSplit({
              onPlay: () => void window.polemica.startGameSearch()
            })
          ) : null
        ) : null}

        {hasNotice ? (
          <div className="search-banner__notice" role="alert">
            <div className="search-banner__notice-body">
              {search.noticeTitle ? (
                <div className="search-banner__notice-title">{search.noticeTitle}</div>
              ) : null}
              {search.noticeText ? (
                <div className="search-banner__notice-text">{search.noticeText}</div>
              ) : null}
            </div>
            <button
              type="button"
              className="search-banner__notice-close"
              aria-label="Скрыть уведомление"
              title="Скрыть"
              onClick={() => void window.polemica.dismissSearchNotice()}
            >
              <X size={14} strokeWidth={2.4} aria-hidden />
            </button>
          </div>
        ) : null}
      </div>
    </div>
  )
}
