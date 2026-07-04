import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { crx } from '@crxjs/vite-plugin';
import chromeManifest from './manifest.json';
import firefoxManifest from './manifest.firefox';
import packageJson from './package.json';

const runtimeEnv = (globalThis as typeof globalThis & {
  process?: { env?: Record<string, string | undefined> };
}).process?.env;

const resolvedTargetBrowser =
  runtimeEnv?.TARGET_BROWSER === 'firefox' || runtimeEnv?.npm_lifecycle_event === 'build:firefox'
    ? 'firefox'
    : 'chrome';
const manifest = resolvedTargetBrowser === 'firefox' ? firefoxManifest : chromeManifest;

export default defineConfig({
  plugins: [react(), crx({ manifest: manifest as never })],
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version)
  },
  build: {
    outDir: resolvedTargetBrowser === 'firefox' ? 'dist-firefox' : 'dist',
    sourcemap: true,
    emptyOutDir: true,
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
        hashCharacters: 'hex'
      },
      input:
        resolvedTargetBrowser === 'firefox'
          ? {
              popup: 'index.html',
              app: 'app.html',
              background: 'background-firefox.html'
            }
          : {
              popup: 'index.html',
              offscreen: 'offscreen.html'
            }
    }
  }
});
