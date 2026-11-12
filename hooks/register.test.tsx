import { expect, mock, test } from 'claude-code/testing'

const BAND = {
  plugin: 'work-clock',
  component: 'AbovePrompt',
  surface: 'terminal',
  props: { hasSurvey: false, isCollapsed: false, isWorking: false, maxRows: 20, bodyColumns: 80, scroll: { offset: 0, bodyRows: 20 }, view: {} },
} as const
const DESK = { ...BAND, surface: 'desktop' } as const

// Wednesday 11 Nov 2026, local time, so the test holds in any time zone.
const at = (h: number, m = 0, day = 11) => new Date(2026, 10, day, h, m).getTime()

// Stands in for what draws beneath the clock: the engine, or another mod's band.
async function start($: any, on: any, ms: number, beneath = '') {
  on('ui.render', ($: any, e: any) => {
    const { Box, Text } = $.ui.resolve(e)
    return beneath ? <Text>{beneath}</Text> : <Box />
  })
  const clock = mock.clock(on, { now: ms })
  mock.store(on)
  const toasts: string[] = []
  on('command.register', () => ({ value: { command: 'clock' } }))
  on('ui.toast', (_: any, e: any) => { toasts.push(e.text ?? String(e)); return { value: undefined } })
  on('session.start', (_: any, e: any) => ({ cwd: e.cwd }))
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  await clock.advance(1000)
  return { clock, toasts }
}

const svgs = async (ui: any) => (await ui.findAll({ type: 'Svg' })).map((s: any) => String(s.props.alt))

test('hooks run in this computer’s time zone (UTC+8)', async () => {
  expect(new Date(2026, 10, 11).getTimezoneOffset()).toBe(-480)
})

test('collapsed row: time worked and time left on one line', async ($, on) => {
  await start($, on, at(11, 18))
  const ui = await $.ui.mount(BAND)
  expect((await ui.find({ type: 'Text', text: /worked/ }))?.text).toBe('3h 18m worked')
  expect((await ui.find({ type: 'Text', text: /left/ }))?.text).toBe('· 4h 42m left')
  expect(await ui.find({ key: 'expand' })).toBeFalsy()
  expect(await ui.find({ key: 'mode' })).toBeFalsy()
  await ui.unmount()
})

test('before work shows a countdown', async ($, on) => {
  await start($, on, at(7, 35))
  const ui = await $.ui.mount(BAND)
  expect((await ui.find({ type: 'Text', text: /Starts/ }))?.text).toBe('Starts in 25m')
  await ui.unmount()
})

test('lunch is a break: not counted as worked', async ($, on) => {
  await start($, on, at(12, 30))
  const ui = await $.ui.mount(BAND)
  expect((await ui.find({ type: 'Text', text: /break/ }))?.text).toBe('On break')
  expect((await ui.find({ type: 'Text', text: /back/ }))?.text).toBe('· 30m left · back 13:00')
  await ui.unmount()
})

test('after the break, worked time skips it', async ($, on) => {
  await start($, on, at(14, 0))
  const ui = await $.ui.mount(BAND)
  expect((await ui.find({ type: 'Text', text: /worked/ }))?.text).toBe('5h 00m worked')
  await ui.unmount()
})

test('after work shows done and toasts once', async ($, on) => {
  const { clock, toasts } = await start($, on, at(17, 30))
  const ui = await $.ui.mount(BAND)
  expect((await ui.find({ type: 'Text', text: /done/ }))?.text).toBe('Work is done')
  await clock.advance(5000)
  expect(toasts.length).toBe(1)
  await ui.unmount()
})

test('a Saturday is a day off', async ($, on) => {
  await start($, on, at(12, 0, 14))
  const ui = await $.ui.mount(BAND)
  expect((await ui.find({ type: 'Text', text: /Day off/ }))?.text).toBe('Day off')
  await ui.unmount()
})

test('/clock opens the view with the mode button, which switches to clock only', async ($, on) => {
  await start($, on, at(11, 18))
  const ui = await $.ui.mount(BAND)
  await $.command.run({ command: 'clock' })
  await ui.press({ key: 'mode' })
  expect(await ui.find({ type: 'Text', text: /worked/ })).toBeFalsy()
  expect((await ui.find({ type: 'Text', text: /Wednesday/ }))?.text).toBe('Wednesday, 11 Nov')
  await ui.unmount()
})

test('the clock row sits above the band beneath it, with no inner borders', async ($, on) => {
  await start($, on, at(11, 18), 'usage band')
  const ui = await $.ui.mount(BAND)
  const tree: any = await ui.drawn()
  const order = JSON.stringify(tree)
  expect(tree.props.gap).toBe('sm')
  expect(order.indexOf('worked')).toBeGreaterThan(-1)
  expect(order.indexOf('worked')).toBeLessThan(order.indexOf('usage band'))
  expect(order).not.toContain('borderStyle')
  await ui.unmount()
})

test('desktop collapsed row: tiny crab, icons and a bar filled to 41%', async ($, on) => {
  await start($, on, at(11, 18))
  const ui = await $.ui.mount(DESK)
  expect(await svgs(ui)).toEqual(['Crab at its laptop', 'clock', 'laptop', 'hourglass'])
  expect(JSON.stringify(await ui.drawn())).toContain('"width":"41%"')
  await ui.unmount()
})

test('desktop expanded: big clock, and the scene is no longer in the band', async ($, on) => {
  await start($, on, at(11, 18))
  const ui = await $.ui.mount(DESK)
  await $.command.run({ command: 'clock' })
  expect((await ui.findAll({ type: 'Text', text: /^11:18/ })).some((t: any) => t.props.size === 'title')).toBe(true)
  expect((await svgs(ui)).some((a: string) => a.includes('worked,'))).toBe(false)
  await ui.unmount()
})

test('a survey takes the band', async ($, on) => {
  await start($, on, at(11, 18))
  const ui = await $.ui.mount({ ...BAND, props: { ...BAND.props, hasSurvey: true } })
  expect(await ui.find({ type: 'Text', text: /worked/ })).toBeFalsy()
  await ui.unmount()
})
