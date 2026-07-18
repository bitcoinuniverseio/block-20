# Changelog

All notable documentation and specification changes for this repository are recorded here.

## Unreleased

### Added

- A source-driven BLOCK-20 implementation specification in [SPEC.md](SPEC.md).
- A JSON Schema for current emitted payload shapes.
- Static API, lifecycle, integration, and conformance documentation pages.
- Payload-to-request mapping, validation boundary, source-driven fixtures, and an end-to-end test matrix.
- Documentation maintenance guidance in [CONTRIBUTING.md](CONTRIBUTING.md).

### Corrected

- Clarified that normal mint hashes are fetched and injected by the server, not supplied by the order API caller.
- Replaced unsupported claims that amounts are always positive integers. Current API behavior accepts zero and decimal amounts.
- Corrected public order defaults: omitted mint/transfer amounts become `"0"`, and deploy without limit or amount emits `"lim":"0"`.
- Documented the server-assisted commit/reveal lifecycle, one-hour monitor window, status and retry behavior, server-held reveal key, and receiver-address fallback risk.
- Documented that direct `repeatCount` changes funding but does not create multiple direct BLOCK-20 reveal operations.
