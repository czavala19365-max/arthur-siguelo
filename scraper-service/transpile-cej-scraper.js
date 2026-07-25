'use strict'

const fs = require('fs')
const ts = require('typescript')

const sourcePath = '../lib/cej-scraper.ts'
const filePath = 'cej-scraper.js'
const source = fs.readFileSync(sourcePath, 'utf8')

const output = ts.transpileModule(source, {
  fileName: 'cej-scraper.ts',
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
    esModuleInterop: true,
  },
}).outputText

fs.writeFileSync(filePath, output)
console.log('[transpile-cej-scraper] wrote', filePath, 'from', sourcePath)