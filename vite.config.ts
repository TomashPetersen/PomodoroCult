import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { crx } from '@crxjs/vite-plugin';
import chromeManifest from './manifest.json';
import firefoxManifest from './manifest.firefox';

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
  build: {
    outDir: resolvedTargetBrowser === 'firefox' ? 'dist-firefox' : 'dist',
    sourcemap: true,
    emptyOutDir: true,
    rollupOptions: {
      input:
        resolvedTargetBrowser === 'firefox'
          ? {
              popup: 'index.html'
            }
          : {
              popup: 'index.html',
              offscreen: 'offscreen.html'
            }
    }
  }
});
