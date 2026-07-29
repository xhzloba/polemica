/** Lobby table filters + fill-descending sort (injected into page world). */
export const LOBBY_FILTERS_JS = `
(() => {
  const VER = 5;
  if (window.__polemicaLobbyFilters === VER) return;
  window.__polemicaLobbyFilters = VER;

  const HIDDEN = 'polemica-lobby-row--filtered';
  const STORAGE_KEY = 'polemica.lobbyFilter';
  const FILTER_IDS = ['all', 'lobby', 'league', 'prime', 'live'];

  let filterId = 'all';
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (FILTER_IDS.includes(saved)) filterId = saved;
  } catch (e) {}

  // Remove legacy in-page filter bar (filters live in Electron chrome now)
  document.querySelectorAll('.polemica-lobby-filters').forEach((el) => el.remove());

  const resolveVm = (row) => {
    let cur = row && row.__vue__;
    for (let i = 0; i < 8 && cur; i++) {
      if (cur.lobby) return cur;
      cur = cur.$parent;
    }
    return row && row.__vue__;
  };

  const isWatchTab = () => {
    const tabs = Array.from(document.querySelectorAll('.p-play__tab'));
    const watch = tabs.find((el) => (el.textContent || '').includes('Смотреть'));
    return Boolean(watch && watch.classList.contains('p-play__tab--active'));
  };

  // Match watch-tab / live.streams: only seated players with active Twitch link.
  const rowHasActiveTwitch = (vm) => {
    if (!vm) return false;
    const players = Array.isArray(vm.lobby && vm.lobby.players) ? vm.lobby.players : [];
    return players.some(
      (p) => p && !p.quit && p.stream && p.stream.active && p.stream.link
    );
  };

  /**
   * Site model:
   * - gameMode "lobby" → custom rooms (обычные)
   * - gameMode "league" + censorship:
   *     standard → обычные
   *     polite   → рейтинговые
   *     prime    → прайм+
   */
  const classifyMode = (gameMode, censorship, typeText) => {
    const gm = String(gameMode || '')
      .trim()
      .toLowerCase();
    const cen = String(censorship || '')
      .trim()
      .toLowerCase();
    const t = String(typeText || '')
      .replace(/\\s+/g, ' ')
      .trim()
      .toLowerCase();

    if (cen === 'prime' || /прайм|\\bprime\\b/.test(t)) return 'prime';
    if (cen === 'polite' || /рейтинг|ranked|polite/.test(t)) return 'league';
    if (cen === 'standard' || /обычн|standard|casual/.test(t)) return 'lobby';

    if (gm === 'lobby' || gm === 'usual' || gm === 'normal' || gm === 'default') return 'lobby';
    if (gm === 'prime') return 'prime';
    if (gm === 'league' || gm === 'rating' || gm === 'ranked') return 'league';

    return 'lobby';
  };

  const parsePlayers = (row, lobby) => {
    const cell =
      row.querySelector('.p-search-lobby-players') ||
      row.querySelector('.p-play__lobby-table-cell-players');
    const text = (cell && cell.textContent) || '';
    const match = text.match(/(\\d+)\\s*\\/\\s*(\\d+)/);
    let cur = match ? Number(match[1]) : NaN;
    let max = match ? Number(match[2]) : NaN;
    if (!Number.isFinite(cur) && lobby && lobby.playersNumber != null) {
      cur = Number(lobby.playersNumber);
    }
    if (!Number.isFinite(max) && lobby && lobby.maxPlayersNumber != null) {
      max = Number(lobby.maxPlayersNumber);
    }
    if (!Number.isFinite(cur) && lobby && Array.isArray(lobby.players)) {
      cur = lobby.players.filter((p) => p && !p.quit).length;
    }
    if (!Number.isFinite(max)) max = 10;
    if (!Number.isFinite(cur)) cur = 0;
    return { cur, max, remaining: Math.max(0, max - cur) };
  };

  const rowUnit = (row) => {
    const parent = row.parentElement;
    if (
      parent &&
      !parent.classList.contains('p-play__lobby-table') &&
      parent.querySelectorAll('.p-play__lobby-table-row').length === 1
    ) {
      return parent;
    }
    return row;
  };

  const rowMeta = (row) => {
    const vm = resolveVm(row);
    const lobby = (vm && vm.lobby) || {};
    const typeText = (
      row.querySelector('.p-search-lobby-type')?.textContent || ''
    ).replace(/\\s+/g, ' ');
    const mode = classifyMode(lobby.gameMode, lobby.censorship, typeText);
    const seats = parsePlayers(row, lobby);
    const started =
      Boolean(lobby.gameIsStarted) ||
      row.classList.contains('p-play__lobby-table-row-started');
    const live = rowHasActiveTwitch(vm);
    return { mode, ...seats, started, live };
  };

  const apply = () => {
    const table = document.querySelector('.p-play__lobby-table');
    if (!table) return;

    document.querySelectorAll('.polemica-lobby-filters').forEach((el) => el.remove());

    const watch = isWatchTab();
    const header = table.querySelector('.p-play__lobby-table-header-row');
    if (header) {
      const headerUnit = rowUnit(header);
      headerUnit.style.order = '-2';
    }

    const rows = Array.from(table.querySelectorAll('.p-play__lobby-table-row'));
    const scored = rows.map((row, idx) => {
      const meta = rowMeta(row);
      const unit = rowUnit(row);
      let match = true;
      if (watch) {
        match = meta.live;
      } else if (filterId === 'live') {
        match = meta.live;
      } else if (filterId !== 'all') {
        match = meta.mode === filterId;
      }
      return { row, unit, meta, idx, match };
    });

    scored.sort((a, b) => {
      if (a.meta.remaining !== b.meta.remaining) {
        return a.meta.remaining - b.meta.remaining;
      }
      if (a.meta.started !== b.meta.started) return a.meta.started ? 1 : -1;
      if (a.meta.cur !== b.meta.cur) return b.meta.cur - a.meta.cur;
      return a.idx - b.idx;
    });

    scored.forEach((item, order) => {
      item.unit.classList.toggle(HIDDEN, !item.match);
      item.unit.style.order = String(order);
      item.unit.style.display = item.match ? '' : 'none';
    });
  };

  window.__polemicaSetLobbyFilter = (id) => {
    const next = FILTER_IDS.includes(id) ? id : 'all';
    filterId = next;
    try {
      localStorage.setItem(STORAGE_KEY, filterId);
    } catch (e) {}
    apply();
    return filterId;
  };

  window.__polemicaGetLobbyFilter = () => filterId;

  let scheduled = 0;
  const schedule = () => {
    if (scheduled) return;
    scheduled = requestAnimationFrame(() => {
      scheduled = 0;
      try {
        apply();
      } catch (e) {}
    });
  };

  const boot = () => {
    schedule();
    const root =
      document.querySelector('.p-play__lobby') ||
      document.querySelector('.p-play__center') ||
      document.body;
    if (!root || root.__polemicaLobbyFiltersObs) return;
    const obs = new MutationObserver(schedule);
    obs.observe(root, { childList: true, subtree: true, characterData: true });
    root.__polemicaLobbyFiltersObs = obs;
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
  setInterval(schedule, 1500);
})();
`
