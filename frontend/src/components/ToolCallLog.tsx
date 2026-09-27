import { CheckCircle2, ClipboardList, XCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { api, ApiError } from '../lib/api'
import type { ToolCall } from '../lib/types'

interface Props {
  workspaceId: string
}

export default function ToolCallLog({ workspaceId }: Props) {
  const [calls, setCalls] = useState<ToolCall[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    api
      .listToolCalls(workspaceId)
      .then(setCalls)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load tool call log'))
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
  if (calls.length === 0)
    return (
      <div
        className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center"
        style={{ borderColor: 'var(--border)' }}
      >
        <ClipboardList size={26} style={{ color: 'var(--text-muted)' }} />
        <p className="mt-3 max-w-xs text-sm" style={{ color: 'var(--text-muted)' }}>
          No tool calls yet. Ask the assistant to save a task or send a notification.
        </p>
      </div>
    )

  return (
    <div className="overflow-hidden rounded-lg border bg-white shadow-sm" style={{ borderColor: 'var(--border)' }}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm" style={{ tableLayout: 'fixed' }}>
          <colgroup>
            <col style={{ width: '15%' }} />
            <col style={{ width: '13%' }} />
            <col style={{ width: '28%' }} />
            <col style={{ width: '28%' }} />
            <col style={{ width: '16%' }} />
          </colgroup>
          <thead>
            <tr className="border-b" style={{ borderColor: 'var(--border)', background: '#fafafd' }}>
              <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                When
              </th>
              <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                Tool
              </th>
              <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                Arguments
              </th>
              <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                Result
              </th>
              <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {calls.map((c, i) => (
              <tr key={c.id} className={i !== calls.length - 1 ? 'border-b' : ''} style={{ borderColor: 'var(--border)' }}>
                <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
                  {new Date(c.created_at).toLocaleString()}
                </td>
                <td className="px-4 py-3 font-semibold" style={{ color: 'var(--text)' }}>
                  {c.tool_name}
                </td>
                <td
                  className="truncate px-4 py-3 font-mono text-xs"
                  style={{ color: 'var(--text-muted)' }}
                  title={JSON.stringify(c.arguments)}
                >
                  {JSON.stringify(c.arguments)}
                </td>
                <td
                  className="truncate px-4 py-3 font-mono text-xs"
                  style={{ color: 'var(--text-muted)' }}
                  title={JSON.stringify(c.result)}
                >
                  {JSON.stringify(c.result)}
                </td>
                <td className="px-4 py-3">
                  <span
                    className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold"
                    style={
                      c.status === 'success'
                        ? { background: 'var(--success-soft)', color: 'var(--success)' }
                        : { background: 'var(--danger-soft)', color: 'var(--danger)' }
                    }
                  >
                    {c.status === 'success' ? <CheckCircle2 size={11} /> : <XCircle size={11} />}
                    {c.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
