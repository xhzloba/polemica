/** Force / restore camera from client pref on /game lobby. */
export const CAMERA_OFF_ON_LOBBY_JS = `
(() => {
  const VER = 5;
  if (window.__polemicaCameraOffOnLobby === VER) return;
  window.__polemicaCameraOffOnLobby = VER;

  // Site room bundle icons (hashed).
  const CAM_ON_ICON = '516810fd6c1e38f17335';
  const CAM_OFF_ICON = 'edf479f3365a51e1beca';

  let trying = false;
  let watchdog = null;
  let targetOff = null; // null = follow pref flag; bool = explicit
  let lastLog = 0;

  const log = (msg, extra) => {
    const now = Date.now();
    if (now - lastLog < 600) return;
    lastLog = now;
    try { console.log('[polemica-cam-off]', msg, extra == null ? '' : extra); } catch (e) {}
  };

  const pathOf = () => (location.pathname || '').replace(/\\/$/, '') || '/';
  const onGame = () => pathOf() === '/game' || pathOf().startsWith('/game/');

  const iconSrc = (btn) => {
    const img = btn && btn.querySelector && btn.querySelector('img.button__icon, img');
    return ((img && (img.getAttribute('src') || img.currentSrc)) || '').toLowerCase();
  };

  const findCameraButton = () => {
    const buttons = Array.from(
      document.querySelectorAll('.button.preset-1.small.desktop-version, .button.preset-1.small')
    );
    for (const btn of buttons) {
      const src = iconSrc(btn);
      if (src.indexOf(CAM_ON_ICON) !== -1 || src.indexOf(CAM_OFF_ICON) !== -1) return btn;
    }
    return null;
  };

  const cameraIsOff = () => {
    const btn = findCameraButton();
    if (!btn) return null;
    const src = iconSrc(btn);
    if (src.indexOf(CAM_OFF_ICON) !== -1 || btn.classList.contains('off')) return true;
    if (src.indexOf(CAM_ON_ICON) !== -1) return false;
    return btn.classList.contains('off');
  };

  const getStore = () => {
    try { if (window.$nuxt && window.$nuxt.$store) return window.$nuxt.$store; } catch (e) {}
    const app = document.querySelector('#app, #__nuxt');
    const root = app && app.__vue__;
    if (root && root.$store) return root.$store;
    if (root && root.$root && root.$root.$store) return root.$root.$store;
    const room = document.querySelector('.game-room');
    if (room && room.__vue__ && room.__vue__.$store) return room.__vue__.$store;
    return null;
  };

  const walkVue = (root, visit) => {
    const seen = new Set();
    const stack = [root];
    while (stack.length) {
      const cur = stack.pop();
      if (!cur || seen.has(cur)) continue;
      seen.add(cur);
      try { if (visit(cur)) return cur; } catch (e) {}
      if (cur.$children && cur.$children.length) {
        for (let i = 0; i < cur.$children.length; i++) stack.push(cur.$children[i]);
      }
    }
    return null;
  };

  const findStreamVm = () => {
    const roots = [];
    const app = document.querySelector('#app, #__nuxt');
    if (app && app.__vue__) roots.push(app.__vue__);
    if (window.$nuxt) roots.push(window.$nuxt);
    document.querySelectorAll('.game-room').forEach((el) => {
      if (el.__vue__) roots.push(el.__vue__);
    });
    for (const root of roots) {
      const hit = walkVue(root, (vm) => {
        if (typeof vm.toggleStreamStatus !== 'function') return false;
        const src = Function.prototype.toString.call(vm.toggleStreamStatus);
        return src.indexOf('playerStream') !== -1 || src.indexOf('set_video') !== -1;
      });
      if (hit) return hit;
    }
    return null;
  };

  const desiredOff = () => {
    if (typeof targetOff === 'boolean') return targetOff;
    return Boolean(window.__polemicaCameraOffOnLobbyEnter);
  };

  const applyOnce = () => {
    if (!onGame() || !document.querySelector('.game-room')) return 'wait';
    const store = getStore();
    const st = store && store.state;
    if (st && st.gameDidStart) return 'stop';

    const wantOff = desiredOff();
    const state = cameraIsOff();
    if (state === null) {
      log('waiting for camera btn');
      return 'wait';
    }
    if (state === wantOff) {
      log(wantOff ? 'camera already off' : 'camera already on');
      return 'done';
    }

    const vm = findStreamVm();
    if (vm && st && st.playerStream) {
      try {
        log('toggleStreamStatus', { video: !wantOff ? true : false });
        vm.toggleStreamStatus({ video: !wantOff });
      } catch (e) {
        log('vue toggle failed', String(e));
      }
    }

    const btn = findCameraButton();
    if (btn) {
      const src = iconSrc(btn);
      const looksOff = src.indexOf(CAM_OFF_ICON) !== -1 || btn.classList.contains('off');
      if (looksOff !== wantOff) {
        log('click camera', { wantOff, src });
        btn.click();
      }
    }

    return 'check';
  };

  const clearWatchdog = () => {
    if (watchdog) {
      clearInterval(watchdog);
      watchdog = null;
    }
  };

  const startWatchdog = () => {
    clearWatchdog();
    // Only keep forcing OFF while pref is on — don't fight user if they want cam on.
    if (!desiredOff()) return;
    let ticks = 0;
    watchdog = setInterval(() => {
      ticks += 1;
      if (!onGame() || !desiredOff()) {
        clearWatchdog();
        return;
      }
      const st = getStore() && getStore().state;
      if (st && st.gameDidStart) {
        clearWatchdog();
        return;
      }
      if (cameraIsOff() === false) applyOnce();
      if (ticks >= 80) clearWatchdog();
    }, 400);
  };

  const runUntilMatch = () => {
    if (trying) return;
    if (!onGame()) return;
    trying = true;
    let tries = 0;
    const tick = () => {
      tries += 1;
      const result = applyOnce();
      if (result === 'done') {
        trying = false;
        startWatchdog();
        return;
      }
      if (result === 'stop') {
        trying = false;
        return;
      }
      if (result === 'check') {
        setTimeout(() => {
          const wantOff = desiredOff();
          if (cameraIsOff() === wantOff) {
            trying = false;
            startWatchdog();
            return;
          }
          if (tries > 40) {
            trying = false;
            startWatchdog();
            return;
          }
          setTimeout(tick, 200);
        }, 80);
        return;
      }
      if (tries > 60) {
        trying = false;
        startWatchdog();
        return;
      }
      setTimeout(tick, 200);
    };
    tick();
  };

  /** Live apply: wantOff true → cam off, false → cam on. */
  window.__polemicaSetLobbyCamera = (wantOff) => {
    targetOff = Boolean(wantOff);
    window.__polemicaCameraOffOnLobbyEnter = targetOff;
    trying = false;
    clearWatchdog();
    log('setLobbyCamera', targetOff);
    runUntilMatch();
  };

  window.__polemicaApplyCameraOffPref = () => {
    targetOff = Boolean(window.__polemicaCameraOffOnLobbyEnter);
    trying = false;
    clearWatchdog();
    log('apply pref', targetOff);
    runUntilMatch();
  };

  const mo = new MutationObserver(() => {
    if (!onGame() || !document.querySelector('.game-room')) return;
    if (!desiredOff()) return;
    if (cameraIsOff() === false) runUntilMatch();
  });
  mo.observe(document.documentElement, { childList: true, subtree: true });

  window.addEventListener('popstate', () => {
    trying = false;
    runUntilMatch();
  });

  if (window.__polemicaCameraOffOnLobbyEnter) runUntilMatch();
})();
`
