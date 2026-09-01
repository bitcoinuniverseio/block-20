# Security policy

## Reporting a vulnerability

Report security issues privately through GitHub's private vulnerability reporting on this
repository: open the **Security** tab and choose **Report a vulnerability**, or go directly to
https://github.com/bitcoinuniverseio/block-20/security/advisories/new

Do not open a public issue or pull request for a security defect, and do not post details in a
public discussion.

Please include:

- what you observed and what you expected;
- the affected page, file, or rule identifier (for example `R6.5`);
- for a protocol correctness issue, the inscription content, block heights, and the reader
  behavior you believe is wrong;
- any transaction IDs or inscription IDs that demonstrate the issue.

Never include seed phrases, private keys, or credentials in a report. We will never ask for them.

## Scope

This repository holds documentation only: static HTML, CSS, and client-side JavaScript. In scope:

- factual errors in the specification, reference, or test vectors that would cause an
  implementer to compute wrong balances;
- defects in the client-side mint anchor verifier that produce an incorrect verdict;
- content injection, unsafe markup, or a request leaving the page (there should be none).

The verifier makes no network requests and stores nothing. If you observe otherwise, that is a
reportable defect.

Out of scope here, but still worth reporting to the owning project:

- defects in the Bitcoin Universe Inscribe writer or in any indexer implementation;
- issues in third-party readers, wallets, or explorers.

## Correctness reports are security reports

A documented rule that does not match implementation behavior can cause real financial loss,
because implementers use this specification to decide whether a mint credits anything. Treat such
a mismatch as a security issue rather than a documentation nit.
