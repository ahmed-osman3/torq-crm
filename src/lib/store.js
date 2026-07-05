// ---------------------------------------------------------------------------
// CRM state store — the ONLY place that owns mutable team state.
//
// Leads themselves are static (scraped) and loaded separately. Everything the
// team creates on top of a lead — stage, owner, notes — lives here, keyed by
// lead id, and is persisted to localStorage.
//
// This is deliberately a thin external store (subscribe / getSnapshot) so that
// swapping localStorage for a shared backend (Supabase) later touches ONLY the
// `persist` + `load` functions below — the rest of the app never changes.
// See README "Turning on live team sync".
// ---------------------------------------------------------------------------

import { useSyncExternalStore } from 'react'
import { uid, nowISO } from './format.js'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './sync-config.js'

const KEY = 'torq-crm:v1'

export const STAGES = [
  { id: 'new', label: 'New', hint: 'Pulled into the pipeline', color: 'faint' },
  { id: 'contacted', label: 'Contacted', hint: 'Reached out', color: 'accent' },
  { id: 'replied', label: 'Replied', hint: 'They responded', color: 'sky' },
  { id: 'qualified', label: 'Qualified', hint: 'Good fit, worth pursuing', color: 'warning' },
  { id: 'won', label: 'Won', hint: 'Closed / client', color: 'positive' },
  { id: 'lost', label: 'Lost', hint: 'Not now', color: 'danger' },
]
export const STAGE_IDS = STAGES.map((s) => s.id)
export const stageMeta = (id) => STAGES.find((s) => s.id === id)

const DEFAULT_TEAM = [
  { id: 'u_ahmed', name: 'Ahmed', color: '#E8552B' },
  { id: 'u_teammate', name: 'Teammate', color: '#2E7D53' },
]

// Shared, editable Instagram DM templates. Fixed ids so the same default lands on
// every device (union-by-id dedupes them instead of multiplying). {{merge}} fields
// are filled per-lead — see renderTemplate() in format.js.
const DEFAULT_TEMPLATES = [
  {
    id: 'tpl_intro',
    name: 'Cold intro',
    body: "Hi {{name}} 👋 came across your Instagram and love the work. We help {{category}} businesses around {{area}} pull more booked-in jobs straight from IG. Mind if I share a quick idea?",
    updatedAt: '2020-01-01T00:00:00.000Z',
  },
  {
    id: 'tpl_reviews',
    name: 'Compliment + hook',
    body: "Hey {{name}}, your {{rating}}★ ({{reviews}} reviews) speak for themselves. We're working with a few detailers & tinters around {{area}} on getting more enquiries from Instagram — reckon it'd suit you. Open to a quick chat?",
    updatedAt: '2020-01-01T00:00:00.000Z',
  },
  {
    id: 'tpl_direct',
    name: 'Short & direct',
    body: "Hi {{name}}, do you take new enquiries through Instagram? Got a quick question about your {{category}} service.",
    updatedAt: '2020-01-01T00:00:00.000Z',
  },
]

const EMPTY = { records: {}, team: DEFAULT_TEAM, templates: DEFAULT_TEMPLATES, meId: 'u_ahmed', v: 1 }

// --- persistence boundary ----------------------------------------------------
// localStorage is the instant, offline-safe local cache. Shared team sync (below)
// layers on top via Supabase REST — the two coexist, so the app works with or
// without a backend configured.
function load() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...EMPTY }
    const parsed = JSON.parse(raw)
    return { ...EMPTY, ...parsed, records: parsed.records || {} }
  } catch {
    return { ...EMPTY }
  }
}
function persistLocal(s) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s))
  } catch {}
}
// ----------------------------------------------------------------------------

let state = load()
const listeners = new Set()
const notify = () => listeners.forEach((l) => l())

// A local user action: cache, notify, and fan out to teammates.
function set(next) {
  state = next
  persistLocal(state)
  notify()
  schedulePush()
}
// Remote changes arriving from a teammate: cache + notify, but DON'T re-push.
function applyRemote(next) {
  state = next
  persistLocal(state)
  notify()
}
function subscribe(l) {
  listeners.add(l)
  return () => listeners.delete(l)
}
const getSnapshot = () => state

