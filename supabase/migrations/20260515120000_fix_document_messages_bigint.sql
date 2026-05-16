-- Corrige document_messages cuando document_id se creó como uuid en lugar de bigint.
-- Los escritos judiciales usan id BIGSERIAL; document_id debe ser bigint.

create extension if not exists pgcrypto;

do $$
begin
  if exists (
    select 1
    from information_schema.columns c
    where c.table_schema = 'public'
      and c.table_name = 'document_messages'
      and c.column_name = 'document_id'
      and c.data_type = 'uuid'
  ) then
    raise notice 'document_messages.document_id era uuid; recreando tabla con bigint';
    drop table public.document_messages;
  end if;
end $$;

create table if not exists public.document_messages (
  id uuid default gen_random_uuid() primary key,
  document_id bigint not null references public.escritos_judiciales(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  document_snapshot text,
  created_at timestamptz default now()
);

create index if not exists idx_doc_messages_doc_id on public.document_messages(document_id);
create index if not exists idx_doc_messages_doc_id_created on public.document_messages(document_id, created_at);

alter table public.document_messages enable row level security;
