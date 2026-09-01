# Contributing

This repository is the documentation site for the BLOCK-20 protocol. Contributions are welcome,
with one hard constraint: **every statement must be verifiable against implementation behavior.**

## Ground rules

1. **No unverified claims.** Do not state that a wallet, marketplace, or indexer supports
   BLOCK-20 unless that support is wired in the organization's own code. When uncertain, write
   "not currently supported in Bitcoin Universe products" or omit the claim.
2. **Cite the rule.** Behavioral statements should reference a specification rule identifier
   (`R6.5`, `R7.9`, and so on). Add a new rule rather than renumbering existing ones.
3. **Vectors accompany rules.** A change to a rule needs a matching entry in `vectors.html`.
4. **No marketplace implication.** BLOCK-20 has no Bitcoin Universe marketplace path. Do not
   write copy that implies a market exists.
5. **Reader profile is named.** Rules on this site describe `bitcoin-universe-block20-v1`. If a
   statement is true only for that profile, say so.

## Style

- Plain, direct writing. No filler, no superlatives, no urgency, no placeholders, no "coming soon".
- Never use an em dash character. Use commas, colons, periods, or parentheses.
- Prefer a diagram or a table over a wall of text.
- Monospace for anything that is literally a value: hashes, payloads, field names, heights.

## Technical constraints

- Static HTML, CSS, and vanilla JavaScript. No build step, no framework, no external CDNs, no
  external fonts, no trackers.
- Every page must be fully usable with JavaScript disabled. JavaScript may only enhance.
- Both themes must meet WCAG 2.2 AA contrast. Responsive down to 320px with no horizontal page
  overflow; wide tables and code scroll inside their own container.
- Semantic landmarks, a skip link, visible focus, correct heading order, and a text alternative
  (`<title>` and `<desc>`) on every inline SVG diagram.
- Diagrams use CSS custom properties for stroke and fill so they stay legible in both themes.

## Checklist before opening a pull request

- [ ] Every new claim traces to implementation behavior, not to another document.
- [ ] Rule identifiers are stable; new rules were added rather than renumbered.
- [ ] `vectors.html` covers any changed behavior, including boundary cases.
- [ ] `changelog.html` records the change and its compatibility impact.
- [ ] `search-index.json` regenerated if headings changed.
- [ ] `sitemap.xml` and `llms.txt` updated if pages were added or removed.
- [ ] `docs.manifest.json` still validates against the platform schema, and `lastVerified` is current.
- [ ] Page footers show the correct source path and document version.
- [ ] No em dash characters anywhere in the diff.

## Reporting problems

Use GitHub issues for factual corrections and documentation gaps. For anything with security or
financial impact, follow [SECURITY.md](SECURITY.md) instead.
