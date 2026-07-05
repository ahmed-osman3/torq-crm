import { useRef, useState } from 'react'
import { Plus, Trash2, Instagram, CornerDownRight } from 'lucide-react'
import { actions } from '../lib/store.js'
import { renderTemplate } from '../lib/format.js'
import { Modal } from './ui.jsx'

const FIELDS = ['name', 'area', 'category', 'rating', 'reviews', 'followers', 'handle', 'district']

// A representative lead so the preview shows what merge fields become.
const SAMPLE = {
  name: 'Fast Lane Styling',
  area: 'RM6',
  district: 'RM',
  categories: ['car window tinting'],
  igHandle: 'fastlanestyling',
  rating: 4.3,
  reviews: 988,
  igFollowers: 91453,
}

function TemplateCard({ tpl }) {
  const [name, setName] = useState(tpl.name)
  const [body, setBody] = useState(tpl.body)
  const bodyRef = useRef(null)

  const save = () => {
    if (name !== tpl.name || body !== tpl.body) actions.updateTemplate(tpl.id, { name, body })
  }
  // Insert a merge field at the cursor (or append) — the fiddly bit made easy.
  const insertField = (f) => {
    const token = `{{${f}}}`
    const el = bodyRef.current
    const start = el ? el.selectionStart : body.length
    const end = el ? el.selectionEnd : body.length
    const next = body.slice(0, start) + token + body.slice(end)
    setBody(next)
    requestAnimationFrame(() => {
      if (!el) return
      el.focus()
      const pos = start + token.length
      el.setSelectionRange(pos, pos)
    })
  }

  return (
    <div className="card p-3.5">
      <div className="flex items-center gap-2">
        <input
          className="input flex-1 font-semibold"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={save}
          placeholder="Template name"
        />
        <button
          className="btn-ghost btn h-8 w-8 shrink-0 p-0 text-faint hover:bg-danger/10 hover:text-danger"
          onClick={() => actions.deleteTemplate(tpl.id)}
          title="Delete template"
        >
          <Trash2 size={15} />
        </button>
      </div>

      <textarea
        ref={bodyRef}
        className="input mt-2 min-h-[96px] resize-y text-sm leading-relaxed"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onBlur={save}
        placeholder="Write your message… click a field below to drop it in."
      />

      <div className="mt-2 flex flex-wrap items-center gap-1">
        <span className="mr-0.5 text-[11px] font-medium text-faint">Insert:</span>
        {FIELDS.map((f) => (
          <button
            key={f}
            onMouseDown={(e) => e.preventDefault()} // keep textarea selection
            onClick={() => insertField(f)}
            className="rounded border border-line bg-surface px-1.5 py-0.5 font-mono text-[11px] text-muted transition-colors hover:border-accent hover:bg-accent-soft hover:text-accent"
          >
            {`{{${f}}}`}
          </button>
        ))}
      </div>

      <div className="mt-2.5 flex items-start gap-1.5 rounded-lg bg-surface px-3 py-2">
        <CornerDownRight size={13} className="mt-0.5 shrink-0 text-faint" />
        <div className="min-w-0">
          <div className="label mb-0.5">Preview · {SAMPLE.name}</div>
          <p className="whitespace-pre-wrap text-xs leading-relaxed text-ink">
            {renderTemplate(body, SAMPLE) || <span className="text-faint">Empty message</span>}
          </p>
        </div>
      </div>
    </div>
  )
}

export default function TemplatesModal({ open, templates, onClose }) {
  return (
    <Modal open={open} onClose={onClose} title="Message templates" wide>
      <div className="space-y-3">
        <p className="flex items-center gap-1.5 text-xs text-muted">
          <Instagram size={13} className="text-accent" />
          Shared with your whole team &amp; synced. Edits save automatically. Merge fields fill in
          per lead when you compose a DM.
        </p>

        <div className="max-h-[54vh] space-y-3 overflow-y-auto pr-1">
          {templates.map((t) => (
            <TemplateCard key={t.id} tpl={t} />
          ))}
          {templates.length === 0 && (
            <p className="py-6 text-center text-sm text-faint">No templates yet — create your first below.</p>
          )}
        </div>

        <button
          className="btn btn-accent w-full"
          onClick={() => actions.addTemplate({ name: 'New template', body: 'Hi {{name}} — ' })}
        >
          <Plus size={15} /> New template
        </button>
      </div>
    </Modal>
  )
}
