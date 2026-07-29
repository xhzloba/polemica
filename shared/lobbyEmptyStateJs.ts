export const LOBBY_EMPTY_STATE_JS = `
(() => {
  const TEXT = 'Сейчас нет открытых лобби';
  const PILL_CLASS = 'polemica-lobby-empty';
  const STATE_KEY = '__polemicaLobbyEmptyState';
  const EMPTY_STABLE_MS = 1500;

  function getContainer() {
    return (
      document.querySelector('.p-play__lobby-table') ||
      document.querySelector('.p-play__lobby') ||
      document.querySelector('.p-play__center')
    );
  }

  function hasLobbyRows() {
    return document.querySelectorAll('.p-play__lobby-table-row').length > 0;
  }

  function hasNativeEmptyState() {
    return Array.from(document.querySelectorAll('.p-play__lobby *, .p-play__center *')).some(
      (node) =>
        node instanceof HTMLElement &&
        !node.classList.contains(PILL_CLASS) &&
        (node.textContent || '').replace(/\\s+/g, ' ').trim() === TEXT
    );
  }

  const previous = window[STATE_KEY];
  if (previous && typeof previous.render === 'function') {
    previous.render();
    return;
  }

  let emptySince = 0;
  let renderTimer = 0;
  let renderQueued = false;

  function ensurePill(container) {
    if (document.querySelector('.' + PILL_CLASS)) return;
    const pill = document.createElement('div');
    pill.className = PILL_CLASS;
    pill.dataset.polemicaEmptyReady = '1';
    pill.textContent = TEXT;

    const header = document.querySelector('.p-play__lobby-table-header-row');
    if (header && header.parentElement === container && header.nextSibling) {
      container.insertBefore(pill, header.nextSibling);
    } else {
      container.appendChild(pill);
    }
  }

  function render() {
    const container = getContainer();
    const existing = document.querySelector('.' + PILL_CLASS);
    if (!container || hasLobbyRows()) {
      emptySince = 0;
      existing?.remove();
      return;
    }

    if (hasNativeEmptyState()) {
      ensurePill(container);
      return;
    }

    if (!emptySince) emptySince = Date.now();
    const remaining = EMPTY_STABLE_MS - (Date.now() - emptySince);
    if (remaining <= 0) {
      ensurePill(container);
      return;
    }

    window.clearTimeout(renderTimer);
    renderTimer = window.setTimeout(render, remaining);
  }

  function scheduleRender() {
    if (renderQueued) return;
    renderQueued = true;
    window.requestAnimationFrame(() => {
      renderQueued = false;
      render();
    });
  }

  const observer = new MutationObserver(scheduleRender);
  observer.observe(document.documentElement, { childList: true, subtree: true });

  window[STATE_KEY] = { render: scheduleRender, observer };
  scheduleRender();
})()
`

