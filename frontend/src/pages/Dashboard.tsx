import { CheckSquare, FileText, Layers, LogOut, MessageSquare, Wrench } from 'lucide-react'
import { useEffect, useState } from 'react'
import ChatPanel from '../components/ChatPanel'
import DocumentsPanel from '../components/DocumentsPanel'
import TasksPanel from '../components/TasksPanel'
import ToolCallLog from '../components/ToolCallLog'
import WorkspaceSwitcher from '../components/WorkspaceSwitcher'
import { api } from '../lib/api'
import { supabase } from '../lib/supabaseClient'
import type { Workspace } from '../lib/types'

type Tab = 'chat' | 'documents' | 'tasks' | 'tool-calls'

const TABS: { key: Tab; label: string; icon: typeof MessageSquare; hint: string }[] = [
  { key: 'chat', label: 'Chat', icon: MessageSquare, hint: 'Ask grounded questions with citations' },
  { key: 'documents', label: 'Documents', icon: FileText, hint: 'Upload and manage source files' },
  { key: 'tasks', label: 'Tasks', icon: CheckSquare, hint: 'Saved by the assistant via tools' },
  { key: 'tool-calls', label: 'Tool Call Log', icon: Wrench, hint: 'Every tool call, validated and logged' },
]

export default function Dashboard() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('chat')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api
      .listWorkspaces()
      .then((ws) => {
        setWorkspaces(ws)
        if (ws.length > 0) setActiveId(ws[0].id)
      })
      .finally(() => setLoading(false))
  }, [])

  async function handleCreateWorkspace(name: string) {
    const created = await api.createWorkspace(name)
    setWorkspaces((prev) => [...prev, created])
    setActiveId(created.id)
  }

  const activeTab = TABS.find((t) => t.key === tab)!
  const activeWorkspace = workspaces.find((w) => w.id === activeId)

  return (
    <div className="flex min-h-screen">
      <aside
        className="flex w-64 shrink-0 flex-col border-r bg-white"
        style={{ borderColor: 'var(--border)' }}
      >
        <div className="flex items-center gap-2.5 px-5 py-5">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg text-white"
            style={{ background: 'var(--primary)' }}
          >
            <Layers size={16} strokeWidth={2} />
          </div>
          <span className="text-[15px] font-semibold tracking-tight" style={{ color: 'var(--text)' }}>
            Document Assistant
          </span>
        </div>

        <div className="px-4 pb-3">
          <WorkspaceSwitcher
            workspaces={workspaces}
            activeId={activeId}
            onSelect={setActiveId}
            onCreate={handleCreateWorkspace}
          />
        </div>

        <nav className="mt-2 flex-1 space-y-1 px-3">
          {TABS.map((t) => {
            const Icon = t.icon
            const isActive = tab === t.key
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition"
                style={
                  isActive
                    ? { background: 'var(--primary-soft)', color: 'var(--primary-hover)' }
                    : { color: 'var(--text-muted)' }
                }
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.background = '#f7f7fb'
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.background = 'transparent'
                }}
              >
                <Icon size={16} strokeWidth={2.25} />
                {t.label}
              </button>
            )
          })}
        </nav>

        <div className="border-t px-4 py-3" style={{ borderColor: 'var(--border)' }}>
          <button
            type="button"
            onClick={() => supabase.auth.signOut()}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition hover:bg-slate-50"
            style={{ color: 'var(--text-muted)' }}
          >
            <LogOut size={16} strokeWidth={2.25} />
            Sign out
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1">
        {loading ? (
          <div className="flex h-screen items-center justify-center">
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Loading workspaces…
            </p>
          </div>
        ) : !activeId ? (
          <div className="flex h-screen items-center justify-center px-6">
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Create a workspace on the left to get started.
            </p>
          </div>
        ) : (
          <div className="mx-auto max-w-4xl px-8 py-8">
            <div className="mb-6">
              <p className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--primary)' }}>
                {activeWorkspace?.name}
              </p>
              <h1 className="mt-0.5 text-2xl font-semibold tracking-tight" style={{ color: 'var(--text)' }}>
                {activeTab.label}
              </h1>
              <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
                {activeTab.hint}
              </p>
            </div>

            <div className="animate-in" key={tab}>
              {tab === 'chat' && <ChatPanel key={activeId} workspaceId={activeId} />}
              {tab === 'documents' && <DocumentsPanel key={activeId} workspaceId={activeId} />}
              {tab === 'tasks' && <TasksPanel key={activeId} workspaceId={activeId} />}
              {tab === 'tool-calls' && <ToolCallLog key={activeId} workspaceId={activeId} />}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
