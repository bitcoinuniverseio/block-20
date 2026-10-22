import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'
import {
  checkAsset,
  checkEntry,
  loadGlobals,
  readManifest,
  verify,
} from '../scripts/verify-launchpad-vendor.mjs'

const dir = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const manifest = readManifest(dir)
const html = readFileSync(join(dir, 'release', 'index.html'), 'utf8')
const sources = manifest.loadOrder.map((file) =>
  readFileSync(join(dir, 'vendor', file), 'utf8'),
)

// x coordinate of the secp256k1 generator, the public key of private key 1.
const GENERATOR_X =
  '79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798'

function hex(bytes) {
  return Buffer.from(bytes).toString('hex')
}

test('vendored bytes, SRI hashes, and the release entry match the manifest', () => {
  assert.deepEqual(verify(dir), [])
})

test('the manifest pins the exact verified upstream files', () => {
  const byFile = Object.fromEntries(manifest.assets.map((asset) => [asset.file, asset]))
  assert.equal(
    byFile['tapscript-1.2.7.2824ba7d.min.js'].sha256,
    '2824ba7d8c142eb3b1a164bde5108f3ba8bc136268e8332fcb7ad5886ab3372f',
  )
  assert.equal(
    byFile['crypto-utils-1.5.11.53a8bb1e.min.js'].sha256,
    '53a8bb1ec0818b0a1f6d40335ce6d3ce4ff43c340dbdab183ab90be3977a087b',
  )
  for (const asset of manifest.assets) {
    assert.ok(asset.file.includes(asset.sha256.slice(0, 8)), asset.file)
    assert.match(asset.tarballIntegrity, /^sha512-/)
  }
})

test('a changed byte is rejected', () => {
  const asset = manifest.assets[0]
  const bytes = Buffer.from(readFileSync(join(dir, 'vendor', asset.file)))
  bytes[100] ^= 1
  const errors = checkAsset(asset, bytes)
  assert.ok(errors.some((error) => error.includes('sha256')))
  assert.ok(errors.some((error) => error.includes('sri')))
})

test('the entry page never loads the former origin or an external script', () => {
  assert.doesNotMatch(html, /block20\.wtf/)
  assert.ok(checkEntry(manifest, html.replace('/vendor/launchpad/', 'https://block20.wtf/scripts/')).length > 0)
  const reordered = html
    .replace('tapscript-1.2.7.2824ba7d.min.js', '__FIRST__')
    .replace('crypto-utils-1.5.11.53a8bb1e.min.js', 'tapscript-1.2.7.2824ba7d.min.js')
    .replace('__FIRST__', 'crypto-utils-1.5.11.53a8bb1e.min.js')
  assert.ok(checkEntry(manifest, reordered).length > 0)
})

test('crypto-utils derives the generator x coordinate from private key 1', () => {
  const { cryptoUtils } = loadGlobals(sources)
  const pair = new cryptoUtils.KeyPair('01'.padStart(64, '0'))
  assert.equal(hex(pair.pub.rawX), GENERATOR_X)
  assert.equal(typeof cryptoUtils.Noble.utils.randomPrivateKey, 'function')
})

test('tapscript encodes the BIP-350 taproot address vector', () => {
  const { tapscript } = loadGlobals(sources)
  assert.equal(
    tapscript.Address.p2tr.encode(GENERATOR_X, 'main'),
    'bc1p0xlxvlhemja6c4dqv22uapctqupfhlxm9h8z3k2e72q4k9hcz7vqzk5jj0',
  )
  const script = tapscript.Script.encode([GENERATOR_X, 'OP_CHECKSIG'])
  assert.ok(script.length > 0)
  for (const name of ['Signer', 'Tap', 'Tx']) {
    assert.ok(tapscript[name], name)
  }
})

function runGate({ withTools }) {
  const gate = /<script>\s*([\s\S]*?)<\/script>/.exec(html)[1]
  const appended = []
  let onReady = null
  const root = { innerHTML: '' }
  const context = vm.createContext({
    document: {
      addEventListener(event, handler) {
        if (event === 'DOMContentLoaded') onReady = handler
      },
      createElement() {
        return {}
      },
      getElementById(id) {
        return id === 'root' ? root : null
      },
      body: { appendChild: (node) => appended.push(node) },
    },
  })
  context.window = context
  if (withTools) {
    Object.assign(context, loadGlobals(sources))
    context.window = context
  }
  vm.runInContext(gate, context)
  onReady()
  return { appended, root }
}

test('the app starts only after both vendored scripts load', () => {
  const { appended, root } = runGate({ withTools: true })
  assert.equal(appended.length, 1)
  assert.equal(appended[0].type, 'module')
  assert.equal(appended[0].src, '/assets/index-De9Bq-ib.js')
  assert.equal(root.innerHTML, '')
})

test('a missing dependency shows a bounded message and never starts the app', () => {
  const { appended, root } = runGate({ withTools: false })
  assert.equal(appended.length, 0)
  assert.match(
    root.innerHTML,
    /Launch tools could not load\. Your wallet has not been asked to sign\. Reload to try again\./,
  )
})
