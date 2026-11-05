export type CacheReading = {
  /** Share of the last turn's input served from the prompt cache, 0 to 1. */
  hitRatio: number
  readTokens: number
  wroteTokens: number
  /** Everything the last turn sent: what a cold re-send would write again. */
  contextTokens: number
  /** Epoch ms the turn ended. */
  at: number
}

declare module 'claude-code' {
  interface PluginState {
    'andliu-kit': {
      frame: number
      role: string
      tools: number
      startedAt: number
      isHidden: boolean
      cache: CacheReading | null
    }
  }
}
