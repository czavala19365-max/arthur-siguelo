export type EntityType = 'natural' | 'juridica'
export type Gender = 'masculino' | 'femenino'

export interface Shareholder {
  id: string
  name: string
  entityType: EntityType
  gender: Gender
  idNumber: string
  shares: number
  representativeName: string
  representativeDni: string
}

export interface CompanyInfo {
  entityType: string
  name: string
  capital: number
  capitalWritten: string
  city: string
  date: string
  startTime: string
  endTime: string
  address: string
  nominalValue: number
}

export interface BoardInfo {
  chairmanName: string
  chairmanTitle: string
  chairmanRole: string
  secretaryName: string
  secretaryTitle: string
  certifyingManagerName: string
  certifyingManagerDni: string
}

export interface CapitalIncreaseAgenda {
  enabled: boolean
  amount: number
  amountWritten: string
  newCapital: number
  newCapitalWritten: string
  priorCapitalWritten: string
  method: string
  sharesByShareholder: Array<{ shareholderName: string; shares: number }>
}

export interface CapitalReductionAgenda {
  enabled: boolean
  amount: number
  newCapital: number
  reason: string
}

export interface ManagerChangeAgenda {
  enabled: boolean
  outgoingName: string
  incomingName: string
  incomingDni: string
}

export interface PowerOfAttorney {
  name: string
  dni: string
  gender: Gender
}

export interface PowersAgenda {
  enabled: boolean
  attorneys: PowerOfAttorney[]
  purpose: string
}

export interface ArticlesAmendmentAgenda {
  enabled: boolean
  articleName: string
  newText: string
}

export interface CustomAgendaItem {
  enabled: boolean
  title: string
  description: string
  generatedText?: string
}

export interface AgendaState {
  capitalIncrease: CapitalIncreaseAgenda
  capitalReduction: CapitalReductionAgenda
  managerChange: ManagerChangeAgenda
  powers: PowersAgenda
  articlesAmendment: ArticlesAmendmentAgenda
  custom: CustomAgendaItem
}

export interface JgaWizardState {
  company: CompanyInfo
  shareholders: Shareholder[]
  board: BoardInfo
  agenda: AgendaState
}
