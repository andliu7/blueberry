import { expect, mock, test } from 'claude-code/testing'

test('the band draws a crab while a turn is running, on both surfaces', async ($, on) => {
  mock.clock(on, { now: 1_000_000 })

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({
      plugin: 'andliu-kit',
      surface,
      component: 'AbovePrompt',
      props: { hasSurvey: false, isWorking: true, maxRows: 10, bodyColumns: 80 },
    } as never)
    expect(await ui.find({ type: 'Text', text: /thinker/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /\(-_-\)/ })).toBeDefined()
    await ui.unmount()
  }
})
