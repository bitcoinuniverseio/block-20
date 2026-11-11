#!/usr/bin/env node
// Check the vendored Launchpad scripts against their manifest and the release
// entry page. Exits non-zero on any mismatch. Makes no network requests.
import { createHash, webcrypto } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'

const LAUNCHPAD_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..')

export function readManifest(dir = LAUNCHPAD_DIR) {
  return JSON.parse(readFileSync(join(dir, 'vendor', 'manifest.json'), 'utf8'))
}

export function digests(bytes) {
  return {
    bytes: bytes.length,
    sha256: createHash('sha256').update(bytes).digest('hex'),
    sri: `sha384-${createHash('sha384').update(bytes).digest('base64')}`,
  }
}

/** Run a classic browser script in an empty context and return its globals. */
export function loadGlobals(sources) {
  const context = vm.createContext({
    crypto: webcrypto,
    TextEncoder,
    TextDecoder,
    console: { log() {}, warn() {}, error() {} },
  })
  context.window = context
  context.self = context
  context.globalThis = context
  for (const source of sources) vm.runInContext(source, context, { timeout: 5_000 })
  return context
}

export function checkAsset(asset, bytes) {
  const errors = []
  const actual = digests(bytes)
  for (const key of ['bytes', 'sha256', 'sri']) {
    if (actual[key] !== asset[key]) {
      errors.push(`${asset.file}: ${key} is ${actual[key]}, manifest says ${asset[key]}`)
    }
  }
  return errors
}

export function checkEntry(manifest, html) {
  const errors = []
  if (/block20\.wtf/i.test(html)) errors.push('index.html still references block20.wtf')
  const scripts = [...html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"[^>]*>/g)]
  for (const [, src] of scripts) {
    if (/^(https?:)?\/\//i.test(src)) errors.push(`index.html loads an external script: ${src}`)
  }
  let last = -1
  for (const file of manifest.loadOrder) {
    const asset = manifest.assets.find((item) => item.file === file)
    const pattern = new RegExp(
      `<script src="${manifest.publicPath}${file.replace(/\./g, '\\.')}" integrity="${asset.sri.replace(/[+/]/g, '\\$&')}"`,
    )
    const match = pattern.exec(html)
    if (!match) {
      errors.push(`index.html does not load ${file} with its SRI hash`)
      continue
    }
    if (match.index < last) errors.push(`index.html loads ${file} out of order`)
    last = match.index
  }
  const gate = html.indexOf("app.type = 'module'")
  if (gate === -1 || gate < last) {
    errors.push('index.html must start the app module only after the vendored scripts load')
  }
  if (/<script type="module"[^>]*\bsrc=/.test(html)) {
    errors.push('index.html must not load the app module before the dependency check')
  }
  return errors
}

export function verify(dir = LAUNCHPAD_DIR) {
  const manifest = readManifest(dir)
  const errors = []
  const sources = []
  for (const file of manifest.loadOrder) {
    const asset = manifest.assets.find((item) => item.file === file)
    if (!asset) {
      errors.push(`load order names unknown asset ${file}`)
      continue
    }
    const bytes = readFileSync(join(dir, 'vendor', file))
    errors.push(...checkAsset(asset, bytes))
    sources.push(bytes.toString('utf8'))
  }
  if (errors.length === 0) {
    const globals = loadGlobals(sources)
    for (const asset of manifest.assets) {
      const value = globals[asset.global]
      for (const name of asset.exports) {
        if (!value || value[name] === undefined) {
          errors.push(`${asset.file} does not define ${asset.global}.${name}`)
        }
      }
    }
  }
  errors.push(...checkEntry(manifest, readFileSync(join(dir, 'release', 'index.html'), 'utf8')))
  return errors
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const errors = verify()
  for (const error of errors) console.error(error)
  if (errors.length > 0) process.exit(1)
  console.log('Launchpad vendor assets match the manifest.')
}
