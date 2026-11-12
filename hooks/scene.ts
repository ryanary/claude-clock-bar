// The band's drawings: line icons and the tiny pixel crab.
// Pure string builders; register.tsx hands the result to an Svg element.

const ACCENT = '#6aabf1' // matches the theme's "suggestion" blue (the worked text)
const DONE = '#5fbf8f'
const GREY = '#9a9a96'
const CL = '#D97757'
const CLL = '#E8957A'
const INK = '#1F1E1D'
const HP = '#3d3d3a'
const HD = '#534AB7'
const SV = '#C9C7BF'
const LENS = '#E6F1FB'

const CSS = `<style>.t{fill:#1f1f1f}.s{fill:#6b6b68}.m{fill:#9a9a96}.k{stroke:#ecebe8}
@media (prefers-color-scheme: dark){.t{fill:#ececec}.s{fill:#a8a8a4}.m{fill:#7d7d79}.k{stroke:#2c2c2b}}
.ca{animation:ty .3s steps(1) infinite}.cb{animation:ty .3s steps(1) infinite .15s}@keyframes ty{50%{transform:translateY(-2px)}}
.glow{animation:gl 1.4s ease-in-out infinite}@keyframes gl{50%{opacity:.06}}
.blink{opacity:0;animation:bl 4s infinite}@keyframes bl{0%,93%,100%{opacity:0}95%,98%{opacity:1}}
.code{opacity:0;animation:cd 2.4s ease-out infinite}@keyframes cd{0%{opacity:0;transform:translateY(6px)}20%{opacity:1}100%{opacity:0;transform:translateY(-20px)}}
.steam{animation:sm 2s ease-in-out infinite}@keyframes sm{0%{opacity:0;transform:translateY(3px)}50%{opacity:.8}100%{opacity:0;transform:translateY(-8px)}}
.cheer{animation:ch .5s ease-in-out infinite alternate}@keyframes ch{to{transform:translateY(-4px)}}
.fall{animation:fa 1.8s linear infinite}@keyframes fa{0%{opacity:0;transform:translateY(-10px)}15%{opacity:1}100%{opacity:0;transform:translateY(50px)}}
.knob{animation:p 1.6s ease-in-out infinite}@keyframes p{50%{opacity:.3}}
@media (prefers-reduced-motion: reduce){.ca,.cb,.glow,.code,.steam,.cheer,.fall,.knob{animation:none}.blink{animation:none;opacity:0}}</style>`

type Phase = 'before' | 'working' | 'break' | 'done' | 'off'
const phaseColor = (p: Phase) => (p === 'working' ? ACCENT : p === 'done' ? DONE : GREY)

// Line icons for the band's row, 24×24 drawn at 14px (paths from Lucide, ISC license).
const ICONS = {
  clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  laptop: '<path d="M20 16V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v9m16 0H4m16 0 1.28 2.55a1 1 0 0 1-.9 1.45H3.62a1 1 0 0 1-.9-1.45L4 16"/>',
  hourglass: '<path d="M5 22h14M5 2h14M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2"/>',
  check: '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
  coffee: '<path d="M10 2v2M14 2v2M6 2v2M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h14a4 4 0 1 1 0 8h-1"/>',
  moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
  briefcase: '<path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/><rect x="2" y="6" width="20" height="14" rx="2"/>',
}
export type IconName = keyof typeof ICONS

// Grey that follows light/dark mode, or the phase's color for the status icon.
export function iconSvg(name: IconName, phase?: Phase): string {
  const stroke = phase ? `stroke="${phaseColor(phase)}"` : 'class="ic"'
  return `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"><style>.ic{stroke:#6b6b68}@media (prefers-color-scheme: dark){.ic{stroke:#a8a8a4}}</style><g ${stroke} fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]}</g></svg>`
}

// The band's slim row: the crab's head and hands at 1px per pixel, 32×24.
export function tinyCrabSvg(phase: Phase): string {
  const R = (a: number, b: number, w: number, h: number, c: string) => `<rect x="${a}" y="${b}" width="${w}" height="${h}" fill="${c}"/>`
  const typing = phase === 'working'
  const eyes = phase === 'off' ? R(9, 7, 6, 3, INK) + R(17, 7, 6, 3, INK) : R(9, 6, 6, 5, INK) + R(17, 6, 6, 5, INK) + R(10, 7, 4, 3, LENS) + R(18, 7, 4, 3, LENS) + R(11, 8, 2, 2, INK) + R(19, 8, 2, 2, INK)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="24" viewBox="0 0 32 24">${CSS}
<g${typing ? ' class="cb"' : ''}>${R(4, 12, 4, 6, HD)}</g><g${typing ? ' class="ca"' : ''}>${R(24, 12, 4, 6, HD)}</g>
${R(8, 3, 16, 15, CL)}${R(8, 3, 16, 1, CLL)}${eyes}${R(7, 1, 18, 2, HP)}${R(5, 5, 3, 6, HP)}${R(24, 5, 3, 6, HP)}
${phase === 'working' || phase === 'done' ? R(6, 14, 20, 9, SV) + R(15, 17, 2, 3, CL) + R(14, 18, 4, 1, CL) : R(6, 21, 20, 2, SV)}
</svg>`
}

