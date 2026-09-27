-- Multi-Workspace Document Assistant schema.
-- Run once against a Postgres instance with the pgvector extension available
-- (Supabase: SQL editor; local: the pgvector/pgvector docker image already has it).
--
-- Embedding dimension is 768 (Gemini's gemini-embedding-001 model, truncated
-- from its native 3072 dims via output_dimensionality=768 for a smaller/
-- cheaper index). If you swap embedding models or dimensions, update the
-- `vector(768)` dimension below to match.

create extension if not exists vector;
create extension if not exists pgcrypto; -- gen_random_uuid()

create table if not exists workspaces (
    id uuid primary key default gen_random_uuid(),
    owner_id uuid not null,
    name text not null,
    created_at timestamptz not null default now()
);
create index if not exists idx_workspaces_owner on workspaces(owner_id);

create table if not exists documents (
    id uuid primary key default gen_random_uuid(),
    workspace_id uuid not null references workspaces(id) on delete cascade,
    filename text not null,
    content_hash text not null,
    status text not null default 'processing', -- processing | ready | error
    error_message text,
    created_at timestamptz not null default now(),
    unique (workspace_id, content_hash)
);
create index if not exists idx_documents_workspace on documents(workspace_id);

-- The single shared vector store for every workspace's chunks.
-- Isolation is enforced by always filtering on workspace_id inside the
-- vector query itself (WHERE workspace_id = $1 ORDER BY embedding <=> $2),
-- never as a post-filter on unscoped results.
create table if not exists chunks (
    id uuid primary key default gen_random_uuid(),
    workspace_id uuid not null references workspaces(id) on delete cascade,
    document_id uuid not null references documents(id) on delete cascade,
    chunk_index int not null,
    content text not null,
    embedding vector(768),
    created_at timestamptz not null default now()
);
create index if not exists idx_chunks_workspace on chunks(workspace_id);
create index if not exists idx_chunks_document on chunks(document_id);
-- IVFFlat requires ANALYZE after data exists to pick good list counts; fine
-- to create up front for a small/demo dataset. Cosine distance (<=>) is used
-- for retrieval, matching Gemini embeddings which are typically normalized.
create index if not exists idx_chunks_embedding on chunks
    using ivfflat (embedding vector_cosine_ops) with (lists = 100);

create table if not exists chat_sessions (
    id uuid primary key default gen_random_uuid(),
    workspace_id uuid not null references workspaces(id) on delete cascade,
    title text,
    created_at timestamptz not null default now()
);
create index if not exists idx_chat_sessions_workspace on chat_sessions(workspace_id);

create table if not exists chat_messages (
    id uuid primary key default gen_random_uuid(),
    session_id uuid not null references chat_sessions(id) on delete cascade,
    workspace_id uuid not null references workspaces(id) on delete cascade,
    role text not null, -- user | assistant
    content text not null,
    citations jsonb not null default '[]'::jsonb,
    retrieved_chunks jsonb not null default '[]'::jsonb, -- retrieval-debug: which chunks fed this answer
    created_at timestamptz not null default now()
);
create index if not exists idx_chat_messages_session on chat_messages(session_id);
create index if not exists idx_chat_messages_workspace on chat_messages(workspace_id);

create table if not exists tool_calls (
    id uuid primary key default gen_random_uuid(),
    workspace_id uuid not null references workspaces(id) on delete cascade,
    session_id uuid references chat_sessions(id) on delete set null,
    message_id uuid references chat_messages(id) on delete set null,
    tool_name text not null,
    arguments jsonb not null default '{}'::jsonb,
    result jsonb not null default '{}'::jsonb,
    status text not null, -- success | error
    error_message text,
    created_at timestamptz not null default now()
);
create index if not exists idx_tool_calls_workspace on tool_calls(workspace_id);

create table if not exists tasks (
    id uuid primary key default gen_random_uuid(),
    workspace_id uuid not null references workspaces(id) on delete cascade,
    title text not null,
    description text,
    status text not null default 'open',
    created_at timestamptz not null default now()
);
create index if not exists idx_tasks_workspace on tasks(workspace_id);

-- Row Level Security policies (Supabase-specific, uses auth.uid()) live in
-- supabase_rls.sql - run that separately against a Supabase project only.
-- It is not part of this file because plain local Postgres (docker-compose)
-- has no `auth` schema/auth.uid() function.
