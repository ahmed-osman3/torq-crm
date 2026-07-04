import { useEffect, useState } from 'react'
import {
  X, Phone, Globe, Mail, MapPin, Instagram, Star, Send, Trash2, ExternalLink,
  Copy, Check, TrendingUp, Users, MessageCircle, Ban, RotateCcw,
} from 'lucide-react'
import { STAGES, actions, stageMeta } from '../lib/store.js'
import { TierTag, StageTag, Avatar, HotDot } from './ui.jsx'
import { fmtFollowers, fmtNum, timeAgo, TIER_STYLE } from '../lib/format.js'

function CopyBtn({ value }) {
  const [done, setDone] = useState(false)
  if (!value) return null
  return (
    <button
      className="btn-ghost btn h-6 w-6 shrink-0 p-0 text-faint"
      onClick={() => {
        navigator.clipboard?.writeText(value)
        setDone(true)
        setTimeout(() => setDone(false), 1200)
      }}
      title="Copy"
    >
      {done ? <Check size={13} className="text-positive" /> : <Copy size={13} />}
    </button>
  )
}

function Field({ icon: Icon, label, children, href, copy }) {
  if (!children) return null
  return (
    <div className="flex items-center gap-2.5 py-1.5">
      <Icon size={15} className="shrink-0 text-faint" />
      <div className="min-w-0 flex-1">
        <div className="label leading-tight">{label}</div>
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 truncate text-sm font-medium text-ink hover:text-accent"
          >
            {children} <ExternalLink size={11} className="shrink-0 opacity-50" />
          </a>
        ) : (
          <div className="truncate text-sm font-medium text-ink">{children}</div>
        )}
      </div>
      {copy && <CopyBtn value={copy} />}
    </div>
  )
}

function Metric({ icon: Icon, label, value, accent }) {
  return (
    <div className="rounded-lg border border-line bg-surface px-3 py-2">
      <div className="flex items-center gap-1 text-faint">
        <Icon size={12} />
        <span className="label">{label}</span>
      </div>
      <div className={`tnum mt-0.5 text-lg font-semibold ${accent ? 'text-accent' : 'text-ink'}`}>{value}</div>
    </div>
  )
}

