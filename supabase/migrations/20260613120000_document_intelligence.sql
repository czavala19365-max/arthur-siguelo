-- Document Intelligence module (JGA actas). Project: judicial (uyvljurjclwqmmsoogqc)

CREATE TABLE IF NOT EXISTS doc_sociedades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  razon_social TEXT NOT NULL,
  tipo_societario TEXT NOT NULL CHECK (tipo_societario IN ('S.A.', 'S.A.C.', 'S.R.L.', 'S.A.A.')),
  ruc TEXT,
  domicilio TEXT,
  distrito TEXT,
  provincia TEXT,
  departamento TEXT,
  capital_social NUMERIC,
  moneda_capital TEXT DEFAULT 'PEN',
  total_acciones INTEGER,
  valor_nominal_accion NUMERIC DEFAULT 1.00,
  partida_electronica TEXT,
  gerente_general JSONB,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS doc_accionistas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sociedad_id UUID NOT NULL REFERENCES doc_sociedades(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('persona_natural', 'persona_juridica')),
  razon_social TEXT,
  ruc TEXT,
  nombre_completo TEXT NOT NULL,
  dni TEXT NOT NULL,
  num_acciones INTEGER NOT NULL,
  valor_nominal NUMERIC DEFAULT 1.00,
  moneda TEXT DEFAULT 'PEN',
  porcentaje NUMERIC,
  representantes JSONB DEFAULT '[]',
  poderes_referencia TEXT,
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS doc_precedentes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  sociedad_id UUID NOT NULL REFERENCES doc_sociedades(id),
  nombre_referencia TEXT NOT NULL,
  tipo_operaciones TEXT[] NOT NULL,
  datos_jga JSONB NOT NULL,
  secciones_generadas JSONB,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS doc_clausulas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  categoria TEXT NOT NULL,
  nombre TEXT NOT NULL,
  contenido TEXT NOT NULL,
  variables TEXT[] DEFAULT '{}',
  uso_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS doc_documentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  sociedad_id UUID REFERENCES doc_sociedades(id),
  precedente_id UUID REFERENCES doc_precedentes(id),
  tipo_documento TEXT NOT NULL DEFAULT 'acta_jga',
  nombre TEXT NOT NULL,
  datos_entrada JSONB NOT NULL,
  contenido_generado JSONB,
  docx_storage_path TEXT,
  estado TEXT DEFAULT 'borrador' CHECK (estado IN ('borrador', 'revision', 'finalizado')),
  version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE doc_sociedades ENABLE ROW LEVEL SECURITY;
ALTER TABLE doc_accionistas ENABLE ROW LEVEL SECURITY;
ALTER TABLE doc_precedentes ENABLE ROW LEVEL SECURITY;
ALTER TABLE doc_clausulas ENABLE ROW LEVEL SECURITY;
ALTER TABLE doc_documentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own sociedades" ON doc_sociedades
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users manage own accionistas" ON doc_accionistas
  FOR ALL USING (sociedad_id IN (SELECT id FROM doc_sociedades WHERE user_id = auth.uid()));

CREATE POLICY "Users manage own precedentes" ON doc_precedentes
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users manage own clausulas" ON doc_clausulas
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users manage own documentos" ON doc_documentos
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_doc_sociedades_user ON doc_sociedades(user_id);
CREATE INDEX IF NOT EXISTS idx_doc_precedentes_sociedad ON doc_precedentes(sociedad_id);
CREATE INDEX IF NOT EXISTS idx_doc_documentos_sociedad ON doc_documentos(sociedad_id);
CREATE INDEX IF NOT EXISTS idx_doc_clausulas_categoria ON doc_clausulas(categoria);
