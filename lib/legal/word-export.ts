/** Exporta contenido como documento Word (.doc) vía HTML con namespace Office. */
export function buildWordHtml(bodyContent: string, title = 'Documento'): string {
  const escaped = bodyContent
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  return `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8">
<title>${title}</title>
<!--[if gte mso 9]><xml>
<w:WordDocument><w:View>Print</w:View></w:WordDocument>
</xml><![endif]-->
<style>
  body { font-family: 'Times New Roman', Times, serif; font-size: 12pt; }
  pre { font-family: 'Times New Roman', Times, serif; font-size: 12pt; white-space: pre-wrap; word-wrap: break-word; }
  table { border-collapse: collapse; width: 100%; }
  th, td { border: 1px solid #333; padding: 6px 8px; font-size: 11pt; }
  th { background: #f0f0f0; }
</style>
</head>
<body>
<pre>${escaped}</pre>
</body>
</html>`
}

export function buildWordTableHtml(
  sections: Array<{ title: string; rows: Array<Record<string, string>> }>,
  columns: Array<{ key: string; label: string }>,
  title = 'Documento',
): string {
  let tables = ''
  for (const sec of sections) {
    tables += `<h2 style="font-size:14pt;margin-top:16px;">${sec.title}</h2><table><thead><tr>`
    for (const col of columns) {
      tables += `<th>${col.label}</th>`
    }
    tables += '</tr></thead><tbody>'
    for (const row of sec.rows) {
      tables += '<tr>'
      for (const col of columns) {
        const val = (row[col.key] ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;')
        tables += `<td>${val}</td>`
      }
      tables += '</tr>'
    }
    tables += '</tbody></table>'
  }

  return `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8"><title>${title}</title></head>
<body style="font-family:'Times New Roman',Times,serif;font-size:12pt;">${tables}</body>
</html>`
}

export function downloadAsWord(html: string, filename: string): void {
  const blob = new Blob(['\ufeff', html], { type: 'application/msword' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename.endsWith('.doc') ? filename : `${filename}.doc`
  a.click()
  URL.revokeObjectURL(url)
}

export function downloadTextAsWord(text: string, filename: string): void {
  downloadAsWord(buildWordHtml(text, filename), filename)
}
