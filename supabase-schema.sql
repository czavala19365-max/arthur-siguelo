-- Ejecutar en el SQL Editor de Supabase

create table if not exists titulos (
  id uuid default gen_random_uuid() primary key,
  oficina_registral text not null,
  anio_titulo integer not null,
  numero_titulo text not null,
  nombre_cliente text not null,
  email_cliente text not null,
  whatsapp_cliente text not null,
  created_at timestamp with time zone default now() not null
);

-- Índice para búsquedas por número de título
create index if not exists titulos_numero_titulo_idx on titulos (numero_titulo);

-- Habilitar Row Level Security
alter table titulos enable row level security;

-- Política: acceso público de lectura y escritura (ajustar según necesidad)
create policy "Lectura pública" on titulos
  for select using (true);

create policy "Inserción pública" on titulos
  for insert with check (true);
