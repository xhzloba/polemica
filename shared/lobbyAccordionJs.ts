/** Injected into the site page world (not isolated preload). */
import { MMR_TIERS } from './mmrTiers'
import { PRIME_ICON, SUBSCRIPTION_ICON } from './siteMarks'

export const LOBBY_ACCORDION_JS = `
(() => {
  const VER = 2;
  if (window.__polemicaLobbyAccordion === VER) return;
  window.__polemicaLobbyAccordion = VER;

  const OPEN = 'polemica-lobby-row--open';
  const PANEL = 'polemica-lobby-expand';
  const PRIME_ICON = ${JSON.stringify(PRIME_ICON)};
  const SUB_ICON = ${JSON.stringify(SUBSCRIPTION_ICON)};
  const MMR_TIERS = ${JSON.stringify(MMR_TIERS)};

  const resolveVm = (row) => {
    let cur = row && row.__vue__;
    for (let i = 0; i < 8 && cur; i++) {
      if (cur.lobby && Array.isArray(cur.lobby.players)) return cur;
      if (typeof cur.getUserAvatarUrl === 'function' && cur.lobby) return cur;
      cur = cur.$parent;
    }
    return row && row.__vue__;
  };

  const avatarUrl = (vm, player) => {
    const raw = player && player.avatar_url != null ? String(player.avatar_url) : '';
    try {
      if (vm && typeof vm.getUserAvatarUrl === 'function') {
        const built = vm.getUserAvatarUrl(raw || null, '100x');
        if (built) {
          const s = String(built);
          if (/^https?:\\/\\//i.test(s) || s.startsWith('//')) return s;
          return location.origin + s;
        }
      }
    } catch (e) {}
    if (/^https?:\\/\\//i.test(raw) || raw.startsWith('data:')) return raw;
    if (raw) {
      return (
        location.origin +
        '/image/user-avatar?file_name=' +
        encodeURIComponent(raw) +
        '&size=100x'
      );
    }
    return location.origin + '/image/user-avatar?size=100x';
  };

  const DEFAULT_AVATAR = () => location.origin + '/image/user-avatar?size=100x';

  const escapeHtml = (s) =>
    String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

  const mmrTier = (value) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return null;
    let tier = null;
    for (const item of MMR_TIERS) {
      if (n >= item.min) tier = item;
    }
    return tier;
  };

  const mmrHtml = (value) => {
    const tier = mmrTier(value);
    if (!tier) return '';
    const text = Number(Number(value).toFixed(0)).toLocaleString('en-US');
    return (
      '<span class="polemica-lobby-expand__mmr">' +
      '<img class="polemica-lobby-expand__mmr-icon" src="' +
      escapeHtml(tier.image) +
      '" alt="" draggable="false" />' +
      '<span class="polemica-lobby-expand__mmr-text polemica-lobby-expand__mmr-text--' +
      escapeHtml(tier.type) +
      '">' +
      escapeHtml(text) +
      '</span>' +
      '</span>'
    );
  };

  const playerHtml = (vm, p, fallbackAvatar) => {
    const name = escapeHtml(p.username || 'Игрок');
    const id = encodeURIComponent(String(p.id || ''));
    const src = escapeHtml(avatarUrl(vm, p) || fallbackAvatar);
    const quit = Boolean(p.quit);
    const sub =
      p.subscription && !p.primeMember
        ? '<img class="polemica-lobby-expand__mark polemica-lobby-expand__mark--sub" src="' +
          escapeHtml(SUB_ICON) +
          '" alt="" title="' +
          escapeHtml(p.subscription) +
          '" draggable="false" />'
        : '';
    const prime = p.primeMember
      ? '<img class="polemica-lobby-expand__mark polemica-lobby-expand__mark--prime" src="' +
        escapeHtml(PRIME_ICON) +
        '" alt="" title="Prime" draggable="false" />'
      : '';
    const mmr = p.mmr != null && p.mmr !== '' ? mmrHtml(p.mmr) : '';
    return (
      '<a class="polemica-lobby-expand__player' +
      (quit ? ' polemica-lobby-expand__player--quit' : '') +
      '" href="/profile/' +
      id +
      '" target="_blank" rel="noopener">' +
      '<img class="polemica-lobby-expand__avatar" src="' +
      src +
      '" alt="" loading="lazy" decoding="async" data-fallback="' +
      escapeHtml(fallbackAvatar) +
      '" />' +
      '<span class="polemica-lobby-expand__meta">' +
      '<span class="polemica-lobby-expand__name-row">' +
      '<span class="polemica-lobby-expand__name">' +
      name +
      '</span>' +
      sub +
      prime +
      '</span>' +
      '</span>' +
      mmr +
      '</a>'
    );
  };

  const closeAll = (except) => {
    document.querySelectorAll('.' + OPEN).forEach((row) => {
      if (row === except) return;
      row.classList.remove(OPEN);
      const panel = row.querySelector('.' + PANEL);
      if (panel) panel.remove();
    });
  };

  const renderPanel = (row, vm) => {
    const lobby = (vm && vm.lobby) || {};
    const players = Array.isArray(lobby.players) ? lobby.players : [];
    const started = Boolean(lobby.gameIsStarted);
    const canWatch =
      started &&
      vm &&
      vm.lobbyTwitchUrl &&
      vm.lobbyTwitchUrl.stream &&
      vm.lobbyTwitchUrl.stream.link;
    const joinLabel = started ? (canWatch ? 'Смотреть' : 'В игре') : 'Присоединиться';
    const joinDisabled = started && !canWatch;
    const fallbackAvatar = DEFAULT_AVATAR();

    const active = players.filter((p) => !p.quit);
    const quit = players.filter((p) => p.quit);
    const parts = [];
    if (active.length) {
      parts.push(active.map((p) => playerHtml(vm, p, fallbackAvatar)).join(''));
    }
    if (quit.length) {
      parts.push(
        '<div class="polemica-lobby-expand__section">Выбывшие · ' + quit.length + '</div>'
      );
      parts.push(quit.map((p) => playerHtml(vm, p, fallbackAvatar)).join(''));
    }
    const list = parts.length
      ? parts.join('')
      : '<div class="polemica-lobby-expand__empty">Нет данных об игроках</div>';

    const titleCount = active.length
      ? String(active.length) + (quit.length ? ' · выб. ' + quit.length : '')
      : String(players.length);

    const panel = document.createElement('div');
    panel.className = PANEL;
    panel.innerHTML =
      '<div class="polemica-lobby-expand__head">' +
      '<div class="polemica-lobby-expand__title">Игроки · ' +
      titleCount +
      '</div>' +
      '<button type="button" class="polemica-lobby-expand__join"' +
      (joinDisabled ? ' disabled' : '') +
      '>' +
      joinLabel +
      '</button>' +
      '</div>' +
      '<div class="polemica-lobby-expand__list">' +
      list +
      '</div>';

    panel.querySelectorAll('a.polemica-lobby-expand__player').forEach((a) => {
      a.addEventListener('click', (e) => e.stopPropagation());
    });

    panel.querySelectorAll('img.polemica-lobby-expand__avatar').forEach((img) => {
      img.addEventListener('error', () => {
        const fb = img.getAttribute('data-fallback');
        if (fb && img.getAttribute('src') !== fb) img.setAttribute('src', fb);
      });
    });

    const joinBtn = panel.querySelector('.polemica-lobby-expand__join');
    if (joinBtn) {
      joinBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (joinDisabled) return;
        try {
          if (vm && typeof vm.enterLobby === 'function') vm.enterLobby();
        } catch (err) {}
      });
    }

    return panel;
  };

  const toggleRow = (row) => {
    const vm = resolveVm(row);
    const open = row.classList.contains(OPEN);
    closeAll(open ? null : row);
    if (open) {
      row.classList.remove(OPEN);
      const panel = row.querySelector('.' + PANEL);
      if (panel) panel.remove();
      return;
    }
    row.classList.add(OPEN);
    const existing = row.querySelector('.' + PANEL);
    if (existing) existing.remove();
    row.appendChild(renderPanel(row, vm));
  };

  document.addEventListener(
    'click',
    (e) => {
      const t = e.target;
      if (!(t instanceof Element)) return;

      if (t.closest('.' + PANEL)) {
        if (!t.closest('.polemica-lobby-expand__join') && !t.closest('a')) {
          e.preventDefault();
          e.stopPropagation();
        } else if (t.closest('a')) {
          e.stopPropagation();
        }
        return;
      }

      const row = t.closest('.p-play__lobby-table-row');
      if (!row) return;

      e.preventDefault();
      e.stopImmediatePropagation();
      toggleRow(row);
    },
    true
  );
})();
`
