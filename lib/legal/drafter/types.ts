export interface SeccionDrafter {
  id: string
  titulo?: string
  contenido: string
  orden: number
}

export interface CambioDrafter {
  seccion: string
  tipo_cambio: 'agregado' | 'modificado' | 'eliminado'
  descripcion: string
}

export function seccionesDrafterToTexto(secciones: SeccionDrafter[]): string {
  return secciones
    .slice()
    .sort((a, b) => a.orden - b.orden)
    .map(s => (s.titulo ? `${s.titulo}\n\n${s.contenido}` : s.contenido))
    .join('\n\n')
}
