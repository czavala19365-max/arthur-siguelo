import Database from 'better-sqlite3'
import path from 'node:path'

const dbPath = path.join(process.cwd(), 'data', 'arthur.db')
const db = new Database(dbPath)

const casoCols = db.prepare('PRAGMA table_info(casos)').all() as { name: string }[]
if (!casoCols.some(c => c.name === 'parte_procesal')) {
  db.exec('ALTER TABLE casos ADD COLUMN parte_procesal TEXT')
}

// Actualiza la parte procesal — cambia 'GANOZA' por tu apellido real del CEJ
db.prepare(`
  UPDATE casos 
  SET parte_procesal = 'GANOZA', 
      last_checked = NULL, 
      estado_hash = ''
  WHERE numero_expediente = '06078-2020-0-1801-JR-CA-11'
`).run()

const caso = db.prepare(`
  SELECT id, alias, numero_expediente, parte_procesal, whatsapp_number, email 
  FROM casos 
  WHERE numero_expediente = '06078-2020-0-1801-JR-CA-11'
`).get()

console.log('Caso actualizado:', JSON.stringify(caso, null, 2))
db.close()
