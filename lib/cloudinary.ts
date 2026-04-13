import { v2 as cloudinary } from 'cloudinary'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

/**
 * Sube un buffer (PDF u otro archivo) a Cloudinary y devuelve la URL segura.
 * Devuelve null si la subida falla (nunca lanza).
 */
export async function uploadPdfToCloudinary(
  buffer: Buffer,
  folder: string,
  publicId: string
): Promise<string | null> {
  try {
    const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
      // Strip any trailing .pdf from publicId — Cloudinary appends it automatically
      // when format is specified, so passing it twice produces a double extension.
      const cleanPublicId = publicId.replace(/\.pdf$/i, '')

      const stream = cloudinary.uploader.upload_stream(
        {
          folder,
          public_id: cleanPublicId,
          resource_type: 'raw',
          type: 'upload',        // delivery type: upload = publicly accessible
          access_mode: 'public', // no auth tokens required to fetch the URL
          format: 'pdf',
          overwrite: true,
        },
        (error, result) => {
          if (error || !result) reject(error ?? new Error('Cloudinary upload returned no result'))
          else resolve(result)
        }
      )
      stream.end(buffer)
    })

    // Guarantee the URL is the plain public form:
    //   https://res.cloudinary.com/{cloud}/raw/upload/.../{public_id}.pdf
    // Authenticated URLs contain a signature segment (/s--...--/) — strip it if present.
    let url = result.secure_url.replace(/\/s--[^/]+--\//, '/')

    if (!url.endsWith('.pdf')) url += '.pdf'

    console.log('[Cloudinary] Uploaded:', url)
    return url
  } catch (err) {
    console.error('[Cloudinary] Upload failed:', err instanceof Error ? err.message : String(err))
    return null
  }
}

export { cloudinary }
