'use server'

import { revalidatePath } from 'next/cache'
import { createTitulo } from '@/lib/supabase'
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

  if (
    !oficina_registral ||
    !anio_titulo ||
    !numero_titulo ||
    !nombre_cliente ||
    !email_cliente ||
    !whatsapp_cliente
  ) {
    return { error: 'Todos los campos son obligatorios.' }
  }

  if (anio_titulo < 1900 || anio_titulo > new Date().getFullYear()) {
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
    })
    revalidatePath('/')
    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    return { error: `Error al guardar: ${message}` }
  }
}
