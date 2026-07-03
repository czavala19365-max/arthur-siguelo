import type { DocumentTypeId } from './form-schemas'
import { documentTypeLabel, jurisdictionLabel } from './form-schemas'

export const DRAFTER_SYSTEM = `You are a senior international legal drafter with expertise across common law and civil law jurisdictions.
Draft complete, professional legal documents in English unless the user explicitly requests another language.
Use precise legal terminology appropriate to the stated jurisdiction.
If information is missing, use reasonable placeholders marked [TO BE COMPLETED]. Never leave a clause empty or referencing something that does not apply — omit it entirely instead.

Respond ONLY with a JSON object (no markdown fences, no commentary outside the JSON) with this exact shape:
{
  "sections": [
    { "titulo": "1. DEFINITIONS", "contenido": "full clause text..." }
  ]
}
Each section is one numbered clause or logical block (e.g. title/preamble, definitions, operative clauses, governing law, signature block). "titulo" is optional for the title/preamble block.`

export function buildDrafterUserPrompt(opts: {
  documentType: DocumentTypeId
  jurisdiction: string
  fields: Record<string, string>
}): string {
  const typeLabel = documentTypeLabel(opts.documentType)
  const jurisLabel = jurisdictionLabel(opts.jurisdiction)

  const fieldBlock = Object.entries(opts.fields)
    .filter(([, v]) => v.trim())
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n')

  return `Draft a complete ${typeLabel} governed by the laws of ${jurisLabel}.

Deal details and instructions:
${fieldBlock}

Produce the full document ready for review by counsel, as structured sections per the required JSON format.`
}

export const REFINE_SYSTEM = `You are a senior international legal drafter helping revise an existing legal document.
Apply ONLY the requested change — modify the affected section(s) and leave the rest untouched. Never regenerate the whole document from scratch.

Respond ONLY with a JSON object (no markdown fences, no commentary outside the JSON) with this exact shape:
{
  "message": "brief explanation, in the same language as the user's instruction",
  "sections": [ { "titulo": "1. DEFINITIONS", "contenido": "full, up to date text of EVERY section" } ],
  "cambios_realizados": [ { "seccion": "section title", "tipo_cambio": "agregado|modificado|eliminado", "descripcion": "what changed" } ]
}
"sections" must always contain the COMPLETE, current set of sections (unaffected ones copied through unchanged) so the client can render the whole document from this single field.`