export default function LeadDrawer({ lead, record, team, meId, onClose }) {
  const [note, setNote] = useState('')

  useEffect(() => {
    const h = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  if (!lead) return null
  const stage = record?.stage || null
  const owner = team.find((m) => m.id === record?.ownerId)
  const notes = record?.notes || []
  const inPipeline = !!stage
  const discarded = !!record?.discarded
  const ts = TIER_STYLE[lead.tier] || TIER_STYLE.C

  const submitNote = () => {
    if (!note.trim()) return
    actions.addNote(lead.id, note, meId)
    setNote('')
  }

  return (
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 animate-fade-in bg-ink/20 backdrop-blur-[1px]" onClick={onClose} />
      <aside className="absolute right-0 top-0 flex h-full w-full max-w-[440px] animate-slide-in flex-col border-l border-line bg-canvas shadow-drawer">
        {/* header */}
        <div className="relative shrink-0 border-b border-line bg-surface px-5 pb-4 pt-5">
          <button className="btn-ghost btn absolute right-3 top-3 h-8 w-8 p-0" onClick={onClose}>
            <X size={16} />
          </button>
          <div className="flex items-start gap-3 pr-8">
            <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl text-lg font-bold ${ts.bg} ${ts.text}`}>
              {lead.name[0]}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="font-display text-xl font-semibold leading-tight text-ink">{lead.name}</h2>
                {lead.hot && <HotDot />}
              </div>
              <p className="mt-0.5 text-sm text-muted">{lead.primaryType || lead.categories[0]}</p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-bold ${ts.bg} ${ts.text}`}>
              Tier {lead.tier}
            </span>
            <span className="chip tnum">
              <TrendingUp size={12} /> Score {lead.score}
            </span>
            {lead.area && (
              <span className="chip">
                <MapPin size={11} /> {lead.area}
              </span>
            )}
            {lead.categories.slice(0, 3).map((c) => (
              <span key={c} className="chip capitalize">
                {c}
              </span>
            ))}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {/* discarded banner */}
          {discarded && (
            <div className="mb-4 flex items-center gap-3 rounded-xl border border-danger/25 bg-danger/[0.06] px-3 py-2.5">
              <Ban size={16} className="shrink-0 text-danger" />
              <span className="flex-1 text-sm font-medium text-danger">Discarded — hidden from the pool.</span>
              <button className="btn h-7 gap-1 px-2 text-xs" onClick={() => actions.restore(lead.id)}>
                <RotateCcw size={13} /> Restore
              </button>
            </div>
          )}
          {/* pipeline control */}
          <div className="card p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="label">Pipeline stage</span>
              <StageTag stage={stage} />
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {STAGES.map((s) => (
                <button
                  key={s.id}
                  onClick={() => actions.setStage(lead.id, s.id)}
                  className={`rounded-lg border px-2 py-1.5 text-xs font-semibold transition-all ${
                    stage === s.id
                      ? 'border-accent bg-accent text-white shadow-card'
                      : 'border-line bg-raised text-muted hover:border-faint hover:text-ink'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
              <span className="label">Owner</span>
              <div className="flex items-center gap-1.5">
                <select
                  value={record?.ownerId || ''}
                  onChange={(e) => actions.assign(lead.id, e.target.value || null)}
                  className="rounded-lg border border-line bg-raised px-2 py-1 text-sm font-medium text-ink focus:border-accent focus:outline-none"
                >
                  <option value="">Unassigned</option>
                  {team.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
                <Avatar member={owner} size={26} />
              </div>
            </div>
            <div className="mt-2 flex gap-2">
              {inPipeline && (
                <button
                  className="btn-ghost btn flex-1 text-xs text-muted hover:bg-black/5"
                  onClick={() => actions.removeFromPipeline(lead.id)}
                >
                  <Trash2 size={12} /> Remove from pipeline
                </button>
              )}
              {!discarded && (
                <button
                  className="btn-ghost btn flex-1 text-xs text-danger hover:bg-danger/5"
                  onClick={() => actions.discard(lead.id)}
                  title="Hide this lead from the pool"
                >
                  <Ban size={12} /> Discard lead
                </button>
              )}
            </div>
          </div>

          {/* IG signal (hot leads) */}
          {lead.hot && (
            <div className="mt-4">
              <div className="mb-1.5 flex items-center gap-1.5 label text-accent">
                <Instagram size={12} /> Instagram signal
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Metric icon={Users} label="Followers" value={fmtFollowers(lead.igFollowers)} accent />
                <Metric icon={MessageCircle} label="Engage" value={lead.igEngagementPct != null ? lead.igEngagementPct + '%' : '—'} />
                <Metric icon={TrendingUp} label="Posts/wk" value={lead.igPostsPerWeek ?? '—'} />
              </div>
              {lead.igReasons && <p className="mt-2 rounded-lg bg-accent-soft/60 px-3 py-2 text-xs text-muted">{lead.igReasons}</p>}
              {lead.igBio && <p className="mt-2 text-xs italic text-muted">“{lead.igBio}”</p>}
            </div>
          )}

          {/* contact block */}
          <div className="mt-4 card divide-y divide-line px-3">
            <Field icon={Phone} label="Phone" copy={lead.phone} href={lead.phone ? `tel:${lead.phone}` : null}>
              {lead.phone}
            </Field>
            <Field icon={Mail} label="Email" copy={lead.email} href={lead.email ? `mailto:${lead.email}` : null}>
              {lead.email}
            </Field>
            <Field icon={Globe} label="Website" href={lead.website}>
              {lead.website?.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}
            </Field>
            <Field icon={Instagram} label="Instagram" href={lead.instagram}>
              {lead.igHandle ? '@' + lead.igHandle : lead.instagram}
            </Field>
            <Field icon={MapPin} label="Address" copy={lead.address} href={lead.googleMapsUrl}>
              {lead.address}
            </Field>
            <Field icon={Star} label="Google rating">
              {lead.rating != null ? `${lead.rating.toFixed(1)}★ · ${fmtNum(lead.reviews)} reviews` : null}
            </Field>
          </div>
          {lead.scoreReasons && (
            <p className="mt-2 px-1 text-xs leading-relaxed text-faint">{lead.scoreReasons}</p>
          )}

          {/* notes / activity */}
          <div className="mt-5">
            <div className="mb-2 label">Notes &amp; activity</div>
            <div className="flex gap-2">
              <textarea
                className="input min-h-[38px] resize-none py-2"
                rows={1}
                placeholder="Log a call, add context for the team…"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submitNote()
                }}
              />
              <button className="btn btn-accent shrink-0 self-end" onClick={submitNote} disabled={!note.trim()}>
                <Send size={14} />
              </button>
            </div>
            <div className="mt-3 space-y-2.5">
              {notes.length === 0 && <p className="py-2 text-center text-xs text-faint">No notes yet — first touch starts the trail.</p>}
              {[...notes].reverse().map((n) => {
                const author = team.find((m) => m.id === n.authorId)
                return (
                  <div key={n.id} className="group flex gap-2.5">
                    <Avatar member={author} size={26} />
                    <div className="min-w-0 flex-1 rounded-lg rounded-tl-sm border border-line bg-surface px-3 py-2">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-xs font-semibold text-ink">{author?.name || 'Someone'}</span>
                        <span className="tnum text-[10px] text-faint">{timeAgo(n.ts)}</span>
                      </div>
                      <p className="mt-0.5 whitespace-pre-wrap text-sm text-muted">{n.text}</p>
                    </div>
                    <button
                      className="btn-ghost btn h-6 w-6 self-center p-0 text-faint opacity-0 transition group-hover:opacity-100"
                      onClick={() => actions.deleteNote(lead.id, n.id)}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </aside>
    </div>
  )
}
