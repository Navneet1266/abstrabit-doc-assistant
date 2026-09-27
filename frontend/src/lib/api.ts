import { supabase } from './supabaseClient'
import type { ChatResponse, Document, Task, ToolCall, Workspace } from './types'

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new ApiError('Not signed in', 401)
  return { Authorization: `Bearer ${token}` }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = await authHeaders()
  const resp = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: { ...headers, ...(init?.headers ?? {}) },
  })
  if (!resp.ok) {
    let detail = resp.statusText
    try {
      const body = await resp.json()
      detail = body.detail ?? detail
    } catch {
      // ignore - not a JSON error body
    }
    throw new ApiError(typeof detail === 'string' ? detail : JSON.stringify(detail), resp.status)
  }
  if (resp.status === 204) return undefined as T
  return (await resp.json()) as T
}

export const api = {
  listWorkspaces: () => request<Workspace[]>('/workspaces'),
  createWorkspace: (name: string) =>
    request<Workspace>('/workspaces', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    }),

  listDocuments: (workspaceId: string) => request<Document[]>(`/workspaces/${workspaceId}/documents`),
  uploadDocument: async (workspaceId: string, file: File) => {
    const headers = await authHeaders()
    const form = new FormData()
    form.append('file', file)
    const resp = await fetch(`${BASE_URL}/workspaces/${workspaceId}/documents`, {
      method: 'POST',
      headers,
      body: form,
    })
    if (!resp.ok) {
      let detail = resp.statusText
      try {
        const body = await resp.json()
        detail = body.detail ?? detail
      } catch {
        // ignore
      }
      throw new ApiError(typeof detail === 'string' ? detail : JSON.stringify(detail), resp.status)
    }
    return (await resp.json()) as Document
  },

  listMessages: (workspaceId: string) => request<import('./types').ChatMessage[]>(`/workspaces/${workspaceId}/chat/messages`),
  sendMessage: (workspaceId: string, message: string, sessionId?: string) =>
    request<ChatResponse>(`/workspaces/${workspaceId}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, session_id: sessionId ?? null }),
    }),

  listTasks: (workspaceId: string) => request<Task[]>(`/workspaces/${workspaceId}/tasks`),
  listToolCalls: (workspaceId: string) => request<ToolCall[]>(`/workspaces/${workspaceId}/tool-calls`),
}
