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

const EMPTY = { records: {}, team: DEFAULT_TEAM, meId: 'u_ahmed', v: 1 }

// --- persistence boundary (swap these two for a backend) ---------------------
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
function persist(s) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s))
  } catch {}
}
// ----------------------------------------------------------------------------

let state = load()
const listeners = new Set()

function set(next) {
  state = next
  persist(state)
  listeners.forEach((l) => l())
}
function subscribe(l) {
  listeners.add(l)
  return () => listeners.delete(l)
}
const getSnapshot = () => state

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
    const team = [...state.team]
    for (const m of incoming.team || []) if (!team.some((t) => t.id === m.id)) team.push(m)
    set({ ...state, records, team })
  },
}
