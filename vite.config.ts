import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Relative asset URLs: the same build works at the root of a server (Docker, a custom domain)
  // and under a sub-path such as GitHub Pages' /<repo>/, so no repo name is baked in.
  // Safe because the app has a single page and keeps its state in the query string, not the path.
  base: './',
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    // Tests read clocks in Taipei, whatever machine runs them (CI runs in UTC).
    env: { TZ: 'Asia/Taipei' },
    css: false,
  },
});
