# Runbook: BLOCK-20 API Bitcoin RPC and token explorer readiness

Status: needs owner approval. Every fact below comes from read-only reads and
loopback GETs (plus one read-only `getblockchaininfo` POST) on srv747890 on
2026-10-21. No production file, unit, or tunnel changed.

## What users see

- `https://api.block20.bitcoinuniverse.io/ready` answers 503
  `{"database":"ready","block20Indexer":"ready","bitcoinRpc":"unavailable"}`.
- `https://api.block20.bitcoinuniverse.io/token-explorer/block20` answers 503,
  and the explorer lists BLOCK-20 as unavailable.

These are two separate services with two separate causes.

## Map

| Public path | Served by | Code |
|---|---|---|
| `api.block20…/` (everything else) | Apache `.htaccess` proxy to `127.0.0.1:3101`, unit `universe-block20-api.service` | `/opt/universe/block20-api/current/block20-api.js` (release `20260925T230721Z-7aea1002`). No source repository; see "Release gate". |
| `api.block20…/token-explorer/(block20\|status)` | Apache proxy to `127.0.0.1:18388`, tunnel `universe-indexer-01-tunnel@block20` to universe-indexers-1 (51.222.43.129) `:3101` | `index-block20` repository (`src/server.mjs`, `src/feed.mjs`) |

The `.htaccess` lives at
`/home/bitcoinuniverse/public_html/api.block20.bitcoinuniverse.io/.htaccess`.

## Cause 1: `bitcoinRpc` points at a web gateway, not an RPC relay

- Key: `BLOCK20_BITCOIN_CORE_URL` in `/etc/universe/block20-api.env`.
  Redacted value: `http://127.0.0.1:38385/bitcoin` (no credentials in the
  URL). `BLOCK20_ALLOW_INSECURE_UPSTREAM=true`, `READINESS_TIMEOUT_MS=5000`.
- Adapter: none. `block20-api.js` calls `fetch(BLOCK20_BITCOIN_CORE_URL)`
  directly in two places:
  - `/ready` (line 113): POST `{"jsonrpc":"1.0","method":"getblockchaininfo"}`.
  - `POST /broadcastTransaction` (line 212): POST
    `{"requestData":{"jsonrpc":"1.0","method":"sendrawtransaction",...}}`.
    That wrapped body is not Bitcoin Core JSON-RPC. It only worked with the
    old custom relay.
- Route: local `38385` belongs to `universe-mempool-indexer-01-tunnel.service`
  (`-L 127.0.0.1:38385:127.0.0.1:8099` to universe-indexers-1). Before
  2026-10-09 the same unit used the retired Netcup backend key
  (`zz-backend-host.conf.before-indexer-api-routing-20261009`).
- Result: universe-indexers-1 `:8099` is the Universe mempool web gateway. It
  serves `GET /api/blocks/tip/height` (972542 at the time of the check) but
  answers `405 Method Not Allowed` (`allow: GET, HEAD`) to the readiness POST.
  So the dependency is not down; it is the wrong endpoint, because the old
  `/bitcoin` relay did not move with the gateway.
- The authenticated Core bridges (`18332`, `18333`, `48332` to
  universe-indexers-2 `:28332`) answer `401 Client authentication required`
  without credentials. `block20-api.js` sends no credentials, so pointing the
  key at them does not work either.

### Fix options

Do not point anything at 159.195.109.76 or 152.53.92.251; both hosts are
retired. Do not re-enable disabled tunnels.

1. Recommended: keep broadcast closed and make readiness truthful.
   Universe retired the generic transaction relay on purpose, so
   `/broadcastTransaction` should stay unavailable. This needs a code change
   in `block20-api.js`: read chain state through an authenticated, allowlisted
   proxy (for example the `index-block20` `bitcoin-rpc-proxy`, which only
   allows POST `/` with client credentials), and report broadcast as
   disabled. Do this only after the release gate below.
2. Not recommended: a new relay on universe-indexers-1 `:8099` that accepts
   the wrapped body. It would restore a generic broadcast path that policy
   retired.

### Verify after a fix

```sh
curl -sS http://127.0.0.1:3101/ready
# expect "dependencies": all "ready", HTTP 200
curl -sS -o /dev/null -w '%{http_code}\n' https://api.block20.bitcoinuniverse.io/ready
```

