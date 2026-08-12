-- Vincula documentos accesorios (pagaré, cronograma, etc.) a su documento
-- primario, para el mecanismo de generación modular del Redactor Internacional.
ALTER TABLE doc_documentos ADD COLUMN IF NOT EXISTS documento_padre_id UUID REFERENCES doc_documentos(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_doc_documentos_padre ON doc_documentos(documento_padre_id);
