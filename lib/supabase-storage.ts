import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

export async function uploadPdfToSupabase(
  buffer: Buffer,
  numeroExpediente: string,
  fecha: string,
  acto: string
): Promise<string | null> {
  try {
    const sanitize = (s: string) => s.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80)
    const fileName = `${sanitize(fecha)}-${sanitize(acto)}.pdf`
    const filePath = `${sanitize(numeroExpediente)}/${fileName}`

    const { error } = await supabase.storage
      .from(process.env.SUPABASE_BUCKET!)
      .upload(filePath, buffer, {
        contentType: 'application/pdf',
        upsert: true
      })

    if (error) {
      console.error('[Supabase] Upload error:', error.message)
      return null
    }

    const { data } = supabase.storage
      .from(process.env.SUPABASE_BUCKET!)
      .getPublicUrl(filePath)

    console.log('[Supabase] Uploaded:', data.publicUrl)
    return data.publicUrl

  } catch (err) {
    console.error('[Supabase] Error:', err)
    return null
  }
}
