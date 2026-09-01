import adapter from '@sveltejs/adapter-auto';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { fileURLToPath, URL } from 'url';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter(),
    alias: {
      '$lib': fileURLToPath(new URL('../src/lib', import.meta.url)),
      '$site': fileURLToPath(new URL('../js/site', import.meta.url)),
      '$config': fileURLToPath(new URL('../ts/config', import.meta.url))
    },
    files: {
      routes: 'src/routes',
      lib: 'src/lib'
    }
  }
};

export default config;
