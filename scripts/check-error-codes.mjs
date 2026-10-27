import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const backendCodesPath = fileURLToPath(
  new URL('../../backend/src/domain/error-codes.ts', import.meta.url),
)
const frontendHandlersPath = fileURLToPath(
  new URL('../src/lib/error-handler.ts', import.meta.url),
)

const backendSource = readFileSync(backendCodesPath, 'utf8')
const handlersSource = readFileSync(frontendHandlersPath, 'utf8')

const codes = [...backendSource.matchAll(/^\s{2}([A-Z][A-Z0-9_]+):\s*\d+,?$/gm)].map(
  (match) => match[1],
)

const missing = codes.filter(
  (code) => !new RegExp(`\\b${code}:\\s*\\{`).test(handlersSource),
)

if (missing.length > 0) {
  console.error('Códigos del backend sin mapeo en frontend/src/lib/error-handler.ts:')
  for (const code of missing) console.error(`  - ${code}`)
  process.exit(1)
}

console.log(`OK: ${codes.length} códigos de error del backend tienen mapeo en el frontend.`)
