/** Lobby table filters + fill-descending sort (injected into page world). */
export const LOBBY_FILTERS_JS = `
(() => {
  const VER = 2;
  if (window.__polemicaLobbyFilters === VER) return;
  window.__polemicaLobbyFilters = VER;

  const BAR = 'polemica-lobby-filters';
  const BTN = 'polemica-lobby-filters__btn';
  const ON = 'polemica-lobby-filters__btn--on';
  const HIDDEN = 'polemica-lobby-row--filtered';
  const STORAGE_KEY = 'polemica.lobbyFilter';

  const FILTERS = [
    { id: 'all', label: 'Все' },
    { id: 'lobby', label: 'Обычные' },
    { id: 'league', label: 'Рейтинг' },
    { id: 'prime', label: 'Прайм+' }
  ];

  let filterId = 'all';
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (FILTERS.some((f) => f.id === saved)) filterId = saved;
  } catch (e) {}

  const resolveVm = (row) => {
    let cur = row && row.__vue__;
    for (let i = 0; i < 8 && cur; i++) {
      if (cur.lobby) return cur;
      cur = cur.$parent;
    }
    return row && row.__vue__;
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
    return { mode, ...seats, started };
  };

  const ensureBar = (table) => {
    let bar = document.querySelector('.' + BAR);
    if (bar && bar.isConnected) return bar;

    bar = document.createElement('div');
    bar.className = BAR;
    bar.setAttribute('role', 'tablist');
    bar.setAttribute('aria-label', 'Фильтр лобби');
    bar.innerHTML = FILTERS.map(
      (f) =>
        '<button type="button" class="' +
        BTN +
        (f.id === filterId ? ' ' + ON : '') +
        '" data-filter="' +
        f.id +
        '" role="tab" aria-selected="' +
        (f.id === filterId ? 'true' : 'false') +
        '">' +
        f.label +
        '</button>'
    ).join('');

    bar.addEventListener('click', (e) => {
      const btn = e.target instanceof Element ? e.target.closest('.' + BTN) : null;
      if (!btn) return;
      e.preventDefault();
      e.stopPropagation();
      const next = btn.getAttribute('data-filter') || 'all';
      if (next === filterId) return;
      filterId = next;
      try {
        localStorage.setItem(STORAGE_KEY, filterId);
      } catch (err) {}
      bar.querySelectorAll('.' + BTN).forEach((el) => {
        const on = el.getAttribute('data-filter') === filterId;
        el.classList.toggle(ON, on);
        el.setAttribute('aria-selected', on ? 'true' : 'false');
      });
      apply();
    });

    const lobby =
      table.closest('.p-play__lobby') ||
      document.querySelector('.p-play__lobby') ||
      table.parentElement;
    const header = table.querySelector('.p-play__lobby-table-header-row');
    if (header && header.parentElement === table) {
      table.insertBefore(bar, header);
    } else if (lobby) {
      lobby.insertBefore(bar, table);
    } else {
      table.prepend(bar);
    }
    return bar;
  };

  const apply = () => {
    const table = document.querySelector('.p-play__lobby-table');
    if (!table) return;

    ensureBar(table);

    const header = table.querySelector('.p-play__lobby-table-header-row');
    if (header) {
      const headerUnit = rowUnit(header);
      headerUnit.style.order = '-2';
    }

    const bar = document.querySelector('.' + BAR);
    if (bar) bar.style.order = '-3';

    const rows = Array.from(table.querySelectorAll('.p-play__lobby-table-row'));
    const scored = rows.map((row, idx) => {
      const meta = rowMeta(row);
      const unit = rowUnit(row);
      const match = filterId === 'all' || meta.mode === filterId;
      return { row, unit, meta, idx, match };
    });

    // Fullest first (10/10 → fewer seats left). Recruiting before started as soft tiebreak.
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
