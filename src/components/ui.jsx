import { useEffect } from 'react'
import { X, Star } from 'lucide-react'
import { TIER_STYLE, STAGE_STYLE, initials } from '../lib/format.js'
import { stageMeta } from '../lib/store.js'

export function TierTag({ tier, size = 'sm' }) {
  const s = TIER_STYLE[tier] || TIER_STYLE.C
  const dim = size === 'lg' ? 'h-7 w-7 text-sm' : 'h-5 w-5 text-[11px]'
  return (
    <span
      title={`Tier ${tier}`}
      className={`inline-grid ${dim} place-items-center rounded-md font-bold tnum ring-1 ${s.bg} ${s.text} ${s.ring}`}
    >
      {s.label}
    </span>
  )
}

export function StageTag({ stage }) {
  if (!stage) return <span className="chip text-faint">Pool</span>
  const s = STAGE_STYLE[stage] || STAGE_STYLE.new
  const m = stageMeta(stage)
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-semibold ${s.bg} ${s.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {m?.label || stage}
    </span>
  )
}

export function Avatar({ member, size = 22 }) {
  if (!member)
    return (
      <span
        className="inline-grid place-items-center rounded-full border border-dashed border-line text-faint"
        style={{ width: size, height: size, fontSize: size * 0.42 }}
      >
        ·
      </span>
    )
  return (
    <span
      title={member.name}
      className="inline-grid place-items-center rounded-full font-semibold text-white ring-2 ring-surface"
      style={{ width: size, height: size, background: member.color, fontSize: size * 0.4 }}
    >
      {initials(member.name)}
    </span>
  )
}

export function Stars({ rating, reviews }) {
  if (rating == null) return <span className="text-faint">—</span>
  return (
    <span className="inline-flex items-center gap-1 text-ink">
      <Star size={13} className="fill-warning text-warning" />
      <span className="tnum font-medium">{rating.toFixed(1)}</span>
      {reviews != null && <span className="tnum text-xs text-faint">({reviews.toLocaleString('en-GB')})</span>}
    </span>
  )
}

export function HotDot() {
  return (
    <span title="Instagram-enriched hot lead" className="relative inline-flex h-2 w-2">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
      <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
    </span>
  )
}

export function Modal({ open, onClose, children, title, wide }) {
  useEffect(() => {
    if (!open) return
    const h = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 animate-fade-in bg-ink/25 backdrop-blur-[2px]" onClick={onClose} />
      <div
        className={`relative z-10 w-full ${wide ? 'max-w-2xl' : 'max-w-md'} animate-fade-up rounded-2xl border border-line bg-raised shadow-pop`}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
          <h3 className="font-display text-lg font-semibold">{title}</h3>
          <button className="btn-ghost btn h-8 w-8 p-0" onClick={onClose}>
            <X size={16} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}
