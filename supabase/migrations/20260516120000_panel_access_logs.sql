-- Registro interno de accesos al panel (jurados / evaluadores del concurso)
create table if not exists public.panel_access_logs (
  id bigserial primary key,
  email text not null,
  ip text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists idx_panel_access_logs_created
  on public.panel_access_logs (created_at desc);

alter table public.panel_access_logs enable row level security;

-- Solo service role desde Next.js (no acceso público anon)
