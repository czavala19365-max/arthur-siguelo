export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const url = searchParams.get('url')

    if (!url) {
      return new Response('Missing url', { status: 400 })
    }

    console.log('[PROXY] Fetching:', url)

    const response = await fetch(url)

    console.log('[PROXY] Cloudinary status:', response.status)

    if (!response.ok) {
      console.error('[PROXY] Failed:', response.status, response.statusText)
      return new Response('Document not found', { status: 404 })
    }

    const buffer = await response.arrayBuffer()

    return new Response(buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline; filename="documento.pdf"',
      },
    })
  } catch (err) {
    console.error('[PROXY] Error:', err)
    return new Response('Error', { status: 500 })
  }
}
