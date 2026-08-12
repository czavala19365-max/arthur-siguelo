export const CHECKLIST_SYSTEM = `You are a senior M&A and corporate transactions lawyer.
Generate a comprehensive transaction closing checklist in JSON format only.
Respond with valid JSON only — no markdown fences, no commentary.

Schema:
{
  "sections": [{
    "title": "string",
    "items": [{
      "description": "string",
      "status": "Pending",
      "responsible": "string",
      "dueDate": "",
      "notes": ""
    }]
  }]
}

Each section should have 5-10 items. Include 6-8 sections covering: corporate approvals, regulatory, financing, commercial contracts, IP/employment, real estate (if relevant), closing deliverables, and post-closing.
Use Spanish for descriptions and responsible party suggestions when the deal context is in Spanish.
Status must always be "Pending" for new items.`

export type PartyFieldLabels = {
  party1Label: string
  party2Label: string
  party1Placeholder: string
  party2Placeholder: string
  party1PromptKey: string
  party2PromptKey: string
}

/** Etiquetas de las dos partes según el tipo de operación. */
export function getPartyFieldLabels(transactionType: string): PartyFieldLabels {
  switch (transactionType) {
    case 'syndicated_loan':
      return {
        party1Label: 'Prestamista',
        party2Label: 'Prestatario',
        party1Placeholder: 'Ej. banco agente o sindicato de bancos',
        party2Placeholder: 'Ej. sociedad deudora',
        party1PromptKey: 'Lender (Prestamista)',
        party2PromptKey: 'Borrower (Prestatario)',
      }
    case 'project_finance':
      return {
        party1Label: 'Financiador / Prestamista',
        party2Label: 'Prestatario / Sponsor',
        party1Placeholder: 'Ej. banco o club de bancos',
        party2Placeholder: 'Ej. proyecto o SPV',
        party1PromptKey: 'Lender',
        party2PromptKey: 'Borrower / Sponsor',
      }
    case 'bond':
      return {
        party1Label: 'Emisor',
        party2Label: 'Banco colocador / Agente',
        party1Placeholder: 'Ej. sociedad emisora',
        party2Placeholder: 'Ej. banco de colocación',
        party1PromptKey: 'Issuer',
        party2PromptKey: 'Placement agent',
      }
    case 'jv':
      return {
        party1Label: 'Socio 1',
        party2Label: 'Socio 2',
        party1Placeholder: 'Nombre del socio',
        party2Placeholder: 'Nombre del socio',
        party1PromptKey: 'Party 1',
        party2PromptKey: 'Party 2',
      }
    case 'ipo':
      return {
        party1Label: 'Emisor',
        party2Label: 'Intermediario / Colocador',
        party1Placeholder: 'Ej. sociedad emisora',
        party2Placeholder: 'Ej. banco de inversión',
        party1PromptKey: 'Issuer',
        party2PromptKey: 'Underwriter',
      }
    default:
      return {
        party1Label: 'Comprador / Adquirente',
        party2Label: 'Vendedor / Objetivo',
        party1Placeholder: 'Comprador o adquirente',
        party2Placeholder: 'Vendedor o sociedad objetivo',
        party1PromptKey: 'Buyer/Acquirer',
        party2PromptKey: 'Seller/Target',
      }
  }
}

export function buildChecklistUserPrompt(opts: {
  dealName: string
  transactionType: string
  transactionTypeValue: string
  buyer: string
  seller: string
  leadCounsel: string
  targetClosingDate: string
}): string {
  const parties = getPartyFieldLabels(opts.transactionTypeValue)
  return `Generate a closing checklist for the following transaction:

Deal name: ${opts.dealName}
Transaction type: ${opts.transactionType}
${parties.party1PromptKey}: ${opts.buyer || 'Not specified'}
${parties.party2PromptKey}: ${opts.seller || 'Not specified'}
Lead legal counsel: ${opts.leadCounsel || 'Not specified'}
Target closing date: ${opts.targetClosingDate || 'Not specified'}

Return JSON only per the schema.`
}

export const TRANSACTION_TYPES = [
  { value: 'ma_share', label: 'M&A — Compraventa de acciones' },
  { value: 'ma_asset', label: 'M&A — Compraventa de activos' },
  { value: 'lbo', label: 'Leveraged Buyout (LBO)' },
  { value: 'project_finance', label: 'Project Finance' },
  { value: 'real_estate', label: 'Adquisición inmobiliaria' },
  { value: 'bond', label: 'Emisión de bonos corporativos' },
  { value: 'syndicated_loan', label: 'Préstamo sindicado' },
  { value: 'jv', label: 'Joint Venture' },
  { value: 'restructuring', label: 'Reestructuración corporativa' },
  { value: 'ipo', label: 'IPO / Mercado de capitales' },
  { value: 'other', label: 'Otro' },
] as const

export type ChecklistItem = {
  description: string
  status: string
  responsible: string
  dueDate: string
  notes: string
}

export type ChecklistSection = {
  title: string
  items: ChecklistItem[]
}

export type ChecklistData = {
  sections: ChecklistSection[]
}

export const CHECKLIST_STATUSES = [
  'Pendiente',
  'En progreso',
  'Completo',
  'N/A',
  'Renunciado',
] as const
