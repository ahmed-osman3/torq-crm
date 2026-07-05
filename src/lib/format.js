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

// --- Instagram DM helpers ---------------------------------------------------
export const DM_STATUS = {
  sent: { label: 'DM sent', text: 'text-accent', bg: 'bg-accent-soft', dot: 'bg-accent' },
  replied: { label: 'Replied', text: 'text-positive', bg: 'bg-positive/10', dot: 'bg-positive' },
  no_reply: { label: 'No reply', text: 'text-faint', bg: 'bg-black/[0.05]', dot: 'bg-faint' },
}

// Opens a DM thread with the handle in the Instagram app (mobile) or web.
export const igDmUrl = (handle) => (handle ? `https://ig.me/m/${encodeURIComponent(handle.replace(/^@/, ''))}` : '')

// Fills {{merge}} fields from a lead. Unknown fields resolve to empty so a
// half-known lead never leaves a literal "{{rating}}" in the message.
export function renderTemplate(body, lead) {
  if (!body) return ''
  const map = {
    name: lead.name || 'there',
    area: lead.area || 'your area',
    district: lead.district || '',
    category: (lead.categories && lead.categories[0]) || 'automotive',
    handle: lead.igHandle ? '@' + lead.igHandle : '',
    rating: lead.rating != null ? lead.rating.toFixed(1) : '',
    reviews: lead.reviews != null ? Number(lead.reviews).toLocaleString('en-GB') : '',
    followers: lead.igFollowers != null ? fmtFollowers(lead.igFollowers) : '',
  }
  return body.replace(/\{\{\s*(\w+)\s*\}\}/g, (m, key) => (key in map ? map[key] : ''))
}
