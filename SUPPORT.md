# Support

## Documentation

Start with the site: https://bitcoinuniverseio.github.io/block-20/

- **"What will be written to Bitcoin?"** See the [guide](https://bitcoinuniverseio.github.io/block-20/guide.html).
- **"Why did my mint credit nothing?"** Run the values through the
  [mint anchor verifier](https://bitcoinuniverseio.github.io/block-20/mint-hash.html#verifier).
  The most common causes are an anchor older than the freshness window, an amount above the
  per-mint limit, and supply already being exhausted.
- **"What does this order status mean?"** See the
  [lifecycle page](https://bitcoinuniverseio.github.io/block-20/lifecycle.html#statuses).
- **"I am writing an indexer."** See the
  [specification](https://bitcoinuniverseio.github.io/block-20/spec.html),
  the [test vectors](https://bitcoinuniverseio.github.io/block-20/vectors.html), and the
  [implementation checklist](https://bitcoinuniverseio.github.io/block-20/reference.html#checklist).

The wider Bitcoin Universe documentation platform is at https://docs.bitcoinuniverse.io

## Questions and corrections

Open an issue in this repository: https://github.com/bitcoinuniverseio/block-20/issues

Useful reports include the inscription content, the reveal block height, the anchor block height,
and the ticker's deploy height, maximum supply, and per-mint limit. Those five values are enough
to reproduce almost any BLOCK-20 outcome.

## Security

Do not report security issues in a public issue. Follow [SECURITY.md](SECURITY.md).

## What this repository cannot help with

- Recovering Bitcoin spent on an order. A funded commit and a mined reveal are not reversible.
- Changing an inscription after it is mined. There is no edit path in the protocol.
- Disputing a ticker. First valid deploy wins, and the protocol has no dispute mechanism.
- Trading BLOCK-20. No Bitcoin Universe product implements a trade path for this protocol.

## Safety reminder

Nobody working on this repository will ever ask for a seed phrase, a private key, or a wallet
export. Any message that does is an attempt to steal from you.
