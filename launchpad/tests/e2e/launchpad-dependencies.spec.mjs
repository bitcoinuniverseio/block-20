import { test, expect } from '@playwright/test'
import { createServer } from 'node:http'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const root = new URL('../../', import.meta.url)
let server, origin
test.beforeAll(async () => {
  server = createServer((request, response) => {
    const path = new URL(request.url, 'http://local').pathname
    if (request.method !== 'GET') { response.writeHead(405).end(); return }
    if (path === '/assets/index-De9Bq-ib.js') {
      response.writeHead(200, { 'content-type': 'application/javascript' })
      response.end('window.__appStarted = true;')
      return
    }
    const file = path === '/' ? 'release/index.html'
      : /^\/vendor\/launchpad\/[\w.-]+\.js$/.test(path) ? `vendor/${path.split('/').at(-1)}` : null
    if (!file) { response.writeHead(404).end(); return }
    response.writeHead(200, { 'content-type': file.endsWith('.js') ? 'application/javascript' : 'text/html' })
    response.end(readFileSync(fileURLToPath(new URL(file, root))))
  })
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  origin = `http://127.0.0.1:${server.address().port}`
})
test.afterAll(async () => { await new Promise(resolve => server.close(resolve)) })

test.beforeEach(async ({ page }) => {
  await page.route('**/*', route => {
    const request = route.request()
    return request.url().startsWith(origin) && ['GET', 'HEAD'].includes(request.method())
      ? route.continue() : route.abort()
  })
})

test('verified local scripts initialize with the former origin unreachable', async ({ page }) => {
  const former = []
  page.on('request', request => { if (request.url().includes('block20.wtf')) former.push(request.url()) })
  await page.goto(origin)
  await expect.poll(() => page.evaluate(() => window.__appStarted)).toBe(true)
  expect(await page.evaluate(() => [typeof window.tapscript.Tx, typeof window.cryptoUtils.KeyPair])).toEqual(['object', 'function'])
  expect(former).toEqual([])
})

for (const failure of ['tampered', 'missing']) {
  test(`${failure} signing dependency never initializes the app or a wallet`, async ({ page }) => {
    await page.route('**/vendor/launchpad/tapscript-*.js', async route => {
      if (failure === 'missing') return route.abort()
      const bytes = readFileSync(fileURLToPath(new URL('vendor/tapscript-1.2.7.2824ba7d.min.js', root)))
      return route.fulfill({ contentType: 'application/javascript', body: Buffer.concat([bytes, Buffer.from('\n// altered')]) })
    })
    await page.goto(origin)
    await expect(page.getByRole('alert')).toHaveText('Launch tools could not load. Your wallet has not been asked to sign. Reload to try again.')
    expect(await page.evaluate(() => window.__appStarted)).toBeUndefined()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  })
}
