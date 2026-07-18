# BLOCK-20 documentation

Implementation-accurate documentation for the BLOCK-20 writer and order flow in [Bitcoin Universe Inscribe](https://github.com/bitcoinuniverse/inscribe).

This repository documents a Bitcoin Universe application profile. It is not a network-wide consensus specification and it does not guarantee compatibility with every independent BLOCK-20 reader or indexer.

## Start here

- [Overview](index.html): scope, architecture, and the facts that affect every integration.
- [Payload specification](reference.html): emitted JSON, carrier, field mapping, defaults, and validation boundary.
- [API reference](api.html): order creation, order reads, reveal, tip lookup, token list, and error behavior.
- [Lifecycle](lifecycle.html): commit funding, server-assisted reveal, status states, expiry, retry, custody, and receiver safety.
- [Integration guide](guide.html): product workflow, client validation, payment UX, recovery, and operations.
- [Conformance](conformance.html): source-driven fixtures and end-to-end test matrix.
- [Prose specification](SPEC.md): durable implementation specification and change policy.
- [Payload JSON Schema](schemas/block20-inscribe-payload.schema.json): shape validation for current emitted payloads.

## What this set corrects

The earlier documentation described only generic payload shapes. The current set documents the actual application behavior:

- The payload is compact UTF-8 JSON in an Ordinals inscription with content type `text/plain;charset=utf-8`.
- REST request fields differ from on-chain payload fields. The server injects `p`, and normal mint orders inject a live block `hash`.
- The API creates a server-assisted commit and reveal order. A client does not construct the final reveal transaction at order creation time.
- A valid, user-controlled `receiverAddress` is essential. An empty receiver falls back to the server-generated commit address at reveal.
- The public writer currently permits zero and decimal amounts, and it does not validate ticker, max supply, or mint limit semantics. Those are compatibility concerns, not guarantees.
- Direct `repeatCount` multiplies funding but does not create multiple direct BLOCK-20 inscription payloads or monitor reveals.

## Source of truth

The documentation is grounded in these implementation locations:

- [`backend/src/block20`](https://github.com/bitcoinuniverse/inscribe/tree/main/backend/src/block20)
- [`backend/src/inscribe/bitcoin.utils.ts`](https://github.com/bitcoinuniverse/inscribe/blob/main/backend/src/inscribe/bitcoin.utils.ts)
- [`backend/src/common/bitcoin-validation.ts`](https://github.com/bitcoinuniverse/inscribe/blob/main/backend/src/common/bitcoin-validation.ts)
- [`frontend/src/components/block20`](https://github.com/bitcoinuniverse/inscribe/tree/main/frontend/src/components/block20)

Always compare this documentation with the deployed source before sending funds. The returned `inscriptionJson` is the concrete record to display, save, and verify for a created order.

## Local preview

This is a static documentation site with no build step. Serve the repository with any local static HTTP server, then open `index.html`. Check every navigation link at both desktop and narrow mobile widths.

## Documentation maintenance

Read [CONTRIBUTING.md](CONTRIBUTING.md) before changing behavior claims. If a source change affects payload serialization, validation, transaction construction, lifecycle, or compatibility, update:

1. `SPEC.md`.
2. The relevant HTML page and `llms.txt`.
3. The payload schema and conformance fixtures when applicable.
4. `CHANGELOG.md` with the compatibility impact.

## License

See [LICENSE](LICENSE).
