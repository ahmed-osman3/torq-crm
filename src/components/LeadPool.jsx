import { useMemo, useRef, useState } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Search, Plus, Check, SlidersHorizontal, Instagram, Star, X, Ban, RotateCcw, Send } from 'lucide-react'
import { actions, STAGES } from '../lib/store.js'
import { TierTag, StageTag, Avatar, HotDot } from './ui.jsx'
import { fmtFollowers, fmtNum, igDmUrl, DM_STATUS } from '../lib/format.js'

const SORTS = [
  { id: 'score', label: 'Quality score' },
  { id: 'reviews', label: 'Reviews' },
  { id: 'followers', label: 'IG followers' },
  { id: 'rating', label: 'Rating' },
  { id: 'name', label: 'Name (A–Z)' },
]

function Toggle({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-all ${
        active ? 'border-accent bg-accent-soft text-accent' : 'border-line bg-raised text-muted hover:border-faint hover:text-ink'
      }`}
    >
      {children}
    </button>
  )
}

export default function LeadPool({ leads, records, team, meta, onOpen }) {
  const [q, setQ] = useState('')
  const [tier, setTier] = useState('all')
  const [district, setDistrict] = useState('all')
  const [category, setCategory] = useState('all')
  const [sort, setSort] = useState('score')
  const [hotOnly, setHotOnly] = useState(false)
  const [needEmail, setNeedEmail] = useState(false)
  const [needIG, setNeedIG] = useState(false)
  const [notDmd, setNotDmd] = useState(false)
  const [poolView, setPoolView] = useState('all') // all | untracked | tracked | discarded
  const parentRef = useRef(null)

  const discardedCount = useMemo(
    () => Object.values(records).filter((r) => r.discarded).length,
    [records],
  )
  const showingDiscarded = poolView === 'discarded'

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    let out = leads.filter((l) => {
      const rec = records[l.id]
      const isDiscarded = !!rec?.discarded
      // Discarded leads are hidden everywhere except the dedicated "Discarded" view.
      if (showingDiscarded ? !isDiscarded : isDiscarded) return false
      if (tier !== 'all' && l.tier !== tier) return false
      if (district !== 'all' && l.district !== district) return false
      if (category !== 'all' && !l.categories.includes(category)) return false
      if (hotOnly && !l.hot) return false
      if (needEmail && !l.email) return false
      if (needIG && !l.instagram) return false
      if (notDmd && (!l.igHandle || rec?.dmStatus)) return false
      const inPipeline = !!rec?.stage
      if (poolView === 'untracked' && inPipeline) return false
      if (poolView === 'tracked' && !inPipeline) return false
      if (needle) {
        const hay = (l.name + ' ' + l.address + ' ' + l.categories.join(' ') + ' ' + l.igHandle).toLowerCase()
        if (!hay.includes(needle)) return false
      }
      return true
    })
    out = [...out].sort((a, b) => {
      switch (sort) {
        case 'reviews': return b.reviews - a.reviews
        case 'followers': return (b.igFollowers || 0) - (a.igFollowers || 0)
        case 'rating': return (b.rating || 0) - (a.rating || 0) || b.reviews - a.reviews
        case 'name': return a.name.localeCompare(b.name)
        default: return b.hot - a.hot || b.score - a.score || b.reviews - a.reviews
      }
    })
    return out
  }, [leads, records, q, tier, district, category, sort, hotOnly, needEmail, needIG, notDmd, poolView])

  const rowVirt = useVirtualizer({
    count: filtered.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 56,
    overscan: 12,
  })

  const anyFilter = tier !== 'all' || district !== 'all' || category !== 'all' || hotOnly || needEmail || needIG || notDmd || poolView !== 'all' || q
  const clear = () => {
    setQ(''); setTier('all'); setDistrict('all'); setCategory('all')
    setHotOnly(false); setNeedEmail(false); setNeedIG(false); setNotDmd(false); setPoolView('all')
  }

  return (
    <div className="flex h-full flex-col">
      {/* toolbar */}
      <div className="shrink-0 space-y-3 border-b border-line bg-surface/60 px-6 py-4 backdrop-blur">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[240px] flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
            <input
              className="input pl-9"
              placeholder="Search name, area, category, @handle…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-1.5 rounded-lg border border-line bg-raised p-0.5">
            {['all', 'A', 'B', 'C'].map((t) => (
              <button
                key={t}
                onClick={() => setTier(t)}
                className={`rounded-md px-2.5 py-1 text-xs font-bold transition-all ${
                  tier === t ? 'bg-ink text-white shadow-card' : 'text-muted hover:text-ink'
                }`}
              >
                {t === 'all' ? 'All tiers' : t}
              </button>
            ))}
          </div>
          <select value={sort} onChange={(e) => setSort(e.target.value)} className="rounded-lg border border-line bg-raised px-2.5 py-2 text-sm font-medium text-ink focus:border-accent focus:outline-none">
            {SORTS.map((s) => <option key={s.id} value={s.id}>Sort · {s.label}</option>)}
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <SlidersHorizontal size={14} className="text-faint" />
          <Toggle active={hotOnly} onClick={() => setHotOnly((v) => !v)}>
            <HotDot /> IG-hot
          </Toggle>
          <Toggle active={needIG} onClick={() => setNeedIG((v) => !v)}>
            <Instagram size={12} /> Has Instagram
          </Toggle>
          <Toggle active={needEmail} onClick={() => setNeedEmail((v) => !v)}>@ Has email</Toggle>
          <Toggle active={notDmd} onClick={() => setNotDmd((v) => !v)}>
            <Send size={12} /> Not DM'd
          </Toggle>
          <select value={poolView} onChange={(e) => setPoolView(e.target.value)} className="rounded-lg border border-line bg-raised px-2 py-1.5 text-xs font-semibold text-muted focus:border-accent focus:outline-none">
            <option value="all">All leads</option>
            <option value="untracked">Not in pipeline</option>
            <option value="tracked">In pipeline</option>
            <option value="discarded">Discarded{discardedCount ? ` (${discardedCount})` : ''}</option>
          </select>
          <select value={district} onChange={(e) => setDistrict(e.target.value)} className="rounded-lg border border-line bg-raised px-2 py-1.5 text-xs font-semibold text-muted focus:border-accent focus:outline-none">
            <option value="all">All areas</option>
            {meta.districts.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="max-w-[190px] rounded-lg border border-line bg-raised px-2 py-1.5 text-xs font-semibold capitalize text-muted focus:border-accent focus:outline-none">
            <option value="all">All categories</option>
            {meta.categories.map((c) => <option key={c} value={c} className="capitalize">{c}</option>)}
          </select>
          {anyFilter && (
            <button className="btn-ghost btn text-xs text-accent" onClick={clear}>
              <X size={12} /> Clear
            </button>
          )}
          <div className="ml-auto flex items-center gap-3">
            {!showingDiscarded && discardedCount > 0 && (
              <button
                className="inline-flex items-center gap-1 text-xs font-medium text-faint hover:text-danger"
                onClick={() => setPoolView('discarded')}
                title="Review discarded leads"
              >
                <Ban size={12} /> {fmtNum(discardedCount)} discarded
              </button>
            )}
            <span className="tnum text-xs font-medium text-faint">
              {fmtNum(filtered.length)} {showingDiscarded ? 'discarded' : `of ${fmtNum(leads.length)}`} leads
            </span>
          </div>
        </div>
      </div>

      {/* column header */}
      <div className="grid shrink-0 grid-cols-[1fr_84px_116px_128px_116px_152px] items-center gap-3 border-b border-line px-6 py-2 text-[11px] font-semibold uppercase tracking-wider text-faint">
        <span>Business</span>
        <span className="text-center">Tier · Score</span>
        <span>Rating</span>
        <span>Instagram</span>
        <span>Pipeline</span>
        <span className="text-right">Action</span>
      </div>

      {/* virtual rows */}
      <div ref={parentRef} className="min-h-0 flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="grid h-full place-items-center text-center text-sm text-faint">
            <div>
              <p>No leads match these filters.</p>
              <button className="btn mt-3" onClick={clear}>Clear filters</button>
            </div>
          </div>
        ) : (
          <div style={{ height: rowVirt.getTotalSize(), position: 'relative' }}>
            {rowVirt.getVirtualItems().map((vi) => {
              const l = filtered[vi.index]
              const rec = records[l.id]
              const owner = team.find((m) => m.id === rec?.ownerId)
              return (
                <div
                  key={l.id}
                  onClick={() => onOpen(l)}
                  className="group absolute left-0 top-0 grid w-full cursor-pointer grid-cols-[1fr_84px_116px_128px_116px_152px] items-center gap-3 border-b border-line/70 px-6 hover:bg-accent-soft/30"
                  style={{ height: vi.size, transform: `translateY(${vi.start}px)` }}
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    {l.hot ? <HotDot /> : <span className="h-2 w-2" />}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 truncate font-medium text-ink">{l.name}</div>
                      <div className="truncate text-xs text-faint">
                        {l.area && <span className="tnum">{l.area}</span>}
                        {l.area && ' · '}
                        <span className="capitalize">{l.categories[0]}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-center gap-1.5">
                    <TierTag tier={l.tier} />
                    <span className="tnum text-sm font-semibold text-muted">{l.score}</span>
                  </div>
                  <div className="text-sm">
                    {l.rating != null ? (
                      <span className="inline-flex items-center gap-1">
                        <Star size={12} className="fill-warning text-warning" />
                        <span className="tnum font-medium">{l.rating.toFixed(1)}</span>
                        <span className="tnum text-xs text-faint">{fmtNum(l.reviews)}</span>
                      </span>
                    ) : (
                      <span className="text-faint">—</span>
                    )}
                  </div>
                  <div className="text-sm">
                    {l.instagram ? (
                      <span className="inline-flex items-center gap-1 text-muted">
                        <Instagram size={13} className="text-accent" />
                        <span className="tnum">{fmtFollowers(l.igFollowers)}</span>
                        {rec?.dmStatus && DM_STATUS[rec.dmStatus] && (
                          <span
                            title={DM_STATUS[rec.dmStatus].label}
                            className={`ml-0.5 h-1.5 w-1.5 rounded-full ${DM_STATUS[rec.dmStatus].dot}`}
                          />
                        )}
                      </span>
                    ) : (
                      <span className="text-faint">—</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <StageTag stage={rec?.stage} />
                    {owner && <Avatar member={owner} size={20} />}
                  </div>
                  <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                    {showingDiscarded ? (
                      <button
                        className="btn h-7 gap-1 px-2 text-xs"
                        onClick={() => actions.restore(l.id)}
                        title="Restore to the pool"
                      >
                        <RotateCcw size={13} /> Restore
                      </button>
                    ) : (
                      <>
                        {l.igHandle && (
                          <button
                            className="btn-ghost btn h-7 w-7 shrink-0 p-0 text-accent opacity-0 transition hover:bg-accent-soft group-hover:opacity-100"
                            onClick={() => window.open(igDmUrl(l.igHandle), '_blank', 'noopener,noreferrer')}
                            title={`Open DM with @${l.igHandle}`}
                          >
                            <Send size={14} />
                          </button>
                        )}
                        {rec?.stage ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-positive">
                            <Check size={13} /> Added
                          </span>
                        ) : (
                          <button
                            className="btn h-7 gap-1 px-2 text-xs opacity-0 transition group-hover:opacity-100"
                            onClick={() => actions.setStage(l.id, 'new')}
                            title="Add to pipeline"
                          >
                            <Plus size={13} /> Pipeline
                          </button>
                        )}
                        <button
                          className="btn-ghost btn h-7 w-7 shrink-0 p-0 text-faint opacity-0 transition hover:bg-danger/10 hover:text-danger group-hover:opacity-100"
                          onClick={() => actions.discard(l.id)}
                          title="Discard — hide this lead from the pool"
                        >
                          <Ban size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
