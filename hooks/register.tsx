import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { Mode } from '../types'
import { iconSvg, tinyCrabSvg } from './scene'
import type { IconName } from './scene'

const now = atom({ plugin: 'work-clock', key: 'now' } as const, 0)
const mode = atom({ plugin: 'work-clock', key: 'mode' } as const, 'work' as Mode)
const expanded = atom({ plugin: 'work-clock', key: 'isExpanded' } as const, false)
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const pad = (n: number) => String(n).padStart(2, '0')
const hm = (min: number) => (min < 60 ? `${min}m` : `${Math.floor(min / 60)}h ${pad(min % 60)}m`)
const toMin = (s: string) => {
  const [h, m] = s.split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

// ponytail: same-day hours only (start < end); night shifts need a date-aware version.
function workStatus(ms: number, start: string, end: string, skipWeekends: boolean, brk?: readonly [string, string]) {
  const d = new Date(ms)
  if (skipWeekends && (d.getDay() === 0 || d.getDay() === 6)) return { phase: 'off', worked: 0, left: 0, pct: 0 } as const
  const t = d.getHours() * 60 + d.getMinutes()
  const s = toMin(start)
  const e = toMin(end)
  // The break, kept inside work hours; it is not worked time.
  const bs = brk ? Math.max(s, toMin(brk[0])) : 0
  const bl = brk ? Math.max(0, Math.min(e, toMin(brk[1])) - bs) : 0
  const total = e - s - bl
  if (t < s) return { phase: 'before', worked: 0, left: s - t, pct: 0 } as const
  if (t >= e) return { phase: 'done', worked: total, left: 0, pct: 100 } as const
  // On break, left is the minutes until it ends.
  if (t >= bs && t < bs + bl) return { phase: 'break', worked: bs - s, left: bs + bl - t, pct: Math.round(((bs - s) / total) * 100) } as const
  const worked = t - s - Math.min(bl, Math.max(0, t - bs))
  return { phase: 'working', worked, left: total - worked, pct: Math.round((worked / total) * 100) } as const
}

export const register: Register = (on, options) => {
  const start = String(options.workStart ?? '08:00')
  const end = String(options.workEnd ?? '17:00')
  const skipWeekends = options.skipWeekends !== false
  const breakEnd = String(options.breakEnd ?? '13:00')
  const brk = options.breakStart !== '' && breakEnd !== '' ? ([String(options.breakStart ?? '12:00'), breakEnd] as const) : undefined
  // What the band and the scene say for each phase.
  const describe = (w: ReturnType<typeof workStatus>) =>
    ({
      before: { status: `Starts in ${hm(w.left)}`, sub: `Work hours ${start} – ${end}` },
      working: { status: `${hm(w.worked)} worked`, sub: `${hm(w.left)} left` },
      break: { status: 'On break', sub: `${hm(w.left)} left · back ${breakEnd}` },
      done: { status: 'Work is done', sub: `${hm(w.worked)} today` },
      off: { status: 'Day off', sub: `Back Monday ${start}` },
    })[w.phase]

  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'clock', description: 'Expand or collapse the clock band' })

    // Tick once a second; the write redraws the band. Toast once per day when work ends.
    $.clock.every(1000, async () => {
      const t = await $.clock.now()
      await update($, now, () => t)
      const d = new Date(t)
      const today = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
      if ((await read($, mode)) === 'work' && workStatus(t, start, end, skipWeekends, brk).phase === 'done' && (await $.store.get('doneDay')) !== today) {
        await $.store.set('doneDay', today)
        $.ui.toast('Work is done for today')
      }
    })

    return next(e)
  })

  on('command.run', { command: 'clock' }, async $ => {
    await update($, expanded, v => !v)

    return { text: (await read($, expanded)) ? 'Clock band expanded.' : 'Clock band collapsed.' }
  })

  // The band above the prompt: our row on top, the bands beneath (the usage band) below.
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) return next(e)
    const below = await next(e)

    const ui = $.ui.resolve(e)
    const { Box, Text, Button } = ui
    const Svg = e.surface === 'desktop' && 'Svg' in ui ? ui.Svg : undefined
    const ms = (await read($, now)) || (await $.clock.now())
    const m = await read($, mode)
    const isOpen = await read($, expanded)
    const d = new Date(ms)
    const time = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
    const date = `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}`
    const w = workStatus(ms, start, end, skipWeekends, brk)
    const tone = w.phase === 'working' ? 'suggestion' : w.phase === 'done' ? 'success' : undefined
    const say = describe(w)

    // Collapsed: one slim row, about a quarter of the prompt's height.
    // Each item is an icon beside its text; the terminal has no Svg, so text alone.
    const pair = (name: IconName, text: JSX.Element, phase?: typeof w.phase) => (
      <Box gap="xs" alignItems="center">
        {Svg && <Svg source={iconSvg(name, phase)} alt={name} width={14} height={14} />}
        {text}
      </Box>
    )
    const statusIcon = ({ before: 'coffee', working: 'laptop', break: 'coffee', done: 'check', off: 'moon' } as const)[w.phase]
    const subIcon = ({ before: 'briefcase', working: 'hourglass', break: 'clock', done: 'hourglass', off: 'calendar' } as const)[w.phase]
    const row = (
      <Box gap={1} alignItems="center" justifyContent="space-between" paddingX="md">
        <Box gap={1} alignItems="center" flexGrow={1}>
          {Svg && m === 'work' && <Svg source={tinyCrabSvg(w.phase)} alt="Crab at its laptop" width={24} height={18} />}
          {pair('clock', <Text bold mono tabular>{time}</Text>)}
          {/* Stretches across the free space: a one-row box holding a thin track, filled to pct. */}
          {m === 'work' && Svg && w.phase !== 'off' && (
            <Box flexGrow={1} height={1} alignItems="center">
              <Box width="100%" height="35%" backgroundColor="inactive">
                <Box width={`${w.pct}%`} backgroundColor={tone ?? 'inactive'} />
              </Box>
            </Box>
          )}
          {m === 'work'
            ? pair(statusIcon, <Text bold color={tone ?? 'subtle'}>{say.status}</Text>, w.phase)
            : pair('calendar', <Text color="subtle">{date}</Text>)}
          {m === 'work' && pair(subIcon, <Text color="subtle">{Svg ? say.sub : `· ${say.sub}`}</Text>)}
        </Box>
      </Box>
    )
    const modeButton = (
      <Button
        key="mode"
        label={m === 'work' ? 'Clock only' : 'Work timer'}
        onPress={() => void update($, mode, x => (x === 'work' ? 'clock' : 'work'))}
      />
    )

    let detail = null
    if (isOpen && Svg) {
      // Desktop: big clock and the date.
      detail = (
        <Box flexDirection="column" alignItems="center">
          <Text size="title" mono tabular bold>{time}</Text>
          <Text dimColor>{date}</Text>
          {modeButton}
        </Box>
      )
    } else if (isOpen) {
      // Terminal: the same facts as text, with a block bar.
      const width = Math.max(10, Math.min(30, e.props.bodyColumns - 2))
      const filled = Math.round((w.pct / 100) * width)
      detail = (
        <Box flexDirection="column" paddingX="md">
          <Text dimColor>{date}</Text>
          {m === 'work' && w.phase !== 'off' && <Text color={tone}>{'█'.repeat(filled) + '░'.repeat(width - filled)}</Text>}
          {modeButton}
        </Box>
      )
    }

    return (
      <Box flexDirection="column" gap="sm">
        {row}
        {detail}
        {below}
      </Box>
    )
  })
}
