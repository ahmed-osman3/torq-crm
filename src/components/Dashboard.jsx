import { useMemo } from 'react'
import { Flame, Layers, Trophy, Target, ArrowRight, Plus, Instagram, Star } from 'lucide-react'
import { STAGES, actions } from '../lib/store.js'
import { TierTag, Avatar, HotDot } from './ui.jsx'
import { fmtNum, fmtFollowers, initials, STAGE_STYLE } from '../lib/format.js'

function Kpi({ icon: Icon, label, value, sub, tone = 'ink' }) {
  const toneMap = {
    ink: 'text-ink',
    accent: 'text-accent',
    positive: 'text-positive',
    warning: 'text-warning',
  }
  return (
    <div className="card animate-fade-up p-4">
      <div className="flex items-center gap-2 text-faint">
        <Icon size={15} />
        <span className="label">{label}</span>
      </div>
      <div className={`tnum mt-1.5 font-display text-3xl font-semibold ${toneMap[tone]}`}>{value}</div>
      {sub && <div className="mt-0.5 text-xs text-faint">{sub}</div>}
    </div>
  )
}

export default function Dashboard({ leads, records, team, onOpen, goToPool }) {
  const s = useMemo(() => {
    const recs = Object.entries(records)
    const inPipeline = recs.filter(([, r]) => r.stage)
    const byStage = Object.fromEntries(STAGES.map((st) => [st.id, 0]))
    for (const [, r] of inPipeline) if (byStage[r.stage] != null) byStage[r.stage]++
    const tiers = { A: 0, B: 0, C: 0 }
    for (const l of leads) tiers[l.tier] = (tiers[l.tier] || 0) + 1

    const perOwner = {}
    for (const [, r] of inPipeline) {
      const k = r.ownerId || '_un'
      perOwner[k] = perOwner[k] || { total: 0, won: 0, active: 0 }
      perOwner[k].total++
      if (r.stage === 'won') perOwner[k].won++
      else if (r.stage !== 'lost') perOwner[k].active++
    }
    const leaderboard = Object.entries(perOwner)
      .map(([id, v]) => ({ member: team.find((m) => m.id === id), ...v }))
      .sort((a, b) => b.total - a.total)

    const tracked = new Set(recs.map(([id]) => id))
    const topOpps = leads.filter((l) => l.hot && !tracked.has(l.id)).slice(0, 6)

    const contacted = inPipeline.filter(([, r]) => r.stage !== 'new').length
    return {
      total: leads.length,
      hot: leads.filter((l) => l.hot).length,
      pipeline: inPipeline.length,
      won: byStage.won,
      byStage,
      tiers,
      leaderboard,
      topOpps,
      contactRate: inPipeline.length ? Math.round((contacted / inPipeline.length) * 100) : 0,
    }
  }, [leads, records, team])

  const maxStage = Math.max(1, ...STAGES.map((st) => s.byStage[st.id]))

  return (
    <div className="h-full overflow-y-auto px-6 py-6">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Kpi icon={Layers} label="Total leads" value={fmtNum(s.total)} sub="in the scraped pool" />
          <Kpi icon={Flame} label="IG-hot leads" value={fmtNum(s.hot)} sub="Instagram-enriched, high-signal" tone="accent" />
          <Kpi icon={Target} label="In pipeline" value={fmtNum(s.pipeline)} sub={`${s.contactRate}% past first touch`} tone="warning" />
          <Kpi icon={Trophy} label="Won" value={fmtNum(s.won)} sub="closed clients" tone="positive" />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* funnel */}
          <div className="card animate-fade-up p-5 lg:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-lg font-semibold">Pipeline funnel</h3>
              <span className="tnum text-xs text-faint">{fmtNum(s.pipeline)} tracked</span>
            </div>
            {s.pipeline === 0 ? (
              <p className="py-6 text-center text-sm text-faint">
                Nothing in the pipeline yet — add leads from the pool to see the funnel fill in.
              </p>
            ) : (
              <div className="space-y-2.5">
                {STAGES.map((st) => {
                  const n = s.byStage[st.id]
                  const style = STAGE_STYLE[st.id]
                  return (
                    <div key={st.id} className="flex items-center gap-3">
                      <span className="w-20 shrink-0 text-sm font-medium text-muted">{st.label}</span>
                      <div className="h-7 flex-1 overflow-hidden rounded-lg bg-black/[0.04]">
                        <div
                          className={`flex h-full items-center justify-end rounded-lg ${style.bar} px-2 transition-all duration-500`}
                          style={{ width: `${Math.max(n ? 8 : 0, (n / maxStage) * 100)}%` }}
                        >
                          {n > 0 && <span className="tnum text-xs font-bold text-white">{n}</span>}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* tier mix */}
          <div className="card animate-fade-up p-5">
            <h3 className="mb-4 font-display text-lg font-semibold">Lead quality</h3>
            <div className="space-y-4">
              {['A', 'B', 'C'].map((t) => {
                const n = s.tiers[t] || 0
                const pct = Math.round((n / s.total) * 100)
                return (
                  <div key={t}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <TierTag tier={t} /> <span className="text-muted">Tier {t}</span>
                      </span>
                      <span className="tnum font-semibold">{fmtNum(n)}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-black/[0.05]">
                      <div
                        className={`h-full rounded-full ${t === 'A' ? 'bg-positive' : t === 'B' ? 'bg-warning' : 'bg-faint'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* team */}
          <div className="card animate-fade-up p-5">
            <h3 className="mb-4 font-display text-lg font-semibold">Team activity</h3>
            {s.leaderboard.length === 0 ? (
              <p className="py-4 text-center text-sm text-faint">No leads claimed yet.</p>
            ) : (
              <div className="space-y-3">
                {s.leaderboard.map(({ member, total, active, won }) => (
                  <div key={member?.id || 'un'} className="flex items-center gap-3">
                    <Avatar member={member} size={30} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-ink">{member?.name || 'Unassigned'}</div>
                      <div className="tnum text-xs text-faint">
                        {active} active · {won} won
                      </div>
                    </div>
                    <span className="tnum font-display text-xl font-semibold text-ink">{total}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* top opportunities */}
          <div className="card animate-fade-up p-5 lg:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-lg font-semibold">Hot opportunities to grab</h3>
              <button className="btn-ghost btn text-xs text-accent" onClick={goToPool}>
                Open pool <ArrowRight size={13} />
              </button>
            </div>
            {s.topOpps.length === 0 ? (
              <p className="py-4 text-center text-sm text-faint">Every hot lead is already in your pipeline. Nice.</p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {s.topOpps.map((l) => (
                  <div
                    key={l.id}
                    onClick={() => onOpen(l)}
                    className="group flex cursor-pointer items-center gap-3 rounded-lg border border-line bg-surface p-2.5 hover:border-accent/40 hover:bg-accent-soft/25"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <HotDot />
                        <span className="truncate text-sm font-semibold text-ink">{l.name}</span>
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 text-xs text-faint">
                        <TierTag tier={l.tier} />
                        {l.rating != null && (
                          <span className="inline-flex items-center gap-0.5">
                            <Star size={10} className="fill-warning text-warning" />
                            <span className="tnum">{l.rating.toFixed(1)}</span>
                          </span>
                        )}
                        {l.instagram && (
                          <span className="inline-flex items-center gap-0.5">
                            <Instagram size={10} className="text-accent" />
                            <span className="tnum">{fmtFollowers(l.igFollowers)}</span>
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      className="btn h-7 gap-1 px-2 text-xs opacity-0 transition group-hover:opacity-100"
                      onClick={(e) => { e.stopPropagation(); actions.setStage(l.id, 'new') }}
                    >
                      <Plus size={12} /> Add
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
