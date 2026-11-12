export type Mode = 'work' | 'clock'

declare module 'claude-code' {
  interface PluginState {
    'work-clock': { now: number; mode: Mode; isExpanded: boolean }
  }
}
