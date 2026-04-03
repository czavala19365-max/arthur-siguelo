'use server'

import { revalidatePath } from 'next/cache'
import { createTitulo, getTituloById, actualizarEstadoTitulo, registrarCambioEstado, getUltimoEstado, eliminarTitulo } from '@/lib/supabase'
import { consultarTitulo, descargarEsquela } from '@/lib/scraper'
import { enviarConfirmacionAgregado } from '@/lib/alertas'
import type { TituloFormState } from '@/types'

export async function agregarTitulo(
  _prevState: TituloFormState,
  formData: FormData
): Promise<TituloFormState> {
  const oficina_registral = formData.get('oficina_registral') as string
  const anio_titulo = Number(formData.get('anio_titulo'))
  const numero_titulo = formData.get('numero_titulo') as string
  const nombre_cliente = formData.get('nombre_cliente') as string
  const email_cliente = formData.get('email_cliente') as string
  const whatsapp_cliente = formData.get('whatsapp_cliente') as string

  if (!oficina_registral || !anio_titulo || !numero_titulo || !nombre_cliente || !email_cliente || !whatsapp_cliente) {
    return { error: 'Todos los campos son obligatorios.' }
  }

  if (anio_titulo < 1900 || anio_titulo > new Date().getFullYear() + 1) {
    return { error: 'El año del título no es válido.' }
  }

  try {
    await createTitulo({
      oficina_registral,
      anio_titulo,
      numero_titulo,
      nombre_cliente,
      email_cliente,
      whatsapp_cliente,
      ultimo_estado: null,
      ultima_consulta: null,
      area_registral: null,
    })
    revalidatePath('/')
    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    return { error: `Error al guardar: ${message}` }
  }
}

export async function agregarYConsultarTitulo(
  formData: FormData
): Promise<{ error?: string; success?: boolean; estado?: string; detalle?: string }> {
  const oficina_registral = formData.get('oficina_registral') as string
  const anio_titulo = Number(formData.get('anio_titulo'))
  const numero_titulo = formData.get('numero_titulo') as string
  const nombre_cliente = formData.get('nombre_cliente') as string
  const email_cliente = formData.get('email_cliente') as string
  const whatsapp_cliente = formData.get('whatsapp_cliente') as string

  if (!oficina_registral || !anio_titulo || !numero_titulo || !nombre_cliente || !email_cliente || !whatsapp_cliente) {
    return { error: 'Todos los campos son obligatorios.' }
  }

  if (anio_titulo < 1900 || anio_titulo > new Date().getFullYear() + 1) {
    return { error: 'El año del título no es válido.' }
  }

  let tituloId: string
  try {
    tituloId = await createTitulo({
      oficina_registral,
      anio_titulo,
      numero_titulo,
      nombre_cliente,
      email_cliente,
      whatsapp_cliente,
      ultimo_estado: null,
      ultima_consulta: null,
      area_registral: null,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    return { error: `Error al guardar: ${message}` }
  }

  try {
    const resultado = await consultarTitulo({ oficina_registral, anio_titulo, numero_titulo })
    await actualizarEstadoTitulo(tituloId, resultado.estado, resultado.areaRegistral)

    // Enviar email de confirmación (no bloquea si falla)
    const tituloGuardado = await getTituloById(tituloId)
    if (tituloGuardado) {
      enviarConfirmacionAgregado({
        titulo: tituloGuardado,
        estado: resultado.estado,
        detalle: resultado.detalle ?? undefined,
        registradoEn: new Date().toISOString(),
      }).catch(() => { /* silencioso */ })
    }

    revalidatePath('/')
    return { success: true, estado: resultado.estado, detalle: resultado.detalle ?? undefined }
  } catch {
    // El título ya fue guardado; devolvemos éxito parcial
    revalidatePath('/')
    return { success: true }
  }
}

export async function eliminarTituloAction(id: string): Promise<{ error?: string }> {
  console.log('[server] eliminarTituloAction llamado con id:', id)
  try {
    await eliminarTitulo(id)
    console.log('[server] eliminarTitulo completado OK')
    revalidatePath('/')
    return {}
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error al eliminar.'
    console.error('[server] eliminarTitulo error:', msg)
    return { error: msg }
  }
}

export async function consultarAhora(
  id: string
): Promise<{ estado?: string; detalle?: string; error?: string }> {
  try {
    const titulo = await getTituloById(id)
    if (!titulo) return { error: 'Título no encontrado.' }

    const resultado = await consultarTitulo({
      oficina_registral: titulo.oficina_registral,
      anio_titulo: titulo.anio_titulo,
      numero_titulo: titulo.numero_titulo,
    })

    // Detectar cambio de estado y registrarlo
    const estadoAnterior = await getUltimoEstado(id)
    if (estadoAnterior !== null && estadoAnterior !== resultado.estado) {
      await registrarCambioEstado({
        titulo_id: id,
        estado_anterior: estadoAnterior,
        estado_nuevo: resultado.estado,
      })
    }

    await actualizarEstadoTitulo(id, resultado.estado, resultado.areaRegistral)
    revalidatePath('/')

    return { estado: resultado.estado, detalle: resultado.detalle ?? undefined }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Error al consultar.' }
  }
}

export async function descargarEsquelaAction(
  id: string
): Promise<{ pdfs?: string[]; error?: string }> {
  try {
    const titulo = await getTituloById(id)
    if (!titulo) return { error: 'Título no encontrado.' }
    if (!titulo.ultimo_estado) return { error: 'El título no tiene estado registrado.' }
    if (!titulo.area_registral) return { error: 'Consulta el estado del título primero para obtener el área registral.' }

    const pdfs = await descargarEsquela({
      oficina_registral: titulo.oficina_registral,
      anio_titulo: titulo.anio_titulo,
      numero_titulo: titulo.numero_titulo,
      area_registral: titulo.area_registral,
      estado: titulo.ultimo_estado,
    })
    return { pdfs }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Error al descargar esquela.' }
  }
}
