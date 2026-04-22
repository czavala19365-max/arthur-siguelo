const Database = require('better-sqlite3');
const db = new Database('./data/arthur.db');
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log('Tablas:', tables.map(t => t.name));
tables.forEach(function(t) {
  var cols = db.prepare('PRAGMA table_info(' + t.name + ')').all();
  console.log(t.name + ':', cols.map(function(c){ return c.name; }));
});
