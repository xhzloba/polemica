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

.polemica-lobby-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  width: 100%;
  padding: 24px 14px;
  margin: 0;
  border-radius: 0;
  background: #121820;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-top: 0;
  color: rgba(255, 255, 255, 0.55);
  font-size: 14px;
  font-weight: 400;
  box-sizing: border-box;
}

.p-play__lobby {
  padding: 28px 4px 14px !important;
}

.polemica-lobby-filters {
  display: none !important;
}

.p-play__lobby-table-row.polemica-lobby-row--filtered,
.polemica-lobby-row--filtered {
  display: none !important;
}

.p-play__lobby-table {
  display: flex !important;
  flex-direction: column !important;
  gap: 0 !important;
  padding: 0 !important;
  margin: 0 !important;
  border: 1px solid rgba(255, 255, 255, 0.08) !important;
  border-radius: 8px !important;
  overflow: hidden !important;
  background: #121820 !important;
  box-shadow: none !important;
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
  min-height: 40px !important;
  margin: 0 !important;
  padding: 0 16px !important;
  background: transparent !important;
  border: 0 !important;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08) !important;
  border-radius: 0 !important;
  box-shadow: none !important;
}

.p-play__lobby-table-header-row .p-play__lobby-table-cell {
  display: flex !important;
  align-items: center !important;
  padding: 10px 8px 10px 0 !important;
  border: 0 !important;
  background: transparent !important;
  color: rgba(255, 255, 255, 0.45) !important;
  font-size: 12px !important;
  font-weight: 500 !important;
  letter-spacing: 0.02em !important;
  text-transform: none !important;
  line-height: 1.2 !important;
}

.p-play__lobby-table-cell-twitch {
  gap: 5px !important;
  color: rgba(255, 255, 255, 0.45) !important;
}

.p-play__lobby-table-cell-twitch img {
  opacity: 0.45 !important;
  width: 10px !important;
  height: 10px !important;
}

/* —— rows (antd Table tbody) —— */
.p-play__lobby-table-row {
  display: grid !important;
  grid-template-columns: minmax(0, 1.85fr) minmax(0, 1.7fr) minmax(0, 1.65fr) minmax(0, 1fr) !important;
  align-items: center !important;
  gap: 0 !important;
  width: 100% !important;
  min-height: 48px !important;
  margin: 0 !important;
  padding: 0 16px !important;
  box-sizing: border-box !important;
  background: #121820 !important;
  border: 0 !important;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06) !important;
  border-radius: 0 !important;
  box-shadow: none !important;
  cursor: pointer !important;
  transition: background 0.2s ease !important;
  overflow: visible !important;
}

.p-play__lobby-table-row:last-child {
  border-bottom: 0 !important;
}

.p-play__lobby-table-row:hover {
  background: rgba(255, 255, 255, 0.04) !important;
}

/* live Twitch in room — same purple as expand player --live */
.p-play__lobby-table-row.polemica-lobby-row--live {
  background: rgba(145, 70, 255, 0.1) !important;
  border-color: rgba(145, 70, 255, 0.32) !important;
}

.p-play__lobby-table-row.polemica-lobby-row--live:hover {
  background: rgba(145, 70, 255, 0.16) !important;
  border-color: rgba(145, 70, 255, 0.45) !important;
}

.p-play__lobby-table-row.polemica-lobby-row--live .p-play__lobby-table-avatars img {
  border-color: rgba(145, 70, 255, 0.35) !important;
}

.p-play__lobby-table-row:active {
  transform: scale(0.997) !important;
}

.p-play__lobby-table-row-started {
  opacity: 1 !important;
  cursor: pointer !important;
  filter: none !important;
}

.p-play__lobby-table-row-started .p-search-lobby-status {
  color: rgba(232, 238, 246, 0.5) !important;
}

.p-play__lobby-table-row-started:hover {
  background: rgba(255, 255, 255, 0.04) !important;
  transform: none !important;
}

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
  padding: 8px 8px 8px 0 !important;
  border: 0 !important;
  border-bottom: 0 !important;
  background: transparent !important;
  color: rgba(245, 247, 250, 0.9) !important;
  font-size: 13.5px !important;
  font-weight: 400 !important;
  line-height: 1.2 !important;
}

