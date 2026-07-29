/**
 * Force-render every lobby from /current-games/get-current-games.
 * Site keeps a full list but v-for uses a paginated computed (~10) — we patch that.
 */
export const LOBBY_UNPAGINATE_JS = `
(() => {
  const VER = 4;
  if (window.__polemicaLobbyUnpaginate === VER) return;
  window.__polemicaLobbyUnpaginate = VER;

  const ENDPOINT = '/current-games/get-current-games';
  const HUGE = 10_000;
  const PAGE_KEYS = [
    'perPage',
    'pageSize',
    'itemsPerPage',
    'limit',
    'pageLimit',
    'lobbiesPerPage',
    'gamesPerPage',
    'rowsPerPage',
    'size',
    'countPerPage'
  ];
  const PAGE_INDEX_KEYS = ['page', 'currentPage', 'pageNumber', 'activePage', 'selectedPage'];

  let lastGames = [];
  let lastFetchAt = 0;
  let fetchInFlight = null;

  const looksLikeLobby = (row) =>
    row &&
    typeof row === 'object' &&
    (row.gameId != null || (row.id != null && (row.name != null || Array.isArray(row.players))));

  const isLobbyArray = (arr) =>
    Array.isArray(arr) && (arr.length === 0 || looksLikeLobby(arr[0]));

  const walk = (vm, fn, depth) => {
    if (!vm || depth > 18) return;
    try {
      fn(vm);
    } catch (e) {}
    const kids = vm.$children || [];
    for (let i = 0; i < kids.length; i++) walk(kids[i], fn, depth + 1);
  };

  const setNum = (vm, key, value) => {
    if (!vm || typeof vm[key] !== 'number') return;
    if (vm[key] === value) return;
    try {
      if (typeof vm.$set === 'function') vm.$set(key, value);
      else vm[key] = value;
    } catch (e) {
      try {
        vm[key] = value;
      } catch (e2) {}
    }
  };

  const disablePagerOn = (vm) => {
    if (!vm) return;
    for (const key of PAGE_KEYS) {
      if (typeof vm[key] === 'number' && vm[key] > 0 && vm[key] < HUGE) setNum(vm, key, HUGE);
    }
    for (const key of PAGE_INDEX_KEYS) {
      if (typeof vm[key] === 'number' && vm[key] !== 1) setNum(vm, key, 1);
    }
    for (const bagKey of ['pagination', 'pager', 'paging', 'meta', 'pageData']) {
      const bag = vm[bagKey];
      if (!bag || typeof bag !== 'object') continue;
      for (const key of PAGE_KEYS) {
        if (typeof bag[key] === 'number' && bag[key] > 0 && bag[key] < HUGE) {
          try {
            bag[key] = HUGE;
          } catch (e) {}
        }
      }
      for (const key of PAGE_INDEX_KEYS) {
        if (typeof bag[key] === 'number' && bag[key] !== 1) {
          try {
            bag[key] = 1;
          } catch (e) {}
        }
      }
    }
  };

  const writeArray = (owner, key, games) => {
    try {
      if (typeof owner.$set === 'function') {
        owner.$set(key, games.slice());
        return true;
      }
    } catch (e) {}
    try {
      const cur = owner[key];
      if (Array.isArray(cur)) {
        cur.splice(0, cur.length, ...games);
        return true;
      }
      owner[key] = games.slice();
      return true;
    } catch (e2) {
      return false;
    }
  };

  /** Find the exact array v-for uses by matching a rendered row's lobby object. */
  const findVforList = () => {
    const row = document.querySelector('.p-play__lobby-table-row');
    if (!row || !row.__vue__) return null;
    let itemVm = row.__vue__;
    let item = null;
    for (let i = 0; i < 6 && itemVm; i++) {
      if (looksLikeLobby(itemVm.lobby)) {
        item = itemVm.lobby;
        break;
      }
      if (looksLikeLobby(itemVm.game)) {
        item = itemVm.game;
        break;
      }
      if (looksLikeLobby(itemVm.item)) {
        item = itemVm.item;
        break;
      }
      // data props
      try {
        for (const k of Object.keys(itemVm)) {
          if (looksLikeLobby(itemVm[k])) {
            item = itemVm[k];
            break;
          }
        }
      } catch (e) {}
      if (item) break;
      itemVm = itemVm.$parent;
    }
    if (!item) return null;

    let parent = row.__vue__;
    for (let depth = 0; depth < 12 && parent; depth++) {
      try {
        for (const key of Object.keys(parent)) {
          const val = parent[key];
          if (!Array.isArray(val)) continue;
          if (val.includes(item)) return { vm: parent, key, list: val };
        }
      } catch (e) {}
      // also $data
      try {
        const data = parent.$data || parent._data;
        if (data) {
          for (const key of Object.keys(data)) {
            const val = data[key];
            if (Array.isArray(val) && val.includes(item)) return { vm: parent, key, list: val };
          }
        }
      } catch (e) {}
      parent = parent.$parent;
    }
    return null;
  };

  const patchComputedToFull = (vm, games) => {
    if (!vm || !games.length) return false;
    let hit = false;
    const watchers = vm._computedWatchers;
    if (watchers) {
      for (const name of Object.keys(watchers)) {
        const w = watchers[name];
        if (!w) continue;
        let val = w.value;
        try {
          if (w.dirty && typeof w.evaluate === 'function') w.evaluate();
          val = w.value;
        } catch (e) {}
        if (!isLobbyArray(val)) continue;
        if (val.length >= games.length) continue;
        // This computed is the paginated slice — force it to full API list
        try {
          w.get = function polemicaFullLobbies() {
            return games;
          };
          w.value = games;
          w.dirty = false;
          Object.defineProperty(vm, name, {
            configurable: true,
            enumerable: true,
            get() {
              return games;
            },
            set() {}
          });
          hit = true;
        } catch (e) {}
      }
    }

    // Also patch $options.computed getters for future re-creates
    const computed = vm.$options && vm.$options.computed;
    if (computed && typeof computed === 'object') {
      for (const name of Object.keys(computed)) {
        try {
          const def = computed[name];
          const getter = typeof def === 'function' ? def : def && def.get;
          if (!getter) continue;
          let sample = null;
          try {
            sample = getter.call(vm);
          } catch (e) {
            continue;
          }
          if (!isLobbyArray(sample)) continue;
          if (sample.length >= games.length) continue;
          computed[name] = function polemicaFullLobbiesOpt() {
            return games;
          };
          hit = true;
        } catch (e) {}
      }
    }

    if (hit && typeof vm.$forceUpdate === 'function') {
      try {
        vm.$forceUpdate();
      } catch (e) {}
    }
    return hit;
  };

  const injectGames = (games) => {
    if (!Array.isArray(games) || !games.length) return false;
    let ok = false;

    // 1) Primary: replace the array that actually feeds v-for
    const found = findVforList();
    if (found) {
      disablePagerOn(found.vm);
      if (writeArray(found.vm, found.key, games)) ok = true;
      if (patchComputedToFull(found.vm, games)) ok = true;
      // parents may own the pager
      let p = found.vm;
      for (let i = 0; i < 8 && p; i++) {
        disablePagerOn(p);
        if (patchComputedToFull(p, games)) ok = true;
        // replace any shorter lobby arrays on ancestors
        try {
          for (const key of Object.keys(p)) {
            if (!isLobbyArray(p[key])) continue;
            if (p[key].length > 0 && p[key].length < games.length) {
              if (writeArray(p, key, games)) ok = true;
            }
          }
        } catch (e) {}
        p = p.$parent;
      }
      if (typeof found.vm.$forceUpdate === 'function') {
        try {
          found.vm.$forceUpdate();
        } catch (e) {}
      }
    }

    // 2) Sweep: any vm with lobby arrays shorter than API
    const seeds = [];
    const push = (el) => {
      if (el && el.__vue__) seeds.push(el.__vue__);
    };
    push(document.querySelector('.p-play__lobby-table'));
    push(document.querySelector('.p-play__lobby'));
    push(document.querySelector('#app'));

    const seen = new Set();
    for (const start of seeds) {
      walk(
        start,
        (vm) => {
          if (!vm || seen.has(vm)) return;
          seen.add(vm);
          disablePagerOn(vm);
          if (patchComputedToFull(vm, games)) ok = true;
          try {
            for (const key of Object.keys(vm)) {
              if (!isLobbyArray(vm[key])) continue;
              if (vm[key].length > 0 && vm[key].length < games.length) {
                if (writeArray(vm, key, games)) ok = true;
              }
            }
          } catch (e) {}
        },
        0
      );
      let cur = start;
      for (let i = 0; i < 10 && cur; i++) {
        if (!seen.has(cur)) {
          seen.add(cur);
          disablePagerOn(cur);
          patchComputedToFull(cur, games);
        }
        cur = cur.$parent;
      }
    }

    return ok;
  };

  const hidePages = () => {
    document.querySelectorAll('.p-play__lobby .pages, .pages, .pagination__container').forEach((el) => {
      if (!(el instanceof HTMLElement)) return;
      el.style.setProperty('display', 'none', 'important');
      el.setAttribute('hidden', '');
    });
  };

  const fetchGames = () => {
    const now = Date.now();
    if (fetchInFlight) return fetchInFlight;
    if (now - lastFetchAt < 2000 && lastGames.length) return Promise.resolve(lastGames);
    fetchInFlight = fetch(ENDPOINT, {
      credentials: 'include',
      headers: { accept: 'application/json' }
    })
      .then((r) => r.json())
      .then((data) => {
        const games = Array.isArray(data && data.result) ? data.result : [];
        lastGames = games;
        lastFetchAt = Date.now();
        return games;
      })
      .catch((err) => {
        console.warn('[polemica] lobby fetch failed', err);
        return lastGames;
      })
      .finally(() => {
        fetchInFlight = null;
      });
    return fetchInFlight;
  };

  const apply = () => {
    hidePages();
    fetchGames().then((games) => {
      if (!games.length) return;
      injectGames(games);
      hidePages();
      const rows = document.querySelectorAll('.p-play__lobby-table-row').length;
      if (rows < games.length) {
        // Retry once after Vue settles
        setTimeout(() => {
          injectGames(games);
          hidePages();
          const again = document.querySelectorAll('.p-play__lobby-table-row').length;
          console.debug('[polemica] lobby fill', 'api=', games.length, 'rows=', again);
        }, 300);
      } else {
        console.debug('[polemica] lobby fill', 'api=', games.length, 'rows=', rows);
      }
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
    if (root && !root.__polemicaLobbyUnpaginateObs) {
      const obs = new MutationObserver(schedule);
      obs.observe(root, { childList: true, subtree: true });
      root.__polemicaLobbyUnpaginateObs = obs;
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
  setInterval(schedule, 1500);
})();
`
