import { useRef, useState } from 'react'
import { Download, Upload, UserPlus, Check, Users2, Cloud } from 'lucide-react'
import { actions } from '../lib/store.js'
import { Avatar } from './ui.jsx'
import { nowISO } from '../lib/format.js'

export default function TeamModal({ team, meId, onClose }) {
  const [newName, setNewName] = useState('')
  const [imported, setImported] = useState(null)
  const [err, setErr] = useState('')
  const fileRef = useRef(null)

  const exportSnapshot = () => {
    const blob = new Blob([actions.exportState()], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `torq-crm-${nowISO().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const onFile = (e) => {
    setErr('')
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        actions.importState(String(reader.result), { merge: true })
        setImported(file.name)
        setTimeout(() => setImported(null), 2500)
      } catch (x) {
        setErr(x.message || 'Could not read that file.')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  return (
    <div className="space-y-5">
      {/* acting as */}
      <div>
        <div className="label mb-2">You're acting as</div>
        <div className="flex flex-wrap gap-2">
          {team.map((m) => (
            <button
              key={m.id}
              onClick={() => actions.setMe(m.id)}
              className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-sm font-medium transition-all ${
                meId === m.id ? 'border-accent bg-accent-soft text-ink' : 'border-line bg-raised text-muted hover:border-faint'
              }`}
            >
              <Avatar member={m} size={22} />
              {m.name}
              {meId === m.id && <Check size={14} className="text-accent" />}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-faint">
          New notes and claimed leads are attributed to this teammate. Switch before you start working as someone else.
        </p>
      </div>

      {/* add teammate */}
      <div>
        <div className="label mb-2 flex items-center gap-1.5">
          <Users2 size={13} /> Team
        </div>
        <div className="flex gap-2">
          <input
            className="input"
            placeholder="Add a teammate by name…"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newName.trim()) {
                actions.addTeammate(newName)
                setNewName('')
              }
            }}
          />
          <button
            className="btn btn-accent shrink-0"
            disabled={!newName.trim()}
            onClick={() => {
              actions.addTeammate(newName)
              setNewName('')
            }}
          >
            <UserPlus size={15} /> Add
          </button>
        </div>
      </div>

      {/* share */}
      <div className="rounded-xl border border-line bg-surface p-4">
        <div className="label mb-1 flex items-center gap-1.5">
          <Cloud size={13} /> Share with colleagues
        </div>
        <p className="mb-3 text-xs text-muted">
          Export a snapshot of everyone's stages, owners and notes, send it over, and they import it — changes merge in
          (newest edit per lead wins). For always-on live sync, see the README.
        </p>
        <div className="flex flex-wrap gap-2">
          <button className="btn" onClick={exportSnapshot}>
            <Download size={15} /> Export snapshot
          </button>
          <button className="btn" onClick={() => fileRef.current?.click()}>
            <Upload size={15} /> Import &amp; merge
          </button>
          <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={onFile} />
        </div>
        {imported && (
          <p className="mt-2 flex items-center gap-1 text-xs font-medium text-positive">
            <Check size={13} /> Merged {imported}
          </p>
        )}
        {err && <p className="mt-2 text-xs font-medium text-danger">{err}</p>}
      </div>
    </div>
  )
}
