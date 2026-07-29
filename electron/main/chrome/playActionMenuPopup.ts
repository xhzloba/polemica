import { BrowserWindow } from 'electron'

const POPUP_WIDTH = 200
const POPUP_HEIGHT = 58

let popup: BrowserWindow | null = null
let shellReady: Promise<void> | null = null
let pending: ((result: { autoAccept: boolean } | null) => void) | null = null
let currentAuto = false

const CHECK_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>'

const SHELL_HTML = `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8" />
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';" />
<style>
  html, body {
    margin: 0;
    width: 100%;
    height: 100%;
    overflow: hidden;
    background: transparent;
    color: #e8eef6;
    font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", sans-serif;
    -webkit-tap-highlight-color: transparent;
  }
  .menu {
    box-sizing: border-box;
    width: 100%;
    height: 100%;
    padding: 4px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 10px;
    background: #0b0f14;
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.4);
    outline: none;
  }
  .item {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    margin: 0;
    padding: 7px 8px;
    border: 0;
    border-radius: 7px;
    background: transparent;
    color: #e8eef6;
    cursor: default;
    text-align: left;
    font: inherit;
  }
  .item:hover { background: rgba(255, 255, 255, 0.06); }
  .item--on .check {
    background: rgba(22, 119, 255, 0.18);
    color: #1677ff;
    border-color: rgba(22, 119, 255, 0.35);
  }
  .check {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    flex: 0 0 auto;
    border-radius: 5px;
    border: 1px solid rgba(255, 255, 255, 0.14);
    background: rgba(255, 255, 255, 0.04);
    color: transparent;
  }
  .text { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
  .title { font-size: 12.5px; font-weight: 650; letter-spacing: -0.015em; color: #f5f7f2; }
  .hint { font-size: 11px; color: rgba(232, 238, 246, 0.45); }
</style>
</head>
<body>
  <div class="menu" id="menu" tabindex="-1" role="menu">
    <button type="button" class="item" id="item" role="menuitemcheckbox">
      <span class="check" id="check" aria-hidden="true"></span>
      <span class="text">
        <span class="title">Автопринятие</span>
        <span class="hint">Принимать матч сразу</span>
      </span>
    </button>
  </div>
  <script>
    let on = false;
    const item = document.getElementById('item');
    const check = document.getElementById('check');
    window.__paint = (autoAccept) => {
      on = Boolean(autoAccept);
      item.classList.toggle('item--on', on);
      item.setAttribute('aria-checked', on ? 'true' : 'false');
      check.innerHTML = on ? ${JSON.stringify(CHECK_SVG)} : '';
    };
    window.__focusShell = () => {
      document.getElementById('menu').focus({ preventScroll: true });
    };
    item.addEventListener('click', () => {
      location.href = 'polemica-auto-accept:' + (on ? '0' : '1');
    });
  </script>
</body>
</html>`

function finish(result: { autoAccept: boolean } | null): void {
  const resolve = pending
  pending = null
  resolve?.(result)
}

function closeAndResolve(result: { autoAccept: boolean } | null): void {
  closePlayActionMenu()
  finish(result)
}

function bindPopupEvents(win: BrowserWindow): void {
  win.webContents.on('before-input-event', (event, input) => {
    if (input.type === 'keyDown' && input.key === 'Escape') {
      event.preventDefault()
      closeAndResolve({ autoAccept: currentAuto })
    }
  })
  win.webContents.on('will-navigate', (event, url) => {
    event.preventDefault()
    if (url.startsWith('polemica-auto-accept:')) {
      currentAuto = url.slice('polemica-auto-accept:'.length) === '1'
      closeAndResolve({ autoAccept: currentAuto })
    }
  })
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('polemica-auto-accept:')) {
      currentAuto = url.slice('polemica-auto-accept:'.length) === '1'
      closeAndResolve({ autoAccept: currentAuto })
    }
    return { action: 'deny' }
  })
  win.on('blur', () => {
    setTimeout(() => {
      if (popup === win && !win.isDestroyed() && win.isVisible() && !win.isFocused()) {
        closeAndResolve({ autoAccept: currentAuto })
      }
    }, 120)
  })
  win.on('closed', () => {
    if (popup === win) {
      popup = null
      shellReady = null
    }
    finish(null)
  })
}

async function ensurePopup(parent: BrowserWindow): Promise<BrowserWindow> {
  if (popup && !popup.isDestroyed()) {
    if (popup.getParentWindow() !== parent) {
      try {
        popup.setParentWindow(parent)
      } catch {
        /* keep */
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
    backgroundColor: '#00000000',
    width: POPUP_WIDTH,
    height: POPUP_HEIGHT,
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

async function paint(win: BrowserWindow, autoAccept: boolean): Promise<void> {
  if (win.isDestroyed()) return
  if (shellReady) await shellReady
  if (win.isDestroyed()) return
  await win.webContents.executeJavaScript(
    `window.__paint(${autoAccept ? 'true' : 'false'}); true`,
    true
  )
}

export function closePlayActionMenu(): void {
  if (!popup || popup.isDestroyed()) {
    popup = null
    return
  }
  if (popup.isVisible()) popup.hide()
}

export function destroyPlayActionMenu(): void {
  if (!popup || popup.isDestroyed()) {
    popup = null
    shellReady = null
    finish(null)
    return
  }
  const win = popup
  popup = null
  shellReady = null
  win.destroy()
  finish(null)
}

export async function openPlayActionMenu(
  parent: BrowserWindow,
  anchor: { x: number; y: number; right: number; bottom: number },
  opts: { autoAccept: boolean }
): Promise<{ autoAccept: boolean } | null> {
  if (popup && !popup.isDestroyed() && popup.isVisible()) {
    closeAndResolve({ autoAccept: currentAuto })
    return null
  }

  try {
    const { closeLivePlayersMenu } = await import('./livePlayersPopup')
    closeLivePlayersMenu()
  } catch {
    /* ignore */
  }

  currentAuto = Boolean(opts.autoAccept)

  if (pending) finish(null)

  const content = parent.getContentBounds()
  const width = POPUP_WIDTH
  const height = POPUP_HEIGHT
  const preferredLeft = Math.round(content.x + (anchor.right || anchor.x) - width)
  const x = Math.min(
    Math.max(content.x + 8, preferredLeft),
    content.x + content.width - width - 8
  )
  const y = Math.min(
    Math.max(content.y + 8, Math.round(content.y + anchor.bottom + 6)),
    content.y + content.height - height - 8
  )

  const win = await ensurePopup(parent)
  win.setBounds({ width, height, x, y })
  await paint(win, currentAuto)
  if (win.isDestroyed()) return null

  const result = new Promise<{ autoAccept: boolean } | null>((resolve) => {
    pending = resolve
  })

  win.show()
  void win.webContents
    .executeJavaScript('window.__focusShell && window.__focusShell(); true', true)
    .catch(() => {
      /* ignore */
    })

  return result
}
