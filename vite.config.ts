import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  base: './',
  /**
   * Pinned, and pinned loudly.
   *
   * Google Identity Services matches the page's origin against the OAuth
   * client's authorised list exactly, port included, and that list holds
   * `http://localhost:5173`. Vite's default is to shrug when a port is busy and
   * take the next free one, so a stray dev server left running on 5173 quietly
   * moved the site to 5176 and sign-in started failing on an origin Google had
   * never heard of.
   *
   * `strictPort` turns that into an error on startup, which names the problem
   * instead of hiding it behind a broken sign-in half an hour later.
   */
  server: { port: 5173, strictPort: true },
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
})
