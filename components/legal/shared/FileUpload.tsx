'use client'

import { useRef, useState } from 'react'
import { readFileAsBase64, validateAttachmentMeta } from '@/lib/legal/file-attachments'
import { legalStyles } from '@/lib/legal/styles'

export interface UploadedFile {
  name: string
  mimeType: string
  base64: string
}

interface FileUploadProps {
  files: UploadedFile[]
  onChange: (files: UploadedFile[]) => void
  label?: string
}

export default function FileUpload({ files, onChange, label = 'Archivos de referencia' }: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState('')

  async function handleFiles(fileList: FileList | null) {
    if (!fileList?.length) return
    setError('')
    const next = [...files]

    for (const file of Array.from(fileList)) {
      const err = validateAttachmentMeta(file.name, file.size)
      if (err) {
        setError(`${file.name}: ${err}`)
        continue
      }
      const base64 = await readFileAsBase64(file)
      next.push({ name: file.name, mimeType: file.type, base64 })
    }

    onChange(next)
  }

  return (
    <div style={legalStyles.card}>
      <label style={legalStyles.label}>{label}</label>
      <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 12 }}>
        PDF, DOCX o TXT — máximo 10 MB por archivo. El formato .doc antiguo no está soportado.
      </p>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx,.txt"
        multiple
        style={{ display: 'none' }}
        onChange={e => void handleFiles(e.target.files)}
      />
      <button type="button" style={legalStyles.btnSecondary} onClick={() => inputRef.current?.click()}>
        Seleccionar archivos
      </button>
      {error && <p style={{ color: '#b91c1c', fontSize: 13, marginTop: 8 }}>{error}</p>}
      {files.length > 0 && (
        <ul style={{ marginTop: 12, paddingLeft: 0, listStyle: 'none' }}>
          {files.map((f, i) => (
            <li
              key={`${f.name}-${i}`}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '8px 0',
                borderTop: '1px solid var(--line-faint)',
                fontSize: 13,
              }}
            >
              <span>{f.name}</span>
              <button
                type="button"
                style={{ ...legalStyles.btnSecondary, padding: '4px 10px', fontSize: 9 }}
                onClick={() => onChange(files.filter((_, j) => j !== i))}
              >
                Quitar
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
