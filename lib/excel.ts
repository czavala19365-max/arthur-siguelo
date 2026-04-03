import * as XLSX from 'xlsx'
import type { Titulo } from '@/types'

export function generarExcelTitulos(titulos: Titulo[]): Buffer {
  const rows = titulos.map((t, i) => ({
    'N°': i + 1,
    'Cliente': t.nombre_cliente,
    'Proyecto': t.proyecto ?? '',
    'Asunto': t.asunto ?? '',
    'Oficina Registral': t.oficina_registral,
    'Año': t.anio_titulo,
    'Número': t.numero_titulo,
    'Registro': t.registro ?? '',
    'Abogado': t.abogado ?? '',
    'Notaría / Presentante': t.notaria ?? '',
    'Último Estado': t.ultimo_estado ?? '',
    'Última Consulta': t.ultima_consulta
      ? new Date(t.ultima_consulta).toLocaleString('es-PE', { timeZone: 'America/Lima' })
      : '',
  }))

  const ws = XLSX.utils.json_to_sheet(rows)

  // Ajustar ancho de columnas
  ws['!cols'] = [
    { wch: 5 },  // N°
    { wch: 28 }, // Cliente
    { wch: 22 }, // Proyecto
    { wch: 28 }, // Asunto
    { wch: 20 }, // Oficina Registral
    { wch: 6 },  // Año
    { wch: 12 }, // Número
    { wch: 22 }, // Registro
    { wch: 22 }, // Abogado
    { wch: 28 }, // Notaría
    { wch: 16 }, // Último Estado
    { wch: 20 }, // Última Consulta
  ]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Títulos')
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
}
