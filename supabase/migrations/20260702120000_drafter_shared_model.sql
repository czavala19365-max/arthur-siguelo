-- Extiende el modelo document-intelligence (creado para Actas JGA) para que lo
-- pueda reutilizar el Redactor Internacional. No destructivo: no borra columnas
-- ni filas existentes, solo relaja constraints y agrega columnas nullable.

-- doc_sociedades: el CHECK original solo permitía formas societarias peruanas
-- (S.A./S.A.C./S.R.L./S.A.A.), lo que impide representar entidades extranjeras
-- (Ltd, LLC, Inc, GmbH, etc.) usadas por el drafter internacional.
ALTER TABLE doc_sociedades DROP CONSTRAINT IF EXISTS doc_sociedades_tipo_societario_check;
ALTER TABLE doc_sociedades ADD COLUMN IF NOT EXISTS pais TEXT DEFAULT 'PE';

-- doc_precedentes: sociedad_id y tipo_operaciones eran NOT NULL porque solo
-- existían precedentes de JGA (siempre atados a una sociedad peruana con
-- puntos de agenda). Un precedente del drafter puede no tener sociedad
-- registrada y no tiene "operaciones" en el sentido de JGA.
ALTER TABLE doc_precedentes ALTER COLUMN sociedad_id DROP NOT NULL;
ALTER TABLE doc_precedentes ALTER COLUMN tipo_operaciones DROP NOT NULL;
ALTER TABLE doc_precedentes ADD COLUMN IF NOT EXISTS tipo_documento TEXT NOT NULL DEFAULT 'acta_jga';
