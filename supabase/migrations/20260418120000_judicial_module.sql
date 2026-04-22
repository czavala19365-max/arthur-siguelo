-- Judicial module (CEJ / Arthur Siguelo). Run in Supabase SQL editor for project.
-- Requires: SUPABASE_URL + SUPABASE_SERVICE_KEY in the app for server-side access.

-- Casos (expedientes)
CREATE TABLE IF NOT EXISTS casos (
  id BIGSERIAL PRIMARY KEY,
  numero_expediente TEXT NOT NULL,
  distrito_judicial TEXT NOT NULL,
  organo_jurisdiccional TEXT,
  juez TEXT,
  tipo_proceso TEXT,
  especialidad TEXT,
  etapa_procesal TEXT,
  partes TEXT,
  cliente TEXT,
  alias TEXT,
  monto TEXT,
  prioridad TEXT NOT NULL DEFAULT 'baja',
  estado TEXT NOT NULL DEFAULT 'activo',
  ultimo_movimiento TEXT,
  ultimo_movimiento_fecha TEXT,
  proximo_evento TEXT,
  proximo_evento_fecha TEXT,
  estado_hash TEXT,
  polling_frequency_hours INTEGER NOT NULL DEFAULT 4,
  whatsapp_number TEXT,
  email TEXT,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  last_checked TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  parte_procesal TEXT
);

CREATE INDEX IF NOT EXISTS idx_casos_activo_archived_deleted ON casos (activo, archived_at, deleted_at);
CREATE INDEX IF NOT EXISTS idx_casos_numero_expediente ON casos (numero_expediente);

-- Movimientos judiciales (actuaciones CEJ)
CREATE TABLE IF NOT EXISTS movimientos_judiciales (
  id BIGSERIAL PRIMARY KEY,
  caso_id BIGINT NOT NULL REFERENCES casos (id) ON DELETE CASCADE,
  numero TEXT,
  fecha TEXT,
  acto TEXT,
  folio TEXT,
  sumilla TEXT,
  tiene_documento BOOLEAN NOT NULL DEFAULT FALSE,
  documento_url TEXT,
  tiene_resolucion BOOLEAN NOT NULL DEFAULT FALSE,
  es_nuevo BOOLEAN NOT NULL DEFAULT TRUE,
  urgencia TEXT NOT NULL DEFAULT 'info',
  ai_sugerencia TEXT,
  ai_analisis TEXT,
  scraped_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_movimientos_judiciales_caso ON movimientos_judiciales (caso_id);
CREATE INDEX IF NOT EXISTS idx_movimientos_judiciales_caso_scraped ON movimientos_judiciales (caso_id, scraped_at DESC, id DESC);

-- Preferencias de alertas por caso (p. ej. Telegram); email/WhatsApp siguen en `casos`.
CREATE TABLE IF NOT EXISTS alertas_config (
  id BIGSERIAL PRIMARY KEY,
  caso_id BIGINT NOT NULL UNIQUE REFERENCES casos (id) ON DELETE CASCADE,
  telegram_chat_id TEXT,
  canal_por_nivel JSONB,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alertas_config_caso ON alertas_config (caso_id);

-- Tablas auxiliares judiciales (antes en SQLite con FK a casos)
CREATE TABLE IF NOT EXISTS audiencias (
  id BIGSERIAL PRIMARY KEY,
  caso_id BIGINT NOT NULL REFERENCES casos (id) ON DELETE CASCADE,
  descripcion TEXT NOT NULL,
  fecha TEXT NOT NULL,
  tipo TEXT,
  completado BOOLEAN NOT NULL DEFAULT FALSE,
  google_calendar_link TEXT,
  outlook_link TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audiencias_caso ON audiencias (caso_id);

CREATE TABLE IF NOT EXISTS escritos_judiciales (
  id BIGSERIAL PRIMARY KEY,
  caso_id BIGINT NOT NULL REFERENCES casos (id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  contenido TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_escritos_caso ON escritos_judiciales (caso_id);

CREATE TABLE IF NOT EXISTS notificaciones_judiciales (
  id BIGSERIAL PRIMARY KEY,
  caso_id BIGINT REFERENCES casos (id) ON DELETE SET NULL,
  canal TEXT NOT NULL,
  movimiento_descripcion TEXT,
  urgencia TEXT,
  ai_sugerencia TEXT,
  enviado_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  success BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_notif_jud_caso ON notificaciones_judiciales (caso_id);

ALTER TABLE casos ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimientos_judiciales ENABLE ROW LEVEL SECURITY;
ALTER TABLE alertas_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE audiencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE escritos_judiciales ENABLE ROW LEVEL SECURITY;
ALTER TABLE notificaciones_judiciales ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS; anon still blocked without policies.
COMMENT ON TABLE casos IS 'Expedientes judiciales (módulo CEJ); acceso vía service role desde Next.js';
