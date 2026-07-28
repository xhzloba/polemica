/** Native lobby table restyle — CSS only, site JS untouched. */
export const LOBBY_UI_CSS = `
.p-play__lobby,
.p-play__lobby-table,
.p-play__lobby-table-row,
.p-play__lobby-table-header-row,
.p-play__lobby-table-cell {
  font-family:
    -apple-system,
    BlinkMacSystemFont,
    'SF Pro Text',
    'Helvetica Neue',
    Helvetica,
    Arial,
    sans-serif !important;
  -webkit-font-smoothing: antialiased !important;
  letter-spacing: -0.015em !important;
}

.p-play__lobby {
  padding: 4px 4px 12px !important;
}

.p-play__lobby-table {
  display: flex !important;
  flex-direction: column !important;
  gap: 6px !important;
  padding: 0 !important;
  margin: 0 !important;
}

.p-play__lobby-table-delimiter {
  display: none !important;
  height: 0 !important;
  margin: 0 !important;
  padding: 0 !important;
  border: 0 !important;
}

/* —— header —— */
.p-play__lobby-table-header-row {
  display: grid !important;
  grid-template-columns: minmax(0, 1.85fr) minmax(0, 1.7fr) minmax(0, 1.65fr) minmax(0, 1fr) !important;
  align-items: center !important;
  gap: 0 !important;
  width: 100% !important;
  min-height: 28px !important;
  margin: 0 0 2px !important;
  padding: 0 14px !important;
  background: transparent !important;
  border: 0 !important;
  border-radius: 0 !important;
  box-shadow: none !important;
}

.p-play__lobby-table-header-row .p-play__lobby-table-cell {
  display: flex !important;
  align-items: center !important;
  padding: 6px 0 !important;
  border: 0 !important;
  background: transparent !important;
  color: rgba(232, 238, 246, 0.4) !important;
  font-size: 11px !important;
  font-weight: 560 !important;
  letter-spacing: 0.04em !important;
  text-transform: uppercase !important;
  line-height: 1.2 !important;
}

.p-play__lobby-table-cell-twitch {
  gap: 6px !important;
  color: rgba(232, 238, 246, 0.4) !important;
}

.p-play__lobby-table-cell-twitch img {
  opacity: 0.45 !important;
  width: 11px !important;
  height: 11px !important;
}

/* —— rows —— */
.p-play__lobby-table-row {
  display: grid !important;
  grid-template-columns: minmax(0, 1.85fr) minmax(0, 1.7fr) minmax(0, 1.65fr) minmax(0, 1fr) !important;
  align-items: center !important;
  gap: 0 !important;
  width: 100% !important;
  min-height: 52px !important;
  margin: 0 !important;
  padding: 0 14px !important;
  box-sizing: border-box !important;
  background: #101418 !important;
  border: 1px solid rgba(255, 255, 255, 0.09) !important;
  border-radius: 12px !important;
  box-shadow: none !important;
  cursor: pointer !important;
  transition:
    background 0.14s ease,
    border-color 0.14s ease,
    transform 0.14s ease !important;
  overflow: visible !important;
}

.p-play__lobby-table-row:hover {
  background: rgba(200, 245, 49, 0.07) !important;
  border-color: rgba(200, 245, 49, 0.28) !important;
}

.p-play__lobby-table-row:active {
  transform: scale(0.997) !important;
}

.p-play__lobby-table-row-started {
  opacity: 0.52 !important;
  cursor: not-allowed !important;
}

.p-play__lobby-table-row-started:hover {
  background: #101418 !important;
  border-color: rgba(255, 255, 255, 0.09) !important;
  transform: none !important;
}

/* site hover chevron — drop, we use card chrome instead */
.p-play__lobby-table-row::after,
.p-play__lobby-table-row:hover::after,
.p-play__lobby-table-row:active::after {
  content: none !important;
  display: none !important;
  background: none !important;
}

.p-play__lobby-table-row .p-play__lobby-table-cell {
  display: flex !important;
  align-items: center !important;
  min-width: 0 !important;
  padding: 12px 8px 12px 0 !important;
  border: 0 !important;
  border-bottom: 0 !important;
  background: transparent !important;
  color: rgba(245, 247, 250, 0.92) !important;
  font-size: 13.5px !important;
  font-weight: 400 !important;
  line-height: 1.25 !important;
}

.p-play__lobby-table-row .p-play__lobby-table-cell:last-of-type {
  padding-right: 0 !important;
}

.p-search-lobby-name {
  gap: 8px !important;
}

.p-search-lobby-name span {
  overflow: hidden !important;
  text-overflow: ellipsis !important;
  white-space: nowrap !important;
  font-weight: 560 !important;
  color: #f5f7f2 !important;
}

.p-play__lobby-table-cell-lock {
  width: 12px !important;
  height: 12px !important;
  opacity: 0.55 !important;
  flex: 0 0 auto !important;
}

.p-search-lobby-type {
  color: rgba(200, 245, 49, 0.88) !important;
  font-weight: 500 !important;
}

.p-search-lobby-players .p-play__lobby-table-cell-players {
  display: flex !important;
  align-items: center !important;
  gap: 10px !important;
}

.p-play__lobby-table-avatars {
  display: inline-flex !important;
  align-items: center !important;
}

.p-play__lobby-table-avatars img {
  width: 22px !important;
  height: 22px !important;
  border-radius: 50% !important;
  border: 1.5px solid #0b0f14 !important;
  object-fit: cover !important;
  margin-left: -6px !important;
  background: #1a2028 !important;
}

.p-play__lobby-table-avatars img:first-child {
  margin-left: 0 !important;
}

.p-play__lobby-table--color {
  color: rgba(232, 238, 246, 0.38) !important;
}

.p-search-lobby-status {
  gap: 6px !important;
  color: rgba(232, 238, 246, 0.72) !important;
  font-size: 12.5px !important;
  font-weight: 500 !important;
}

.p-search-lobby-status img {
  display: none !important;
}

/* status accents via text match — soft pills */
.p-search-lobby-status {
  position: relative !important;
}

/* keep join button hidden (site default) but harmless if shown */
.p-play__lobby-join {
  display: none !important;
}

/* participants popover */
.p-play__participants,
.participants {
  z-index: 80 !important;
}

.participants {
  background: #12171e !important;
  border: 1px solid rgba(255, 255, 255, 0.1) !important;
  border-radius: 12px !important;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.45) !important;
  padding: 10px 12px !important;
  font-family:
    -apple-system,
    BlinkMacSystemFont,
    'SF Pro Text',
    'Helvetica Neue',
    sans-serif !important;
}

.participants-title {
  color: rgba(232, 238, 246, 0.45) !important;
  font-size: 11px !important;
  font-weight: 560 !important;
  letter-spacing: 0.04em !important;
  text-transform: uppercase !important;
}

.participants-item {
  border-radius: 8px !important;
}

.participants-name span {
  color: #f5f7f2 !important;
  font-weight: 500 !important;
}

/* pagination */
.p-play__lobby .pages,
.p-play__lobby .pagination__container,
.pagination__container {
  display: flex !important;
  justify-content: center !important;
  align-items: center !important;
  gap: 6px !important;
  margin-top: 14px !important;
  padding: 0 !important;
  background: transparent !important;
}

.pagination__page {
  min-width: 32px !important;
  height: 32px !important;
  padding: 0 10px !important;
  border-radius: 9px !important;
  border: 1px solid rgba(255, 255, 255, 0.08) !important;
  background: #101418 !important;
  color: rgba(232, 238, 246, 0.72) !important;
  font-size: 13px !important;
  font-weight: 500 !important;
  cursor: pointer !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  transition: background 0.12s ease, color 0.12s ease, border-color 0.12s ease !important;
}

.pagination__page:hover {
  background: rgba(255, 255, 255, 0.06) !important;
  color: #f5f7f2 !important;
}

.pagination__page-active,
.pagination__page.pagination__page-active {
  background: rgba(200, 245, 49, 0.16) !important;
  border-color: rgba(200, 245, 49, 0.35) !important;
  color: #c8f531 !important;
}
`
