/* BLOCK-20 mint anchor verifier.
   Pure client-side. Nothing typed here is transmitted, stored, or logged.
   Reader profile: bitcoin-universe-block20-v1. Network: Bitcoin mainnet rules. */
(function () {
  'use strict';

  var MAX_ATOMIC = (1n << 128n) - 1n;
  var MAX_CONTENT_BYTES = 2048;

  /* ---------- strict flat string object grammar (spec section 3) ---------- */

  function parseFlatStringObject(source) {
    var position = 0;
    var result = Object.create(null);
    var order = [];

    function fail(message) { throw new Error(message); }

    function skipSpace() {
      while (position < source.length && /\s/.test(source.charAt(position))) position += 1;
    }

    function readString() {
      skipSpace();
      if (source.charAt(position) !== '"') fail('R3.3: every key and value must be a JSON string.');
      var start = position;
      position += 1;
      var escaped = false;
      while (position < source.length) {
        var character = source.charAt(position);
        position += 1;
        if (escaped) { escaped = false; continue; }
        if (character === '\\') { escaped = true; continue; }
        if (character === '"') {
          try { return JSON.parse(source.slice(start, position)); }
          catch (e) { fail('R3.3: invalid JSON string escape.'); }
        }
        if (character.charCodeAt(0) < 0x20) fail('R3.5: raw control character inside a string.');
      }
      fail('R3.6: unterminated JSON string.');
      return '';
    }

    skipSpace();
    if (source.charAt(position) !== '{') fail('R3.2: content must be a single JSON object.');
    position += 1;
    skipSpace();
    if (source.charAt(position) === '}') {
      position += 1;
    } else {
      while (position < source.length) {
        var key = readString();
        if (Object.prototype.hasOwnProperty.call(result, key)) fail('R3.4: repeated field "' + key + '".');
        skipSpace();
        if (source.charAt(position) !== ':') fail('R3.6: missing colon after field "' + key + '".');
        position += 1;
        var value = readString();
        result[key] = value;
        order.push(key);
        skipSpace();
        var separator = source.charAt(position);
        position += 1;
        if (separator === '}') break;
        if (separator !== ',') fail('R3.6: missing comma between fields.');
      }
    }
    skipSpace();
    if (position !== source.length) fail('R3.2: trailing content after the JSON object.');
    return { fields: result, order: order };
  }

  /* ---------- helpers ---------- */

  var FIELD_SETS = {
    deploy: { required: ['p', 'op', 'tick', 'max', 'lim'], optional: ['des'] },
    mint: { required: ['p', 'op', 'tick', 'amt', 'hash'], optional: [] },
    transfer: { required: ['p', 'op', 'tick', 'amt'], optional: [] }
  };

  function byteLength(text) {
    if (window.TextEncoder) return new TextEncoder().encode(text).length;
    return unescape(encodeURIComponent(text)).length;
  }

  function intOrNull(value) {
    var raw = String(value == null ? '' : value).trim().replace(/[\s,_]/g, '');
    if (raw === '') return null;
    if (!/^\d+$/.test(raw)) return NaN;
    var parsed = Number(raw);
    return Number.isSafeInteger(parsed) ? parsed : NaN;
  }

  function bigOrNull(value) {
    var raw = String(value == null ? '' : value).trim().replace(/[\s,_]/g, '');
    if (raw === '') return null;
    if (!/^\d+$/.test(raw)) return NaN;
    return BigInt(raw);
  }

  /* ---------- DOM ---------- */

  var form = document.getElementById('verify-form');
  if (!form) return;

  var toolBlocks = document.querySelectorAll('[data-js-tool]');
  for (var t = 0; t < toolBlocks.length; t += 1) toolBlocks[t].hidden = false;
  var noJs = document.getElementById('no-js-note');
  if (noJs) noJs.hidden = true;

  var out = document.getElementById('verify-output');
  var stepsEl = document.getElementById('verify-steps');
  var verdictEl = document.getElementById('verify-verdict');

  function el(id) { return document.getElementById(id); }

  function step(state, title, detail) {
    var li = document.createElement('li');
    li.className = state;
    var mark = state === 'pass' ? 'OK' : state === 'fail' ? 'X' : 'i';
    var body = document.createElement('div');
    body.className = 'step-body';
    var strong = document.createElement('strong');
    strong.textContent = title;
    body.appendChild(strong);
    if (detail) {
      var p = document.createElement('p');
      p.className = 'small muted';
      p.style.margin = '2px 0 0';
      p.textContent = detail;
      body.appendChild(p);
    }
    var span = document.createElement('span');
    span.className = 'mark';
    span.setAttribute('aria-hidden', 'true');
    span.textContent = mark;
    li.appendChild(span);
    li.appendChild(body);
    stepsEl.appendChild(li);
    return state !== 'fail';
  }

  function verdict(state, text) {
    verdictEl.className = 'verdict ' + state;
    verdictEl.textContent = text;
  }

  function run(event) {
    event.preventDefault();
    stepsEl.innerHTML = '';
    verdictEl.className = 'verdict';
    verdictEl.textContent = '';
    out.hidden = false;

    var payloadText = el('payload').value;
    var deployHeight = intOrNull(el('deploy-height').value);
    var anchorHeight = intOrNull(el('anchor-height').value);
    var revealHeight = intOrNull(el('reveal-height').value);
    var windowBlocks = intOrNull(el('window').value);
    var mintLimit = bigOrNull(el('mint-limit').value);
    var maxSupply = bigOrNull(el('max-supply').value);
    var mintedSupply = bigOrNull(el('minted-supply').value);
    if (windowBlocks === null) windowBlocks = 144;

    /* R2.3 size */
    var bytes = byteLength(payloadText);
    if (!step(bytes >= 1 && bytes <= MAX_CONTENT_BYTES ? 'pass' : 'fail',
      'R2.3 content size: ' + bytes + ' bytes',
      'Inscription content must be at least 1 byte and at most ' + MAX_CONTENT_BYTES + ' bytes of UTF-8.')) {
      return verdict('fail', 'Rejected. The inscription content is outside the BLOCK-20 size limit.');
    }

    /* R3.1 encoding */
    var loneSurrogate = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(^|[^\uD800-\uDBFF])[\uDC00-\uDFFF]/.test(payloadText);
    if (!step(loneSurrogate ? 'fail' : 'pass', 'R3.1 strict UTF-8',
      'The text you pasted encodes cleanly as UTF-8. A real reader applies this test to the raw inscription bytes.')) {
      return verdict('fail', 'Rejected. The content is not valid UTF-8.');
    }

    /* R3.2 to R3.6 grammar */
    var parsed;
    try {
      parsed = parseFlatStringObject(payloadText);
    } catch (error) {
      step('fail', 'Payload grammar', error.message);
      return verdict('fail', 'Rejected. The payload does not satisfy the BLOCK-20 flat string object grammar.');
    }
    var fields = parsed.fields;
    step('pass', 'R3.2 to R3.6 payload grammar',
      'Parsed ' + parsed.order.length + ' field(s): ' + parsed.order.join(', ') + '. All keys and values are JSON strings, none repeated, nothing trailing.');

    /* R3.7 protocol marker */
    if (!step(fields.p === 'block-20' ? 'pass' : 'fail', 'R3.7 protocol marker',
      fields.p === 'block-20' ? 'p is exactly "block-20".' : 'p is ' + JSON.stringify(fields.p === undefined ? null : fields.p) + '. It must be exactly "block-20", case sensitive.')) {
      return verdict('fail', 'Not a BLOCK-20 message. A reader ignores it.');
    }

    /* R3.9 operation */
    var op = fields.op;
    if (!step(FIELD_SETS[op] ? 'pass' : 'fail', 'R3.9 operation',
      FIELD_SETS[op] ? 'op is "' + op + '".' : 'op must be deploy, mint, or transfer.')) {
      return verdict('fail', 'Ignored. The operation is not one of deploy, mint, or transfer.');
    }

    /* R3.8 exact field set */
    var set = FIELD_SETS[op];
    var allowed = set.required.concat(set.optional);
    var missing = set.required.filter(function (k) { return !Object.prototype.hasOwnProperty.call(fields, k); });
    var unknown = parsed.order.filter(function (k) { return allowed.indexOf(k) === -1; });
    if (!step(missing.length === 0 && unknown.length === 0 ? 'pass' : 'fail', 'R3.8 exact field set for ' + op,
      missing.length === 0 && unknown.length === 0
        ? 'Fields match the ' + op + ' shape exactly (' + set.required.join(', ') + (set.optional.length ? ', optional ' + set.optional.join(', ') : '') + ').'
        : (missing.length ? 'Missing: ' + missing.join(', ') + '. ' : '') + (unknown.length ? 'Unknown: ' + unknown.join(', ') + '.' : ''))) {
      return verdict('fail', 'Rejected. The field set does not match the ' + op + ' shape.');
    }

    /* R4.1 ticker */
    var tickOk = /^[A-Za-z0-9]{1,5}$/.test(fields.tick || '');
    if (!step(tickOk ? 'pass' : 'fail', 'R4.1 and R4.2 ticker',
      tickOk ? 'tick "' + fields.tick + '" is valid. Ticker identity is "' + fields.tick.toLowerCase() + '" (case insensitive).'
        : 'tick must be one to five ASCII letters or digits.')) {
      return verdict('fail', 'Rejected. The ticker is invalid.');
    }

    if (op !== 'mint') {
      step('info', 'This tool verifies the mint anchor',
        'The payload above is a valid ' + op + ' shape. The anchor derivation only applies to mints. See the specification for ' + op + ' rules.');
      return verdict('pass', 'The payload parses and matches the ' + op + ' shape. Anchor checks do not apply.');
    }

    /* R4.4 and R4.5 amount */
    var amtText = fields.amt;
    var amtOk = /^[1-9]\d*$/.test(amtText);
    if (!step(amtOk ? 'pass' : 'fail', 'R4.4 amount grammar',
      amtOk ? 'amt "' + amtText + '" is a positive integer with no leading zero, sign, or decimal point.'
        : 'amt "' + amtText + '" must match ^[1-9]\\d*$. Zero, leading zeros, signs, and decimals are invalid.')) {
      return verdict('fail', 'Rejected. The mint amount is not a valid BLOCK-20 integer.');
    }
    var amt = BigInt(amtText);
    if (!step(amt <= MAX_ATOMIC ? 'pass' : 'fail', 'R4.5 amount range',
      'amt must not exceed 2^128 minus 1 (340282366920938463463374607431768211455).')) {
      return verdict('fail', 'Rejected. The mint amount is out of range.');
    }

    /* R6.3 per-mint limit */
    if (mintLimit === null || mintLimit !== mintLimit) {
      step('info', 'R6.3 per-mint limit not checked',
        'Supply the deployment lim value to test this rule. A mint above lim is rejected outright and is not reduced to the limit.');
    } else if (!step(amt <= mintLimit ? 'pass' : 'fail', 'R6.3 per-mint limit',
      'amt ' + amt.toString() + ' against lim ' + mintLimit.toString() + '.')) {
      return verdict('fail', 'Rejected. The mint amount exceeds the deployment per-mint limit.');
    }

    /* R6.4 hash syntax */
    var hash = fields.hash;
    var hashOk = /^[0-9a-f]{64}$/.test(hash);
    if (!step(hashOk ? 'pass' : 'fail', 'R6.4 anchor hash syntax',
      hashOk ? 'hash is 64 lowercase hexadecimal characters.'
        : 'hash must match ^[0-9a-f]{64}$. Uppercase hex, a 0x prefix, whitespace, a transaction ID, an inscription ID, or a height all fail here.')) {
      return verdict('fail', 'Rejected. The anchor hash is not 64 lowercase hexadecimal characters.');
    }

    /* R6.5 chain membership */
    if (anchorHeight === null || anchorHeight !== anchorHeight) {
      step('fail', 'R6.5 active-chain resolution needs chain data',
        'This page cannot reach a Bitcoin node. Look the hash up in a block explorer and enter the height it reports, or leave it blank if no block with that ID exists on the active chain. A hash that resolves to nothing, or to a height now occupied by a different block, rejects the mint.');
      return verdict('fail', 'Cannot complete. Enter the anchor block height that a Bitcoin node reports for this hash.');
    }
    step('pass', 'R6.5 active-chain resolution (supplied)',
      'Treating the hash as the block at height ' + anchorHeight + ' on the active chain, as you entered. A reader confirms this itself: the header must be known, have at least one confirmation, and the block currently at that height must hash to the same value.');

    /* R6.6 after deploy */
    if (deployHeight === null || deployHeight !== deployHeight) {
      step('info', 'R6.6 deploy height not supplied', 'Enter the ticker deploy height to test the lower bound.');
    } else if (!step(anchorHeight >= deployHeight ? 'pass' : 'fail', 'R6.6 anchor at or after deploy',
      'anchor ' + anchorHeight + ' against deploy height ' + deployHeight + '.')) {
      return verdict('fail', 'Rejected. The anchor block is older than the ticker deployment.');
    }

    /* R6.7 before reveal */
    if (revealHeight === null || revealHeight !== revealHeight) {
      step('fail', 'R6.7 reveal height required',
        'Enter the height of the block that reveals the mint inscription. The anchor must be strictly earlier.');
      return verdict('fail', 'Cannot complete. Enter the reveal block height.');
    }
    if (!step(anchorHeight < revealHeight ? 'pass' : 'fail', 'R6.7 anchor strictly before reveal',
      'anchor ' + anchorHeight + ' against reveal ' + revealHeight + '.')) {
      return verdict('fail', 'Rejected. The anchor block is not earlier than the block that reveals the mint.');
    }

    /* R6.8 freshness */
    var age = revealHeight - anchorHeight;
    if (!step(age <= windowBlocks ? 'pass' : 'fail', 'R6.8 freshness window',
      'reveal ' + revealHeight + ' minus anchor ' + anchorHeight + ' is ' + age + ' block(s), against a window of ' + windowBlocks + '.')) {
      return verdict('fail', 'Rejected. The anchor is ' + age + ' blocks old, beyond the ' + windowBlocks + ' block freshness window.');
    }

    /* R6.9 and R6.10 supply */
    if (maxSupply === null || maxSupply !== maxSupply || mintedSupply === null || mintedSupply !== mintedSupply) {
      step('info', 'R6.9 and R6.10 supply not checked',
        'Supply the deployment max and the already-minted total to see the credited amount. Without them the anchor is valid but the credited amount is unknown.');
      return verdict('pass', 'The anchor derivation passes. Add max supply and minted supply to compute the credited amount.');
    }
    var remaining = maxSupply - mintedSupply;
    if (remaining <= 0n) {
      step('fail', 'R6.9 remaining supply',
        'max ' + maxSupply.toString() + ' minus minted ' + mintedSupply.toString() + ' leaves ' + remaining.toString() + '. Supply is exhausted.');
      return verdict('fail', 'Ignored. Supply is already full, so this mint credits nothing and produces no event.');
    }
    step('pass', 'R6.9 remaining supply',
      'max ' + maxSupply.toString() + ' minus minted ' + mintedSupply.toString() + ' leaves ' + remaining.toString() + '.');

    var credited = amt < remaining ? amt : remaining;
    var partial = credited !== amt;
    step('pass', 'R6.10 credited amount',
      'credited = min(amt ' + amt.toString() + ', remaining ' + remaining.toString() + ') = ' + credited.toString() +
      (partial ? '. This is a partial final mint: the requested amount is reduced to the remaining supply.' : '.'));

    verdict('pass', 'Valid. This mint credits ' + credited.toString() + ' ' + fields.tick.toUpperCase() +
      ' to the reveal owner' + (partial ? ' as a partial final mint' : '') + '.');
  }

  form.addEventListener('submit', run);

  var reset = document.getElementById('verify-reset');
  if (reset) {
    reset.addEventListener('click', function () {
      out.hidden = true;
      stepsEl.innerHTML = '';
      verdictEl.textContent = '';
      verdictEl.className = 'verdict';
    });
  }

  var samples = document.querySelectorAll('[data-sample]');
  for (var s = 0; s < samples.length; s += 1) {
    samples[s].hidden = false;
    samples[s].addEventListener('click', function (event) {
      var data = JSON.parse(event.currentTarget.getAttribute('data-sample'));
      el('payload').value = data.payload;
      el('deploy-height').value = data.deploy || '';
      el('anchor-height').value = data.anchor === null ? '' : (data.anchor || '');
      el('reveal-height').value = data.reveal || '';
      el('window').value = data.window || 144;
      el('mint-limit').value = data.lim || '';
      el('max-supply').value = data.max || '';
      el('minted-supply').value = data.minted === undefined ? '' : data.minted;
      form.dispatchEvent(new Event('submit', { cancelable: true }));
      out.scrollIntoView({ block: 'nearest' });
    });
  }
}());
