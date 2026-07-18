# BLOCK-20 InScribe implementation specification

## Status and authority

This is the implementation specification for the BLOCK-20 writer and order API in Bitcoin Universe Inscribe. It describes the behavior reviewed in `backend/src/block20` and the shared Inscribe transaction utilities.

It is not a Bitcoin consensus rule, a global token standard, or a promise that every external BLOCK-20 reader will accept or settle every emitted message. A reader or indexer remains responsible for interpreting inscription ordering, ticker state, supply rules, balances, and transfer semantics.

The source of truth for this document is the deployed InScribe implementation. Review the linked source and update this document whenever payload construction, validation, transaction construction, or lifecycle behavior changes.

- [BLOCK-20 controller](https://github.com/bitcoinuniverse/inscribe/blob/main/backend/src/block20/block20.controller.ts)
- [BLOCK-20 service and payload builder](https://github.com/bitcoinuniverse/inscribe/blob/main/backend/src/block20/block20.service.ts)
- [Numeric validation](https://github.com/bitcoinuniverse/inscribe/blob/main/backend/src/block20/block20-order.validation.ts)
- [Order monitor](https://github.com/bitcoinuniverse/inscribe/blob/main/backend/src/block20/block20-monitor.service.ts)
- [Inscribe transaction utilities](https://github.com/bitcoinuniverse/inscribe/blob/main/backend/src/inscribe/bitcoin.utils.ts)

## 1. Terms

| Term | Meaning in this specification |
| --- | --- |
| Writer | The Bitcoin Universe Inscribe service that builds the BLOCK-20 JSON payload and inscription transaction. |
| Payload | The compact JSON bytes placed inside the Ordinals inscription. |
| Order request | The REST JSON body passed to `POST /block20/order`. It is not the on-chain payload. |
| Commit address | A server-generated address that receives the funding output used to reveal the inscription. |
| Reveal | The transaction that spends the commit output and exposes the inscription. |
| Reader | An indexer or application that interprets BLOCK-20 inscription payloads. |

## 2. Carrier and encoding

The current writer emits the payload as a standard Ordinals-style inscription:

- Content type: `text/plain;charset=utf-8`
- Payload encoding: UTF-8
- JSON serialization: compact `JSON.stringify` output
- Envelope: an `ord` inscription envelope in a taproot script-path reveal

The carrier is not an OP_RETURN output. The REST request body is not copied directly to the chain. Clients must use `inscriptionJson` from the created order as the record of what the writer intends to inscribe.

## 3. Emitted payloads

The writer supports three operations. The shape schema at [schemas/block20-inscribe-payload.schema.json](schemas/block20-inscribe-payload.schema.json) captures current output without inventing reader semantics. The opt-in [canonical mint-hash profile](schemas/block20-mint-hash.profile.schema.json) validates a stricter hash syntax for integrations that require it.

### 3.1 Deploy

```json
{
  "p": "block-20",
  "op": "deploy",
  "tick": "BLK",
  "max": "21000000",
  "lim": "1000",
  "des": "Optional description"
}
```

Required emitted fields are `p`, `op`, `tick`, `max`, and `lim`. `des` appears only when the order request contains a truthy `description`.

### 3.2 Mint

```json
{
  "p": "block-20",
  "op": "mint",
  "tick": "BLK",
  "amt": "1000",
  "hash": "<current tip hash>"
}
```

Required emitted fields are `p`, `op`, `tick`, `amt`, and `hash`. The public order endpoint gets the hash from its configured Bitcoin tip source. The caller does not provide the hash through this API.

#### 3.2.1 Mint hash semantics

For a normal public API mint, `hash` is the Bitcoin block ID observed by the backend while constructing the order. The writer:

1. selects the global configured mainnet or testnet Mempool-compatible source;
2. reads `/blocks/tip/height`;
3. resolves that height through `/block-height/{height}`;
4. trims the returned text;
5. writes the resulting string into both the order `blockHash` and payload `hash`.

The value is selected before funding, payment detection, reveal, or confirmation. It is not a client-supplied field, transaction ID, `txid:vout`, inscription ID, numeric height, Merkle root, payload digest, previous block hash, or the hash of the block that later confirms the reveal.

The current writer stores the hash but not the selected height, source URL, confirmation count, or a reorganization decision. It does not refresh the hash before reveal. A reader that needs freshness, active-chain membership, or reorganization semantics MUST define those rules independently.

The recommended canonical interoperability syntax is a 64-character, lowercase hexadecimal Bitcoin block ID without whitespace or a `0x` prefix: `^[0-9a-f]{64}$`. The writer itself only trims the upstream response and does not enforce this syntax. The canonical schema validates syntax only, not chain validity or reader acceptance.

### 3.3 Transfer

```json
{
  "p": "block-20",
  "op": "transfer",
  "tick": "BLK",
  "amt": "250"
}
```

Required emitted fields are `p`, `op`, `tick`, and `amt`.

### 3.4 Field definitions

| Field | Emitted for | Type | Current writer behavior |
| --- | --- | --- | --- |
| `p` | All | string | Always literal `block-20`, injected by the writer. |
| `op` | All | string | Derived from API `action`. The writer supports exact `deploy`, `mint`, and `transfer`. |
| `tick` | All | string | Derived from API input without normalization. |
| `max` | Deploy | string | Derived from `maxSupply`, or defaults to `"21000000"` when omitted. |
| `lim` | Deploy | string | Derived from `limitMint`; when missing in the public order path it uses normalized `amount`, which defaults to `"0"`. |
| `des` | Deploy | JSON value, canonical client profile uses string | Derived from truthy `description`. The endpoint does not runtime-validate its type before `JSON.stringify`. |
| `amt` | Mint, transfer | string | Derived from normalized `amount`. |
| `hash` | Mint | string | Backend-observed configured-tip Bitcoin block ID, selected during order creation and trimmed before writing. See section 3.2.1. |

Numeric-looking payload values are strings. This specification does not claim that a reader accepts any particular number grammar, scale, positivity requirement, or relationship between supply fields.

## 4. Public order API mapping

### 4.1 Endpoint

The direct backend route is:

```text
POST /block20/order
```

A reverse proxy may expose the same route under `/api/block20/order`. The deployment controls host, prefix, authentication, and network exposure.

### 4.2 Request shape

```json
{
  "action": "deploy",
  "tick": "BLK",
  "amount": 0,
  "maxSupply": "21000000",
  "limitMint": "1000",
  "description": "Optional description",
  "repeatCount": 1,
  "feeRate": 5,
  "receiverAddress": "<user-controlled Bitcoin address>",
  "outputValue": 546
}
```

`action` and `tick` are the only required fields at runtime. The following table is normative for current endpoint behavior.

| Request field | Behavior |
| --- | --- |
| `action` | Must be a nonblank string. It is later matched exactly to a supported operation. |
| `tick` | Must be a nonblank string. The endpoint does not trim it, enforce character rules, or check uniqueness. |
| `amount` | Defaults to `0`. Must be a finite number or numeric string from `0` through `Number.MAX_SAFE_INTEGER`. The current parser accepts decimals. |
| `maxSupply` | Not runtime-validated. The writer applies `String()` when emitting `max`. |
| `limitMint` | Not runtime-validated. The writer applies `String()` when emitting `lim`. |
| `description` | Not runtime-validated. It is emitted only when truthy. |
| `repeatCount` | Defaults to `1`, must be in 1 through 100, and is floored. It is not emitted in the payload. |
| `feeRate` | Defaults to `5`, must be finite and in 1 through 10,000. |
| `receiverAddress` | Not runtime-validated at order creation. A normal client MUST provide a valid user-controlled address. |
| `outputValue` | Omitted or below 330 becomes 0. Values at or above 330 are floored. |

The order API does not use a caller-supplied `p` or mint `hash`. A normal mint performs a fresh server lookup for every order. A preceding `GET /block20/latest-block` response is observational only and is not guaranteed to match a later order.

### 4.3 Default behavior that often surprises clients

The public order service normalizes `amount` to `0` before building the payload. As a result:

- A deploy with omitted `maxSupply` emits `"max":"21000000"`.
- A deploy with omitted `limitMint` and omitted `amount` emits `"lim":"0"`.
- A mint with omitted `amount` emits `"amt":"0"` and a server-fetched `hash`.
- A transfer with omitted `amount` emits `"amt":"0"`.

The `1000` fallbacks visible in the standalone payload helper are bypassed by the public order path because the service has already normalized `amount`.

### 4.4 Public order response

The created-order and get-order endpoints return:

```text
orderId, action, tick, amount, repeatCount, commitAddress, commitAmount,
estimatedCost, inscriptionJson, blockHash, status, network, createdAt,
expiresAt, revealTxid
```

The public response omits `receiverAddress`, `feeRate`, `outputValue`, deploy inputs, service fee detail, retry count, broadcast error, the server-held WIF, and the inscription script. Clients MUST retain the original request, returned `inscriptionJson`, returned `blockHash`, intended receiver, and all returned payment details. These values cannot be reliably reconstructed from a later public order read.

## 5. Commit and reveal lifecycle

1. The writer serializes the payload and creates a commit key, commit address, and commitment script.
2. The service calculates `commitAmount`, which includes estimated reveal fee, inscription output value, and the current 1,500-sat service fee.
3. The order starts as `awaiting_payment` and its initial expiry is one hour after creation.
4. The monitor checks pending orders every 10 seconds. It accepts one eligible UTXO at the commit address with value at least `commitAmount`, prefers confirmed outputs when available, otherwise can use an unconfirmed output, and chooses the largest eligible UTXO. It does not aggregate several smaller outputs.
5. The service signs and broadcasts the reveal. On success, status becomes `revealed` and the public order has `revealTxid`.
6. Signing or broadcast failure produces `reveal_failed`. The monitor retries up to five times, then writes `reveal_error`.
7. If no qualifying UTXO is found after the initial window, the monitor writes `expired`.

Expiry is a monitor behavior, not a hard reveal authorization gate. A qualifying UTXO found after the time window can still be revealed, and an explicit reveal call does not check `expiresAt`.

### 5.1 Receiver safety

At reveal time the destination is:

```text
receiverAddress || commitAddress
```

An omitted or empty receiver makes the output return to the server-generated commit address, which is controlled by persisted backend key material. A nonempty malformed receiver may instead fail during reveal output construction. Production clients MUST reject an empty receiver address for normal user orders.

### 5.2 Repeat-count limitation

In a direct BLOCK-20 order, `repeatCount` multiplies funding amount but is not placed in `inscriptionJson`, and the monitor attempts one reveal for that order. It MUST NOT be represented to users as a direct multi-inscription or multi-mint feature.

The current frontend uses a separate generic bulk flow for normal repeated mints. That is a distinct integration path.

### 5.3 Funding economics

The selected commit UTXO is spent in full by the reveal transaction. After reveal fee and service fee, residual value is sent to the configured receiver. Clients SHOULD fund exactly one deliberate UTXO and MUST NOT assume a set of smaller outputs will be combined. Overfunding and direct `repeatCount > 1` can therefore change the economics of the one reveal without creating multiple direct inscriptions.

### 5.4 Manual reveal endpoint

```text
POST /block20/order/:orderId/reveal
```

The body accepts `commitTxid`, optional `commitVout`, and optional `commitAmount`. Validation requires a 64-character hexadecimal transaction ID, an integer vout in 0 through 10,000, and a positive safe-integer satoshi amount when supplied.

The endpoint validates reference shape but does not preflight ownership of the referenced outpoint. It is an advanced recovery or orchestration endpoint, not a client authorization proof. A signing or broadcast failure can return HTTP 201 with `revealTxid: null` and `broadcastError`.

## 6. Read-only API behavior

### 6.1 Latest block

```text
GET /block20/latest-block
```

Returns `{ hash, height }` after reading the configured Mempool-compatible source. Internally, normal mint creation reads the height then resolves that height to a hash in a fresh lookup. It returns and persists the observed hash, not the height. The tip source follows global network configuration, not the supplied receiver address.

The endpoint is useful to display current source context. Clients MUST NOT prefill a normal mint request with its hash or assume it will equal a subsequent order's value. A block can arrive between calls, and the writer does not record a finalized or reorganization-checked snapshot.

### 6.2 Token list

```text
GET /block20/tokens?ticker&start&limit&orderBy&orderDir
```

Returns `{ total, tokens }` from configured external indexers. The server:

- trims and lowercases `ticker` before forwarding it as `tick`;
- clamps `start` to 0 through 10,000,000, `limit` to 1 through 100, and `orderBy` to 0 through 100;
- translates `start` into a one-based upstream page offset;
- preserves only normalized `asc`, otherwise uses `desc`;
- caches fresh results for 60 seconds with up to 256 cached keys;
- tries configured `BLOCK20_API_URLS`, then `BLOCK20_API_URL`, then the baked-in public indexer URL.

If every source fails, the service can return the same request-key cached result as a stale fallback. If no cached result is available, the endpoint returns 503. Token data is a mapped external-indexer view, not an independently validated BLOCK-20 state engine.

## 7. Compatibility and validation boundary

The current order API checks request shape, required `action` and `tick`, numeric ranges for selected operational inputs, and supported action selection. It does not enforce:

- ticker grammar, uniqueness, case policy, or size;
- positive-integer amount semantics;
- numeric grammar or supply relationships for `maxSupply` and `limitMint`;
- description policy;
- a valid user-controlled receiver address at create time;
- canonical 64-character hexadecimal validation, active-chain membership, freshness, or reorganization handling for the fetched mint hash;
- external reader acceptance.

An integration MAY apply stricter product validation. If it does, it SHOULD document the target reader rules and distinguish client-side rejection from backend rejection.

## 8. Security and operations

The backend stores generated WIF and inscription script data in the `block20_orders` database table. Operators SHOULD protect database access, backups, retention, logging, access to mutation endpoints, and availability of the reveal worker.

Relevant deployment inputs include:

- `BLOCK20_API_URL`
- `BLOCK20_API_URLS` (comma-separated fallback sources)
- `IS_TEST`
- `MEMPOOL_API_URL` or `MEMPOOL_BASE_URL`
- testnet mempool configuration when applicable
- database configuration used for order persistence

The pending-order monitor uses an in-process lock and processes a bounded oldest-first batch. Multi-instance deployments SHOULD run one active worker or provide a distributed lock.

Clients SHOULD retain order ID, request ID, original request, selected receiver, network, returned payload, returned mint hash, commit address, commit amount, commit transaction ID and vout, and reveal transaction ID. Do not tell users to repay an order merely because the public status lacks internal error detail.

## 9. Conformance

Use [conformance.html](conformance.html) with the JSON Schema for regression tests. At a minimum, test:

- explicit deploy payload serialization;
- public deploy defaults, including `lim: "0"` when limit and amount are omitted;
- normal mint equality between payload `hash` and response `blockHash`, canonical hash syntax when the profile is selected, and independent target-network resolution;
- exact UTF-8 mint serialization and current content type, while keeping parsed-object reader tests separate from writer-byte tests;
- transfer zero and decimal compatibility behavior, marked as a caveat rather than a semantic recommendation;
- order validation errors;
- reveal input validation and reveal failure handling;
- payment detection with one eligible UTXO, retry, expiry, receiver safety, and target reader verification in a controlled end-to-end environment.

## 10. Change policy

Because emitted messages have no explicit profile version field, payload behavior changes are compatibility-sensitive. A change to field names, default values, serialization, mint hash source, receiver behavior, or lifecycle semantics MUST update:

1. this specification;
2. the static pages and `llms.txt`;
3. the payload schema and conformance vectors when applicable;
4. `CHANGELOG.md` with the source commit and compatibility impact;
5. automated coverage for the changed behavior.
