import { CheckSquare, ListTodo } from 'lucide-react'
import { useEffect, useState } from 'react'
import { api, ApiError } from '../lib/api'
import type { Task } from '../lib/types'

interface Props {
  workspaceId: string
}

export default function TasksPanel({ workspaceId }: Props) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    api
      .listTasks(workspaceId)
      .then(setTasks)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load tasks'))
      .finally(() => setLoading(false))
  }, [workspaceId])

  if (loading)
    return (
      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
        Loading…
      </p>
    )
  if (error)
    return (
      <p className="rounded-lg px-3 py-2 text-sm" style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>
        {error}
      </p>
    )
  if (tasks.length === 0)
    return (
      <div
        className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center"
        style={{ borderColor: 'var(--border)' }}
      >
        <ListTodo size={26} style={{ color: 'var(--text-muted)' }} />
        <p className="mt-3 text-sm" style={{ color: 'var(--text-muted)' }}>
          No tasks yet. Ask the assistant to save one via chat.
        </p>
      </div>
    )

  return (
    <div className="space-y-2">
      {tasks.map((t) => (
        <div
          key={t.id}
          className="flex gap-3 rounded-lg border bg-white px-4 py-3 transition hover:border-slate-300"
          style={{ borderColor: 'var(--border)' }}
        >
          <div
            className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md"
            style={{ background: 'var(--primary-soft)' }}
          >
            <CheckSquare size={13} style={{ color: 'var(--primary)' }} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                {t.title}
              </p>
              <span
                className="shrink-0 rounded-full px-2 py-0.5 text-xs font-medium"
                style={{ background: '#f4f5fa', color: 'var(--text-muted)' }}
              >
                {t.status}
              </span>
            </div>
            {t.description && (
              <p className="mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                {t.description}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