.p-play__lobby-table-row .p-play__lobby-table-cell:last-of-type {
  padding-right: 0 !important;
}

.p-search-lobby-name {
  gap: 6px !important;
}

.p-search-lobby-name span {
  overflow: hidden !important;
  text-overflow: ellipsis !important;
  white-space: nowrap !important;
  font-weight: 600 !important;
  font-size: 13.5px !important;
  color: #f5f7f2 !important;
}

.p-play__lobby-table-cell-lock {
  width: 11px !important;
  height: 11px !important;
  opacity: 0.55 !important;
  flex: 0 0 auto !important;
}

.p-search-lobby-type {
  color: rgba(255, 255, 255, 0.62) !important;
  font-weight: 500 !important;
  font-size: 13px !important;
}

.p-search-lobby-players .p-play__lobby-table-cell-players {
  display: flex !important;
  align-items: center !important;
  gap: 8px !important;
}

.p-play__lobby-table-avatars {
  display: inline-flex !important;
  align-items: center !important;
}

.p-play__lobby-table-avatars img {
  width: 26px !important;
  height: 26px !important;
  border-radius: 50% !important;
  border: 1.5px solid #121820 !important;
  object-fit: cover !important;
  margin-left: -7px !important;
  background: #1a2028 !important;
}

.p-play__lobby-table-avatars img:first-child {
  margin-left: 0 !important;
}

.p-play__lobby-table--color {
  color: rgba(232, 238, 246, 0.36) !important;
  font-size: 12.5px !important;
}

.p-search-lobby-status {
  gap: 5px !important;
  color: rgba(232, 238, 246, 0.68) !important;
  font-size: 12.5px !important;
  font-weight: 500 !important;
}

.p-search-lobby-status img {
  display: none !important;
}

.p-search-lobby-status {
  position: relative !important;
}

.p-play__lobby-join {
  display: none !important;
}

.p-play__participants {
  display: none !important;
  visibility: hidden !important;
  pointer-events: none !important;
  opacity: 0 !important;
}

/* —— open row: blue header + left accent; expand panel keeps app bg —— */
.p-play__lobby-table-row.polemica-lobby-row--open {
  grid-template-rows: auto auto !important;
  align-items: stretch !important;
  padding: 0 16px 0 13px !important;
  padding-bottom: 0 !important;
  background: rgba(22, 119, 255, 0.16) !important;
  border-left: 3px solid #1677ff !important;
  box-shadow: none !important;
  overflow: hidden !important;
}

.p-play__lobby-table-row.polemica-lobby-row--live.polemica-lobby-row--open {
  border-color: transparent !important;
  border-left: 3px solid #1677ff !important;
  background: rgba(22, 119, 255, 0.16) !important;
  box-shadow: none !important;
}

.polemica-lobby-expand {
  grid-column: 1 / -1 !important;
  display: flex !important;
  flex-direction: column !important;
  gap: 0 !important;
  margin: 0 -16px 0 -13px !important;
  padding: 0 !important;
  border-radius: 0 0 10px 10px !important;
  border: 0 !important;
  border-top: 1px solid rgba(255, 255, 255, 0.07) !important;
  background: #0b0f14 !important;
  box-shadow: none !important;
  box-sizing: border-box !important;
  font-family:
    -apple-system,
    BlinkMacSystemFont,
    'SF Pro Text',
    'Helvetica Neue',
    Helvetica,
    Arial,
    sans-serif !important;
  -webkit-font-smoothing: antialiased !important;
  animation: polemica-lobby-expand-in 0.18s ease-out !important;
}

