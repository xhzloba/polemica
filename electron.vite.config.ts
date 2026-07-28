import { resolve } from 'node:path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

const sharedAlias = {
  '@shared': resolve('shared')
}

export default defineConfig({
  main: {
    resolve: { alias: sharedAlias },
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: {
          index: resolve('electron/main/index.ts')
        }
      }
    }
  },
  preload: {
    resolve: { alias: sharedAlias },
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: {
          index: resolve('electron/preload/index.ts'),
          game: resolve('electron/preload-game/index.ts')
        }
      }
    }
  },
  renderer: {
    root: resolve('src'),
    resolve: {
      alias: {
        '@renderer': resolve('src'),
        ...sharedAlias
      }
    },
    build: {
      rollupOptions: {
        input: {
          index: resolve('src/index.html')
        }
      }
    },
    plugins: [react()]
  }
})
