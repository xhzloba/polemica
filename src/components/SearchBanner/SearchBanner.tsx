import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown, LoaderCircle, X } from 'lucide-react'
import type { SearchStatus } from '@shared/ipc'
import './SearchBanner.css'

const AUTO_ACCEPT_KEY = 'polemica.autoAccept'
/** Ignore lobby inset noise; chrome-stack already tracks game view X via CSS grid. */
const INSET_DEADZONE_PX = 12

function readAutoAccept(): boolean {
  try {
    return localStorage.getItem(AUTO_ACCEPT_KEY) === '1'
  } catch {
    return false
  }
}

function writeAutoAccept(on: boolean): void {
  try {
    localStorage.setItem(AUTO_ACCEPT_KEY, on ? '1' : '0')
  } catch {
    /* ignore */
  }
}

function stabilizeInset(next: number, prev: number): number {
  const n = Math.max(0, Math.round(next) || 24)
  if (prev <= 24 && n > 24) return n
  return Math.abs(n - prev) < INSET_DEADZONE_PX ? prev : n
}

interface Props {
  search: SearchStatus
}

export function SearchBanner({ search }: Props) {
  const hasNotice = Boolean(search.noticeTitle || search.noticeText)
  const splitRef = useRef<HTMLDivElement>(null)
  const autoFiredKey = useRef<string>('')
  // Only lobby inset inside the game page — NOT viewX. Menu open moves chrome-stack
  // with the same offset as the game WebContentsView, same as the table (no pad recalc).
  const [padLeft, setPadLeft] = useState(() => Math.max(0, search.insetLeft || 24))
  const [autoAccept, setAutoAccept] = useState(readAutoAccept)
  const [menuOpenLocal, setMenuOpenLocal] = useState(false)
  const [menuPos, setMenuPos] = useState<{ left: number; bottom: number; minWidth: number } | null>(
    null
  )

  useLayoutEffect(() => {
    setPadLeft((prev) => stabilizeInset(search.insetLeft || 24, prev))
  }, [search.insetLeft])

  useLayoutEffect(() => {
    if (!menuOpenLocal) {
      setMenuPos(null)
      return
    }
    const el = splitRef.current
    if (!el) return
    const place = (): void => {
      const r = el.getBoundingClientRect()
      setMenuPos({
        left: Math.round(r.left),
        bottom: Math.round(window.innerHeight - r.top + 6),
        minWidth: Math.round(Math.max(r.width, 168))
      })
    }
    place()
    window.addEventListener('resize', place)
    return () => window.removeEventListener('resize', place)
  }, [menuOpenLocal])

  useEffect(() => {
    if (!menuOpenLocal) return
    const onDoc = (e: MouseEvent): void => {
      const t = e.target as Node
      if (splitRef.current?.contains(t)) return
      if ((t as Element).closest?.('.search-banner__play-menu')) return
      setMenuOpenLocal(false)
    }
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setMenuOpenLocal(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [menuOpenLocal])

  // Auto-accept when match appears
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
    if (search.phase !== 'accept') autoFiredKey.current = ''
  }, [search.phase])

  if (!search.visible && !search.playVisible && !hasNotice) return null

  const phase = search.phase
  const showModes = (phase === 'idle' || phase === 'searching') && search.modes.length > 0
  const canPlay = search.modes.some((m) => m.selected && m.available)
  const showIdleControls = phase === 'idle'
  const showChooseModeTitle = showModes

  const toggleAutoAccept = (): void => {
    setAutoAccept((prev) => {
      const next = !prev
      writeAutoAccept(next)
      return next
    })
    setMenuOpenLocal(false)
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
          setMenuOpenLocal((v) => !v)
        }}
      >
        <ChevronDown size={20} strokeWidth={2.4} aria-hidden />
      </button>
      {menuOpenLocal && menuPos
        ? createPortal(
            <div
              className="search-banner__play-menu"
              role="menu"
              style={{
                left: menuPos.left,
                bottom: menuPos.bottom,
                minWidth: menuPos.minWidth
              }}
            >
              <button
                type="button"
                role="menuitemcheckbox"
                aria-checked={autoAccept}
                className={`search-banner__play-menu-item${autoAccept ? ' search-banner__play-menu-item--on' : ''}`}
                onClick={toggleAutoAccept}
              >
                <span className="search-banner__play-menu-check" aria-hidden>
                  {autoAccept ? <Check size={12} strokeWidth={2.8} /> : null}
                </span>
                <span className="search-banner__play-menu-text">
                  <span className="search-banner__play-menu-title">Автопринятие</span>
                  <span className="search-banner__play-menu-hint">Принимать матч сразу</span>
                </span>
              </button>
            </div>,
            document.body
          )
        : null}
    </div>
  )

  return (
    <div
      className="search-banner search-banner--play"
      role={search.visible || hasNotice ? 'status' : 'region'}
      aria-label="Поиск игры"
      aria-live={search.visible || hasNotice ? 'polite' : undefined}
      style={{ paddingLeft: padLeft }}
    >
      <div className="search-banner__card search-banner__card--play">
        {showModes ? (
          <div className="search-banner__modes-block">
            {showChooseModeTitle ? <div className="search-banner__modes-title">Выберите режим</div> : null}
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
              size={24}
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
                size={24}
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
