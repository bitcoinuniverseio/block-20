import assert from 'node:assert/strict'

assert.equal(process.versions.node, '24.19.0', 'Use the pinned Node.js runtime')
assert.match(process.env.npm_config_user_agent ?? '', /^npm\/11\.17\.0\b/, 'Run through npm 11.17.0')