@keyframes polemica-lobby-expand-in {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.polemica-lobby-expand__toolbar {
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  gap: 10px !important;
  padding: 12px 16px 6px !important;
}

.polemica-lobby-expand__title {
  color: rgba(255, 255, 255, 0.45) !important;
  font-size: 12px !important;
  font-weight: 500 !important;
  letter-spacing: 0 !important;
  text-transform: none !important;
}

.polemica-lobby-expand__list {
  display: flex !important;
  flex-direction: column !important;
  gap: 0 !important;
  padding: 0 12px 8px !important;
  max-height: min(48vh, 420px) !important;
  overflow: auto !important;
}

.polemica-lobby-expand__player {
  display: flex !important;
  align-items: center !important;
  gap: 10px !important;
  margin: 0 !important;
  padding: 8px 4px !important;
  min-width: 0 !important;
  border: 0 !important;
  border-radius: 6px !important;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06) !important;
  background: transparent !important;
  box-sizing: border-box !important;
  color: rgba(255, 255, 255, 0.88) !important;
  text-decoration: none !important;
  transition:
    color 0.12s ease,
    background 0.12s ease,
    border-color 0.12s ease !important;
}

.polemica-lobby-expand__player:last-child {
  border-bottom-color: transparent !important;
}

.polemica-lobby-expand__player:hover {
  background: rgba(22, 119, 255, 0.08) !important;
  border-bottom-color: transparent !important;
  text-decoration: none !important;
  color: #69b1ff !important;
}

.polemica-lobby-expand__player:hover .polemica-lobby-expand__name {
  color: #69b1ff !important;
}

.polemica-lobby-expand__player--quit {
  opacity: 0.4 !important;
  background: transparent !important;
}

.polemica-lobby-expand__player--live {
  background: transparent !important;
  border-bottom-color: rgba(255, 255, 255, 0.06) !important;
}

.polemica-lobby-expand__player--live:hover {
  background: rgba(145, 70, 255, 0.1) !important;
  border-bottom-color: transparent !important;
  color: #c4a0ff !important;
}

.polemica-lobby-expand__player--live:hover .polemica-lobby-expand__name {
  color: #c4a0ff !important;
}

.polemica-lobby-expand__player--live .polemica-lobby-expand__avatar {
  border-color: rgba(145, 70, 255, 0.65) !important;
  box-shadow: 0 0 0 1px rgba(145, 70, 255, 0.25) !important;
}

.polemica-lobby-expand__player--live .polemica-lobby-expand__name {
  color: #d4b8ff !important;
}

.polemica-lobby-expand__avatar {
  width: 28px !important;
  height: 28px !important;
  flex: 0 0 28px !important;
  border-radius: 50% !important;
  border: 1px solid rgba(255, 255, 255, 0.12) !important;
  object-fit: cover !important;
  background: transparent !important;
}

.polemica-lobby-expand__avatar--empty {
  display: inline-block !important;
}

.polemica-lobby-expand__meta {
  display: flex !important;
  flex-direction: column !important;
  gap: 1px !important;
  min-width: 0 !important;
  flex: 1 1 auto !important;
}

.polemica-lobby-expand__name-row {
  display: flex !important;
  align-items: center !important;
  gap: 4px !important;
  min-width: 0 !important;
}

.polemica-lobby-expand__name {
  overflow: hidden !important;
  text-overflow: ellipsis !important;
  white-space: nowrap !important;
  font-size: 13px !important;
  font-weight: 500 !important;
  letter-spacing: -0.01em !important;
  line-height: 1.25 !important;
  min-width: 0 !important;
  color: inherit !important;
}

.polemica-lobby-expand__mark {
  flex: 0 0 auto !important;
  display: block !important;
  object-fit: contain !important;
}

.polemica-lobby-expand__mark--prime {
  width: 13px !important;
  height: 13px !important;
}

.polemica-lobby-expand__mark--sub {
  width: 12px !important;
  height: 13px !important;
}

.polemica-lobby-expand__mark--twitch {
  width: 12px !important;
  height: 12px !important;
  border-radius: 3px !important;
  cursor: pointer !important;
  opacity: 0.55 !important;
}

.polemica-lobby-expand__mark--twitch-live {
  opacity: 1 !important;
  box-shadow: 0 0 0 1px rgba(145, 70, 255, 0.45) !important;
}

