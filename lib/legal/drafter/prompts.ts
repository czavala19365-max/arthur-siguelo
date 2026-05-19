import type { DocumentTypeId } from './form-schemas'
import { documentTypeLabel, jurisdictionLabel } from './form-schemas'

export const DRAFTER_SYSTEM = `You are a senior international legal drafter with expertise across common law and civil law jurisdictions.
Draft complete, professional legal documents in English unless the user explicitly requests another language.
Use precise legal terminology appropriate to the stated jurisdiction.
Structure documents with clear headings, numbered clauses, and defined terms where appropriate.
Do not include commentary outside the document — output only the final document text.
If information is missing, use reasonable placeholders marked [TO BE COMPLETED].`

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

Produce the full document ready for review by counsel.`
}

export const REFINE_SYSTEM = `You are a senior international legal drafter. The user will provide an existing legal document and instructions for revisions.
Apply the requested changes and return the COMPLETE revised document only — no commentary outside the document.`
