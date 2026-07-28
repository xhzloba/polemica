import type { PolemicaApi } from '@shared/ipc'

declare global {
  interface Window {
    polemica: PolemicaApi
  }
}

declare module '*.svg' {
  const src: string
  export default src
}

export {}
