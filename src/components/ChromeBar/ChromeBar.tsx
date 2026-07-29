import { useCallback, useEffect, useState } from 'react'
import { flushSync } from 'react-dom'
import type { NavState, UserProfile } from '@shared/ipc'
import { BAN_BANNER_HEIGHT, CHROME_HEIGHT, SEARCH_PLAY_BANNER_HEIGHT } from '@shared/config'
import { NavControls } from '../NavControls/NavControls'
import { UrlPill } from '../UrlPill/UrlPill'
import { WindowControls } from '../WindowControls/WindowControls'
import { LiveOnline } from '../LiveOnline/LiveOnline'
import { TitleBarProfile } from '../TitleBarProfile/TitleBarProfile'
import { SideMenuPanel, SideMenuToggle } from '../SideMenu/SideMenu'
import { BanBanner } from '../BanBanner/BanBanner'
import { SearchBanner } from '../SearchBanner/SearchBanner'
import { useLiveStats } from '../../hooks/useLiveStats'
import { useBanStatus } from '../../hooks/useBanStatus'
import { useSearchStatus } from '../../hooks/useSearchStatus'
import './ChromeBar.css'

const INSET_DEADZONE = 12

function stabilizeLobbyInset(next: number, prev: number): number {
  const n = Math.max(12, Math.round(next) || 24)
  if (prev <= 24 && n > 24) return n
  return Math.abs(n - prev) < INSET_DEADZONE ? prev : n
}

interface Props {
  nav: NavState
  profile: UserProfile | null
  onLogout: () => void
}

export function ChromeBar({ nav, profile, onLogout }: Props) {
  const live = useLiveStats()
  const ban = useBanStatus()
  const search = useSearchStatus()
  const [menuOpen, setMenuOpen] = useState(false)
  const [menuBusy, setMenuBusy] = useState(false)
  const [lobbyInset, setLobbyInset] = useState(24)

  useEffect(() => {
    setLobbyInset((prev) => stabilizeLobbyInset(search.insetLeft || 24, prev))
  }, [search.insetLeft])

  const setMenu = useCallback(
    (open: boolean) => {
      if (!window.polemica || menuBusy) return
      if (open === menuOpen) return
      setMenuBusy(true)
      try {
        // Sync IPC + flushSync: game bounds and chrome grid commit before the next paint.
        window.polemica.setChromeOverlay(open)
        flushSync(() => setMenuOpen(open))
      } finally {
        setMenuBusy(false)
      }
    },
    [menuBusy, menuOpen]
  )

  useEffect(() => {
    return () => {
      window.polemica?.setChromeOverlay(false)
    }
  }, [])

  const hasNotice = Boolean(search.noticeTitle || search.noticeText)
  const bannerVisible = ban.visible || search.visible || search.playVisible || hasNotice
  const bannerH = ban.visible ? BAN_BANNER_HEIGHT : SEARCH_PLAY_BANNER_HEIGHT
  const chromeH = CHROME_HEIGHT + (bannerVisible ? bannerH : 0)
  const rootClass = [
    'chrome-root',
    menuOpen && 'chrome-root--menu',
    bannerVisible && 'chrome-root--ban'
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div
      className={rootClass}
      style={{
        ...(menuOpen ? undefined : { height: chromeH }),
        ['--lobby-inset' as string]: `${lobbyInset}px`
      }}
    >
      <div
        className={`window-load-bar${nav.progress > 0 ? ' window-load-bar--on' : ''}`}
        style={{ transform: `scaleX(${nav.progress > 0 ? Math.max(nav.progress, 0.04) : 0})` }}
        aria-hidden
      />
      <SideMenuPanel
        currentUrl={nav.url}
        open={menuOpen}
        onOpenChange={(open) => setMenu(open)}
        live={live}
        search={search}
      />
      <div className="chrome-stack">
        <header className="chrome" data-platform={window.polemica ? 'electron' : 'web'}>
          <div className="chrome__drag" />
          <div className="chrome__left">
            <SideMenuToggle open={menuOpen} onToggle={() => setMenu(!menuOpen)} />
            <NavControls isLoading={nav.isLoading} />
          </div>
          <UrlPill url={nav.url} isLoading={nav.isLoading} />
          <div className="chrome__right">
            <LiveOnline stats={live} />
            {profile ? <TitleBarProfile profile={profile} onLogout={onLogout} /> : null}
            <WindowControls />
          </div>
        </header>
        {ban.visible ? <BanBanner ban={ban} /> : <SearchBanner search={search} />}
      </div>
    </div>
  )
}
