# BLOCK-20

Protocol documentation for BLOCK-20, an inscription-carried token protocol on Bitcoin.

**Site: https://bitcoinuniverseio.github.io/block-20/**

BLOCK-20 writes compact UTF-8 JSON into Ordinals inscriptions. `deploy` defines a ticker,
`transfer` moves a balance, and `mint` creates units. What separates BLOCK-20 from other
inscription token protocols is that every mint carries the hash of a Bitcoin block, and a
reader credits that mint only when the named block is on the active chain, at or after the
ticker's deploy height, strictly before the mint's own reveal height, and no more than a
freshness window before the reveal. Minting is not open, it is proved.

## The rule in one line

```
D <= A < R   and   R - A <= W
```

where `A` is the height of the block named by the mint's `hash`, resolved against the active
chain, `D` is the ticker's deploy height, `R` is the height of the block revealing the mint,
and `W` is the reader's freshness window, 144 blocks by default.

## Payloads

```json
{"p":"block-20","op":"deploy","tick":"BLK","max":"21000000","lim":"1000"}
{"p":"block-20","op":"mint","tick":"BLK","amt":"1000","hash":"<64 lowercase hex>"}
{"p":"block-20","op":"transfer","tick":"BLK","amt":"250"}
```

Every key and every value must be a JSON string. Duplicate keys, non-string values, nested
structures, unknown fields, and trailing content are all rejected. Content must be 1 to 2048
bytes with content type `text/plain` or `application/json`.

## Key facts

| | |
| --- | --- |
| Protocol marker | `block-20` |
| Chain and network | Bitcoin, mainnet in production (testnet configurable in readers) |
| Carrier | Ordinals inscription envelope, taproot script-path reveal |
| Operations | `deploy`, `mint`, `transfer` |
| Ticker | one to five ASCII alphanumerics, case-insensitive identity, first valid deploy wins |
| Decimals | 0 |
| Amount ceiling | 2^128 minus 1 |
| Reader profile documented | `bitcoin-universe-block20-v1` |
| Document version | 2.0.0 |
| Lifecycle | experimental |

## Bitcoin Universe product support

Only what is recorded in the organization's capability registry:

- **Core explorer:** view, discover, view collection, view activity, view transaction.
- **Wallet:** view, send, receive.
- **Inscribe:** deploy, mint, transfer. The writer performs no token validation.
- **Marketplace:** none.

**BLOCK-20 is indexed but not tradeable inside Bitcoin Universe.** The capability registry
contains no marketplace entry for this protocol, so no Universe product implements listing,
buying, offers, acceptance, or settlement. This documentation makes no claim about venues
outside the organization.

## Pages

| Page | What it covers |
| --- | --- |
| [Overview](https://bitcoinuniverseio.github.io/block-20/) | What BLOCK-20 is, the anchor rule, audiences, verified support |
| [Specification](https://bitcoinuniverseio.github.io/block-20/spec.html) | Numbered normative rules and every rejection condition |
| [Guide](https://bitcoinuniverseio.github.io/block-20/guide.html) | Worked deploy, mint, and transfer examples |
| [Reference](https://bitcoinuniverseio.github.io/block-20/reference.html) | Terminology, indexer semantics, fees, limitations, security, checklist |
| [Lifecycle](https://bitcoinuniverseio.github.io/block-20/lifecycle.html) | Order stages and statuses, then reader event states |
| [Mint anchor](https://bitcoinuniverseio.github.io/block-20/mint-hash.html) | The derivation, plus a client-side verifier |
| [Test vectors](https://bitcoinuniverseio.github.io/block-20/vectors.html) | Valid and invalid cases with expected outcomes |
| [Changelog](https://bitcoinuniverseio.github.io/block-20/changelog.html) | Document version history and change policy |

## Attribution and scope

BLOCK-20 uses the compact field conventions established by inscription token standards that
originated outside Bitcoin Universe, notably BRC-20. The parts specific to BLOCK-20 are the
mint anchor and the reader rules that make it binding. The rules documented here describe the
`bitcoin-universe-block20-v1` reader profile and the Bitcoin Universe Inscribe writer. They are
implementations, not Bitcoin consensus rules, and another reader may reach a different
conclusion about the same inscription unless it applies the same profile.

## This repository

Static, hand-authored HTML, CSS, and vanilla JavaScript. No build step, no framework, no
external fonts, no CDNs, no trackers. Every page works with JavaScript disabled; JavaScript only
adds search, the theme toggle, and the anchor verifier. Published by GitHub Pages from `main`
at the repository root.

```
index.html  spec.html  guide.html  reference.html  lifecycle.html
mint-hash.html  vectors.html  changelog.html  404.html
site.css  site.js  verify.js  search-index.json
llms.txt  sitemap.xml  robots.txt  docs.manifest.json
favicon.svg  og.svg  .nojekyll
```

See [CONTRIBUTING.md](CONTRIBUTING.md) to propose a change, [SECURITY.md](SECURITY.md) to report
a vulnerability, and [SUPPORT.md](SUPPORT.md) for where to ask questions.

## Safety

Use a Bitcoin receiving address you control; an empty receiver falls back to a writer-controlled
address. Review the exact payload, receiver, commit address, required amount, expiry, and fee
before paying. Send one dedicated output, once. Never share a seed phrase or private key.
Bitcoin payments and confirmed inscriptions are difficult to reverse, and an inscription that
exists on Bitcoin is not the same as a balance that exists in a reader.