// --- shared team sync over Supabase REST (fetch-only, no SDK) -----------------
// Only `records` + `team` are shared; `meId` (who am I) stays per-device. Merge
// is per-record newest-wins with note union, so concurrent edits don't clobber.
const SYNC = !!(SUPABASE_URL && SUPABASE_ANON_KEY)
const REST = SYNC ? `${SUPABASE_URL}/rest/v1/crm_state` : null
const HEADERS = { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' }

function mergeRecords(a = {}, b = {}) {
  const out = { ...a }
  for (const [id, rb] of Object.entries(b)) {
    const ra = out[id]
    if (!ra) { out[id] = rb; continue }
    const base = (rb.updatedAt || '') > (ra.updatedAt || '') ? rb : ra
    const notes = new Map()
    for (const n of ra.notes || []) notes.set(n.id, n)
    for (const n of rb.notes || []) if (!notes.has(n.id)) notes.set(n.id, n)
    out[id] = { ...base, notes: [...notes.values()].sort((x, y) => (x.ts || '').localeCompare(y.ts || '')) }
  }
  return out
}
function mergeTeam(a = [], b = []) {
  const byId = new Map(a.map((m) => [m.id, m]))
  for (const m of b) if (!byId.has(m.id)) byId.set(m.id, m)
  return [...byId.values()]
}
// Templates: union by id, newest content wins (edits propagate). Deletes aren't
// tombstoned, so a template removed on one device can reappear from another.
function mergeTemplates(a = [], b = []) {
  const byId = new Map(a.map((t) => [t.id, t]))
  for (const t of b) {
    const cur = byId.get(t.id)
    if (!cur || (t.updatedAt || '') > (cur.updatedAt || '')) byId.set(t.id, t)
  }
  return [...byId.values()]
}
async function pullRemote() {
  const r = await fetch(`${REST}?id=eq.shared&select=data`, { headers: HEADERS })
  if (!r.ok) return null
  const rows = await r.json()
  return rows[0]?.data || { records: {}, team: [], templates: [] }
}
async function pushRemote() {
  await fetch(REST, {
    method: 'POST',
    headers: { ...HEADERS, Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify([
      { id: 'shared', data: { records: state.records, team: state.team, templates: state.templates }, updated_at: nowISO() },
    ]),
  })
}
function mergedFrom(remote) {
  const records = mergeRecords(state.records, remote.records)
  const team = mergeTeam(state.team, remote.team)
  const templates = mergeTemplates(state.templates, remote.templates)
  const changed =
    JSON.stringify([records, team, templates]) !== JSON.stringify([state.records, state.team, state.templates])
  return { changed, next: { ...state, records, team, templates } }
}
async function syncOnce() {
  try {
    const remote = await pullRemote()
    if (!remote) return
    const { changed, next } = mergedFrom(remote)
    if (changed) applyRemote(next)
  } catch {}
}
let pushTimer = null
function schedulePush() {
  if (!SYNC) return
  clearTimeout(pushTimer)
  pushTimer = setTimeout(async () => {
    try {
      const remote = await pullRemote() // merge in any concurrent remote change first
      if (remote) { const { changed, next } = mergedFrom(remote); if (changed) applyRemote(next) }
      await pushRemote()
    } catch {}
  }, 800)
}
if (SYNC) {
  syncOnce()
  setInterval(syncOnce, 4000)
  if (typeof window !== 'undefined') window.addEventListener('focus', syncOnce)
}

// React binding
export function useStore() {
  return useSyncExternalStore(subscribe, getSnapshot)
}

// A lead's record, creating a shell if the lead has never been touched.
function ensure(records, id) {
  if (records[id]) return records[id]
  return { stage: null, ownerId: null, notes: [], addedAt: null, updatedAt: null }
}

// --- actions -----------------------------------------------------------------
export const actions = {
  setStage(id, stage) {
    const records = { ...state.records }
    const rec = { ...ensure(records, id) }
    if (!rec.addedAt) rec.addedAt = nowISO()
    rec.stage = stage
    rec.discarded = false // pulling into a stage un-discards
    rec.updatedAt = nowISO()
    if (rec.ownerId == null) rec.ownerId = state.meId // auto-claim on first move
    records[id] = rec
    set({ ...state, records })
  },
  removeFromPipeline(id) {
    const records = { ...state.records }
    delete records[id]
    set({ ...state, records })
  },
  // Discard = "this lead is no good" — hide it from the pool and drop it from
  // the pipeline. Reversible via restore(); it never touches the scraped data.
  discard(id) {
    const records = { ...state.records }
    const rec = { ...ensure(records, id) }
    rec.discarded = true
    rec.stage = null
    rec.updatedAt = nowISO()
    records[id] = rec
    set({ ...state, records })
  },
  restore(id) {
    const records = { ...state.records }
    const rec = records[id]
    if (!rec) return
    // If the lead had no other history, forget it entirely (back to a clean pool lead).
    if (!rec.stage && (!rec.notes || rec.notes.length === 0)) {
      delete records[id]
    } else {
      records[id] = { ...rec, discarded: false, updatedAt: nowISO() }
    }
    set({ ...state, records })
  },
  assign(id, ownerId) {
    const records = { ...state.records }
    const rec = { ...ensure(records, id) }
    if (!rec.stage) {
      rec.stage = 'new'
      rec.addedAt = nowISO()
    }
    rec.discarded = false
    rec.ownerId = ownerId
    rec.updatedAt = nowISO()
    records[id] = rec
    set({ ...state, records })
  },
  addNote(id, text, authorId) {
    const t = text.trim()
    if (!t) return
    const records = { ...state.records }
    const rec = { ...ensure(records, id) }
    if (!rec.stage) {
      rec.stage = 'new'
      rec.addedAt = nowISO()
    }
    rec.discarded = false
    rec.notes = [...(rec.notes || []), { id: uid(), text: t, authorId: authorId || state.meId, ts: nowISO() }]
    rec.updatedAt = nowISO()
    records[id] = rec
    set({ ...state, records })
  },
  deleteNote(id, noteId) {
    const records = { ...state.records }
    const rec = records[id]
    if (!rec) return
    records[id] = { ...rec, notes: (rec.notes || []).filter((n) => n.id !== noteId) }
    set({ ...state, records })
  },

  // --- Instagram DM outreach ---
  // Marking a DM as sent is an outreach action: it advances the lead to
  // "contacted" (if not further along), claims it, and logs the message.
  markDmSent(id, { text, authorId } = {}) {
    const records = { ...state.records }
    const rec = { ...ensure(records, id) }
    if (!rec.stage || rec.stage === 'new') { rec.stage = 'contacted'; if (!rec.addedAt) rec.addedAt = nowISO() }
    rec.discarded = false
    rec.dmStatus = 'sent'
    rec.dmAt = nowISO()
    if (rec.ownerId == null) rec.ownerId = authorId || state.meId
    const body = (text || '').trim()
    rec.notes = [
      ...(rec.notes || []),
      { id: uid(), text: body ? `📩 DM sent:\n${body}` : '📩 DM sent', authorId: authorId || state.meId, ts: nowISO() },
    ]
    rec.updatedAt = nowISO()
    records[id] = rec
    set({ ...state, records })
  },
  // Set/clear DM status directly (replied · no_reply · sent · null to reset).
  setDmStatus(id, dmStatus) {
    const records = { ...state.records }
    const rec = { ...ensure(records, id) }
    rec.dmStatus = dmStatus || null
    if (dmStatus && !rec.dmAt) rec.dmAt = nowISO()
    rec.updatedAt = nowISO()
    records[id] = rec
    set({ ...state, records })
  },

  // --- message templates (shared across the team) ---
  addTemplate({ name, body }) {
    const t = { id: 'tpl_' + uid(), name: (name || 'Untitled').trim(), body: body || '', updatedAt: nowISO() }
    set({ ...state, templates: [...state.templates, t] })
    return t.id
  },
  updateTemplate(tid, patch) {
    set({
      ...state,
      templates: state.templates.map((t) => (t.id === tid ? { ...t, ...patch, updatedAt: nowISO() } : t)),
    })
  },
  deleteTemplate(tid) {
    set({ ...state, templates: state.templates.filter((t) => t.id !== tid) })
  },
  setMe(meId) {
    set({ ...state, meId })
  },
  addTeammate(name) {
    const n = name.trim()
    if (!n) return
    const palette = ['#E8552B', '#2E7D53', '#2563C9', '#B7822C', '#8B4FB8', '#0E9AA7', '#C0392B']
    const color = palette[state.team.length % palette.length]
    const member = { id: 'u_' + uid(), name: n, color }
    set({ ...state, team: [...state.team, member] })
    return member.id
  },
  renameTeammate(id, name) {
    const n = name.trim()
    if (!n) return
    set({ ...state, team: state.team.map((m) => (m.id === id ? { ...m, name: n } : m)) })
  },
  // Export / import — the "share a snapshot" path for local-mode collaboration.
  exportState() {
    return JSON.stringify({ ...state, exportedAt: nowISO() }, null, 2)
  },
  importState(json, { merge = true } = {}) {
    const incoming = JSON.parse(json)
    if (!incoming || typeof incoming !== 'object' || !incoming.records) {
      throw new Error('That file does not look like a Torq CRM export.')
    }
    if (!merge) {
      set({ ...EMPTY, ...incoming, records: incoming.records || {} })
      return
    }
    // Merge: newest-updatedAt wins per lead; union of teams.
    const records = { ...state.records }
    for (const [id, rec] of Object.entries(incoming.records)) {
      const cur = records[id]
      if (!cur || (rec.updatedAt || '') > (cur.updatedAt || '')) records[id] = rec
    }
    const team = mergeTeam(state.team, incoming.team)
    const templates = mergeTemplates(state.templates, incoming.templates)
    set({ ...state, records, team, templates })
  },
}
