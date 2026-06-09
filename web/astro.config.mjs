import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://soundcheck.app',
  output: 'static',
  vite: {
    plugins: [tailwindcss()],
  },
});
