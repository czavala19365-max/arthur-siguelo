import type { JgaWizardState, Shareholder } from './types'

function pad(text: string, width = 72): string {
  return text
}

function formatShareholderLine(sh: Shareholder, nominal: number): string {
  const rep =
    sh.entityType === 'juridica' && sh.representativeName
      ? `, representada por ${sh.representativeName}${sh.representativeDni ? `, identificado con DNI N° ${sh.representativeDni}` : ''}`
      : ''
  const idLabel = sh.entityType === 'juridica' ? 'RUC' : 'DNI'
  return `• ${sh.name}, identificad${sh.gender === 'femenino' ? 'a' : 'o'} con ${idLabel} N° ${sh.idNumber}${rep}, titular de ${sh.shares.toLocaleString('es-PE')} acciones de S/ ${nominal.toFixed(2)} de valor nominal cada una.`
}

function agendaItems(state: JgaWizardState): string[] {
  const items: string[] = []
  let n = 1
  const { agenda } = state

  if (agenda.capitalIncrease.enabled) {
    items.push(`${n}. Aumento de capital social por S/ ${agenda.capitalIncrease.amount.toLocaleString('es-PE')}.`)
    n++
  }
  if (agenda.capitalReduction.enabled) {
    items.push(`${n}. Reducción de capital social.`)
    n++
  }
  if (agenda.managerChange.enabled) {
    items.push(`${n}. Designación de Gerente General.`)
    n++
  }
  if (agenda.powers.enabled) {
    items.push(`${n}. Otorgamiento de poderes.`)
    n++
  }
  if (agenda.articlesAmendment.enabled) {
    items.push(`${n}. Reforma parcial de estatuto — ${agenda.articlesAmendment.articleName}.`)
    n++
  }
  if (agenda.custom.enabled && agenda.custom.title) {
    items.push(`${n}. ${agenda.custom.title}.`)
  }

  return items
}

