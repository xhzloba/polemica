import { useCallback, useEffect, useState } from 'react'
import { flushSync } from 'react-dom'
import type { NavState, UserProfile } from '@shared/ipc'
import {
  BAN_BANNER_HEIGHT,
  CHROME_HEIGHT,
  LOBBY_FILTERS_ROW_HEIGHT,
  SEARCH_PLAY_BANNER_HEIGHT
} from '@shared/config'
import { NavControls } from '../NavControls/NavControls'
import { UrlPill } from '../UrlPill/UrlPill'
import { WindowControls } from '../WindowControls/WindowControls'
import { LiveOnline } from '../LiveOnline/LiveOnline'
import { TitleBarProfile } from '../TitleBarProfile/TitleBarProfile'
import { SideMenuPanel, SideMenuToggle } from '../SideMenu/SideMenu'
import { SettingsPanel } from '../SettingsPanel/SettingsPanel'
import { OnlinePanel } from '../OnlinePanel/OnlinePanel'
import { BanBanner } from '../BanBanner/BanBanner'
import { SearchBanner } from '../SearchBanner/SearchBanner'
import { LobbyFiltersBar } from '../LobbyFiltersBar/LobbyFiltersBar'
import { useLiveStats } from '../../hooks/useLiveStats'
import { useBanStatus } from '../../hooks/useBanStatus'
import { useSearchStatus } from '../../hooks/useSearchStatus'
import './ChromeBar.css'

const INSET_DEADZONE = 12

type OverlayMode = 'menu' | 'settings' | 'online' | null

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
  const [overlay, setOverlay] = useState<OverlayMode>('menu')
  const [busy, setBusy] = useState(false)
  const [lobbyInset, setLobbyInset] = useState(24)

  useEffect(() => {
    setLobbyInset((prev) => stabilizeLobbyInset(search.insetLeft || 24, prev))
  }, [search.insetLeft])

  useEffect(() => {
    void import('../../lib/clientPrefsCache').then(({ loadClientPrefs }) => {
      void loadClientPrefs()
    })
  }, [])

  // Default: side menu open — sync Electron game inset once chrome is ready.
  useEffect(() => {
    window.polemica?.setChromeOverlay(true)
  }, [])

  const applyOverlay = useCallback((next: OverlayMode) => {
    if (!window.polemica || busy) return
    if (next === overlay) return
    setBusy(true)
    try {
      window.polemica.setChromeOverlay(next !== null)
      flushSync(() => setOverlay(next))
    } finally {
      setBusy(false)
    }
  }, [busy, overlay])

  useEffect(() => {
    return () => {
      window.polemica?.setChromeOverlay(false)
    }
  }, [])

  const hasNotice = Boolean(search.noticeTitle || search.noticeText)
  const showPlayBanner = !ban.visible && (search.visible || search.playVisible || hasNotice)
  const showLobbyFilters = !ban.visible
  const bannerH =
    (ban.visible ? BAN_BANNER_HEIGHT : 0) +
    (showPlayBanner ? SEARCH_PLAY_BANNER_HEIGHT : 0) +
    (showLobbyFilters ? LOBBY_FILTERS_ROW_HEIGHT : 0)
  const bannerVisible = ban.visible || showPlayBanner || showLobbyFilters
  const chromeH = CHROME_HEIGHT + (bannerVisible ? bannerH : 0)
  const overlayOpen = overlay !== null
  const rootClass = [
    'chrome-root',
    overlayOpen && 'chrome-root--menu',
    bannerVisible && 'chrome-root--ban'
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div
      className={rootClass}
      style={{
        ...(overlayOpen ? undefined : { height: chromeH }),
        ['--lobby-inset' as string]: `${lobbyInset}px`
      }}
    >
      <div
        className={`window-load-bar${nav.progress > 0 ? ' window-load-bar--on' : ''}`}
        style={{ transform: `scaleX(${nav.progress > 0 ? Math.max(nav.progress, 0.04) : 0})` }}
        aria-hidden
      />
      {overlay === 'settings' ? (
        <SettingsPanel
          open
          onBack={() => applyOverlay('menu')}
          onClose={() => applyOverlay(null)}
        />
      ) : overlay === 'online' ? (
        <OnlinePanel
          open
          stats={live}
          onBack={() => applyOverlay('menu')}
          onClose={() => applyOverlay(null)}
        />
      ) : (
        <SideMenuPanel
          currentUrl={nav.url}
          open={overlay === 'menu'}
          onOpenChange={(open) => applyOverlay(open ? 'menu' : null)}
          onOpenSettings={() => applyOverlay('settings')}
          onOpenOnline={() => applyOverlay('online')}
          live={live}
          search={search}
        />
      )}
      <div className="chrome-stack">
        <header className="chrome" data-platform={window.polemica ? 'electron' : 'web'}>
          <div className="chrome__drag" />
          <div className="chrome__left">
            <SideMenuToggle
              open={overlayOpen}
              onToggle={() => applyOverlay(overlayOpen ? null : 'menu')}
            />
            <NavControls isLoading={nav.isLoading} />
          </div>
          <UrlPill url={nav.url} isLoading={nav.isLoading} />
          <div className="chrome__right">
            <LiveOnline stats={live} onOpenOnline={() => applyOverlay('online')} />
            {profile ? <TitleBarProfile profile={profile} onLogout={onLogout} /> : null}
            <WindowControls />
          </div>
        </header>
        {ban.visible ? <BanBanner ban={ban} /> : <SearchBanner search={search} />}
        {showLobbyFilters ? <LobbyFiltersBar /> : null}
      </div>
    </div>
  )
}
