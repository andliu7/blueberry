import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { CacheReading } from '../types'

// Blueberry palette, from documentation/STATUS.md: --bb-primary at night, ink in light.
const PRIMARY = '#6d5ae0'
const INK = '#472ab4'

// The cache is cold after this long idle. The guide: about an hour on a
// subscription, five minutes on an API key. An estimate, not a reading.
const COLD_AFTER_MS = 60 * 60 * 1000

const TICK_MS = 450
const IDLE_REFRESH_TICKS = 66

const frame = atom({ plugin: 'andliu-kit', key: 'frame' } as const, 0)
const role = atom({ plugin: 'andliu-kit', key: 'role' } as const, 'thinker')
const tools = atom({ plugin: 'andliu-kit', key: 'tools' } as const, 0)
const startedAt = atom({ plugin: 'andliu-kit', key: 'startedAt' } as const, 0)
const isHidden = atom({ plugin: 'andliu-kit', key: 'isHidden' } as const, false)
const cache = atom({ plugin: 'andliu-kit', key: 'cache' } as const, null)

const EYES: Record<string, string> = {
  scout: 'o_o',
  builder: '^_^',
  engineer: '>_<',
  captain: 'O_O',
  thinker: '-_-',
}

const ROLE_OF_TOOL: Record<string, string> = {
  Read: 'scout',
  Grep: 'scout',
  Glob: 'scout',
  WebFetch: 'scout',
  WebSearch: 'scout',
  Edit: 'builder',
  Write: 'builder',
  NotebookEdit: 'builder',
  Bash: 'engineer',
  Agent: 'captain',
  Task: 'captain',
}

export const crab = (who: string, step: number): string => {
  const eyes = EYES[who] ?? EYES.thinker
  return step % 2 === 0 ? `\\(${eyes})/` : `/(${eyes})\\`
}

/** Left-to-right-and-back position on a track of `width` cells. */
export const crabPosition = (step: number, width: number): number => {
  if (width <= 0) return 0
  const period = width * 2
  const at = step % period
  return at <= width ? at : period - at
}

export const meter = (ratio: number, cells = 8): string => {
  const filled = Math.max(0, Math.min(cells, Math.round(ratio * cells)))
  return '▰'.repeat(filled) + '▱'.repeat(cells - filled)
}

export const compact = (n: number): string =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}m` : n >= 1000 ? `${Math.round(n / 1000)}k` : `${n}`

export const minutes = (ms: number): string => {
  const m = Math.floor(ms / 60_000)
  return m < 1 ? '<1m' : m < 60 ? `${m}m` : `${Math.floor(m / 60)}h${m % 60 ? ` ${m % 60}m` : ''}`
}

export const register: Register = on => {
  let isWorking = false
  let ticks = 0

  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'andliu',
      description: 'Show or hide the andliu crab band',
    })
    $.clock.every(TICK_MS, () => {
      ticks += 1
      if (isWorking || ticks % IDLE_REFRESH_TICKS === 0) {
        void update($, frame, n => n + 1)
      }
    })

    return next(e)
  })

  on('command.run', { command: 'andliu' }, async $ => {
    await update($, isHidden, h => !h)
    const hidden = await read($, isHidden)

    return { text: hidden ? 'andliu band hidden.' : 'andliu band shown.' }
  })

  on('prompt.submit', async ($, e, next) => {
    isWorking = true
    const began = await $.clock.now()
    await update($, startedAt, () => began)
    await update($, tools, () => 0)
    await update($, role, () => 'thinker')

    return next(e)
  })

  on('tool.call', async ($, e, next) => {
    await update($, tools, n => n + 1)
    await update($, role, () => ROLE_OF_TOOL[String(e.tool)] ?? 'engineer')

    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    if (e.agentId === undefined) {
      isWorking = false
      const u = e.usage
      if (u !== undefined) {
        const context =
          u.input_tokens + u.cache_read_input_tokens + u.cache_creation_input_tokens
        const reading: CacheReading = {
          hitRatio: context === 0 ? 0 : u.cache_read_input_tokens / context,
          readTokens: u.cache_read_input_tokens,
          wroteTokens: u.cache_creation_input_tokens,
          contextTokens: context,
          at: await $.clock.now(),
        }
        await update($, cache, () => reading)
      }
    }

    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey || (await read($, isHidden))) return next(e)

    const reading = await read($, cache)
    if (!e.props.isWorking && reading === null) return next(e)

    const { Box, Text } = $.ui.resolve(e)
    const now = await $.clock.now()
    const step = await read($, frame)
    const who = await read($, role)
    const began = await read($, startedAt)
    const count = await read($, tools)
    const width = Math.max(6, Math.min(24, e.props.bodyColumns - 44))
    const at = crabPosition(step, width)
    const seconds = began === 0 ? 0 : Math.round((now - began) / 1000)

    const working = e.props.isWorking ? (
      <Text key="crab">
        <Text color={INK}>{'·'.repeat(at)}</Text>
        <Text color={PRIMARY} bold>
          {crab(who, step)}
        </Text>
        <Text color={INK}>{'·'.repeat(width - at)}</Text>
        <Text dimColor>
          {' '}
          {who} · {seconds}s · {count} tool{count === 1 ? '' : 's'}
        </Text>
      </Text>
    ) : null

    const idle = reading === null ? 0 : now - reading.at
    const cacheLine =
      reading === null ? null : idle > COLD_AFTER_MS ? (
        <Text key="cache" color="warning">
          cache likely cold after {minutes(idle)} idle: the next message re-writes about{' '}
          {compact(reading.contextTokens)} tokens (estimate)
        </Text>
      ) : (
        <Text key="cache">
          <Text color={PRIMARY}>cache {meter(reading.hitRatio)}</Text>
          <Text dimColor>
            {' '}
            {Math.round(reading.hitRatio * 100)}% hit · read {compact(reading.readTokens)} · wrote{' '}
            {compact(reading.wroteTokens)} · {minutes(idle)} ago
          </Text>
        </Text>
      )

    return (
      <Box flexDirection="column">
        {working}
        {cacheLine}
      </Box>
    )
  })
}
