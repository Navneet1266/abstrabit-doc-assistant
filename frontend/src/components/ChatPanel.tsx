import { Bot, ChevronDown, MessageSquare, Search, Send, Wrench } from 'lucide-react'
import { Fragment, useEffect, useRef, useState, type FormEvent } from 'react'
import { api, ApiError } from '../lib/api'
import type { ChatMessage, ToolCall } from '../lib/types'

interface Props {
  workspaceId: string
}

// Minimal, safe **bold** rendering for assistant text - split on the marker
// pairs and render alternating plain/bold spans. Deliberately not a full
// markdown parser and never uses dangerouslySetInnerHTML: model output is
// untrusted text, so it stays plain strings passed through React, never HTML.
function renderWithBold(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return <strong key={i}>{part.slice(2, -2)}</strong>
    }
    return <Fragment key={i}>{part}</Fragment>
  })
}

function Avatar({ role }: { role: 'user' | 'assistant' }) {
  if (role === 'assistant') {
    return (
      <div
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white"
        style={{ background: 'var(--primary)' }}
      >
        <Bot size={14} strokeWidth={2} />
      </div>
    )
  }
  return (
    <div
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
      style={{ background: 'var(--primary-soft)', color: 'var(--primary-hover)' }}
    >
      Y
    </div>
  )
}

