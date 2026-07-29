/** Polish site CommonRoomModal — especially camera/mic gate on /game. */
export const GAME_AV_GATE_JS = `
(() => {
  const VER = 3;
  if (window.__polemicaAvGate === VER) return;
  window.__polemicaAvGate = VER;

  const STYLE_ID = 'polemica-av-gate-css';
  const BTN_CSS =
    '.polemica-av-gate .button-comp,' +
    '.polemica-av-gate button.button-comp,' +
    'button.polemica-av-btn{' +
    'display:inline-flex!important;' +
    'align-items:center!important;' +
    'justify-content:center!important;' +
    'box-sizing:border-box!important;' +
    'width:100%!important;' +
    'max-width:none!important;' +
    'min-height:44px!important;' +
    'height:44px!important;' +
    'margin:0!important;' +
    'padding:0 16px!important;' +
    'border:0!important;' +
    'border-color:transparent!important;' +
    'border-radius:12px!important;' +
    'background:#1677ff!important;' +
    'background-color:#1677ff!important;' +
    'background-image:none!important;' +
    'color:#fff!important;' +
    'box-shadow:none!important;' +
    'outline:none!important;' +
    'font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text","Helvetica Neue",Helvetica,Arial,sans-serif!important;' +
    'font-size:14px!important;' +
    'font-weight:650!important;' +
    'letter-spacing:-0.02em!important;' +
    'cursor:pointer!important;' +
    'opacity:1!important;' +
    '}' +
    '.polemica-av-gate .button-comp:hover,' +
    '.polemica-av-gate .button-comp:focus,' +
    'button.polemica-av-btn:hover,' +
    'button.polemica-av-btn:focus{' +
    'background:#4096ff!important;' +
    'background-color:#4096ff!important;' +
    'background-image:none!important;' +
    'border:0!important;' +
    'color:#fff!important;' +
    'opacity:1!important;' +
    'filter:none!important;' +
    '}';

  const ICON =
    '<svg viewBox="0 0 48 48" width="28" height="28" fill="none" aria-hidden="true">' +
    '<rect x="6" y="14" width="22" height="16" rx="4" stroke="currentColor" stroke-width="2.2"/>' +
    '<path d="M28 20.5 38 15v14l-10-5.5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<path d="M14 36h8" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>' +
    '<circle cx="18" cy="36" r="3.2" stroke="currentColor" stroke-width="2"/>' +
    '<path d="M34 31.5v3.2a3.2 3.2 0 0 1-6.4 0V31" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' +
    '</svg>';

  const ensureCss = () => {
    let el = document.getElementById(STYLE_ID);
    if (!el) {
      el = document.createElement('style');
      el.id = STYLE_ID;
      (document.head || document.documentElement).appendChild(el);
    }
    if (el.textContent !== BTN_CSS) el.textContent = BTN_CSS;
  };

  const isAvModal = (el) => {
    const title = (el.querySelector('.title')?.textContent || '').toLowerCase();
    const desc = (el.querySelector('.description')?.textContent || '').toLowerCase();
    const blob = title + ' ' + desc;
    return (
      blob.includes('камер') ||
      blob.includes('микрофон') ||
      blob.includes('camera') ||
      blob.includes('microphone')
    );
  };

  const paintBtn = (btn) => {
    if (!(btn instanceof HTMLElement)) return;
    if (btn.__polemicaPainting) return;
    btn.__polemicaPainting = true;
    try {
      btn.classList.add('polemica-av-btn');
      // Vue rewrites style= to CSS vars only — keep forcing fill after each patch.
      btn.style.setProperty('background', '#1677ff', 'important');
      btn.style.setProperty('background-color', '#1677ff', 'important');
      btn.style.setProperty('background-image', 'none', 'important');
      btn.style.setProperty('color', '#fff', 'important');
      btn.style.setProperty('border', '0 solid transparent', 'important');
      btn.style.setProperty('border-width', '0', 'important');
      btn.style.setProperty('border-style', 'none', 'important');
      btn.style.setProperty('border-color', 'transparent', 'important');
      btn.style.setProperty('border-radius', '12px', 'important');
      btn.style.setProperty('width', '100%', 'important');
      btn.style.setProperty('max-width', 'none', 'important');
      btn.style.setProperty('height', '44px', 'important');
      btn.style.setProperty('min-height', '44px', 'important');
      btn.style.setProperty('font-weight', '650', 'important');
      btn.style.setProperty('font-size', '14px', 'important');
      btn.style.setProperty('opacity', '1', 'important');
      btn.style.setProperty('--main-color', '#1677ff');
      btn.style.setProperty('--text-color', '#fff');
      btn.style.setProperty('--hover-color', '#4096ff');
      btn.style.setProperty('--hover-border-color', '#4096ff');
      btn.style.setProperty('--hover-text-color', '#fff');
      btn.style.setProperty('--hover-text-color-inverted', '#fff');
      btn.style.setProperty('--is-transparent', 'false');
    } finally {
      btn.__polemicaPainting = false;
    }

    if (btn.dataset.polemicaBtnMo === '1') return;
    btn.dataset.polemicaBtnMo = '1';
    const btnMo = new MutationObserver(() => {
      if (btn.__polemicaPainting) return;
      paintBtn(btn);
    });
    btnMo.observe(btn, { attributes: true, attributeFilter: ['style', 'class'] });
  };

  const polish = (el) => {
    if (!(el instanceof HTMLElement)) return;
    ensureCss();

    if (!isAvModal(el)) {
      el.classList.remove('polemica-av-gate');
      const old = el.querySelector('.polemica-av-gate__icon');
      if (old) old.remove();
      return;
    }

    el.classList.add('polemica-av-gate');

    const desc = el.querySelector('.description');
    if (desc instanceof HTMLElement && desc.dataset.polemicaCleaned !== '1') {
      let text = String(desc.textContent || '').replace(/\\s+/g, ' ').trim();
      text = text.replace(/обноружить/gi, 'обнаружить');
      desc.textContent = text;
      desc.dataset.polemicaCleaned = '1';
    }

    if (!el.querySelector('.polemica-av-gate__icon')) {
      const icon = document.createElement('div');
      icon.className = 'polemica-av-gate__icon';
      icon.setAttribute('aria-hidden', 'true');
      icon.innerHTML = ICON;
      el.insertBefore(icon, el.firstChild);
    }

    el.querySelectorAll('button, .button-comp').forEach(paintBtn);
  };

  const scan = () => {
    ensureCss();
    document.querySelectorAll('.common-room-modal, .common-room-modal.default-modal').forEach(polish);
  };

  const mo = new MutationObserver(() => scan());
  mo.observe(document.documentElement, {
    childList: true,
    subtree: true,
    characterData: true
  });
  scan();
  setTimeout(scan, 50);
  setTimeout(scan, 250);
  setTimeout(scan, 800);
})();
`
