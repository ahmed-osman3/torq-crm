import { useEffect, useState } from 'react'
import { Instagram, Copy, Check, ExternalLink, Send, SlidersHorizontal } from 'lucide-react'
import { actions } from '../lib/store.js'
import { renderTemplate, igDmUrl, timeAgo, DM_STATUS } from '../lib/format.js'
import TemplatesModal from './TemplatesModal.jsx'

const STATUS_ACTIONS = [
  { id: 'sent', label: 'Sent' },
  { id: 'replied', label: 'Replied' },
  { id: 'no_reply', label: 'No reply' },
]

export default function DmComposer({ lead, record, templates, meId }) {
  const [tplId, setTplId] = useState(templates[0]?.id || 'blank')
  const [text, setText] = useState('')
  const [copied, setCopied] = useState(false)
  const [manage, setManage] = useState(false)

  const hasHandle = !!lead.igHandle
  const dmStatus = record?.dmStatus || null

  // Re-render the message whenever the lead or chosen template changes (but not
  // on unrelated re-renders, so in-progress edits survive a status click).
  useEffect(() => {
    const tpl = templates.find((t) => t.id === tplId)
    setText(renderTemplate(tpl?.body || '', lead))
  }, [lead.id, tplId]) // eslint-disable-line react-hooks/exhaustive-deps

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1400)
    } catch {}
  }
  const openDm = () => window.open(igDmUrl(lead.igHandle), '_blank', 'noopener,noreferrer')
  const copyAndOpen = async () => {
    await copy()
    openDm()
  }
  const setStatus = (id) => {
    if (dmStatus === id) return actions.setDmStatus(lead.id, null) // toggle off
    if (id === 'sent') return actions.markDmSent(lead.id, { text, authorId: meId })
    actions.setDmStatus(lead.id, id)
  }

  const sm = dmStatus ? DM_STATUS[dmStatus] : null

  return (
    <div className="mt-4 card p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="flex items-center gap-1.5 label text-accent">
          <Instagram size={13} /> Direct message
        </span>
        {sm && (
          <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-semibold ${sm.bg} ${sm.text}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${sm.dot}`} />
            {sm.label}
            {record?.dmAt && <span className="tnum opacity-70">· {timeAgo(record.dmAt)}</span>}
          </span>
        )}
      </div>

      {!hasHandle ? (
        <p className="rounded-lg bg-surface px-3 py-3 text-center text-xs text-faint">
          No Instagram handle on this lead — nothing to DM.
        </p>
      ) : (
        <>
          <div className="mb-2 flex items-center gap-1.5">
            <select
              value={tplId}
              onChange={(e) => setTplId(e.target.value)}
              className="min-w-0 flex-1 rounded-lg border border-line bg-raised px-2 py-1.5 text-sm font-medium text-ink focus:border-accent focus:outline-none"
            >
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
              <option value="blank">Blank message</option>
            </select>
            <button className="btn-ghost btn h-8 w-8 shrink-0 p-0 text-faint" title="Manage templates" onClick={() => setManage(true)}>
              <SlidersHorizontal size={15} />
            </button>
          </div>

          <textarea
            className="input min-h-[104px] resize-y text-sm leading-relaxed"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Write your message…"
          />

          <div className="mt-2 flex gap-2">
            <button className="btn btn-accent flex-1" onClick={copyAndOpen} disabled={!text.trim()}>
              <ExternalLink size={14} /> Copy &amp; open DM
            </button>
            <button className="btn h-9 w-9 shrink-0 p-0" title="Copy message" onClick={copy} disabled={!text.trim()}>
              {copied ? <Check size={15} className="text-positive" /> : <Copy size={15} />}
            </button>
          </div>
          <p className="mt-1.5 text-[11px] text-faint">
            Opens the chat in Instagram with your message copied — just paste &amp; send, then mark it below.
          </p>

          <div className="mt-2.5 flex items-center gap-1.5 border-t border-line pt-2.5">
            <Send size={13} className="text-faint" />
            <span className="label mr-1">Mark</span>
            {STATUS_ACTIONS.map((s) => {
              const active = dmStatus === s.id
              return (
                <button
                  key={s.id}
                  onClick={() => setStatus(s.id)}
                  className={`rounded-lg border px-2.5 py-1 text-xs font-semibold transition-all ${
                    active ? 'border-accent bg-accent text-white' : 'border-line bg-raised text-muted hover:border-faint hover:text-ink'
                  }`}
                >
                  {s.label}
                </button>
              )
            })}
          </div>
        </>
      )}

      <TemplatesModal open={manage} templates={templates} onClose={() => setManage(false)} />
    </div>
  )
}
