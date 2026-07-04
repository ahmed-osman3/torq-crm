export const uid = () => Math.random().toString(36).slice(2, 10)
export const nowISO = () => new Date().toISOString()

export const fmtNum = (n) => (n == null ? '—' : Number(n).toLocaleString('en-GB'))

export const fmtFollowers = (n) => {
  if (n == null) return '—'
  if (n >= 1000) return (n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, '') + 'k'
  return String(n)
}

export function timeAgo(iso) {
  if (!iso) return ''
  const d = (Date.now() - new Date(iso).getTime()) / 1000
  if (d < 60) return 'just now'
  if (d < 3600) return Math.floor(d / 60) + 'm ago'
  if (d < 86400) return Math.floor(d / 3600) + 'h ago'
  if (d < 604800) return Math.floor(d / 86400) + 'd ago'
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

export const initials = (name) =>
  (name || '?')
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()

export const TIER_STYLE = {
  A: { label: 'A', text: 'text-positive', bg: 'bg-positive/10', ring: 'ring-positive/25', dot: 'bg-positive' },
  B: { label: 'B', text: 'text-warning', bg: 'bg-warning/10', ring: 'ring-warning/25', dot: 'bg-warning' },
  C: { label: 'C', text: 'text-faint', bg: 'bg-black/[0.04]', ring: 'ring-black/10', dot: 'bg-faint' },
}

export const STAGE_STYLE = {
  new: { text: 'text-faint', bg: 'bg-black/[0.05]', dot: 'bg-faint', bar: 'bg-faint' },
  contacted: { text: 'text-accent', bg: 'bg-accent-soft', dot: 'bg-accent', bar: 'bg-accent' },
  replied: { text: 'text-[#2563C9]', bg: 'bg-[#2563C9]/10', dot: 'bg-[#2563C9]', bar: 'bg-[#2563C9]' },
  qualified: { text: 'text-warning', bg: 'bg-warning/10', dot: 'bg-warning', bar: 'bg-warning' },
  won: { text: 'text-positive', bg: 'bg-positive/10', dot: 'bg-positive', bar: 'bg-positive' },
  lost: { text: 'text-danger', bg: 'bg-danger/10', dot: 'bg-danger', bar: 'bg-danger' },
}
