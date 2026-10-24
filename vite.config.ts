import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

/**
 * Writes dist/budget-subjects.json, the contract the budget validators read
 * (packages/validators/src/measure/subject.ts). It names which emitted chunks a
 * cold load of #/app fetches, so the 400 KB game route budget is weighed off the
 * build's own chunk graph instead of a guessed filename.
 *
 * A cold #/app load is the site entry plus the lazy chunks that fire on mount
 * for the first game screen: the GamePage route and the default Path tab. They
 * are named here by source module; Rollup resolves each to its hashed chunk.
 * The validator walks static imports from each and weighs the union. CSS is
 * listed separately because a <link> tag is not an import a walker can follow.
 *
 * ChestSheet is the day's first open: App.tsx claims the daily gift on mount
 * and the gift arrives in this sheet, so once a day #/app fetches it before
 * the student presses anything. The budget holds on that open too, so it is
 * weighed on every one (a headless cold load, 22 Oct: 401.0 KB on the first
 * open of a day, 398.5 KB after).
 */
const GAME_ROUTE_COLD_LOAD_MODULES = [
  'src/components/GamePage.tsx',
  'src/game/tabs/pathway/PathwayTab.tsx',
  'src/game/chest/ChestSheet.tsx',
]

/**
 * Modules whose own dynamic imports fire on mount of #/app, not on a press.
 * Every chunk they import dynamically is weighed as part of the cold load too,
 * because a headless cold load of #/app fetches it (validator finding,
 * 2026-10-20: leaving these out reported 341 KB for a load that was 432 KB).
 *
 * - src/components/ui/blueberry-loader.tsx: the loader imports its tip list
 *   when it appears, and it appears over #/app on a cold open.
 * - src/lib/supabase.ts: since G1 (owner, 23 Oct) the game renders only for a
 *   signed-in visitor (src/components/AppGate.tsx). A signed-in visitor has a
 *   stored session, and AuthProvider loads supabase-js on mount whenever one is
 *   stored (supabaseAuthToRestore), so every open that reaches the game fetches
 *   it. A signed-out open never reaches the game; it lands on #/signin.
 *
 * src/lib/useDecks.ts is not listed: its built-in decks chunk loads only on
 * pages that read deck data, and #/app is not one of them. If a component the
 * game draws starts calling useDecks(), add it here, or the number lies again.
 */
const GAME_ROUTE_ON_MOUNT_DYNAMIC_IMPORTERS = [
  'src/components/ui/blueberry-loader.tsx',
  'src/lib/supabase.ts',
]

function budgetSubjects(): Plugin {
  return {
    name: 'blueberry-budget-subjects',
    apply: 'build',
    generateBundle(_options, bundle) {
      const chunks = Object.values(bundle).filter((file) => file.type === 'chunk')
      const byFile = new Map(chunks.map((chunk) => [chunk.fileName, chunk]))
      const entry = chunks.find((chunk) => chunk.isEntry)
      if (!entry) this.error('budget-subjects: no entry chunk in the bundle')

      const routeChunks = GAME_ROUTE_COLD_LOAD_MODULES.map((module) => {
        const absolute = path.resolve(import.meta.dirname, module)
        const chunk = chunks.find(
          (candidate) => candidate.facadeModuleId !== null && path.resolve(candidate.facadeModuleId) === absolute,
        )
        if (!chunk) this.error(`budget-subjects: no chunk has ${module} as its facade module`)
        return chunk.fileName
      })

      for (const module of GAME_ROUTE_ON_MOUNT_DYNAMIC_IMPORTERS) {
        const absolute = path.resolve(import.meta.dirname, module)
        const id = [...this.getModuleIds()].find((candidate) => path.resolve(candidate) === absolute)
        const info = id === undefined ? null : this.getModuleInfo(id)
        if (!info) this.error(`budget-subjects: ${module} is not in the build`)
        if (info.dynamicallyImportedIds.length === 0) {
          this.error(`budget-subjects: ${module} has no dynamic import to weigh`)
        }
        for (const target of info.dynamicallyImportedIds) {
          // The chunk the browser fetches for this import: the one built around
          // it if there is one, otherwise whichever chunk the bundler put it in.
          const wanted = path.resolve(target)
          const chunk =
            chunks.find((candidate) => candidate.facadeModuleId !== null && path.resolve(candidate.facadeModuleId) === wanted) ??
            chunks.find((candidate) => candidate.moduleIds.some((moduleId) => path.resolve(moduleId) === wanted))
          if (!chunk) this.error(`budget-subjects: no chunk for ${target}, imported on mount by ${module}`)
          if (!routeChunks.includes(chunk.fileName)) routeChunks.push(chunk.fileName)
        }
      }

      // Stylesheets of every chunk statically reachable from the roots.
      const css = new Set<string>()
      const seen = new Set<string>()
      const queue = [entry.fileName, ...routeChunks]
      while (queue.length > 0) {
        const chunk = byFile.get(queue.shift()!)
        if (!chunk || seen.has(chunk.fileName)) continue
        seen.add(chunk.fileName)
        for (const sheet of chunk.viteMetadata?.importedCss ?? []) css.add(sheet)
        queue.push(...chunk.imports)
      }

      const lazyChunks = chunks
        .filter((chunk) => chunk.moduleIds.some((id) => /[\\/]node_modules[\\/]ketcher-/.test(id)))
        .map((chunk) => chunk.fileName)

      this.emitFile({
        type: 'asset',
        fileName: 'budget-subjects.json',
        source: JSON.stringify(
          { gameRouteEntry: entry.fileName, routeChunks, lazyChunks, additionalInitialAssets: [...css] },
          null,
          2,
        ),
      })
    },
  }
}

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
  plugins: [react(), tailwindcss(), budgetSubjects()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
}))
