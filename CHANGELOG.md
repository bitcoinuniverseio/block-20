# Changelog

All notable documentation and specification changes for this repository are recorded here.

## Unreleased

### Added

- A dedicated [mint-hash reference](mint-hash.html) covering exact source selection, canonical syntax, timing, verification, reorganization, and reader-policy boundaries.
- A separate canonical mint-hash JSON Schema profile at [schemas/block20-mint-hash.profile.schema.json](schemas/block20-mint-hash.profile.schema.json), keeping strict client compatibility checks distinct from the current writer's permissive upstream handling.
- Byte-level UTF-8 mint serialization vectors, hash relationship vectors, funding UTXO vectors, and target-chain verification guidance.
- A direct funding and audit contract covering immutable order evidence, one-UTXO detection, selected-output behavior, and multi-instance monitor deployment.
- A source-driven BLOCK-20 implementation specification in [SPEC.md](SPEC.md).
- A JSON Schema for current emitted payload shapes.
- Static API, lifecycle, integration, and conformance documentation pages.
- Payload-to-request mapping, validation boundary, source-driven fixtures, and an end-to-end test matrix.
- Documentation maintenance guidance in [CONTRIBUTING.md](CONTRIBUTING.md).

### Corrected

- Clarified that a mint hash is the backend-observed Bitcoin tip block ID at order creation, not the reveal confirmation block, a transaction ID, an inscription ID, or a client-supplied field.
- Clarified that `GET /block20/latest-block` is observational and cannot be reused as a mint input or guaranteed to match a later order.
- Distinguished fresh token cache entries from stale same-key fallback entries when upstream indexers fail.
- Clarified that normal mint hashes are fetched and injected by the server, not supplied by the order API caller.
- Replaced unsupported claims that amounts are always positive integers. Current API behavior accepts zero and decimal amounts.
- Corrected public order defaults: omitted mint/transfer amounts become `"0"`, and deploy without limit or amount emits `"lim":"0"`.
- Documented the server-assisted commit/reveal lifecycle, one-hour monitor window, status and retry behavior, server-held reveal key, and receiver-address fallback risk.
- Documented that direct `repeatCount` changes funding but does not create multiple direct BLOCK-20 reveal operations.
