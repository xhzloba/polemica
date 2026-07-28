import { useLayoutEffect, useRef, useState } from 'react'
import { LoaderCircle, X } from 'lucide-react'
import type { SearchStatus } from '@shared/ipc'
import './SearchBanner.css'

interface Props {
  search: SearchStatus
  /** Game WebContentsView X in window coords — keep in sync with menuOpen. */
  viewX?: number
  menuOpen?: boolean
}

export function SearchBanner({ search, viewX = 0, menuOpen = false }: Props) {
  const hasNotice = Boolean(search.noticeTitle || search.noticeText)
  const rootRef = useRef<HTMLDivElement>(null)
  const [padLeft, setPadLeft] = useState(Math.max(0, search.insetLeft || 24))

  // Align banner content to lobby: windowX(lobby) = viewX + insetLeft.
  // Compensates chrome-stack shift when the side menu grid toggles.
  useLayoutEffect(() => {
    const el = rootRef.current
    if (!el) return
    const target = Math.max(0, viewX) + Math.max(0, search.insetLeft || 0)
    const left = el.getBoundingClientRect().left
    setPadLeft(Math.max(0, Math.round(target - left)))
  }, [viewX, search.insetLeft, menuOpen, search.phase, search.visible, search.playVisible, hasNotice])

  if (!search.visible && !search.playVisible && !hasNotice) return null

  const phase = search.phase
  const showModes = (phase === 'idle' || phase === 'searching') && search.modes.length > 0
  const canPlay = search.modes.some((m) => m.selected && m.available)
  const showIdlePlay = phase === 'idle' || (!search.visible && search.playVisible)

  return (
    <div
      ref={rootRef}
      className="search-banner search-banner--play"
      role={search.visible || hasNotice ? 'status' : 'region'}
      aria-label="Поиск игры"
      aria-live={search.visible || hasNotice ? 'polite' : undefined}
      style={{ paddingLeft: padLeft }}
    >
      <div className="search-banner__card search-banner__card--play">
        {showModes ? (
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
        ) : null}

        {phase === 'launching' || (phase === 'searching' && search.loading) ? (
          <div className="search-banner__status search-banner__status--loading">
            <LoaderCircle
              size={20}
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
              <div className="search-banner__title">{search.title}</div>
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
        ) : showIdlePlay ? (
          <button
            type="button"
            className="search-banner__play"
            disabled={!canPlay}
            onClick={() => void window.polemica.startGameSearch()}
          >
            Играть
          </button>
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
