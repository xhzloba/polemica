import { BrowserWindow } from 'electron'
import type { LivePlayer } from '@shared/ipc'
import { GAME_ORIGIN } from '@shared/config'
import { getLiveStats, refreshLiveStats } from '../live/liveStatsService'
import { gameGoto } from '../views/GameBrowserView'

const POPUP_WIDTH = 320
const POPUP_MAX_HEIGHT = 420

let popup: BrowserWindow | null = null

function escapeHtml(value: string): string {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function buildPopupHtml(players: LivePlayer[], fallbackCount: number): string {
  const count = players.length || fallbackCount
  const rows = players.length
    ? players
        .map((player) => {
          const href = `polemica-profile:${encodeURIComponent(player.profileUrl)}`
          const badges = [
            player.subscription
              ? `<span class="badge">${escapeHtml(player.subscription)}</span>`
              : '',
            player.primeMember ? `<span class="badge badge--prime">prime</span>` : ''
          ].join('')
          const mmr =
            player.mmr != null ? `<span class="mmr">${escapeHtml(String(player.mmr))}</span>` : ''
          return `<a class="item${player.quit ? ' item--quit' : ''}" href="${href}">
  <img class="avatar" src="${escapeHtml(player.avatarUrl)}" alt="" />
  <span class="meta">
    <span class="name">${escapeHtml(player.username)}</span>
    ${badges ? `<span class="badges">${badges}</span>` : ''}
  </span>
  ${mmr}
</a>`
        })
        .join('')
    : `<div class="empty">${fallbackCount > 0 ? 'Загрузка списка…' : 'Никого в лобби'}</div>`

  return `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8" />
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src https: data:; style-src 'unsafe-inline';" />
<style>
  html, body {
    margin: 0;
    width: 100%;
    height: 100%;
    overflow: hidden;
    background: transparent;
    color: #e8eef6;
    font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", sans-serif;
  }
  .menu {
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
    width: 100%;
    height: 100%;
    padding: 6px;
    border: 1px solid rgba(255, 255, 255, 0.04);
    border-radius: 12px;
    background: #0b0f14;
    box-shadow: 0 12px 28px rgba(0, 0, 0, 0.45);
  }
  .head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 8px 10px 6px;
  }
  .title {
    color: #f5f7f2;
    font-size: 12.5px;
    font-weight: 650;
    letter-spacing: -0.015em;
  }
  .count {
    color: rgba(232,238,246,0.45);
    font-size: 12px;
    font-variant-numeric: tabular-nums;
  }
  .list {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-height: 0;
    overflow: auto;
    padding-bottom: 2px;
  }
  .empty {
    padding: 18px 10px;
    color: rgba(232,238,246,0.45);
    font-size: 12.5px;
    text-align: center;
  }
  .item {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    margin: 0;
    padding: 7px 8px;
    border-radius: 8px;
    color: #e8eef6;
    text-decoration: none;
    box-sizing: border-box;
  }
  .item:hover { background: rgba(255,255,255,0.06); }
  .item--quit { opacity: 0.48; }
  .avatar {
    width: 28px;
    height: 28px;
    flex: 0 0 28px;
    border-radius: 50%;
    object-fit: cover;
    background: rgba(255,255,255,0.06);
  }
  .meta {
    display: flex;
    flex-direction: column;
    gap: 3px;
    min-width: 0;
    flex: 1 1 auto;
  }
  .name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 13px;
    font-weight: 600;
    letter-spacing: -0.015em;
    line-height: 1.15;
  }
  .badges { display: inline-flex; gap: 4px; min-width: 0; }
  .badge {
    display: inline-flex;
    align-items: center;
    height: 16px;
    padding: 0 6px;
    border-radius: 999px;
    background: rgba(255,255,255,0.08);
    color: rgba(232,238,246,0.72);
    font-size: 10px;
    font-weight: 650;
    letter-spacing: 0.02em;
    text-transform: uppercase;
    line-height: 1;
  }
  .badge--prime {
    background: rgba(200,245,49,0.14);
    color: #c8f531;
  }
  .mmr {
    flex: 0 0 auto;
    color: rgba(232,238,246,0.45);
    font-size: 12px;
    font-variant-numeric: tabular-nums;
  }
</style>
</head>
<body>
  <div class="menu" role="menu" aria-label="Игроки онлайн">
    <div class="head">
      <span class="title">Онлайн</span>
      <span class="count">${count}</span>
    </div>
    <div class="list">${rows}</div>
  </div>
  <script>
    document.querySelectorAll('img.avatar').forEach((img) => {
      img.addEventListener('error', () => {
        const fb = ${JSON.stringify(`${GAME_ORIGIN}/image/user-avatar?size=100x`)};
        if (img.getAttribute('src') !== fb) img.setAttribute('src', fb);
      });
    });
  </script>
</body>
</html>`
}

export function closeLivePlayersMenu(): void {
  if (!popup || popup.isDestroyed()) {
    popup = null
    return
  }
  popup.close()
  popup = null
}

export function isLivePlayersMenuOpen(): boolean {
  return Boolean(popup && !popup.isDestroyed())
}

export async function openLivePlayersMenu(
  parent: BrowserWindow,
  anchor: { x: number; y: number; right: number; bottom: number }
): Promise<void> {
  if (popup && !popup.isDestroyed()) {
    closeLivePlayersMenu()
    return
  }

  await refreshLiveStats()
  const stats = getLiveStats()
  const players = stats.onlinePlayers ?? []
  const content = parent.getContentBounds()
  const height = Math.min(
    POPUP_MAX_HEIGHT,
    Math.max(160, content.height - Math.round(anchor.bottom) - 24)
  )
  const x = Math.round(content.x + anchor.right - POPUP_WIDTH)
  const y = Math.round(content.y + anchor.bottom + 8)
  const maxX = content.x + content.width - POPUP_WIDTH - 8
  const maxY = content.y + content.height - height - 8

  popup = new BrowserWindow({
    parent,
    modal: false,
    frame: false,
    show: false,
    resizable: false,
    maximizable: false,
    minimizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    movable: false,
    hasShadow: false,
    transparent: true,
    backgroundColor: '#00000000',
    width: POPUP_WIDTH,
    height,
    x: Math.min(Math.max(content.x + 8, x), maxX),
    y: Math.min(Math.max(content.y + 8, y), maxY),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false
    }
  })

  const current = popup
  current.setAlwaysOnTop(true, 'pop-up-menu')
  current.on('closed', () => {
    if (popup === current) popup = null
  })
  current.webContents.on('before-input-event', (event, input) => {
    if (input.type === 'keyDown' && input.key === 'Escape') {
      event.preventDefault()
      closeLivePlayersMenu()
    }
  })
  current.webContents.on('will-navigate', (event, url) => {
    event.preventDefault()
    if (url.startsWith('polemica-profile:')) {
      const profileUrl = decodeURIComponent(url.slice('polemica-profile:'.length))
      closeLivePlayersMenu()
      void gameGoto(profileUrl)
    }
  })
  current.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('polemica-profile:')) {
      const profileUrl = decodeURIComponent(url.slice('polemica-profile:'.length))
      closeLivePlayersMenu()
      void gameGoto(profileUrl)
    }
    return { action: 'deny' }
  })

  await current.loadURL(
    `data:text/html;charset=utf-8,${encodeURIComponent(buildPopupHtml(players, stats.players))}`
  )
  if (current.isDestroyed()) return

  current.on('blur', () => {
    setTimeout(() => {
      if (popup === current && !current.isDestroyed() && !current.isFocused()) {
        closeLivePlayersMenu()
      }
    }, 120)
  })

  current.show()
}
