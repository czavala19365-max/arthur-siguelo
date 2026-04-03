import { enviarConfirmacionAgregado } from '@/lib/alertas'

const titulo = {
  id: 'test-id',
  created_at: new Date().toISOString(),
  oficina_registral: 'LIMA',
  anio_titulo: 2026,
  numero_titulo: '431663',
  nombre_cliente: 'Cliente de Prueba',
  email_cliente: 'czavala19365@gmail.com',
  whatsapp_cliente: '+51999999999',
  ultimo_estado: 'OBSERVADO',
  ultima_consulta: new Date().toISOString(),
  area_registral: '22000',
}

enviarConfirmacionAgregado({
  titulo,
  estado: 'OBSERVADO',
  detalle: 'OTORGAMIENTO DE PODER',
  registradoEn: new Date().toISOString(),
})
  .then(() => console.log('✅ Email de confirmación enviado correctamente'))
  .catch((err: Error) => console.error('❌ Error:', err.message))
