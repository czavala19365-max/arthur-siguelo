import { NextResponse } from 'next/server'
import { getTitulos } from '@/lib/supabase'

export interface AgendaFecha {
  tipo: 'vencimiento' | 'presentacion' | 'calificacion'
  label: string
  fecha: string
}

export interface TituloAgenda {
  id: string
  numero_titulo: string
  anio_titulo: number
  oficina_registral: string
  nombre_cliente: string
  ultimo_estado: string | null
  actos: string[] | null
  fechas: AgendaFecha[]
}

export async function GET() {
  try {
    const titulos = await getTitulos()

    const titulosAgenda: TituloAgenda[] = []

    for (const titulo of titulos) {
      const fechas: AgendaFecha[] = []

      if (titulo.fecha_presentacion) {
        fechas.push({
          tipo: 'presentacion',
          label: 'Presentación',
          fecha: titulo.fecha_presentacion,
        })
      }

      if (titulo.fecha_ingreso_calificacion) {
        fechas.push({
          tipo: 'calificacion',
          label: 'Ingreso a Calificación',
          fecha: titulo.fecha_ingreso_calificacion,
        })
      }

      if (titulo.fecha_vencimiento) {
        fechas.push({
          tipo: 'vencimiento',
          label: 'Vencimiento',
          fecha: titulo.fecha_vencimiento,
        })
      }

      if (fechas.length > 0) {
        titulosAgenda.push({
          id: titulo.id,
          numero_titulo: titulo.numero_titulo,
          anio_titulo: titulo.anio_titulo,
          oficina_registral: titulo.oficina_registral,
          nombre_cliente: titulo.nombre_cliente,
          ultimo_estado: titulo.ultimo_estado,
          actos: titulo.actos ?? null,
          fechas,
        })
      }
    }

    // Plazos planos (solo vencimientos futuros) para compatibilidad con la lista ordenada
    const plazos = titulosAgenda
      .filter(t => t.fechas.some(f => f.tipo === 'vencimiento'))
      .map(t => {
        const venc = t.fechas.find(f => f.tipo === 'vencimiento')!
        return {
          id: `${t.id}-venc`,
          tramite_id: t.id,
          descripcion: `Vencimiento — Título ${t.numero_titulo} (${t.oficina_registral})`,
          fecha_vencimiento: venc.fecha,
          tipo: 'subsanacion' as const,
          alias: t.nombre_cliente,
        }
      })

    return NextResponse.json({ plazos, titulos: titulosAgenda })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error al obtener plazos.' },
      { status: 500 }
    )
  }
}
