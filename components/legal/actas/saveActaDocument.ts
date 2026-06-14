import type { DatosJGA, SeccionActa } from '@/lib/document-intelligence/types'

export async function saveActaDocument(params: {
  documentoId: string | null
  secciones: SeccionActa[]
  datos: DatosJGA | null
  sociedadId?: string
}): Promise<{ documentoId: string }> {
  let id = params.documentoId

  if (!id) {
    if (!params.datos) throw new Error('No hay datos del acta para guardar')
    const createRes = await fetch('/api/documentos/generar-acta', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        datos: params.datos,
        sociedad_id: params.sociedadId,
        guardar: true,
      }),
    })
    const createData = await createRes.json()
    if (!createRes.ok) throw new Error(createData.error ?? 'Error al crear el documento')
    id = createData.documento_id
    if (!id) throw new Error('No se recibió ID del documento')
  }

  const patchRes = await fetch(`/api/documentos/jga/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contenido_generado: params.secciones,
      datos_entrada: params.datos ?? undefined,
      estado: 'revision',
    }),
  })
  const patchData = await patchRes.json()
  if (!patchRes.ok) throw new Error(patchData.error ?? 'Error al guardar cambios')

  return { documentoId: id }
}