A correct RPC answer reports `"chain":"main"` and a height within a few blocks
of `GET http://127.0.0.1:38385/api/blocks/tip/height`. Check
`getblockhash 0` returns
`000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f`.

### Rollback

Keep payment and broadcast admission closed. Before any approved release, record the current release symlink and copy the environment to an operator-owned path outside the web root. Stage and verify the replacement through the established release path; do not restart the only serving process as a smoke check. Roll back the release symlink and environment atomically through that same path if its read-only probes fail. No worker may be started twice. The old URL remains unavailable, so reverting it does not restore transaction readiness.

## Cause 2: the token explorer waits for the ord provider

- `index-block20` on universe-indexers-1 is live (`/live` 200) but not ready.
  `GET /token-explorer/status` reported:
  - `provider.name` `ord-server`, `state` `backoff`,
    `lastSuccessAt` 2026-10-18T11:20:38Z,
    `lastError` "Ord request failed: The operation was aborted due to timeout".
  - `checkpoint` height 970053, hash
    `000000000000000000005260ddc48a2e8421fff7cb681ca999db1b65d119fdfc`,
    `network` mainnet, `coverage` partial.
  - counts: 12 assets, 42216 events, 923 holders.
- `src/feed.mjs` refuses every page while `indexer.ready()` is false, and
  readiness needs a fresh provider success. The ord server it reads is the
  universe-indexers-2 Ord 0.29 that is stalled on disk I/O (see
  `INDEXERS-addendum-20261021.md`). Bitcoin RPC is not the cause here.
- The page route needs the bearer token `BLOCK20_SOURCE_BEARER_TOKEN`.
  Apache does not add it, so an outside request gets 401 when the indexer is
  ready.

### Fix (code change in the `index-block20` repository)

Serve token pages from the stored checkpoint when the provider is in backoff,
but only when the checkpoint is a verified mainnet checkpoint. Return
`asOfHeight` and `ageSeconds` with each page. Keep every write and every
"current" claim closed. The UI then says: "Live Bitcoin checks are
unavailable. Token data is shown as of block {height}. Transactions are
paused." With no usable checkpoint it must show unavailable, never an empty
list. Do not reindex and do not restart the ord indexer for this.

### Verify

```sh
curl -sS http://127.0.0.1:18388/token-explorer/status | jq '.ready, .provider.state, .checkpoint.height'
```

## Release gate

`block20-api.js` has no source repository. The inscribe runbook
`backend/docs/runbooks/production-operations.md` names
`C:\Universe\work\ops-standardization-20260801\block20-api-migration` as the
snapshot, and that path does not exist on the workstation. Import the
deployed release (`/opt/universe/block20-api/releases/20260925T230721Z-7aea1002`,
with its `SOURCE_MANIFEST.sha256`) into a Universe repository before changing
its code.

## Prepared read change and remaining integration

Branch `fix/p2-ins-claude` in `index-block20` separates stored read readiness from live provider readiness for normalized feeds, asset reads and the legacy catalogue. It checks the stored network, source, ruleset, height, block hash and timestamp. Reads include `asOfHeight`, `ageSeconds` and `transactionsReady: false`; `/ready` keeps its live-provider contract. No new writer, schema migration, RPC fallback or tunnel is introduced. Roll back the reader artifact through its existing release process; preserve the database and keep admission closed.

The Inscribe backend currently maps the legacy catalogue into `{total,tokens}` and discards checkpoint metadata in `backend/src/block20/block20.service.ts::getTokens`. That file belongs to the backend agent. Before claiming dated results in Inscribe, preserve validated `asOfHeight`, `ageSeconds`, and `transactionsReady: false` through that mapping and its cache; test malformed, wrong-network and unavailable reads. The frontend is prepared to show the exact dated message and disable transaction controls when that evidence arrives. No metadata must be invented from the time the proxy fetched the page.

After an approved release, GET `/block20/indexer?limit=1&offset=0` through the existing owned route. Require HTTP 200 with a nonnegative integer height and age, `transactionsReady: false`, and actual stored rows. With no qualified checkpoint require HTTP 503, never an empty success. `/ready` must remain 503 during the provider outage. Use authenticated normalized reads only through an existing server-side credential mechanism; do not expose source bearer credentials in browser code.