function buildAcuerdos(state: JgaWizardState): string {
  const lines: string[] = []
  const { agenda, company } = state
  let sub = 1

  if (agenda.capitalIncrease.enabled) {
    const ci = agenda.capitalIncrease
    lines.push(`\n${sub}. AUMENTO DE CAPITAL SOCIAL\n`)
    lines.push(
      pad(
        `El Presidente informó a la Junta sobre la necesidad de aumentar el capital social de la sociedad en la suma de S/ ${ci.amount.toLocaleString('es-PE')} (${ci.amountWritten}), mediante ${ci.method}, elevando el capital social de S/ ${company.capital.toLocaleString('es-PE')} (${ci.priorCapitalWritten}) a la suma de S/ ${ci.newCapital.toLocaleString('es-PE')} (${ci.newCapitalWritten}).`,
      ),
    )
    if (ci.sharesByShareholder.length > 0) {
      lines.push('\nDistribución de acciones suscritas:')
      for (const row of ci.sharesByShareholder) {
        lines.push(`  • ${row.shareholderName}: ${row.shares.toLocaleString('es-PE')} acciones.`)
      }
    }
    lines.push(
      '\nLuego de una breve deliberación, la Junta acordó por unanimidad aprobar el aumento de capital en los términos expuestos y autorizar las modificaciones estatutarias correspondientes.',
    )
    sub++
  }

  if (agenda.capitalReduction.enabled) {
    const cr = agenda.capitalReduction
    lines.push(`\n${sub}. REDUCCIÓN DE CAPITAL SOCIAL\n`)
    lines.push(
      pad(
        `El Presidente expuso que, por ${cr.reason}, procede reducir el capital social en S/ ${cr.amount.toLocaleString('es-PE')}, quedando el capital social en S/ ${cr.newCapital.toLocaleString('es-PE')}.`,
      ),
    )
    lines.push(
      '\nLuego de una breve deliberación, la Junta acordó por unanimidad la reducción de capital y las modificaciones estatutarias pertinentes.',
    )
    sub++
  }

  if (agenda.managerChange.enabled) {
    const mc = agenda.managerChange
    lines.push(`\n${sub}. DESIGNACIÓN DE GERENTE GENERAL\n`)
    lines.push(
      pad(
        `El Presidente informó que ${mc.outgoingName} cesa en el cargo de Gerente General y propuso la designación de ${mc.incomingName}, identificado con DNI N° ${mc.incomingDni}, como nuevo Gerente General.`,
      ),
    )
    lines.push(
      '\nLuego de una breve deliberación, la Junta acordó por unanimidad aceptar la renuncia o cese y designar al nuevo Gerente General en los términos propuestos.',
    )
    sub++
  }

  if (agenda.powers.enabled) {
    const pw = agenda.powers
    lines.push(`\n${sub}. OTORGAMIENTO DE PODERES\n`)
    lines.push(pad(`El Presidente propuso otorgar poderes a favor de:`))
    for (const atty of pw.attorneys) {
      const trat = atty.gender === 'femenino' ? 'la señora' : 'el señor'
      lines.push(`  • ${trat} ${atty.name}, identificad${atty.gender === 'femenino' ? 'a' : 'o'} con DNI N° ${atty.dni}.`)
    }
    lines.push(pad(`Finalidad: ${pw.purpose}`))
    lines.push(
      '\nLuego de una breve deliberación, la Junta acordó por unanimidad otorgar los poderes indicados.',
    )
    sub++
  }

  if (agenda.articlesAmendment.enabled) {
    const am = agenda.articlesAmendment
    lines.push(`\n${sub}. REFORMA PARCIAL DE ESTATUTO\n`)
    lines.push(
      pad(
        `El Presidente sometió a consideración la modificación del artículo "${am.articleName}" con el siguiente texto: ${am.newText}`,
      ),
    )
    lines.push(
      '\nLuego de una breve deliberación, la Junta acordó por unanimidad aprobar la reforma parcial del estatuto.',
    )
    sub++
  }

  if (agenda.custom.enabled && agenda.custom.generatedText) {
    lines.push(`\n${sub}. ${agenda.custom.title.toUpperCase()}\n`)
    lines.push(pad(agenda.custom.generatedText))
    sub++
  } else if (agenda.custom.enabled && agenda.custom.description) {
    lines.push(`\n${sub}. ${agenda.custom.title.toUpperCase()}\n`)
    lines.push(pad(agenda.custom.description))
    lines.push(
      '\nLuego de una breve deliberación, la Junta acordó por unanimidad lo propuesto en este punto.',
    )
  }

  return lines.join('\n')
}

function signatureBlocks(shareholders: Shareholder[]): string {
  const lines: string[] = ['\n\n', '═'.repeat(72), '\nFIRMAS DE ACCIONISTAS\n', '═'.repeat(72), '\n']
  for (let i = 0; i < shareholders.length; i += 2) {
    const left = shareholders[i]
    const right = shareholders[i + 1]
    const leftName =
      left.entityType === 'juridica' && left.representativeName
        ? `${left.name}\nPor: ${left.representativeName}`
        : left.name
    const rightName = right
      ? right.entityType === 'juridica' && right.representativeName
        ? `${right.name}\nPor: ${right.representativeName}`
        : right.name
      : ''
    lines.push(`${leftName.padEnd(36)}${rightName}`)
    lines.push('\n\n\n')
  }
  return lines.join('\n')
}

