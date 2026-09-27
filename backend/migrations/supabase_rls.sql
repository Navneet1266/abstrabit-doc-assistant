-- Defense-in-depth Row Level Security policies for Supabase deployments only.
-- Run this in the Supabase SQL editor AFTER schema.sql, against your Supabase
-- project (it relies on Supabase's `auth.uid()`, which doesn't exist on a
-- plain local Postgres instance - that's why this is a separate file from
-- schema.sql, which docker-compose also applies to a local dev database).
--
-- The backend service connects with a privileged/direct Postgres role and
-- enforces tenancy in application code (see app/workspaces.py::
-- assert_workspace_access and the mandatory workspace_id predicate in every
-- query) - these policies are a second layer of defense in case this
-- database is ever queried through Supabase's PostgREST/anon layer directly.

alter table workspaces enable row level security;
alter table documents enable row level security;
alter table chunks enable row level security;
alter table chat_sessions enable row level security;
alter table chat_messages enable row level security;
alter table tool_calls enable row level security;
alter table tasks enable row level security;

drop policy if exists workspaces_owner_only on workspaces;
create policy workspaces_owner_only on workspaces
    using (owner_id = auth.uid());

drop policy if exists documents_owner_only on documents;
create policy documents_owner_only on documents
    using (workspace_id in (select id from workspaces where owner_id = auth.uid()));

drop policy if exists chunks_owner_only on chunks;
create policy chunks_owner_only on chunks
    using (workspace_id in (select id from workspaces where owner_id = auth.uid()));

drop policy if exists chat_sessions_owner_only on chat_sessions;
create policy chat_sessions_owner_only on chat_sessions
    using (workspace_id in (select id from workspaces where owner_id = auth.uid()));

drop policy if exists chat_messages_owner_only on chat_messages;
create policy chat_messages_owner_only on chat_messages
    using (workspace_id in (select id from workspaces where owner_id = auth.uid()));

drop policy if exists tool_calls_owner_only on tool_calls;
create policy tool_calls_owner_only on tool_calls
    using (workspace_id in (select id from workspaces where owner_id = auth.uid()));

drop policy if exists tasks_owner_only on tasks;
create policy tasks_owner_only on tasks
    using (workspace_id in (select id from workspaces where owner_id = auth.uid()));
