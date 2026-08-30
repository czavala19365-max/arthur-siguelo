import { AlignmentType, LineRuleType, Paragraph, TextRun, UnderlineType } from 'docx'

// --- Formato corporativo compartido ---
// Página: A4, márgenes de 1 pulgada (2.54 cm) en los 4 lados.
// Usado por todos los generadores DOCX (JGA, Redactor Internacional, etc.)
// para que todo documento de Arthur luzca como redactado por la misma firma.
export const ONE_INCH = 1440 // twips
export const HANGING = 720 // 1.27 cm / 0.5 pulgada en twips

export const PAGE_CONFIG = {
  size: { width: 11906, height: 16838 }, // A4
  margin: { top: ONE_INCH, bottom: ONE_INCH, left: ONE_INCH, right: ONE_INCH },
}

// Fuente y métricas corporativas (Estilo 'Normal')
export const FONT = 'Arial'
export const SIZE = 22 // 11 pt (half-points)
export const LINE = 276 // interlineado 1.15 (240 = sencillo)
export const AFTER = 240 // espaciado posterior 12 pt (twips)
export const COLOR = '000000'

export const NORMAL_SPACING = { line: LINE, lineRule: LineRuleType.AUTO, after: AFTER }

export function bodyParagraph(text: string, opts?: { center?: boolean; indent?: boolean }): Paragraph {
  return new Paragraph({
    alignment: opts?.center ? AlignmentType.CENTER : AlignmentType.JUSTIFIED,
    spacing: NORMAL_SPACING,
    indent: opts?.indent !== false && !opts?.center ? { firstLine: HANGING } : undefined,
    children: [new TextRun({ text, font: FONT, size: SIZE, color: COLOR })],
  })
}

// Título Principal: Arial 11, Negrita, Subrayado, MAYÚSCULAS, Centrado.
export function mainTitle(text: string, opts?: { after?: number }): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { line: LINE, lineRule: LineRuleType.AUTO, after: opts?.after ?? AFTER },
    children: [
      new TextRun({
        text: text.toUpperCase(),
        font: FONT,
        size: SIZE,
        bold: true,
        underline: { type: UnderlineType.SINGLE },
        color: COLOR,
      }),
    ],
  })
}

// Títulos de Sección (ej. "I.- INTRODUCCIÓN"): Arial 11, Negrita, Subrayado,
// MAYÚSCULAS, Izquierda, con tabulación colgante a 1.27 cm.
export function sectionTitle(text: string): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing: { before: AFTER, after: AFTER, line: LINE, lineRule: LineRuleType.AUTO },
    indent: { left: HANGING, hanging: HANGING },
    children: [
      new TextRun({
        text: text.toUpperCase(),
        font: FONT,
        size: SIZE,
        bold: true,
        underline: { type: UnderlineType.SINGLE },
        color: COLOR,
      }),
    ],
  })
}

export function paragraphsFromText(text: string, indent = true): Paragraph[] {
  return text
    .split(/\n+/)
    .filter(Boolean)
    .map(line => bodyParagraph(line.trim(), { indent }))
}
