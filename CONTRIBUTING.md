# Contributing to BLOCK-20 documentation

## Documentation standard

This repository is source-driven. Do not promote an intended product rule to an implementation fact unless the deployed source enforces it. When behavior differs from a desirable rule, document both clearly:

- **Current implementation behavior**: what the writer, API, or lifecycle code does now.
- **Compatibility or product recommendation**: what a client or target reader should require for safe use.

For example, the API currently accepts decimal and zero amounts. Documentation must not state that the server requires a positive integer unless the code and tests are changed first.

## When to update the docs

Update this repository whenever a source change affects any of the following:

- emitted JSON fields, serialization, defaults, carrier, MIME type, or mint-hash selection timing;
- order request or response fields;
- validation, error behavior, or authentication assumptions;
- commit address, reveal, receiver, fee, retry, or expiry behavior;
- network or upstream indexer configuration;
- test vectors, compatibility claims, or operational custody assumptions.

## Required update set

For a behavior change, update the relevant items together:

1. [SPEC.md](SPEC.md).
2. The matching static page or pages.
3. [llms.txt](llms.txt).
4. [schemas/block20-inscribe-payload.schema.json](schemas/block20-inscribe-payload.schema.json), if emitted shape changes, and [schemas/block20-mint-hash.profile.schema.json](schemas/block20-mint-hash.profile.schema.json), if canonical mint-hash guidance changes.
5. [conformance.html](conformance.html), if a testable behavior changes.
6. [CHANGELOG.md](CHANGELOG.md), including compatibility impact and linked source change.

## Review checklist

- Link every material claim to the relevant implementation source in the pull request or review note.
- Separate API input names from emitted payload names.
- State default behavior as exercised through public endpoints, not only a helper function.
- Flag state that is determined by an external reader or indexer rather than the writer.
- For mints, distinguish the backend-observed tip snapshot from the reveal confirmation block, transaction IDs, and any reader freshness or reorganization policy.
- Do not suggest that a successful HTTP response proves an on-chain reveal or accepted token state.
- Do not omit custody or destination implications of server-assisted reveal.
- Avoid the U+2014 punctuation character in documentation.

## Static-site checks

This repository has no build step. Before publishing:

1. Open every HTML page through a local static server.
2. Verify desktop and narrow mobile navigation.
3. Check all internal links, source links, code blocks, tables, and schema links.
4. Confirm the Markdown, `llms.txt`, and site pages agree on critical defaults and safety notes.
5. Compare all examples with source tests or a controlled API response.
