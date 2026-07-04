import { useMemo, useState } from 'react'
import { Instagram, GripVertical, Star, Filter } from 'lucide-react'
import { STAGES, actions } from '../lib/store.js'
import { TierTag, Avatar, HotDot } from './ui.jsx'
import { fmtFollowers, fmtNum, STAGE_STYLE } from '../lib/format.js'

function Card({ lead, rec, owner, onOpen, onDragStart }) {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, lead.id)}
      onClick={() => onOpen(lead)}
      className="group card cursor-pointer bg-raised p-3 transition-shadow hover:shadow-pop active:cursor-grabbing"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          {lead.hot && <HotDot />}
          <span className="truncate text-sm font-semibold text-ink">{lead.name}</span>
        </div>
        <GripVertical size={14} className="mt-0.5 shrink-0 text-line group-hover:text-faint" />
      </div>
      <div className="mt-1 truncate text-xs capitalize text-faint">
        {lead.area && <span className="tnum">{lead.area}</span>}
        {lead.area && ' · '}
        {lead.categories[0]}
      </div>
      <div className="mt-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-muted">
          <TierTag tier={lead.tier} />
          {lead.rating != null && (
            <span className="inline-flex items-center gap-0.5">
              <Star size={11} className="fill-warning text-warning" />
              <span className="tnum">{lead.rating.toFixed(1)}</span>
            </span>
          )}
          {lead.instagram && (
            <span className="inline-flex items-center gap-0.5">
              <Instagram size={11} className="text-accent" />
              <span className="tnum">{fmtFollowers(lead.igFollowers)}</span>
            </span>
          )}
        </div>
        <Avatar member={owner} size={22} />
      </div>
    </div>
  )
}

export default function Pipeline({ leadsById, records, team, onOpen }) {
  const [dragOver, setDragOver] = useState(null)
  const [ownerFilter, setOwnerFilter] = useState('all')

  const byStage = useMemo(() => {
    const map = Object.fromEntries(STAGES.map((s) => [s.id, []]))
    for (const [id, rec] of Object.entries(records)) {
      if (!rec.stage || !map[rec.stage]) continue
      if (ownerFilter !== 'all' && rec.ownerId !== ownerFilter) continue
      const lead = leadsById[id]
      if (lead) map[rec.stage].push({ lead, rec })
    }
    for (const s of STAGES) map[s.id].sort((a, b) => (b.rec.updatedAt || '').localeCompare(a.rec.updatedAt || ''))
    return map
  }, [records, leadsById, ownerFilter])

  const total = Object.values(byStage).reduce((n, arr) => n + arr.length, 0)

  const onDragStart = (e, id) => {
    e.dataTransfer.setData('text/plain', id)
    e.dataTransfer.effectAllowed = 'move'
  }
  const onDrop = (e, stageId) => {
    e.preventDefault()
    const id = e.dataTransfer.getData('text/plain')
    if (id) actions.setStage(id, stageId)
    setDragOver(null)
  }

  if (total === 0) {
    return (
      <div className="grid h-full place-items-center px-6 text-center">
        <div className="max-w-sm animate-fade-up">
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-accent-soft text-accent">
            <Filter size={24} />
          </div>
          <h3 className="font-display text-xl font-semibold">Your pipeline is empty</h3>
          <p className="mt-1.5 text-sm text-muted">
            Head to the <span className="font-semibold text-ink">Lead Pool</span>, find businesses worth pursuing, and hit
            <span className="mx-1 inline-flex items-center rounded border border-line bg-surface px-1.5 py-0.5 text-xs font-semibold">+ Pipeline</span>
            to start tracking them here.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center gap-3 border-b border-line bg-surface/60 px-6 py-3 backdrop-blur">
        <span className="font-display text-sm font-semibold text-ink">{fmtNum(total)} in pipeline</span>
        <div className="ml-auto flex items-center gap-2">
          <span className="label">Owner</span>
          <select
            value={ownerFilter}
            onChange={(e) => setOwnerFilter(e.target.value)}
            className="rounded-lg border border-line bg-raised px-2.5 py-1.5 text-sm font-medium text-ink focus:border-accent focus:outline-none"
          >
            <option value="all">Everyone</option>
            {team.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-x-auto">
        <div className="flex h-full min-w-max gap-3 p-4">
          {STAGES.map((s) => {
            const items = byStage[s.id]
            const st = STAGE_STYLE[s.id]
            const isOver = dragOver === s.id
            return (
              <div
                key={s.id}
                onDragOver={(e) => { e.preventDefault(); setDragOver(s.id) }}
                onDragLeave={(e) => { if (e.currentTarget === e.target) setDragOver(null) }}
                onDrop={(e) => onDrop(e, s.id)}
                className={`flex h-full w-[276px] shrink-0 flex-col rounded-xl border transition-colors ${
                  isOver ? 'border-accent bg-accent-soft/40' : 'border-line bg-canvas'
                }`}
              >
                <div className="flex items-center gap-2 px-3 py-2.5">
                  <span className={`h-2 w-2 rounded-full ${st.dot}`} />
                  <span className="text-sm font-semibold text-ink">{s.label}</span>
                  <span className="tnum ml-auto rounded-md bg-black/[0.05] px-1.5 py-0.5 text-xs font-semibold text-muted">
                    {items.length}
                  </span>
                </div>
                <div className={`h-0.5 ${st.bar} opacity-40`} />
                <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-2">
                  {items.map(({ lead, rec }) => (
                    <Card
                      key={lead.id}
                      lead={lead}
                      rec={rec}
                      owner={team.find((m) => m.id === rec.ownerId)}
                      onOpen={onOpen}
                      onDragStart={onDragStart}
                    />
                  ))}
                  {items.length === 0 && (
                    <div className="mt-1 rounded-lg border border-dashed border-line py-6 text-center text-xs text-faint">
                      Drop here
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
