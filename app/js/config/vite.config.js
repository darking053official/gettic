import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [sveltekit()],
  optimizeDeps: {
    exclude: ['@matrix-org/olm']
  },
  server: {
    port: 5173,
    strictPort: false
  }
});
