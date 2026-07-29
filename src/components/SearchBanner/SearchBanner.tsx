import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Alert, Button, Checkbox, Space, Spin, Typography } from 'antd'
import { CloseOutlined, DownOutlined } from '@ant-design/icons'
import type { SearchStatus } from '@shared/ipc'
import {
  getCachedPrefs,
  loadClientPrefs,
  setCachedPrefs
} from '../../lib/clientPrefsCache'
import './SearchBanner.css'

interface Props {
  search: SearchStatus
}

export function SearchBanner({ search }: Props) {
  const hasNotice = Boolean(search.noticeTitle || search.noticeText)
  const splitRef = useRef<HTMLDivElement>(null)
  const autoFiredKey = useRef<string>('')
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

  // Auto-accept: allow one retry if the first click races the DOM.
  useEffect(() => {
    if (!autoAccept) return
    if (search.phase !== 'accept' || search.acceptAccepted || search.loading) return
    const matchKey = `${search.title}|${search.acceptMode}|${search.delay}`
    if (autoFiredKey.current === matchKey) return
    autoFiredKey.current = matchKey
    void window.polemica.acceptGameSearch().then((ok) => {
      if (!ok && autoFiredKey.current === matchKey) {
        autoFiredKey.current = ''
      }
    })
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
    }
  }, [search.phase])

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
      <Button
        type="primary"
        className="search-banner__play search-banner__play--main"
        disabled={opts.disabled}
        onClick={opts.onPlay}
      >
        Играть
        {autoAccept ? <span className="search-banner__play-auto-tag">авто</span> : null}
      </Button>
      <Button
        type="primary"
        className="search-banner__play search-banner__play--caret"
        disabled={opts.disabled}
        aria-label="Настройки поиска"
        aria-haspopup="menu"
        aria-expanded={menuOpenLocal}
        icon={<DownOutlined />}
        onClick={(e) => {
          e.stopPropagation()
          openActionMenu()
        }}
      />
    </div>
  )

  return (
    <div
      className="search-banner search-banner--play"
      role={search.visible || hasNotice ? 'status' : 'region'}
      aria-label="Поиск игры"
      aria-live={search.visible || hasNotice ? 'polite' : undefined}
    >
      <div
        className={`search-banner__card search-banner__card--play${
          showModes ? ' search-banner__card--modes' : ''
        }`}
      >
        {showModes ? (
          <Space className="search-banner__modes" size={8} wrap={false}>
            {search.modes.map((mode) => (
              <Checkbox
                key={mode.mode}
                className="search-banner__mode"
                checked={mode.selected}
                disabled={!mode.available}
                title={mode.description || mode.title}
                onChange={() => void window.polemica.toggleSearchMode(mode.mode)}
              >
                <span className="search-banner__mode-name">{mode.title}</span>
                <Typography.Text type="secondary" className="search-banner__mode-count">
                  {mode.count}/{mode.countTarget}
                </Typography.Text>
              </Checkbox>
            ))}
          </Space>
        ) : null}

        {phase === 'launching' ? (
          <Space className="search-banner__status" size={10}>
            <Spin size="small" />
            <Typography.Text strong>{search.title || 'Игра запускается'}</Typography.Text>
          </Space>
        ) : phase === 'accept' ? (
          search.acceptAccepted ? (
            <Space className="search-banner__status" size={10}>
              {search.time ? (
                <Typography.Text className="search-banner__time">{search.time}</Typography.Text>
              ) : null}
              <span className="search-banner__center">
                <Typography.Text strong>{search.title}</Typography.Text>
                {search.delay || search.acceptMode ? (
                  <Typography.Text type="secondary" className="search-banner__delay">
                    {search.delay || search.acceptMode}
                  </Typography.Text>
                ) : null}
              </span>
            </Space>
          ) : autoAccept ? (
            <Space className="search-banner__status" size={10}>
              <Spin size="small" />
              <span className="search-banner__center">
                <Typography.Text strong>Автопринятие…</Typography.Text>
                {search.delay || search.acceptMode ? (
                  <Typography.Text type="secondary" className="search-banner__delay">
                    {search.delay || search.acceptMode}
                  </Typography.Text>
                ) : null}
              </span>
            </Space>
          ) : (
            <Button
              type="primary"
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
            </Button>
          )
        ) : phase === 'inGame' ? (
          <Space className="search-banner__decide" size={10}>
            <Button type="primary" onClick={() => void window.polemica.returnToGame()}>
              Продолжить игру
            </Button>
            <Button danger onClick={() => void window.polemica.quitActiveGame()}>
              Покинуть игру
            </Button>
          </Space>
        ) : phase === 'searching' ? (
          <Space className="search-banner__status" size={10}>
            {search.loading ? (
              <Spin size="small" />
            ) : search.time ? (
              <Typography.Text className="search-banner__time">{search.time}</Typography.Text>
            ) : (
              <span className="search-banner__close-spacer" aria-hidden />
            )}
            <span className="search-banner__center">
              <Typography.Text strong>
                {search.title || (search.loading ? 'Подключение…' : 'Идёт поиск игры')}
                {autoAccept ? (
                  <Typography.Text type="secondary"> · авто</Typography.Text>
                ) : null}
              </Typography.Text>
              {search.delay ? (
                <Typography.Text type="secondary" className="search-banner__delay">
                  {search.delay}
                </Typography.Text>
              ) : null}
            </span>
            <Button
              type="text"
              size="small"
              className="search-banner__close"
              aria-label="Отменить поиск"
              icon={<CloseOutlined />}
              onClick={() => void window.polemica.cancelGameSearch()}
            />
          </Space>
        ) : showIdleControls ? (
          canPlay ? (
            playSplit({
              onPlay: () => void window.polemica.startGameSearch()
            })
          ) : null
        ) : null}

        {hasNotice ? (
          <Alert
            className="search-banner__notice"
            type="warning"
            showIcon
            closable
            onClose={() => void window.polemica.dismissSearchNotice()}
            message={search.noticeTitle || undefined}
            description={search.noticeText || undefined}
          />
        ) : null}
      </div>
    </div>
  )
}