export default function ChatPanel({ workspaceId }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [input, setInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [toolCallsByMessage, setToolCallsByMessage] = useState<Record<string, ToolCall[]>>({})
  const [expandedDebug, setExpandedDebug] = useState<Record<string, boolean>>({})
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setLoading(true)
    setToolCallsByMessage({})
    api
      .listMessages(workspaceId)
      .then(setMessages)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load chat history'))
      .finally(() => setLoading(false))
  }, [workspaceId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, sending])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const text = input.trim()
    if (!text || sending) return
    setInput('')
    setError(null)

    const optimisticUser: ChatMessage = {
      id: `pending-${Date.now()}`,
      role: 'user',
      content: text,
      citations: [],
      retrieved_chunks: [],
      created_at: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, optimisticUser])
    setSending(true)

    try {
      const response = await api.sendMessage(workspaceId, text)
      setMessages((prev) => [...prev, response.message])
      if (response.tool_calls.length > 0) {
        setToolCallsByMessage((prev) => ({ ...prev, [response.message.id]: response.tool_calls }))
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to send message')
    } finally {
      setSending(false)
    }
  }

  return (
    <div
      className="flex h-[calc(100vh-14rem)] min-h-[420px] flex-col overflow-hidden rounded-lg border bg-white shadow-sm"
      style={{ borderColor: 'var(--border)' }}
    >
      <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
        {loading ? (
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Loading…
          </p>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div
              className="mb-3 flex h-11 w-11 items-center justify-center rounded-full"
              style={{ background: 'var(--primary-soft)' }}
            >
              <MessageSquare size={18} style={{ color: 'var(--primary)' }} />
            </div>
            <p className="max-w-xs text-sm" style={{ color: 'var(--text-muted)' }}>
              Ask a question about this workspace's documents, or ask the assistant to save a task or
              send a Discord notification.
            </p>
          </div>
        ) : (
          messages.map((m) => (
            <div key={m.id} className={`flex gap-2.5 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <Avatar role={m.role} />
              <div
                className={`max-w-[78%] whitespace-pre-wrap rounded-lg px-4 py-2.5 text-sm leading-relaxed ${
                  m.role === 'user' ? 'text-white' : ''
                }`}
                style={
                  m.role === 'user'
                    ? { background: 'var(--primary)' }
                    : { background: '#f4f5fa', color: 'var(--text)' }
                }
              >
                {m.role === 'assistant' ? renderWithBold(m.content) : m.content}

                {m.role === 'assistant' && m.citations.length > 0 && (
                  <div className="mt-2.5 border-t pt-2 text-xs" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                    <p className="font-semibold" style={{ color: 'var(--text)' }}>
                      Sources
                    </p>
                    <ul className="mt-1 space-y-0.5">
                      {m.citations.map((c) => (
                        <li key={c.marker}>
                          [{c.marker}] {c.filename} (chunk {c.chunk_index})
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {m.role === 'assistant' && toolCallsByMessage[m.id] && (
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {toolCallsByMessage[m.id].map((tc) => (
                      <span
                        key={tc.id}
                        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
                        style={
                          tc.status === 'success'
                            ? { background: 'var(--success-soft)', color: 'var(--success)' }
                            : { background: 'var(--danger-soft)', color: 'var(--danger)' }
                        }
                      >
                        <Wrench size={10} strokeWidth={2.5} />
                        {tc.tool_name}: {tc.status}
                      </span>
                    ))}
                  </div>
                )}

                {m.role === 'assistant' && m.retrieved_chunks.length > 0 && (
                  <div className="mt-2.5">
                    <button
                      type="button"
                      onClick={() => setExpandedDebug((prev) => ({ ...prev, [m.id]: !prev[m.id] }))}
                      className="inline-flex items-center gap-1 text-xs font-semibold transition hover:opacity-80"
                      style={{ color: 'var(--primary)' }}
                    >
                      <Search size={11} strokeWidth={2.5} />
                      {expandedDebug[m.id] ? 'Hide retrieval debug' : 'Show retrieval debug'}
                      <ChevronDown
                        size={12}
                        className="transition-transform"
                        style={{ transform: expandedDebug[m.id] ? 'rotate(180deg)' : 'none' }}
                      />
                    </button>
                    {expandedDebug[m.id] && (
                      <div className="mt-2 space-y-2 rounded-lg border bg-white p-2.5 text-xs" style={{ borderColor: 'var(--border)' }}>
                        {m.retrieved_chunks.map((rc, i) => (
                          <div key={i} className="border-b pb-2 last:border-0 last:pb-0" style={{ borderColor: 'var(--border)' }}>
                            <p className="font-semibold" style={{ color: 'var(--text)' }}>
                              {rc.filename} · chunk {rc.chunk_index} ·{' '}
                              <span style={{ color: 'var(--primary)' }}>score {rc.score.toFixed(3)}</span>
                            </p>
                            <p className="mt-0.5" style={{ color: 'var(--text-muted)' }}>
                              {rc.content_preview}…
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        {sending && (
          <div className="flex items-center gap-2.5">
            <Avatar role="assistant" />
            <div className="flex items-center gap-1 rounded-lg px-4 py-3" style={{ background: '#f4f5fa' }}>
              <span className="pulse-dot h-1.5 w-1.5 rounded-full" style={{ background: 'var(--text-muted)', animationDelay: '0ms' }} />
              <span className="pulse-dot h-1.5 w-1.5 rounded-full" style={{ background: 'var(--text-muted)', animationDelay: '200ms' }} />
              <span className="pulse-dot h-1.5 w-1.5 rounded-full" style={{ background: 'var(--text-muted)', animationDelay: '400ms' }} />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {error && (
        <p className="border-t px-5 py-2 text-sm" style={{ borderColor: 'var(--border)', background: 'var(--danger-soft)', color: 'var(--danger)' }}>
          {error}
        </p>
      )}

      <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t p-3" style={{ borderColor: 'var(--border)' }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about this workspace's documents…"
          className="flex-1 rounded-lg border px-3.5 py-2.5 text-sm outline-none transition"
          style={{ borderColor: 'var(--border)' }}
          onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--primary)')}
          onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
        />
        <button
          type="submit"
          disabled={sending || !input.trim()}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white shadow-sm transition disabled:opacity-40"
          style={{ background: 'var(--primary)' }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--primary-hover)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--primary)')}
        >
          <Send size={14} strokeWidth={2.25} />
        </button>
      </form>
    </div>
  )
}
