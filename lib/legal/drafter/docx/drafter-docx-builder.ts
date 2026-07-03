import { Document, Packer, Paragraph } from 'docx'
import {
  PAGE_CONFIG,
  mainTitle,
  paragraphsFromText,
  sectionTitle,
} from '@/lib/document-intelligence/docx/style-kit'
import type { SeccionDrafter } from '../types'
import { documentTypeLabel } from '../form-schemas'
import type { DocumentTypeId } from '../form-schemas'

export async function generarDocxDrafter(secciones: SeccionDrafter[], documentType: DocumentTypeId): Promise<Buffer> {
  const children: Paragraph[] = [mainTitle(documentTypeLabel(documentType), { after: 360 })]

  const ordenadas = secciones.slice().sort((a, b) => a.orden - b.orden)
  for (const seccion of ordenadas) {
    if (seccion.titulo) children.push(sectionTitle(seccion.titulo))
    children.push(...paragraphsFromText(seccion.contenido))
  }

  const doc = new Document({
    sections: [
      {
        properties: { page: PAGE_CONFIG },
        children,
      },
    ],
  })

  return (await Packer.toBuffer(doc)) as Buffer<ArrayBuffer>
}
