import { Building2, ChevronDown, Plus } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import type { Workspace } from '../lib/types'

interface Props {
  workspaces: Workspace[]
  activeId: string | null
  onSelect: (id: string) => void
  onCreate: (name: string) => Promise<void>
}

export default function WorkspaceSwitcher({ workspaces, activeId, onSelect, onCreate }: Props) {
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setBusy(true)
    try {
      await onCreate(name.trim())
      setName('')
      setCreating(false)
    } finally {
      setBusy(false)
    }
  }

  if (creating) {
    return (
      <form onSubmit={handleCreate} className="space-y-1.5">
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Escape' && setCreating(false)}
          placeholder="Workspace name"
          className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
          style={{ borderColor: 'var(--primary)' }}
        />
        <div className="flex gap-1.5">
          <button
            type="submit"
            disabled={busy}
            className="flex-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
            style={{ background: 'var(--primary)' }}
          >
            Create
          </button>
          <button
            type="button"
            onClick={() => setCreating(false)}
            className="rounded-lg px-2 py-1.5 text-xs font-medium"
            style={{ color: 'var(--text-muted)' }}
          >
            Cancel
          </button>
        </div>
      </form>
    )
  }

  return (
    <div className="space-y-1.5">
      <div className="relative">
        <Building2
          size={15}
          className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2"
          style={{ color: 'var(--text-muted)' }}
        />
        <select
          value={activeId ?? ''}
          onChange={(e) => onSelect(e.target.value)}
          className="w-full cursor-pointer appearance-none rounded-lg border bg-white py-2 pl-8 pr-8 text-sm font-medium outline-none"
          style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
        >
          {workspaces.length === 0 && <option value="">No workspaces yet</option>}
          {workspaces.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
        </select>
        <ChevronDown
          size={15}
          className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2"
          style={{ color: 'var(--text-muted)' }}
        />
      </div>

      <button
        type="button"
        onClick={() => setCreating(true)}
        className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed px-2 py-1.5 text-xs font-medium transition hover:border-solid"
        style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = 'var(--primary)'
          e.currentTarget.style.color = 'var(--primary)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'var(--border)'
          e.currentTarget.style.color = 'var(--text-muted)'
        }}
      >
        <Plus size={13} strokeWidth={2.5} />
        New workspace
      </button>
    </div>
  )
}
