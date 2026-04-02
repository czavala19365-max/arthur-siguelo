export type Titulo = {
  id: string
  oficina_registral: string
  anio_titulo: number
  numero_titulo: string
  nombre_cliente: string
  email_cliente: string
  whatsapp_cliente: string
  created_at: string
}

export type TituloFormState = {
  error?: string
  success?: boolean
}
