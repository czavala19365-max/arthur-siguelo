-- Document messages for judicial writing (chat history + snapshots)
-- Uses UUID primary keys; document_id references escritos_judiciales(id).

create extension if not exists pgcrypto;

create table if not exists document_messages (
  id uuid default gen_random_uuid() primary key,
  document_id bigint not null references escritos_judiciales(id) on delete cascade,
  role text check (role in ('user', 'assistant', 'system')) not null,
  content text not null,
  document_snapshot text,
  created_at timestamptz default now()
);

create index if not exists idx_doc_messages_doc_id on document_messages(document_id);
create index if not exists idx_doc_messages_doc_id_created on document_messages(document_id, created_at);

