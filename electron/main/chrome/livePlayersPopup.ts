import { BrowserWindow } from 'electron'
import type { LivePlayer } from '@shared/ipc'
import { GAME_ORIGIN } from '@shared/config'
import { getLiveStats, refreshLiveStats } from '../live/liveStatsService'
import { gameGoto } from '../views/GameBrowserView'

const POPUP_WIDTH = 320
const POPUP_MAX_HEIGHT = 420
const FALLBACK_AVATAR = `${GAME_ORIGIN}/image/user-avatar?size=100x`

let popup: BrowserWindow | null = null
let shellReady: Promise<void> | null = null

const SHELL_HTML = `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8" />
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src https: data:; style-src 'unsafe-inline'; script-src 'unsafe-inline';" />
<style>
  html, body {
    margin: 0;
    width: 100%;
    height: 100%;
    overflow: hidden;
    background: #0b0f14;
    color: #e8eef6;
    font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", sans-serif;
    -webkit-tap-highlight-color: transparent;
  }
  ::selection { background: rgba(255,255,255,0.14); color: #e8eef6; }
  .menu {
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
    width: 100%;
    height: 100%;
    padding: 6px;
    border: 1px solid rgba(130, 130, 140, 0.42);
    border-radius: 12px;
    background: #0b0f14;
    box-shadow: 0 12px 28px rgba(0, 0, 0, 0.45);
    outline: none;
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
  .filters {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 0 6px 6px;
  }
  .filters-label {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    color: rgba(232,238,246,0.45);
    font-size: 11px;
    font-weight: 650;
    letter-spacing: -0.01em;
    white-space: nowrap;
  }
  .filters-label svg {
    width: 13px;
    height: 13px;
    flex: 0 0 auto;
  }
  .filter-btns {
    display: inline-flex;
    gap: 3px;
  }
  .filter {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    margin: 0;
    padding: 0;
    border: 0;
    border-radius: 8px;
    background: rgba(255,255,255,0.04);
    color: rgba(232,238,246,0.55);
    cursor: default;
    outline: none;
    -webkit-tap-highlight-color: transparent;
  }
  .filter svg {
    width: 15px;
    height: 15px;
    display: block;
  }
  .filter:hover { background: rgba(255,255,255,0.07); color: rgba(232,238,246,0.88); }
  .filter:focus,
  .filter:focus-visible { outline: none; box-shadow: none; }
  .filter--on {
    background: rgba(255,255,255,0.12);
    color: #f5f7f2;
  }
  .filter--prime.filter--on {
    background: rgba(200,245,49,0.14);
    color: #c8f531;
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
    border: 0;
    border-radius: 8px;
    color: #e8eef6;
    text-decoration: none;
    box-sizing: border-box;
    outline: none;
    -webkit-tap-highlight-color: transparent;
  }
  .item:link,
  .item:visited,
  .item:hover,
  .item:active,
  .item:focus,
  .item:focus-visible {
    color: #e8eef6;
    outline: none;
    box-shadow: none;
  }
  .item:hover,
  .item:focus-visible { background: rgba(255,255,255,0.06); }
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
  <div class="menu" id="menu" role="menu" aria-label="Игроки онлайн" tabindex="-1">
    <div class="head">
      <span class="title">Онлайн</span>
      <span class="count" id="count">0</span>
    </div>
    <div class="filters">
      <div class="filters-label" title="Фильтр списка">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 5h20"/><path d="M6 12h12"/><path d="M9 19h6"/></svg>
        <span>Фильтр</span>
      </div>
      <div class="filter-btns" role="tablist" aria-label="Фильтр">
        <button type="button" class="filter filter--on" data-filter="alpha" role="tab" aria-selected="true" title="По алфавиту">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m3 16 4 4 4-4"/><path d="M7 20V4"/><path d="M20 8h-5"/><path d="M15 10V6.5a2.5 2.5 0 0 1 5 0V10"/><path d="M15 14h5l-5 6h5"/></svg>
        </button>
        <button type="button" class="filter" data-filter="rating" role="tab" aria-selected="false" title="По рейтингу">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m3 16 4 4 4-4"/><path d="M7 20V4"/><path d="M11 4h10"/><path d="M11 8h7"/><path d="M11 12h4"/></svg>
        </button>
        <button type="button" class="filter" data-filter="quit" role="tab" aria-selected="false" title="Выбывшие">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="22" x2="16" y1="11" y2="11"/></svg>
        </button>
        <button type="button" class="filter filter--prime" data-filter="prime" role="tab" aria-selected="false" title="Prime">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.246a1 1 0 0 1-.956.734H5.81a1 1 0 0 1-.957-.734L2.02 6.02a.5.5 0 0 1 .798-.519l4.276 3.664a1 1 0 0 0 1.516-.294z"/><path d="M5 21h14"/></svg>
        </button>
      </div>
    </div>
    <div class="list" id="list"><div class="empty">Никого в лобби</div></div>
  </div>
  <script>
    const FALLBACK = ${JSON.stringify(FALLBACK_AVATAR)};
    let roster = [];
    let fallbackCount = 0;
    let filterMode = 'alpha';
    const esc = (s) => String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
    const byName = (a, b) => String(a.username || '').localeCompare(String(b.username || ''), 'ru', { sensitivity: 'base' });
    const sortActiveThenName = (list) => list.sort((a, b) => {
      if (a.quit !== b.quit) return a.quit ? 1 : -1;
      return byName(a, b);
    });
    const arrange = (rows) => {
      const list = rows.slice();
      if (filterMode === 'quit') {
        return list.filter((p) => p.quit).sort(byName);
      }
      if (filterMode === 'prime') {
        return sortActiveThenName(list.filter((p) => p.primeMember));
      }
      if (filterMode === 'rating') {
        return list.sort((a, b) => {
          const am = a.mmr == null ? -Infinity : Number(a.mmr);
          const bm = b.mmr == null ? -Infinity : Number(b.mmr);
          if (bm !== am) return bm - am;
          if (a.quit !== b.quit) return a.quit ? 1 : -1;
          return byName(a, b);
        });
      }
      return sortActiveThenName(list);
    };
    const emptyForFilter = () => {
      if (filterMode === 'quit') return 'Нет выбывших';
      if (filterMode === 'prime') return 'Нет Prime';
      return 'Никого в лобби';
    };
    const paint = () => {
      const list = document.getElementById('list');
      const count = document.getElementById('count');
      const rows = arrange(roster);
      const total = roster.length || fallbackCount || 0;
      const filtered = filterMode === 'quit' || filterMode === 'prime';
      count.textContent = filtered ? (rows.length + '/' + total) : String(total);
      if (!roster.length) {
        list.innerHTML = '<div class="empty">' +
          ((fallbackCount > 0) ? 'Загрузка списка…' : 'Никого в лобби') +
          '</div>';
        return;
      }
      if (!rows.length) {
        list.innerHTML = '<div class="empty">' + emptyForFilter() + '</div>';
        return;
      }
      list.innerHTML = rows.map((p) => {
        const badges = [
          p.subscription ? '<span class="badge">' + esc(p.subscription) + '</span>' : '',
          p.primeMember ? '<span class="badge badge--prime">prime</span>' : ''
        ].join('');
        const mmr = p.mmr != null ? '<span class="mmr">' + esc(String(p.mmr)) + '</span>' : '';
        return '<a class="item' + (p.quit ? ' item--quit' : '') +
          '" href="polemica-profile:' + encodeURIComponent(p.profileUrl || '') +
          '" tabindex="-1">' +
          '<img class="avatar" src="' + esc(p.avatarUrl || FALLBACK) + '" alt="" draggable="false" />' +
          '<span class="meta"><span class="name">' + esc(p.username) + '</span>' +
          (badges ? '<span class="badges">' + badges + '</span>' : '') +
          '</span>' + mmr + '</a>';
      }).join('');
      list.querySelectorAll('img.avatar').forEach((img) => {
        img.addEventListener('error', () => {
          if (img.getAttribute('src') !== FALLBACK) img.setAttribute('src', FALLBACK);
        });
      });
    };
    document.querySelectorAll('.filter').forEach((btn) => {
      btn.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        const next = btn.getAttribute('data-filter') || 'alpha';
        if (next === filterMode) return;
        filterMode = next;
        document.querySelectorAll('.filter').forEach((el) => {
          const on = el.getAttribute('data-filter') === filterMode;
          el.classList.toggle('filter--on', on);
          el.setAttribute('aria-selected', on ? 'true' : 'false');
        });
        paint();
      });
    });
    window.__focusShell = () => {
      const menu = document.getElementById('menu');
      if (menu) menu.focus({ preventScroll: true });
    };
    window.__setRoster = (players, nextFallback) => {
      roster = Array.isArray(players) ? players : [];
      fallbackCount = Number(nextFallback) || 0;
      paint();
    };
  </script>
</body>
</html>`

