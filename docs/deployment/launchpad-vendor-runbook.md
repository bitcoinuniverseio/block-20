# Runbook: serve Launchpad signing scripts from Universe

Status: needs owner approval. Nothing here has run in production.

## Problem

`https://launchpad.bitcoinuniverse.io/` loads four scripts from
`https://block20.wtf/scripts/`. That host closes every connection, so the
`window.tapscript` and `window.cryptoUtils` globals are missing and every
launch and signing path fails. Loading signing code from a third-party host is
also a supply-chain risk.

## Change

- Serve `@cmdcode/tapscript@1.2.7` and `@cmdcode/crypto-utils@1.5.11` from
  `/vendor/launchpad/` on the same host. The bytes are the npm
  `dist/bundle.min.js` files; `launchpad/vendor/manifest.json` records the
  tarball sha512, file sha256, and SRI sha384.
- Drop `wif.js` and `buffer.6.0.3.js`. The live bundle never reads a `wif`,
  `Buffer`, or `buffer` global (checked with `grep` on
  `assets/index-De9Bq-ib.js`).
- Replace `index.html` with `launchpad/release/index.html`. It loads both
  scripts with `integrity`. It starts the app module only when both globals
  exist. Otherwise it shows "Launch tools could not load. Your wallet has not
  been asked to sign. Reload to try again." The app never starts in that
  case, so no wallet prompt can open.

## Before you start

1. On the workstation, in this repository:
   `node launchpad/scripts/verify-launchpad-vendor.mjs` must print
   `Launchpad vendor assets match the manifest.`
2. `node --test "launchpad/tests/*.test.mjs"` must pass.
3. Confirm the live entry page is still the one this change was built from:

   ```sh
   sha256sum /home/bitcoinuniverse/public_html/launchpad.bitcoinuniverse.io/index.html
   # expect 63befcb74cd003c1afcdc5c64d61b98bed4ddf4faad6ac818502990f260f1fa6
   ```

   Stop if it differs. Rebuild `launchpad/release/index.html` from the new
   page first.

## Deploy (as root on srv747890)

```sh
DOC=/home/bitcoinuniverse/public_html/launchpad.bitcoinuniverse.io
STAMP=$(date -u +%Y%m%dT%H%M%SZ)
cp -a "$DOC/index.html" "/root/launchpad-index.html.before-$STAMP"
install -d -o bitcoinuniverse -g bitcoinuniverse -m 0755 "$DOC/vendor/launchpad"
# copy from a checkout of this repository at the reviewed commit
install -o bitcoinuniverse -g bitcoinuniverse -m 0644 \
  launchpad/vendor/tapscript-1.2.7.2824ba7d.min.js \
  launchpad/vendor/crypto-utils-1.5.11.53a8bb1e.min.js \
  launchpad/vendor/manifest.json \
  launchpad/vendor/LICENSE.tapscript \
  launchpad/vendor/LICENSE.crypto-utils \
  "$DOC/vendor/launchpad/"
sha256sum "$DOC"/vendor/launchpad/*.js
# expect 2824ba7d... tapscript and 53a8bb1e... crypto-utils, exactly as in manifest.json
install -o bitcoinuniverse -g bitcoinuniverse -m 0644 launchpad/release/index.html "$DOC/index.html.next"
mv "$DOC/index.html.next" "$DOC/index.html"
```

The vendor files go in first, so the page never points at a missing file.

## Verify

```sh
curl -sS https://launchpad.bitcoinuniverse.io/ | grep -c block20.wtf      # expect 0
for f in tapscript-1.2.7.2824ba7d.min.js crypto-utils-1.5.11.53a8bb1e.min.js; do
  curl -sS "https://launchpad.bitcoinuniverse.io/vendor/launchpad/$f" | sha256sum
done                                                                     # expect manifest sha256 values
curl -sS -o /dev/null -w '%{content_type}\n' \
  https://launchpad.bitcoinuniverse.io/vendor/launchpad/tapscript-1.2.7.2824ba7d.min.js
# expect application/javascript (a text/html answer means the file is missing
# and the SPA fallback answered; the SRI check then blocks it)
```

In a browser, open the page with the network panel: no request goes to
`block20.wtf`, both vendor files answer 200, the console shows no integrity
error, and `typeof window.tapscript.Tx` is `function`. Do not sign anything.

## Rollback

```sh
DOC=/home/bitcoinuniverse/public_html/launchpad.bitcoinuniverse.io
cp -a /root/launchpad-index.html.before-<STAMP> "$DOC/index.html"
```

The vendor directory can stay; nothing else reads it. Rolling back restores
the broken third-party loads, so prefer fixing forward.
