import { createLegalMessage, type DocumentBlock } from '@/lib/legal/anthropic'
import { parseAttachmentsServer, flattenAttachmentBlocks, type AttachmentInput } from '@/lib/legal/file-attachments'
import { DRAFTER_SYSTEM, buildDrafterUserPrompt } from './prompts'
import { parseGeneratedSections } from './parse-sections'
import { guardarDocumentoDrafter } from './document-service'
import type { DocumentTypeId } from './form-schemas'
import type { SeccionDrafter } from './types'

export interface GeneratedDocument {
  documentId: string
  documentType: DocumentTypeId
  sections: SeccionDrafter[]
}

export async function generarYGuardarDocumento(params: {
  userId: string
  documentType: DocumentTypeId
  jurisdiction: string
  fields: Record<string, string>
  attachments?: AttachmentInput[]
  documentoPadreId?: string
}): Promise<GeneratedDocument> {
  const prompt = buildDrafterUserPrompt({
    documentType: params.documentType,
    jurisdiction: params.jurisdiction,
    fields: params.fields,
  })

  const content: Array<{ type: 'text'; text: string } | DocumentBlock> = [{ type: 'text', text: prompt }]

  if (params.attachments?.length) {
    const parsed = await parseAttachmentsServer(params.attachments)
    content.push(...flattenAttachmentBlocks(parsed))
  }

  const raw = await createLegalMessage({
    system: DRAFTER_SYSTEM,
    userContent: content,
    // Un contrato completo con comparecencia, antecedentes y 10+ cláusulas
    // supera holgadamente los 4.000 tokens y se truncaba a media redacción.
    maxTokens: 16000,
  })

  const sections = parseGeneratedSections(raw)

  const doc = await guardarDocumentoDrafter({
    userId: params.userId,
    input: {
      documentType: params.documentType,
      jurisdiction: params.jurisdiction,
      fields: params.fields,
    },
    sections,
    documentoPadreId: params.documentoPadreId,
  })

  return { documentId: doc.id, documentType: params.documentType, sections }
}
