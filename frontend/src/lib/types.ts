export interface Workspace {
  id: string
  name: string
  created_at: string
}

export interface Document {
  id: string
  filename: string
  status: 'processing' | 'ready' | 'error'
  error_message: string | null
  created_at: string
}

export interface Citation {
  marker: number
  document_id: string
  filename: string
  chunk_index: number
}

export interface RetrievedChunk {
  document_id: string
  filename: string
  chunk_index: number
  score: number
  content_preview: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  citations: Citation[]
  retrieved_chunks: RetrievedChunk[]
  created_at: string
}

export interface ToolCall {
  id: string
  tool_name: string
  arguments: Record<string, unknown>
  result: Record<string, unknown>
  status: 'success' | 'error'
  error_message: string | null
  created_at: string
}

export interface Task {
  id: string
  title: string
  description: string | null
  status: string
  created_at: string
}

export interface ChatResponse {
  session_id: string
  message: ChatMessage
  tool_calls: ToolCall[]
}
