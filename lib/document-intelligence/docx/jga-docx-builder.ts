import {
  AlignmentType,
  BorderStyle,
  Document,
  LevelFormat,
  Packer,
  PageBreak,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  UnderlineType,
  WidthType,
} from 'docx'
import type { DatosJGA, SeccionActa } from '../types'
import { getFirmantesTabla } from '../sections/signatures'
import {
  AFTER,
  COLOR,
  FONT,
  HANGING,
  NORMAL_SPACING,
  PAGE_CONFIG,
  SIZE,
  bodyParagraph,
  mainTitle,
  paragraphsFromText,
  sectionTitle,
} from './style-kit'

function buildSignatureTable(datos: DatosJGA): Table {
  const firmantes = getFirmantesTabla(datos)
  const rows: TableRow[] = []

  for (let i = 0; i < firmantes.length; i += 2) {
    const left = firmantes[i]
    const right = firmantes[i + 1]

    const cell = (f?: { nombre: string; cargo: string }) =>
      new TableCell({
        width: { size: 50, type: WidthType.PERCENTAGE },
        borders: {
          top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
          left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
          right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
          bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
        },
        children: f
          ? [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { after: 60 },
                border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: '000000' } },
                children: [new TextRun({ text: ' ', font: FONT, size: SIZE, color: COLOR })],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: f.nombre, font: FONT, size: SIZE, bold: true, color: COLOR })],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: f.cargo, font: FONT, size: SIZE, color: COLOR })],
              }),
            ]
          : [new Paragraph({ children: [new TextRun({ text: '', font: FONT, size: SIZE })] })],
      })

    rows.push(new TableRow({ children: [cell(left), cell(right)] }))
  }

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows,
  })
}

export async function generarDocxJGA(secciones: SeccionActa[], datos: DatosJGA): Promise<Buffer> {
  const children: (Paragraph | Table)[] = []

  for (const seccion of secciones) {
    if (seccion.tipo === 'encabezado') {
      const lines = seccion.contenido.split('\n').filter(Boolean)
      lines.forEach((line, idx) => {
        children.push(mainTitle(line, { after: idx === lines.length - 1 ? 360 : AFTER }))
      })
      continue
    }

    if (seccion.tipo === 'firmas') {
      children.push(sectionTitle('FIRMAS'))
      children.push(buildSignatureTable(datos))
      continue
    }

    if (seccion.tipo === 'certificacion') {
      children.push(new Paragraph({ children: [new PageBreak()] }))
      if (seccion.titulo) children.push(sectionTitle(seccion.titulo))
      children.push(...paragraphsFromText(seccion.contenido))
      continue
    }

    if (seccion.titulo) {
      children.push(sectionTitle(seccion.titulo))
    }

    if (seccion.tipo === 'agenda') {
      const items = seccion.contenido.split('\n').filter(Boolean)
      for (const item of items) {
        children.push(
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            spacing: NORMAL_SPACING,
            numbering: { reference: 'agenda-bullets', level: 0 },
            children: [new TextRun({ text: item, font: FONT, size: SIZE, color: COLOR })],
          }),
        )
      }
      continue
    }

    children.push(...paragraphsFromText(seccion.contenido))
  }

  const doc = new Document({
    sections: [
      {
        properties: { page: PAGE_CONFIG },
        children,
      },
    ],
    numbering: {
      config: [
        {
          reference: 'agenda-bullets',
          levels: [
            {
              level: 0,
              format: LevelFormat.BULLET,
              // Viñeta en el margen izquierdo (0 cm) y texto con sangría
              // francesa/colgante a 1.27 cm (0.5").
              text: '\u2022',
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: HANGING, hanging: HANGING } } },
            },
          ],
        },
      ],
    },
    styles: {
      default: {
        document: {
          run: { font: FONT, size: SIZE, color: COLOR },
          paragraph: { alignment: AlignmentType.JUSTIFIED, spacing: NORMAL_SPACING },
        },
        heading1: {
          run: { font: FONT, size: SIZE, bold: true, underline: { type: UnderlineType.SINGLE }, color: COLOR },
          paragraph: { alignment: AlignmentType.CENTER },
        },
      },
    },
  })

  const buffer = (await Packer.toBuffer(doc)) as Buffer<ArrayBuffer>
  return buffer
}
