-- Historial de versiones de precedentes (genérico, no atado a JGA ni al
-- drafter). Se conecta primero desde el Redactor Internacional; JGA no se
-- modifica en esta migración.
CREATE TABLE IF NOT EXISTS doc_precedente_versiones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  precedente_id UUID NOT NULL REFERENCES doc_precedentes(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  datos_entrada JSONB NOT NULL,
  secciones_generadas JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (precedente_id, version)
);

ALTER TABLE doc_precedente_versiones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own precedent versions" ON doc_precedente_versiones
  FOR ALL USING (precedente_id IN (SELECT id FROM doc_precedentes WHERE user_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_doc_precedente_versiones_precedente ON doc_precedente_versiones(precedente_id);
