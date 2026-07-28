import { BrowserWindow, Menu, type MenuItemConstructorOptions } from 'electron'

export type ProfileMenuChoice = 'profile' | 'settings' | 'logout' | null

export function popupProfileMenu(
  win: BrowserWindow,
  point?: { x: number; y: number; width?: number; height?: number }
): Promise<ProfileMenuChoice> {
  return new Promise((resolve) => {
    let settled = false
    const finish = (value: ProfileMenuChoice): void => {
      if (settled) return
      settled = true
      resolve(value)
    }

    const template: MenuItemConstructorOptions[] = [
      {
        label: 'Профиль',
        click: () => finish('profile')
      },
      {
        label: 'Настройки',
        click: () => finish('settings')
      },
      { type: 'separator' },
      {
        label: 'Выйти',
        click: () => finish('logout')
      }
    ]

    const menu = Menu.buildFromTemplate(template)
    menu.popup({
      window: win,
      x: point ? Math.round(point.x) : undefined,
      y: point ? Math.round(point.y) : undefined,
      callback: () => finish(null)
    })
  })
}
