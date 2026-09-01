import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'url';

export default defineConfig({
  plugins: [sveltekit()],
  resolve: {
    alias: {
      '$lib': fileURLToPath(new URL('./src/lib', import.meta.url)),
      '$app': fileURLToPath(new URL('./.svelte-kit/runtime/app', import.meta.url)),
      '$site': fileURLToPath(new URL('./js/site', import.meta.url)),
      '$config': fileURLToPath(new URL('./ts/config', import.meta.url))
    }
  },
  optimizeDeps: {
    exclude: ['@matrix-org/olm']
  },
  server: {
    port: 5173,
    strictPort: false,
    host: true
  },
  build: {
    target: 'esnext',
    sourcemap: true
  }
});
