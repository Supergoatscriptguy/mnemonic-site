// copies the engine and the tokenizer from the Mnemonic repo next door into public/.
// engine.wasm is built there from site\engine.wat (.\build.bat site\engine)
import { copyFileSync, statSync } from 'node:fs'

const repo = new URL('../../Mnemonic/', import.meta.url)
const files = [
  ['site/web/engine.wasm', 'engine.wasm'],
  ['datasets/tokenizer.bin', 'tokenizer.bin'],
]
for (const [from, to] of files) {
  const src = new URL(from, repo)
  copyFileSync(src, new URL(`../public/${to}`, import.meta.url))
  console.log(`${to}  ${statSync(src).size} bytes`)
}