/**
 * Días hábiles peruanos — excluye fines de semana y feriados nacionales.
 */

// Feriados fijos: formato MM-DD
const FERIADOS_FIJOS = new Set([
  '01-01', // Año Nuevo
  '05-01', // Día del Trabajo
  '06-29', // San Pedro y San Pablo
  '07-28', // Fiestas Patrias
  '07-29', // Fiestas Patrias
  '08-30', // Santa Rosa de Lima
  '10-08', // Combate de Angamos
  '11-01', // Todos los Santos
  '12-08', // Inmaculada Concepción
  '12-25', // Navidad
])

/** Algoritmo gregoriano anónimo para calcular la fecha de Pascua */
function calcularPascua(year: number): Date {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31) - 1
  const day = ((h + l - 7 * m + 114) % 31) + 1
  return new Date(year, month, day)
}

function toYMD(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}

// Cache de Semana Santa (Jueves + Viernes Santo) por año
const cacheSemana: Record<number, Set<string>> = {}

function getSemanaSanta(year: number): Set<string> {
  if (!cacheSemana[year]) {
    const pascua = calcularPascua(year)
    const set = new Set<string>()
    for (const offset of [-3, -2]) {
      const d = new Date(pascua)
      d.setDate(pascua.getDate() + offset)
      set.add(toYMD(d))
    }
    cacheSemana[year] = set
  }
  return cacheSemana[year]
}

function esFeriado(date: Date): boolean {
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  if (FERIADOS_FIJOS.has(`${mm}-${dd}`)) return true
  return getSemanaSanta(date.getFullYear()).has(toYMD(date))
}

function esDiaHabil(date: Date): boolean {
  const dow = date.getDay()
  if (dow === 0 || dow === 6) return false
  return !esFeriado(date)
}

/**
 * Parsea una fecha en formato DD/MM/YYYY (con o sin hora) o ISO.
 */
export function parsearFecha(s: string | null | undefined): Date | null {
  if (!s) return null
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/)
  if (m) return new Date(parseInt(m[3]), parseInt(m[2]) - 1, parseInt(m[1]))
  const iso = new Date(s)
  return isNaN(iso.getTime()) ? null : iso
}

/**
 * Suma (o resta si sumar=false) `dias` días hábiles peruanos a una fecha.
 */
export function calcularDiasHabiles(
  fechaBase: Date | string | null | undefined,
  dias: number,
  sumar = true,
): Date | null {
  const base = typeof fechaBase !== 'object' || fechaBase === null
    ? parsearFecha(fechaBase as string | null)
    : new Date(fechaBase as Date)
  if (!base || isNaN(base.getTime())) return null

  const result = new Date(base)
  result.setHours(0, 0, 0, 0)
  const step = sumar ? 1 : -1
  let counted = 0
  while (counted < dias) {
    result.setDate(result.getDate() + step)
    if (esDiaHabil(result)) counted++
  }
  return result
}

/** Formatea una fecha como DD/MM/YYYY */
export function formatFechaPE(date: Date | null): string {
  if (!date) return '—'
  const d = String(date.getDate()).padStart(2, '0')
  const m = String(date.getMonth() + 1).padStart(2, '0')
  return `${d}/${m}/${date.getFullYear()}`
}

/**
 * Devuelve el color semáforo de urgencia:
 * - red    → ya pasó o es hoy
 * - orange → ≤ 2 días restantes
 * - green  → > 2 días restantes
 * - neutral → fecha no disponible
 */
export function colorPorFecha(
  fecha: Date | null,
): 'red' | 'orange' | 'green' | 'neutral' {
  if (!fecha) return 'neutral'
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  const limit = new Date(fecha)
  limit.setHours(0, 0, 0, 0)
  const diffDays = Math.floor((limit.getTime() - hoy.getTime()) / 86400000)
  if (diffDays < 0) return 'red'
  if (diffDays <= 2) return 'orange'
  return 'green'
}
