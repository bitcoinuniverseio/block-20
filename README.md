# BLOCK-20 documentation

Bitcoin Universe documentation for BLOCK-20 on Bitcoin.

## What this covers

BLOCK-20 in this repository documents the payload contract exposed by Bitcoin Universe Inscribe. It supports deploy, mint, and transfer messages, with mint operations optionally bound to a Bitcoin block hash.

## State model

This is an application-facing profile. Its payloads are useful only when the builder, API, and consuming indexer agree on the same version and validation behavior.

## Documentation site

- Overview: [index.html](index.html)
- Field reference: [reference.html](reference.html)
- Build and verification playbook: [guide.html](guide.html)

## Core rules

- p is block-20 for every supported payload.
- deploy supplies max and lim, with application defaults only when the builder explicitly applies them.
- mint carries amt and can carry a 64-character Bitcoin block hash.
- transfer carries a positive amt.
- A valid JSON object is not enough: the target reader must support this profile version.
- Keep the profile version and source application in integration records.

## Source material

- [Bitcoin Universe Inscribe BLOCK-20 builder](https://github.com/bitcoinuniverse/inscribe/tree/main/backend/src/block20)

## Scope

This repository specifies the Bitcoin Universe Inscribe profile. It does not claim to define a network-wide consensus standard outside compatible implementations.