export function buildDoc(state: JgaWizardState): string {
  const { company, shareholders, board } = state
  const totalShares = shareholders.reduce((s, sh) => s + sh.shares, 0)
  const nominal = company.nominalValue || 1
  const items = agendaItems(state)

  const parts: string[] = []

  parts.push('JUNTA GENERAL DE ACCIONISTAS DE')
  parts.push(company.name.toUpperCase())
  parts.push('')
  parts.push('I.    INTRODUCCIÓN')
  parts.push(
    pad(
      `En la ciudad de ${company.city}, siendo las ${company.startTime} horas del ${company.date}, los accionistas de ${company.name} (${company.entityType}), con domicilio en ${company.address}, se reunieron en Junta General de Accionistas, presidida por ${board.chairmanName}, en su calidad de ${board.chairmanTitle}, y actuando como secretario ${board.secretaryName}, en su calidad de ${board.secretaryTitle}.`,
    ),
  )
  parts.push('')
  parts.push('II.   ASISTENTES')
  for (const sh of shareholders) {
    parts.push(formatShareholderLine(sh, nominal))
  }
  parts.push('')
  parts.push('III.  PRESIDENCIA Y SECRETARÍA')
  parts.push(
    pad(
      `La presidencia de la Junta recayó en ${board.chairmanName}, ${board.chairmanTitle}, quien fue elegido por los accionistas presentes. La secretaría fue ejercida por ${board.secretaryName}, ${board.secretaryTitle}, designado al efecto.`,
    ),
  )
  parts.push('')
  parts.push('IV.   QUÓRUM')
  parts.push(
    pad(
      `Se dejó constancia que se encontraban presentes accionistas titulares de ${totalShares.toLocaleString('es-PE')} acciones, que representan el 100% del capital social de S/ ${company.capital.toLocaleString('es-PE')} (${company.capitalWritten}), con un valor nominal de S/ ${nominal.toFixed(2)} por acción. Conforme al artículo 120° de la Ley General de Sociedades, la Junta quedó válidamente constituida en primera convocatoria.`,
    ),
  )
  parts.push('')
  parts.push('V.    AGENDA')
  if (items.length === 0) {
    parts.push('  (Sin puntos de agenda registrados)')
  } else {
    for (const item of items) parts.push(`  ${item}`)
  }
  parts.push('')
  parts.push('VI.   ACUERDOS')
  parts.push(buildAcuerdos(state))
  parts.push('')
  parts.push('VII.  CIERRE DE LA JUNTA Y APROBACIÓN DEL ACTA')
  parts.push(
    pad(
      `No habiendo otro asunto que tratar, siendo las ${company.endTime} horas, el Presidente dio por concluida la sesión, aprobándose el acta por unanimidad de los accionistas presentes.`,
    ),
  )
  parts.push(signatureBlocks(shareholders))
  parts.push('')
  parts.push('═'.repeat(72))
  parts.push('CERTIFICACIÓN DEL GERENTE GENERAL')
  parts.push('═'.repeat(72))
  parts.push('')
  parts.push(
    pad(
      `Yo, ${board.certifyingManagerName}, identificado con DNI N° ${board.certifyingManagerDni}, en mi calidad de Gerente General, declaro bajo juramento que de acuerdo al Decreto Supremo N° 006-2013-JUS y normas complementarias, la presente es copia fiel y conforme del acta de Junta General de Accionistas de fecha ${company.date}, la cual se encuentra debidamente archivada en los libros de la sociedad.`,
    ),
  )
  parts.push('')
  parts.push(`\n\n_______________________________\n${board.certifyingManagerName}\nGerente General`)

  return parts.join('\n')
}

export function defaultJgaState(): JgaWizardState {
  return {
    company: {
      entityType: 'Sociedad Anónima Cerrada',
      name: '',
      capital: 0,
      capitalWritten: '',
      city: 'Lima',
      date: new Date().toISOString().slice(0, 10),
      startTime: '10:00',
      endTime: '11:30',
      address: '',
      nominalValue: 1,
    },
    shareholders: [],
    board: {
      chairmanName: '',
      chairmanTitle: 'Presidente del Directorio',
      chairmanRole: 'Presidente',
      secretaryName: '',
      secretaryTitle: 'Secretario',
      certifyingManagerName: '',
      certifyingManagerDni: '',
    },
    agenda: {
      capitalIncrease: {
        enabled: false,
        amount: 0,
        amountWritten: '',
        newCapital: 0,
        newCapitalWritten: '',
        priorCapitalWritten: '',
        method: 'aporte dinerario',
        sharesByShareholder: [],
      },
      capitalReduction: { enabled: false, amount: 0, newCapital: 0, reason: 'pérdidas' },
      managerChange: { enabled: false, outgoingName: '', incomingName: '', incomingDni: '' },
      powers: { enabled: false, attorneys: [], purpose: '' },
      articlesAmendment: { enabled: false, articleName: '', newText: '' },
      custom: { enabled: false, title: '', description: '', generatedText: '' },
    },
  }
}