function bindPopupEvents(win: BrowserWindow): void {
  win.webContents.on('before-input-event', (event, input) => {
    if (input.type === 'keyDown' && input.key === 'Escape') {
      event.preventDefault()
      closeLivePlayersMenu()
    }
  })
  win.webContents.on('will-navigate', (event, url) => {
    event.preventDefault()
    if (url.startsWith('polemica-profile:')) {
      const profileUrl = decodeURIComponent(url.slice('polemica-profile:'.length))
      closeLivePlayersMenu()
      void gameGoto(profileUrl)
    }
  })
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('polemica-profile:')) {
      const profileUrl = decodeURIComponent(url.slice('polemica-profile:'.length))
      closeLivePlayersMenu()
      void gameGoto(profileUrl)
    }
    return { action: 'deny' }
  })
  win.on('blur', () => {
    setTimeout(() => {
      if (popup === win && !win.isDestroyed() && win.isVisible() && !win.isFocused()) {
        closeLivePlayersMenu()
      }
    }, 120)
  })
  win.on('closed', () => {
    if (popup === win) {
      popup = null
      shellReady = null
    }
  })
}

async function ensurePopup(parent: BrowserWindow): Promise<BrowserWindow> {
  if (popup && !popup.isDestroyed()) {
    if (popup.getParentWindow() !== parent) {
      try {
        popup.setParentWindow(parent)
      } catch {
        /* keep existing parent */
      }
    }
    return popup
  }

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
    backgroundColor: '#0b0f14',
    width: POPUP_WIDTH,
    height: 240,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false
    }
  })

  const current = popup
  current.setAlwaysOnTop(true, 'pop-up-menu')
  bindPopupEvents(current)

  shellReady = current
    .loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(SHELL_HTML)}`)
    .then(() => undefined)
  await shellReady
  return current
}

async function paintRoster(win: BrowserWindow, players: LivePlayer[], fallbackCount: number): Promise<void> {
  if (win.isDestroyed()) return
  if (shellReady) await shellReady
  if (win.isDestroyed()) return
  await win.webContents.executeJavaScript(
    `window.__setRoster(${JSON.stringify(players)}, ${JSON.stringify(fallbackCount)}); true`,
    true
  )
}

export function prewarmLivePlayersMenu(parent: BrowserWindow): void {
  void ensurePopup(parent).catch((err) => {
    console.warn('[live-players] prewarm failed', err)
  })
}

export function closeLivePlayersMenu(): void {
  if (!popup || popup.isDestroyed()) {
    popup = null
    return
  }
  if (popup.isVisible()) popup.hide()
}

export function destroyLivePlayersMenu(): void {
  if (!popup || popup.isDestroyed()) {
    popup = null
    shellReady = null
    return
  }
  const win = popup
  popup = null
  shellReady = null
  win.destroy()
}

export function isLivePlayersMenuOpen(): boolean {
  return Boolean(popup && !popup.isDestroyed() && popup.isVisible())
}

export async function openLivePlayersMenu(
  parent: BrowserWindow,
  anchor: { x: number; y: number; right: number; bottom: number }
): Promise<void> {
  if (popup && !popup.isDestroyed() && popup.isVisible()) {
    closeLivePlayersMenu()
    return
  }

  const stats = getLiveStats()
  const content = parent.getContentBounds()
  const height = Math.min(
    POPUP_MAX_HEIGHT,
    Math.max(160, content.height - Math.round(anchor.bottom) - 24)
  )
  const x = Math.round(content.x + anchor.right - POPUP_WIDTH)
  const y = Math.round(content.y + anchor.bottom + 8)
  const maxX = content.x + content.width - POPUP_WIDTH - 8
  const maxY = content.y + content.height - height - 8

  const win = await ensurePopup(parent)
  win.setBounds({
    width: POPUP_WIDTH,
    height,
    x: Math.min(Math.max(content.x + 8, x), maxX),
    y: Math.min(Math.max(content.y + 8, y), maxY)
  })

  await paintRoster(win, stats.onlinePlayers ?? [], stats.players)
  if (win.isDestroyed()) return
  win.show()
  void win.webContents
    .executeJavaScript('window.__focusShell && window.__focusShell(); true', true)
    .catch(() => {
      /* ignore */
    })

  void refreshLiveStats()
    .then(async (next) => {
      if (!popup || popup.isDestroyed() || !popup.isVisible()) return
      await paintRoster(popup, next.onlinePlayers ?? [], next.players)
    })
    .catch(() => {
      /* keep cached roster */
    })
}
