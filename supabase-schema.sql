-- ============================================================
-- Ejecutar en el SQL Editor de Supabase
-- ============================================================

-- ── Tabla principal de títulos ────────────────────────────────
create table if not exists titulos (
  id uuid default gen_random_uuid() primary key,
  oficina_registral text not null,
  anio_titulo integer not null,
  numero_titulo text not null,
  nombre_cliente text not null,
  email_cliente text not null,
  whatsapp_cliente text not null,
  ultimo_estado text,
  ultima_consulta timestamp with time zone,
  created_at timestamp with time zone default now() not null
);

-- Índice para búsquedas por número de título
create index if not exists titulos_numero_titulo_idx on titulos (numero_titulo);

-- Columnas nuevas si la tabla ya existía (idempotente)
alter table titulos add column if not exists ultimo_estado text;
alter table titulos add column if not exists ultima_consulta timestamp with time zone;
alter table titulos add column if not exists area_registral text;
alter table titulos add column if not exists numero_partida text;

-- ── Tabla de historial de cambios de estado ───────────────────
create table if not exists historial_estados (
  id uuid default gen_random_uuid() primary key,
  titulo_id uuid not null references titulos(id) on delete cascade,
  estado_anterior text not null,
  estado_nuevo text not null,
  detectado_en timestamp with time zone default now() not null
);

create index if not exists historial_titulo_id_idx on historial_estados (titulo_id);
create index if not exists historial_detectado_en_idx on historial_estados (detectado_en desc);

-- ── Row Level Security ────────────────────────────────────────
alter table titulos enable row level security;
alter table historial_estados enable row level security;

-- Políticas para titulos
create policy "Lectura pública" on titulos
  for select using (true);

create policy "Inserción pública" on titulos
  for insert with check (true);

create policy "Actualización pública" on titulos
  for update using (true);

create policy "Eliminación pública" on titulos
  for delete using (true);

-- Políticas para historial_estados
create policy "Lectura pública historial" on historial_estados
  for select using (true);

create policy "Inserción pública historial" on historial_estados
  for insert with check (true);
