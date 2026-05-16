// @ts-nocheck — script opcional; requiere `pg` solo si se ejecuta con npm run db:fix-judicial-chat
/**
 * Aplica la corrección de document_messages (document_id bigint).
 * Requiere SUPABASE_DB_URL o DATABASE_URL (connection string Postgres de Supabase).
 *
 * Uso: npx tsx scripts/fix-document-messages-schema.ts
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { config } from 'dotenv'

config({ path: resolve(process.cwd(), '.env.local') })
config({ path: resolve(process.cwd(), '.env') })

const sqlPath = resolve(
  process.cwd(),
  'supabase/migrations/20260515120000_fix_document_messages_bigint.sql',
)
const sql = readFileSync(sqlPath, 'utf8')

async function main() {
  const url = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL
  if (!url?.trim()) {
    console.error(
      'Falta SUPABASE_DB_URL o DATABASE_URL en .env.local\n' +
        'Copia la connection string (URI) desde Supabase → Project Settings → Database.\n' +
        'O pega el SQL manualmente en el SQL Editor:\n' +
        sqlPath,
    )
    process.exit(1)
  }

  let pg: typeof import('pg')
  try {
    pg = await import('pg')
  } catch {
    console.error(
      'Instala pg para ejecutar este script: npm install -D pg\n' +
        'O ejecuta el SQL en Supabase SQL Editor:\n' +
        sqlPath,
    )
    process.exit(1)
  }

  const client = new pg.Client({ connectionString: url })
  await client.connect()
  try {
    await client.query(sql)
    console.log('OK: document_messages corregida (document_id → bigint).')
  } finally {
    await client.end()
  }
}

main().catch(err => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