.polemica-lobby-expand__mmr {
  display: inline-flex !important;
  align-items: center !important;
  gap: 3px !important;
  flex: 0 0 auto !important;
  margin-left: 2px !important;
}

.polemica-lobby-expand__mmr-icon {
  width: 14px !important;
  height: 14px !important;
  flex: 0 0 14px !important;
  display: block !important;
  object-fit: contain !important;
}

.polemica-lobby-expand__mmr-text {
  font-size: 11px !important;
  font-weight: 700 !important;
  font-variant-numeric: tabular-nums !important;
  letter-spacing: -0.02em !important;
  line-height: 1 !important;
}

.polemica-lobby-expand__mmr-text--white {
  background: linear-gradient(180deg, #f5f7f2 0%, #9aa3ad 100%) !important;
  -webkit-background-clip: text !important;
  background-clip: text !important;
  color: transparent !important;
}

.polemica-lobby-expand__mmr-text--green {
  background: linear-gradient(180deg, #e8ff8a 0%, #c8f531 100%) !important;
  -webkit-background-clip: text !important;
  background-clip: text !important;
  color: transparent !important;
}

.polemica-lobby-expand__mmr-text--yellow {
  background: linear-gradient(180deg, #ffe58a 0%, #ffd71b 100%) !important;
  -webkit-background-clip: text !important;
  background-clip: text !important;
  color: transparent !important;
}

.polemica-lobby-expand__mmr-text--orange {
  background: linear-gradient(180deg, #ffc49a 0%, #fb8b5a 100%) !important;
  -webkit-background-clip: text !important;
  background-clip: text !important;
  color: transparent !important;
}

.polemica-lobby-expand__mmr-text--red,
.polemica-lobby-expand__mmr-text--purple {
  background: linear-gradient(90deg, #fb5a5f 0%, #c65ef6 100%) !important;
  -webkit-background-clip: text !important;
  background-clip: text !important;
  color: transparent !important;
}

.polemica-lobby-expand__section {
  margin: 10px 0 0 !important;
  padding: 10px 4px 6px !important;
  color: rgba(255, 255, 255, 0.4) !important;
  font-size: 12px !important;
  font-weight: 500 !important;
  letter-spacing: 0 !important;
  text-transform: none !important;
  border-top: 1px solid rgba(255, 255, 255, 0.06) !important;
}

.polemica-lobby-expand__empty {
  padding: 16px 4px !important;
  color: rgba(255, 255, 255, 0.42) !important;
  font-size: 13px !important;
  text-align: center !important;
}

.polemica-lobby-expand__foot {
  display: flex !important;
  align-items: center !important;
  padding: 8px 12px 12px !important;
  border-top: 1px solid rgba(255, 255, 255, 0.06) !important;
  background: rgba(0, 0, 0, 0.18) !important;
}

.polemica-lobby-expand__join {
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  width: 100% !important;
  height: 32px !important;
  margin: 0 !important;
  padding: 0 16px !important;
  border: 0 !important;
  border-radius: 6px !important;
  background: #1677ff !important;
  color: #fff !important;
  font-size: 14px !important;
  font-weight: 400 !important;
  letter-spacing: 0 !important;
  cursor: pointer !important;
  white-space: nowrap !important;
  transition: background 0.2s ease, opacity 0.12s ease !important;
}

.polemica-lobby-expand__join:hover:not(:disabled) {
  background: #4096ff !important;
}

.polemica-lobby-expand__join:active:not(:disabled) {
  transform: scale(0.99) !important;
}

.polemica-lobby-expand__join:disabled {
  opacity: 0.38 !important;
  cursor: default !important;
  filter: none !important;
}

/* pagination — hidden; client loads full list via lobby-unpaginate */
.p-play__lobby .pages,
.p-play__lobby .pagination__container,
.pagination__container,
.pages,
.pagination__page {
  display: none !important;
  visibility: hidden !important;
  height: 0 !important;
  max-height: 0 !important;
  margin: 0 !important;
  padding: 0 !important;
  overflow: hidden !important;
  pointer-events: none !important;
}
`
