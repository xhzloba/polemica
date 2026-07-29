export const LOBBY_EMPTY_STATE_JS = `
(() => {
  const TEXT = 'Сейчас нет открытых лобби';
  const PILL_CLASS = 'polemica-lobby-empty';

  const container =
    document.querySelector('.p-play__lobby-table') ||
    document.querySelector('.p-play__lobby') ||
    document.querySelector('.p-play__center');

  if (!container) return;

  function hasLobbyRows(): boolean {
    // Header row has a different class; only real rows should count.
    return document.querySelectorAll('.p-play__lobby-table-row').length > 0;
  }

  function render(): void {
    const existing = document.querySelector('.' + PILL_CLASS);
    if (hasLobbyRows()) {
      existing?.remove();
      return;
    }

    if (existing) return;

    const pill = document.createElement('div');
    pill.className = PILL_CLASS;
    pill.textContent = TEXT;

    const header = document.querySelector('.p-play__lobby-table-header-row');
    if (header && header.parentElement === container && header.nextSibling) {
      container.insertBefore(pill, header.nextSibling);
    } else {
      container.appendChild(pill);
    }
  }

  render();

  // Lobby data loads async; keep checking briefly to avoid flicker.
  let ticks = 0;
  const maxTicks = 20; // ~10s
  const t = window.setInterval(() => {
    ticks++;
    render();
    if (ticks >= maxTicks || hasLobbyRows()) {
      window.clearInterval(t);
    }
  }, 500);
})()
`

