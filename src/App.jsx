import { useEffect, useMemo, useState } from 'react'
import { LayoutDashboard, Table2, KanbanSquare, Users, Loader2 } from 'lucide-react'
import { useStore } from './lib/store.js'
import { Avatar, Modal } from './components/ui.jsx'
import Dashboard from './components/Dashboard.jsx'
import LeadPool from './components/LeadPool.jsx'
import Pipeline from './components/Pipeline.jsx'
import LeadDrawer from './components/LeadDrawer.jsx'
import TeamModal from './components/TeamModal.jsx'

const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'pool', label: 'Lead Pool', icon: Table2 },
  { id: 'pipeline', label: 'Pipeline', icon: KanbanSquare },
]

export default function App() {
  const store = useStore()
  const [data, setData] = useState(null)
  const [tab, setTab] = useState('dashboard')
  const [openId, setOpenId] = useState(null)
  const [teamOpen, setTeamOpen] = useState(false)

  useEffect(() => {
    fetch(import.meta.env.BASE_URL + 'leads.json')
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData({ leads: [], districts: [], categories: [], count: 0 }))
  }, [])

  const leadsById = useMemo(() => {
    const m = {}
    if (data) for (const l of data.leads) m[l.id] = l
    return m
  }, [data])

  const me = store.team.find((t) => t.id === store.meId)
  const openLead = openId ? leadsById[openId] : null

  if (!data) {
    return (
      <div className="grid h-screen place-items-center text-muted">
        <div className="flex flex-col items-center gap-3 animate-fade-in">
          <Loader2 className="animate-spin text-accent" size={28} />
          <p className="text-sm">Loading leads…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      {/* top bar */}
      <header className="z-20 flex shrink-0 items-center gap-4 border-b border-line bg-surface/80 px-4 backdrop-blur-md">
        <div className="flex items-center gap-2.5 py-3 pr-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-ink font-mono text-sm font-bold text-accent">T</div>
          <div className="leading-none">
            <div className="font-display text-[15px] font-semibold tracking-tight">Torq CRM</div>
            <div className="mt-0.5 text-[10px] font-medium uppercase tracking-wider text-faint">Lead Pipeline</div>
          </div>
        </div>

        <nav className="flex items-center gap-1 rounded-xl border border-line bg-canvas p-1">
          {TABS.map((t) => {
            const Icon = t.icon
            const active = tab === t.id
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
                  active ? 'bg-raised text-ink shadow-card' : 'text-muted hover:text-ink'
                }`}
              >
                <Icon size={15} className={active ? 'text-accent' : ''} />
                {t.label}
              </button>
            )
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setTeamOpen(true)}
            className="btn h-9 gap-2 pl-1.5 pr-3"
            title="Team & sharing"
          >
            <Avatar member={me} size={24} />
            <span className="hidden text-sm sm:inline">{me?.name}</span>
            <span className="mx-0.5 hidden h-4 w-px bg-line sm:block" />
            <Users size={15} className="text-faint" />
          </button>
        </div>
      </header>

      {/* main view */}
      <main className="min-h-0 flex-1">
        {tab === 'dashboard' && (
          <Dashboard
            leads={data.leads}
            records={store.records}
            team={store.team}
            onOpen={(l) => setOpenId(l.id)}
            goToPool={() => setTab('pool')}
          />
        )}
        {tab === 'pool' && (
          <LeadPool
            leads={data.leads}
            records={store.records}
            team={store.team}
            meta={{ districts: data.districts, categories: data.categories }}
            onOpen={(l) => setOpenId(l.id)}
          />
        )}
        {tab === 'pipeline' && (
          <Pipeline leadsById={leadsById} records={store.records} team={store.team} onOpen={(l) => setOpenId(l.id)} />
        )}
      </main>

      {openLead && (
        <LeadDrawer
          lead={openLead}
          record={store.records[openLead.id]}
          team={store.team}
          templates={store.templates}
          meId={store.meId}
          onClose={() => setOpenId(null)}
        />
      )}

      <Modal open={teamOpen} onClose={() => setTeamOpen(false)} title="Team &amp; sharing" wide>
        <TeamModal team={store.team} meId={store.meId} onClose={() => setTeamOpen(false)} />
      </Modal>
    </div>
  )
}
