/* BLOCK-20 docs: theme toggle and local search. Progressive enhancement only.
   Nothing on this page transmits, stores remotely, or logs anything you type. */
(function () {
  'use strict';

  var root = document.documentElement;

  /* ---------------- theme ---------------- */

  function stored() {
    try { return localStorage.getItem('block20-theme'); } catch (e) { return null; }
  }
  function save(value) {
    try { localStorage.setItem('block20-theme', value); } catch (e) { /* private mode */ }
  }

  var saved = stored();
  if (saved === 'dark' || saved === 'light') root.setAttribute('data-theme', saved);

  function currentTheme() {
    var explicit = root.getAttribute('data-theme');
    if (explicit) return explicit;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  }

  var toggle = document.getElementById('theme-toggle');
  if (toggle) {
    toggle.hidden = false;
    var label = function () {
      var next = currentTheme() === 'dark' ? 'light' : 'dark';
      toggle.textContent = next === 'dark' ? 'Dark' : 'Light';
      toggle.setAttribute('aria-label', 'Switch to ' + next + ' theme');
    };
    label();
    toggle.addEventListener('click', function () {
      var next = currentTheme() === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      save(next);
      label();
    });
  }

  /* ---------------- heading anchors ---------------- */

  var headings = document.querySelectorAll('main h2[id], main h3[id]');
  for (var h = 0; h < headings.length; h += 1) {
    var node = headings[h];
    var link = document.createElement('a');
    link.className = 'anchor-link';
    link.href = '#' + node.id;
    link.setAttribute('aria-label', 'Link to this section');
    link.textContent = '#';
    node.appendChild(link);
  }

  /* ---------------- search ---------------- */

  var input = document.getElementById('site-search');
  var output = document.getElementById('search-results');
  if (!input || !output) return;

  var index = null;
  var loading = false;
  var pending = false;
  var base = input.getAttribute('data-base') || '';

  function load() {
    if (index || loading) return;
    loading = true;
    fetch(base + 'search-index.json', { credentials: 'omit' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        index = data && Array.isArray(data.entries) ? data.entries : [];
        loading = false;
        if (pending) { pending = false; render(); }
      })
      .catch(function () {
        index = [];
        loading = false;
        if (pending) { pending = false; render(); }
      });
  }

  function score(entry, terms) {
    var hay = entry.h.toLowerCase();
    var body = (entry.t + ' ' + (entry.a || '')).toLowerCase();
    var total = 0;
    for (var i = 0; i < terms.length; i += 1) {
      var term = terms[i];
      if (!term) continue;
      var got = 0;
      if (hay.indexOf(term) === 0) got += 12;
      else if (hay.indexOf(term) > -1) got += 8;
      if (body.indexOf(term) > -1) got += 3;
      if (got === 0) return 0;
      total += got;
    }
    return total;
  }

  function esc(value) {
    return String(value).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  function render() {
    var raw = input.value.trim().toLowerCase();
    output.innerHTML = '';
    if (raw.length < 2) return;
    if (!index) { pending = true; load(); return; }

    var terms = raw.split(/\s+/);
    var hits = [];
    for (var i = 0; i < index.length; i += 1) {
      var s = score(index[i], terms);
      if (s > 0) hits.push({ e: index[i], s: s });
    }
    hits.sort(function (a, b) { return b.s - a.s; });

    if (hits.length === 0) {
      var none = document.createElement('li');
      none.className = 'search-empty';
      none.textContent = 'No match for "' + raw + '". Try a field name (hash, tick, amt), an operation (deploy, mint, transfer), or a term such as reorg, anchor, or supply.';
      output.appendChild(none);
      return;
    }

    var limit = Math.min(hits.length, 12);
    for (var j = 0; j < limit; j += 1) {
      var e = hits[j].e;
      var li = document.createElement('li');
      li.innerHTML =
        '<a href="' + esc(base + e.u) + '">' +
        '<span class="r-page">' + esc(e.p) + '</span>' +
        '<span class="r-title">' + esc(e.h) + '</span>' +
        '<span class="r-snip">' + esc(e.t.slice(0, 130)) + '</span></a>';
      output.appendChild(li);
    }
  }

  input.addEventListener('focus', load);
  input.addEventListener('input', render);
  input.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') { input.value = ''; output.innerHTML = ''; input.blur(); }
    if (event.key === 'ArrowDown') {
      var first = output.querySelector('a');
      if (first) { event.preventDefault(); first.focus(); }
    }
  });
  output.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') { output.innerHTML = ''; input.focus(); }
  });
  document.addEventListener('click', function (event) {
    if (!output.contains(event.target) && event.target !== input) output.innerHTML = '';
  });
  document.addEventListener('keydown', function (event) {
    if (event.key !== '/' || event.ctrlKey || event.metaKey || event.altKey) return;
    var tag = document.activeElement && document.activeElement.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    event.preventDefault();
    input.focus();
    input.select();
  });
}());
