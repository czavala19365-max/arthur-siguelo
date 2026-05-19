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

export function buildChecklistUserPrompt(opts: {
  dealName: string
  transactionType: string
  buyer: string
  seller: string
  leadCounsel: string
  targetClosingDate: string
}): string {
  return `Generate a closing checklist for the following transaction:

Deal name: ${opts.dealName}
Transaction type: ${opts.transactionType}
Buyer/Acquirer: ${opts.buyer || 'Not specified'}
Seller/Target: ${opts.seller || 'Not specified'}
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
