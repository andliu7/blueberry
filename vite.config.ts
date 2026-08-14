import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  base: './',

  /**
   * Ketcher reads `process.env` at runtime, and `process` does not exist in a
   * browser. Vite makes no attempt to shim it — that was a webpack convention —
   * so without this the drawing route throws `ReferenceError: process is not
   * defined` the moment it loads, React unmounts the tree, and you get a blank
   * page with nothing in the console pointing at the cause.
   *
   * Copied from `mechanism_trainer/vite.config.ts`, whose note says it was
   * found by running it rather than by reading about it. Bringing
   * `MoleculeCanvas` across without this line reproduced the same failure here,
   * which is fair warning that the two files are a pair.
   *
   * This is the single most likely thing to break when Ketcher is upgraded.
   */
  define: {
    global: 'globalThis',
    'process.env': JSON.stringify({ NODE_ENV: mode }),
  },

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
}))
