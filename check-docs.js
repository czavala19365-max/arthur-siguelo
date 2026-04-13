const Database = require('better-sqlite3');
const db = new Database('./data/arthur.db');
const movs = db.prepare('SELECT id, fecha, acto, tiene_documento, documento_url FROM movimientos WHERE caso_id = 8 LIMIT 10').all();
console.log(JSON.stringify(movs, null, 2));
