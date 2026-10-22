// Optional maintainer check against the pinned package archives. Routine CI is
// offline and uses verify-launchpad-vendor.mjs against the committed bytes.
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { readManifest } from './verify-launchpad-vendor.mjs'

function entry(tar, name) {
  for (let offset = 0; offset + 512 <= tar.length;) {
    const header = tar.subarray(offset, offset + 512)
    const file = header.subarray(0, 100).toString().replace(/\0.*$/, '')
    const size = Number.parseInt(header.subarray(124, 136).toString().replace(/\0.*$/, '').trim() || '0', 8)
    assert.ok(Number.isSafeInteger(size) && size >= 0 && offset + 512 + size <= tar.length)
    if (file === name) return tar.subarray(offset + 512, offset + 512 + size)
    offset += 512 + Math.ceil(size / 512) * 512
  }
  throw new Error(`Archive entry missing: ${name}`)
}

for (const asset of readManifest().assets) {
  assert.equal(new URL(asset.tarball).origin, 'https://registry.npmjs.org')
  const response = await fetch(asset.tarball, { signal: AbortSignal.timeout(15_000), redirect: 'error' })
  assert.ok(response.ok, `Package archive HTTP ${response.status}`)
  const archive = Buffer.from(await response.arrayBuffer())
  assert.equal(`sha512-${createHash('sha512').update(archive).digest('base64')}`, asset.tarballIntegrity)
  const tar = gunzipSync(archive)
  const metadata = JSON.parse(entry(tar, 'package/package.json').toString())
  assert.equal(metadata.name, asset.package)
  assert.equal(metadata.version, asset.version)
  const bytes = entry(tar, asset.sourcePath)
  assert.equal(createHash('sha256').update(bytes).digest('hex'), asset.sha256)
  assert.equal(`sha384-${createHash('sha384').update(bytes).digest('base64')}`, asset.sri)
  assert.deepEqual(bytes, readFileSync(new URL(`../vendor/${asset.file}`, import.meta.url)))
  // Git may normalize the license text on Windows; script bytes above must
  // remain exact. Compare license content with only line endings normalized.
  const license = readFileSync(new URL(`../vendor/LICENSE.${asset.global === 'tapscript' ? 'tapscript' : 'crypto-utils'}`, import.meta.url), 'utf8')
  assert.equal(entry(tar, 'package/LICENSE').toString().replace(/\r\n/g, '\n'), license.replace(/\r\n/g, '\n'))
  console.log(`${asset.package}@${asset.version}: package identity, archive integrity, license and final bytes verified`)
}
