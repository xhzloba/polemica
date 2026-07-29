import type { ThemeConfig } from 'antd'
import { theme } from 'antd'

/** Dark shell + vivid Ant Design blue (not gray-washed darkAlgorithm defaults). */
export const polemicaAntdTheme: ThemeConfig = {
  algorithm: theme.darkAlgorithm,
  token: {
    colorBgBase: '#0b0f14',
    colorBgContainer: '#121820',
    colorBgElevated: '#182230',
    colorBgLayout: '#0b0f14',
    colorPrimary: '#1677ff',
    colorPrimaryHover: '#4096ff',
    colorPrimaryActive: '#0958d9',
    colorPrimaryBg: 'rgba(22, 119, 255, 0.22)',
    colorPrimaryBgHover: 'rgba(22, 119, 255, 0.32)',
    colorPrimaryBorder: '#1677ff',
    colorPrimaryBorderHover: '#4096ff',
    colorInfo: '#1677ff',
    colorLink: '#69b1ff',
    colorLinkHover: '#91caff',
    colorText: 'rgba(255, 255, 255, 0.92)',
    colorTextSecondary: 'rgba(255, 255, 255, 0.68)',
    colorTextTertiary: 'rgba(255, 255, 255, 0.5)',
    colorBorder: 'rgba(22, 119, 255, 0.22)',
    colorBorderSecondary: 'rgba(255, 255, 255, 0.1)',
    colorBgTextHover: 'rgba(22, 119, 255, 0.14)',
    colorBgTextActive: 'rgba(22, 119, 255, 0.22)',
    borderRadius: 6,
    fontSize: 13,
    controlHeight: 32,
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
  },
  components: {
    Button: {
      primaryShadow: 'none',
      defaultShadow: 'none',
      dangerShadow: 'none',
      colorPrimary: '#1677ff',
      colorPrimaryHover: '#4096ff',
      colorPrimaryActive: '#0958d9'
    },
    Menu: {
      darkItemBg: 'transparent',
      darkSubMenuItemBg: 'transparent',
      itemBg: 'transparent',
      itemColor: 'rgba(255, 255, 255, 0.78)',
      itemHoverColor: '#fff',
      itemHoverBg: 'rgba(22, 119, 255, 0.14)',
      itemSelectedBg: 'rgba(22, 119, 255, 0.22)',
      itemSelectedColor: '#69b1ff',
      activeBarBorderWidth: 0
    },
    Tabs: {
      inkBarColor: '#1677ff',
      itemSelectedColor: '#1677ff',
      itemHoverColor: '#4096ff',
      itemColor: 'rgba(255, 255, 255, 0.55)',
      titleFontSize: 13,
      horizontalItemPadding: '8px 14px',
      horizontalMargin: '0'
    },
    Checkbox: {
      colorPrimary: '#1677ff',
      colorPrimaryHover: '#4096ff'
    },
    Switch: {
      colorPrimary: '#1677ff',
      colorPrimaryHover: '#4096ff'
    },
    Table: {
      headerBg: '#152033',
      headerColor: 'rgba(255, 255, 255, 0.75)',
      rowHoverBg: 'rgba(22, 119, 255, 0.18)',
      borderColor: 'rgba(22, 119, 255, 0.2)',
      headerBorderRadius: 0
    },
    Input: {
      activeBorderColor: '#1677ff',
      hoverBorderColor: '#4096ff',
      activeShadow: '0 0 0 2px rgba(22, 119, 255, 0.25)',
      errorActiveShadow: 'none',
      warningActiveShadow: 'none'
    },
    Badge: {
      colorBgContainer: '#1677ff'
    }
  }
}
