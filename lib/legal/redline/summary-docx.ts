import { AlignmentType, Document, Packer, Paragraph, TextRun } from 'docx'
import {
  AFTER,
  COLOR,
  FONT,
  NORMAL_SPACING,
  ONE_INCH,
  PAGE_CONFIG,
  SIZE,
  bodyParagraph,
  mainTitle,
  sectionTitle,
} from '@/lib/document-intelligence/docx/style-kit'
import type { ChangeGroup, EditItem } from './text-redline'

interface Stats {
  substitutions: number
  insertions: number
  deletions: number
  unmatched: number
}

/**
 * Genera un DOCX con el resumen de cambios del redline, en formato corporativo
 * Arthur (Arial 11, A4, mismo style-kit que Actas JGA y el redactor). Es un
 * documento aparte que el usuario puede descargar junto al redline con
 * tracked changes.
 */
export async function buildSummaryDocx(params: {
  oldName: string
  newName: string
  summary: string
  groups: ChangeGroup[]
  stats: Stats
}): Promise<Buffer> {
  const children: Paragraph[] = []

  children.push(mainTitle('Resumen de cambios — Redline', { after: 360 }))

  children.push(metadataParagraph('Documento original', params.oldName))
  children.push(metadataParagraph('Documento revisado', params.newName))
  children.push(
    metadataParagraph(
      'Cambios detectados',
      `${totalChanges(params.stats)} ` +
        `(${params.stats.substitutions} sustitucion(es), ${params.stats.insertions} insercion(es), ${params.stats.deletions} eliminacion(es))`,
    ),
  )
  if (params.stats.unmatched > 0) {
    children.push(
      metadataParagraph(
        'Cambios no anclados',
        `${params.stats.unmatched} — revisar manualmente en la version revisada`,
      ),
    )
  }

  children.push(spacer())

  if (params.summary.trim()) {
    children.push(sectionTitle('Resumen ejecutivo'))
    for (const line of params.summary.split(/\n+/).filter(Boolean)) {
      children.push(bodyParagraph(line.trim(), { indent: false }))
    }
    children.push(spacer())
  }

  if (params.groups.length === 0) {
    children.push(
      bodyParagraph(
        'No se detectaron cambios estructurales entre ambas versiones.',
        { indent: false },
      ),
    )
  } else {
    children.push(sectionTitle('Detalle de cambios por seccion'))
    for (const group of params.groups) {
      children.push(groupHeader(group.location))
      for (const edit of group.changes) {
        children.push(editParagraph(edit))
      }
      children.push(spacer())
    }
  }

  const doc = new Document({
    sections: [
      {
        properties: { page: PAGE_CONFIG },
        children,
      },
    ],
  })

  return (await Packer.toBuffer(doc)) as Buffer
}

function totalChanges(stats: Stats): number {
  return stats.substitutions + stats.insertions + stats.deletions
}

function metadataParagraph(label: string, value: string): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing: { ...NORMAL_SPACING, after: 60 },
    children: [
      new TextRun({ text: `${label}: `, font: FONT, size: SIZE, bold: true, color: COLOR }),
      new TextRun({ text: value, font: FONT, size: SIZE, color: COLOR }),
    ],
  })
}

function groupHeader(location: string): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing: { before: AFTER, after: 60, line: NORMAL_SPACING.line, lineRule: NORMAL_SPACING.lineRule },
    children: [
      new TextRun({ text: location.toUpperCase(), font: FONT, size: SIZE, bold: true, color: COLOR }),
    ],
  })
}

function editParagraph(edit: EditItem): Paragraph {
  const kindLabel: Record<EditItem['kind'], string> = {
    substitution: 'Sustitucion',
    insertion: 'Insercion',
    deletion: 'Eliminacion',
  }
  const description = edit.description ?? summarizeEdit(edit)
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    spacing: { ...NORMAL_SPACING, after: 60 },
    indent: { left: ONE_INCH / 4 },
    children: [
      new TextRun({ text: `• ${kindLabel[edit.kind]}: `, font: FONT, size: SIZE, bold: true, color: COLOR }),
      new TextRun({ text: description, font: FONT, size: SIZE, color: COLOR }),
    ],
  })
}

function summarizeEdit(edit: EditItem): string {
  if (edit.kind === 'substitution') {
    const oldT = truncate(edit.old_text ?? '')
    const newT = truncate(edit.new_text ?? '')
    return `Reemplaza «${oldT}» por «${newT}».`
  }
  if (edit.kind === 'insertion') {
    return `Inserta despues de «${truncate(edit.after_text ?? '')}»: «${truncate(edit.new_text ?? '')}».`
  }
  return `Elimina «${truncate(edit.old_text ?? '')}».`
}

function truncate(text: string, max = 120): string {
  if (text.length <= max) return text
  return text.slice(0, max) + '...'
}

function spacer(): Paragraph {
  return new Paragraph({ children: [new TextRun('')], spacing: { after: AFTER / 2 } })
}
