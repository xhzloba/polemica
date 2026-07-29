# Polemica Client Architecture

Unofficial Electron shell that keeps the application's native chrome separate from the
embedded `polemicagame.com` page.

## Runtime boundaries

```text
React renderer (window chrome)
  ↕ typed contextBridge API
Electron main process (state, lifecycle, IPC)
  ↕ controlled WebContents APIs
Game WebContentsView (polemicagame.com)
  ↕ preload + registered page patches
Site DOM / Vue application
```

### Renderer

- `src/App.tsx` selects the auth phase.
- Hooks under `src/hooks/` mirror state owned by the main process.
- `ChromeBar` owns titlebar composition and passes already-subscribed state to descendants.
- Components call only the typed API exposed as `window.polemica`.

The renderer must not scrape or mutate the embedded site's DOM.

### Main process

- `electron/main/auth/authService.ts` owns the auth phase and game-view layout.
- `electron/main/views/GameBrowserView.ts` owns the single embedded `WebContentsView`.
- `live`, `ban`, and `search` services own their respective polling state.
- `electron/main/ipc/registerHandlers.ts` maps the shared IPC contract to main-process actions.

Window-bound services must be disposed before the game view is detached. Polling start/stop
operations must remain idempotent so macOS window close/reopen cannot leave stale timers.

### Preload boundaries

- `electron/preload/index.ts` is the only bridge available to the React renderer.
- `electron/preload-game/index.ts` runs at document start in the game view. It may install
  the anti-flash loader and early CSS, but it must not expose Node or IPC to the site.
- Shared IPC types live in `shared/ipc.ts`; changes to channels and `PolemicaApi` are made
  together.

## Site customization pipeline

1. Game preload installs the earliest anti-flash/background protection.
2. `electron/injection/registry.ts` selects CSS and page-world scripts for the current URL.
3. `electron/main/injection/applyInjections.ts` serializes application per `WebContents`.
4. A navigation generation token prevents work from an old document from touching the new one.
5. Inserted CSS is tracked and removed on full navigation before route-appropriate styles apply.

### Rules for page-world scripts

- Files such as `shared/lobbyAccordionJs.ts` export plain JavaScript strings. TypeScript syntax
  inside those strings is invalid at runtime.
- Every script must be idempotent and use a page-world guard when it installs observers/listeners.
- DOM reads and actions stay separate where possible.
- Prefer stable DOM selectors; Vue 2 internals (`__vue__`, `$children`) are a fallback contract,
  not a general application API.
- Add each script to the registry syntax test. `npm test` compiles all registered page scripts.

### Rules for CSS patches

- Shared visual patches belong in `shared/*Css.ts`.
- Route matching belongs in the injection registry.
- Do not add another independent CSS injection path.
- Keep the preload CSS limited to anti-flash rules until the duplicated legacy bundle can be
  consolidated under visual regression coverage.

## Verification

Run before handing off changes:

```bash
npm test
npm run typecheck
npm run build
```

Manual smoke coverage:

- splash → login/resume → greeting → app
- refresh on `Играть` with rows and with an empty lobby
- menu open/close and lobby tab switching
- search → accept → launching → in-game actions on other pages
- cancel/continue/quit actions
- close and reopen the window on macOS

## Deferred refactors

These are valuable but intentionally separate from safety hardening:

- consolidate duplicated preload/registry CSS after adding screenshot coverage
- replace repeated Vue tree walks with a versioned page bridge
- split `SearchBanner` by phase after component tests exist
- consider a renderer state provider if more consumers appear
- evaluate `sandbox: true` for the game view only in an isolated compatibility branch

