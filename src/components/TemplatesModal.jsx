import { useState } from 'react'
import { Plus, Trash2, Check } from 'lucide-react'
import { actions } from '../lib/store.js'
import { Modal } from './ui.jsx'

const FIELDS = ['name', 'area', 'category', 'rating', 'reviews', 'followers', 'handle', 'district']

export default function TemplatesModal({ open, templates, onClose }) {
  const [editing, setEditing] = useState(null) // template id being edited

  return (
    <Modal open={open} onClose={onClose} title="Message templates" wide>
      <div className="space-y-3">
        <p className="text-xs text-muted">
          Shared with your team. Use merge fields — they fill in per lead when you compose a DM.
        </p>
        <div className="flex flex-wrap gap-1">
          {FIELDS.map((f) => (
            <code key={f} className="rounded border border-line bg-surface px-1.5 py-0.5 font-mono text-[11px] text-muted">
              {'{{'}
              {f}
              {'}}'}
            </code>
          ))}
        </div>

        <div className="max-h-[46vh] space-y-2.5 overflow-y-auto pr-1">
          {templates.map((t) => {
            const isEditing = editing === t.id
            return (
              <div key={t.id} className="card p-3">
                {isEditing ? (
                  <div className="space-y-2">
                    <input
                      className="input font-semibold"
                      defaultValue={t.name}
                      onBlur={(e) => actions.updateTemplate(t.id, { name: e.target.value })}
                    />
                    <textarea
                      className="input min-h-[92px] resize-y"
                      defaultValue={t.body}
                      onBlur={(e) => actions.updateTemplate(t.id, { body: e.target.value })}
                    />
                    <button className="btn btn-accent h-8" onClick={() => setEditing(null)}>
                      <Check size={14} /> Done
                    </button>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-3">
                    <button className="min-w-0 flex-1 text-left" onClick={() => setEditing(t.id)}>
                      <div className="text-sm font-semibold text-ink">{t.name}</div>
                      <p className="mt-0.5 line-clamp-2 whitespace-pre-wrap text-xs text-muted">{t.body}</p>
                    </button>
                    <button
                      className="btn-ghost btn h-7 w-7 shrink-0 p-0 text-faint hover:bg-danger/10 hover:text-danger"
                      onClick={() => actions.deleteTemplate(t.id)}
                      title="Delete template"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
            )
          })}
          {templates.length === 0 && <p className="py-4 text-center text-sm text-faint">No templates yet.</p>}
        </div>

        <button
          className="btn w-full"
          onClick={() => {
            const id = actions.addTemplate({ name: 'New template', body: 'Hi {{name}} — ' })
            setEditing(id)
          }}
        >
          <Plus size={15} /> New template
        </button>
      </div>
    </Modal>
  )
}
