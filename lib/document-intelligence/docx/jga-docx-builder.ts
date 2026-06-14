import {
  AlignmentType,
  Document,
  LevelFormat,
  Packer,
  PageBreak,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
  BorderStyle,
} from 'docx'
import type { DatosJGA, SeccionActa } from '../types'
import { getFirmantesTabla } from '../sections/signatures'

const PAGE_CONFIG = {
  size: { width: 11906, height: 16838 },
  margin: { top: 1701, bottom: 1418, left: 1701, right: 1418 },
}

const FONT = 'Times New Roman'
const BODY_SIZE = 24
const TITLE_SIZE = 28
const SECTION_SIZE = 24

function bodyParagraph(text: string, opts?: { bold?: boolean; center?: boolean; indent?: boolean }): Paragraph {
  return new Paragraph({
    alignment: opts?.center ? AlignmentType.CENTER : AlignmentType.JUSTIFIED,
    spacing: { line: 360, after: 120 },
    indent: opts?.indent !== false && !opts?.center ? { firstLine: 720 } : undefined,
    children: [
      new TextRun({
        text,
        font: FONT,
        size: opts?.bold ? SECTION_SIZE : BODY_SIZE,
        bold: opts?.bold,
      }),
    ],
  })
}

function sectionTitle(text: string): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 240, after: 120, line: 360 },
    children: [
      new TextRun({
        text: text.toUpperCase(),
        font: FONT,
        size: SECTION_SIZE,
        bold: true,
      }),
    ],
  })
}

function paragraphsFromText(text: string, indent = true): Paragraph[] {
  return text
    .split(/\n+/)
    .filter(Boolean)
    .map(line => bodyParagraph(line.trim(), { indent }))
}

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
                children: [new TextRun({ text: ' ', font: FONT, size: BODY_SIZE })],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: f.nombre, font: FONT, size: BODY_SIZE, bold: true })],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: f.cargo, font: FONT, size: BODY_SIZE })],
              }),
            ]
          : [new Paragraph({ children: [new TextRun({ text: '' })] })],
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
      const lines = seccion.contenido.split('\n')
      children.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 120, line: 360 },
          children: [
            new TextRun({ text: lines[0] ?? '', font: FONT, size: TITLE_SIZE, bold: true }),
          ],
        }),
      )
      if (lines[1]) {
        children.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 360, line: 360 },
            children: [
              new TextRun({ text: lines[1], font: FONT, size: TITLE_SIZE, bold: true }),
            ],
          }),
        )
      }
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

    if (seccion.titulo && seccion.tipo !== 'desarrollo') {
      children.push(sectionTitle(seccion.titulo))
    } else if (seccion.tipo === 'desarrollo' && seccion.titulo) {
      children.push(
        new Paragraph({
          spacing: { before: 240, after: 120, line: 360 },
          children: [
            new TextRun({
              text: seccion.titulo,
              font: FONT,
              size: SECTION_SIZE,
              bold: true,
            }),
          ],
        }),
      )
    }

    if (seccion.tipo === 'agenda') {
      const items = seccion.contenido.split('\n').filter(Boolean)
      for (const item of items) {
        children.push(
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            spacing: { line: 360, after: 60 },
            bullet: { level: 0 },
            children: [new TextRun({ text: item, font: FONT, size: BODY_SIZE })],
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
              text: '•',
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 720, hanging: 360 } } },
            },
          ],
        },
      ],
    },
    styles: {
      default: {
        document: {
          run: { font: FONT, size: BODY_SIZE },
          paragraph: { spacing: { line: 360, after: 120 } },
        },
        heading1: {
          run: { font: FONT, size: TITLE_SIZE, bold: true },
          paragraph: { alignment: AlignmentType.CENTER },
        },
      },
    },
  })

  const buffer = (await Packer.toBuffer(doc)) as Buffer<ArrayBuffer>
  return buffer
}
