/*!
 * nsl-search v1.0.0 — search results page behaviour for newserverlife.com
 * No dependencies. ES2017. Markup and styles: NSL Design System (nsl-search.css).
 *
 * 1. Predictive search: a suggestion panel under any search field while the person types.
 *      <div class="nsl-search-combo" data-nsl-suggest="/ajax/search-suggest.php">
 *        <form class="nsl-search" role="search" action="/search/"><input type="search" name="q">…</form>
 *      </div>
 * 2. "Show 10 more" on phones: loads the next results page and appends its rows.
 *      <section data-nsl-results>…rows…</section>
 *      <button data-nsl-more data-next="/search/?q=…&PAGEN_1=2">Show 10 more</button>
 *      <p data-nsl-count data-from="1" data-to="10" data-total="47">Showing 1–10 of 47</p>
 *
 *   <script src="/local/templates/nsl/js/nsl-search.js" defer></script>
 *   Markup with data attributes works on its own (auto-init on DOMContentLoaded).
 *   NSLSearch.init({ … }) changes the options; NSLSearch.suggest(el, { … }) binds one field by hand.
 */
(function (global) {
  'use strict';

  var VERSION = '1.0.0';

  var DEFAULTS = {
    suggestUrl: '',            // GET {suggestUrl}?q=… → JSON { groups: [{ title, items: [{ label, href }], more: { label, href } }], all: { label, href } }
    source: null,              // function (query, signal) → Promise<groups | { groups, all }>; replaces suggestUrl (demo, tests, another backend)
    queryParam: 'q',
    minChars: 2,               // the panel opens from this many characters
    delay: 150,                // ms of quiet typing before a request
    maxPerGroup: 4,            // 2–4 items per group (DS rule); the rest goes to "Show all … (N)"
    searchUrl: '',             // "All Results" link; default: the form's action + ?q=
    autoInit: true,            // bind [data-nsl-suggest] and [data-nsl-more] on DOMContentLoaded
    onEvent: null,             // function (type, detail) — also a `nsl-search` CustomEvent and a dataLayer push
    labels: {
      panel: 'Search suggestions',
      allResults: 'All Results',
      more: 'Show {n} more',
      loading: 'Loading…',
      count: 'Showing {from}–{to} of {total}',
      loadError: 'Couldn’t load more results. Opening the next page…'
    }
  };

  /* ------------------------------------------------------------------ helpers */
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function fmt(s, vars) { return String(s).replace(/\{(\w+)\}/g, function (_, k) { return vars[k] != null ? vars[k] : ''; }); }
  function merge(a, b) { var o = {}; Object.keys(a).forEach(function (k) { o[k] = a[k]; }); Object.keys(b || {}).forEach(function (k) { if (b[k] !== undefined) o[k] = b[k]; }); return o; }
  var opts = merge(DEFAULTS, {});
  var uid = 0;

  function emit(el, type, detail) {
    detail = merge({ type: type }, detail || {});
    try { el.dispatchEvent(new CustomEvent('nsl-search', { detail: detail, bubbles: true })); } catch (e) {}
    if (typeof opts.onEvent === 'function') { try { opts.onEvent(type, detail); } catch (e) {} }
    try { if (Array.isArray(global.dataLayer)) global.dataLayer.push(merge({ event: 'search_' + type }, detail)); } catch (e) {}
  }

  /* every word of the query marked on its own, as in the results list; Latin x and Cyrillic х count as one letter ("8х nvme") */
  function markTerms(text, q, cls) {
    var words = String(q || '').trim().split(/\s+/).filter(Boolean);
    var terms = words.filter(function (t) { return t.length > 1 || words.length === 1; })
      .sort(function (a, b) { return b.length - a.length; })
      .map(function (t) { return t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/[xх]/gi, '[xх]'); });
    if (!terms.length) return esc(text);
    var re = new RegExp('(' + terms.join('|') + ')', 'ig');
    return String(text).split(re).map(function (part, i) { return i % 2 ? '<mark class="' + cls + '">' + esc(part) + '</mark>' : esc(part); }).join('');
  }

  /* ================================================================== predictive search */
  function suggest(box, local) {
    if (!box || box.__nslSuggest) return box && box.__nslSuggest;
    var o = merge(opts, local || {});
    o.labels = merge(opts.labels, (local || {}).labels || {});
    if (!o.suggestUrl) o.suggestUrl = box.getAttribute('data-nsl-suggest') || '';
    var L = o.labels, id = 'nsl-psearch-' + (++uid);
    var input = box.querySelector('input[type="search"], input[name="' + o.queryParam + '"], input[type="text"]');
    if (!input) return null;
    var form = input.form;

    input.setAttribute('role', 'combobox');
    input.setAttribute('aria-autocomplete', 'list');
    input.setAttribute('aria-expanded', 'false');
    input.setAttribute('aria-controls', id);
    input.setAttribute('autocomplete', 'off');

    /* the DS header keeps the panel in its own positioned wrapper; everywhere else it sits right in .nsl-search-combo */
    var holder = box;
    if (box.classList.contains('nsl-header__searchwrap')) { holder = document.createElement('div'); holder.className = 'nsl-header__suggest'; holder.hidden = true; box.appendChild(holder); }
    var panel = document.createElement('div');
    panel.className = 'nsl-psearch'; panel.id = id; panel.hidden = true;
    panel.setAttribute('role', 'listbox'); panel.setAttribute('aria-label', L.panel);
    holder.appendChild(panel);

    var st = { open: false, query: '', data: null, active: -1, timer: null, ctrl: null };
    var cache = {};

    function allHref(q) {
      var base = o.searchUrl || (form && form.getAttribute('action')) || global.location.pathname;
      return base + (base.indexOf('?') > -1 ? '&' : '?') + encodeURIComponent(o.queryParam) + '=' + encodeURIComponent(q);
    }
    function normalize(res) {
      var groups = Array.isArray(res) ? res : (res && res.groups) || [];
      return { groups: groups.filter(function (g) { return g && g.items && g.items.length; }), all: res && !Array.isArray(res) ? res.all : null };
    }
    function load(q) {
      if (cache[q]) return Promise.resolve(cache[q]);
      if (st.ctrl) try { st.ctrl.abort(); } catch (e) {}
      var ctrl = global.AbortController ? new AbortController() : null; st.ctrl = ctrl;
      var job;
      if (typeof o.source === 'function') job = Promise.resolve(o.source(q, ctrl && ctrl.signal));
      else if (o.suggestUrl) {
        var url = o.suggestUrl + (o.suggestUrl.indexOf('?') > -1 ? '&' : '?') + encodeURIComponent(o.queryParam) + '=' + encodeURIComponent(q);
        job = fetch(url, { credentials: 'same-origin', headers: { 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest' }, signal: ctrl && ctrl.signal })
          .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); });
      } else job = Promise.resolve([]);
      return job.then(function (res) { var d = normalize(res); cache[q] = d; return d; });
    }

    function options() { return Array.prototype.slice.call(panel.querySelectorAll('a')); }
    function setActive(i) {
      var list = options();
      if (st.active > -1 && list[st.active]) list[st.active].classList.remove('is-active');
      st.active = list.length ? (i + list.length) % list.length : -1;
      if (i < 0 || st.active < 0) { st.active = -1; input.removeAttribute('aria-activedescendant'); return; }
      var a = list[st.active]; a.classList.add('is-active');
      input.setAttribute('aria-activedescendant', a.id);
      if (a.scrollIntoView) a.scrollIntoView({ block: 'nearest' });
    }

    function render() {
      var d = st.data, q = st.query, n = 0;
      var html = d.groups.map(function (g) {
        var items = g.items.slice(0, o.maxPerGroup).map(function (x) {
          x = typeof x === 'string' ? { label: x } : x;
          return '<a class="nsl-psearch__item" role="option" id="' + id + '-' + (n++) + '" href="' + esc(x.href || allHref(x.label)) + '">' + markTerms(x.label, q, 'nsl-psearch__match') + '</a>';
        }).join('');
        var more = g.more ? '<a class="nsl-psearch__meta" role="option" id="' + id + '-' + (n++) + '" href="' + esc(g.more.href || allHref(q)) + '">' + esc(g.more.label || g.more) + '</a>' : '';
        return '<div class="nsl-psearch__row" role="group" aria-label="' + esc(g.title) + '"><div class="nsl-psearch__cat">' + esc(g.title) + '</div><div class="nsl-psearch__items">' + items + more + '</div></div>';
      }).join('');
      var all = d.all || {};
      html += '<div class="nsl-psearch__row nsl-psearch__row--all"><div class="nsl-psearch__cat"></div><div class="nsl-psearch__items"><a class="nsl-psearch__meta" role="option" id="' + id + '-' + (n++) + '" href="' + esc(all.href || allHref(q)) + '">' + esc(all.label || L.allResults) + '</a></div></div>';
      panel.innerHTML = html;
      st.active = -1; input.removeAttribute('aria-activedescendant');
    }

    function show() {
      if (!st.data || !st.data.groups.length) { hide(); return; }
      if (!st.open) emit(box, 'suggest_open', { query: st.query, groups: st.data.groups.length });
      st.open = true; panel.hidden = false; if (holder !== box) holder.hidden = false;
      input.setAttribute('aria-expanded', 'true');
      box.classList.add('is-suggesting');
    }
    function hide() {
      if (!st.open && panel.hidden) return;
      st.open = false; panel.hidden = true; if (holder !== box) holder.hidden = true;
      input.setAttribute('aria-expanded', 'false'); input.removeAttribute('aria-activedescendant');
      box.classList.remove('is-suggesting');
    }

    function update(immediate) {
      var q = input.value.trim();
      clearTimeout(st.timer);
      if (q.length < o.minChars) { st.query = q; st.data = null; hide(); return; }
      var go = function () {
        load(q).then(function (d) {
          if (input.value.trim() !== q) return;          // the person kept typing: a newer request owns the panel
          st.query = q; st.data = d; render();
          if (document.activeElement === input || box.contains(document.activeElement)) show();
        }, function (err) { if (!err || err.name !== 'AbortError') hide(); });
      };
      if (immediate || cache[q]) go(); else st.timer = setTimeout(go, o.delay);
    }

    function onInput() { update(false); }
    function onFocus() { if (input.value.trim().length >= o.minChars) update(true); }
    function onKey(e) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        if (!st.open) { update(true); return; }
        e.preventDefault(); setActive(st.active + (e.key === 'ArrowDown' ? 1 : -1));
      } else if (e.key === 'Enter' && st.open && st.active > -1) {
        var a = options()[st.active];
        if (a) { e.preventDefault(); emit(box, 'suggest_click', { query: st.query, label: a.textContent, href: a.href, keyboard: true }); a.click(); }
      } else if (e.key === 'Escape' && st.open) { e.preventDefault(); e.stopPropagation(); hide(); }
      else if (e.key === 'Tab') hide();
    }
    function onDown(e) { if (st.open && !box.contains(e.target)) hide(); }
    function onPanelClick(e) {
      var a = e.target.closest && e.target.closest('a'); if (!a) return;
      emit(box, 'suggest_click', { query: st.query, label: a.textContent, href: a.href, keyboard: false });
      hide();
    }
    function onSubmit() { hide(); emit(box, 'submit', { query: input.value.trim() }); }

    input.addEventListener('input', onInput);
    input.addEventListener('focus', onFocus);
    input.addEventListener('keydown', onKey);
    panel.addEventListener('click', onPanelClick);
    panel.addEventListener('mousedown', function (e) { e.preventDefault(); });   // keep focus in the field while clicking
    document.addEventListener('pointerdown', onDown);
    if (form) form.addEventListener('submit', onSubmit);

    var api = {
      open: function () { update(true); },
      close: hide,
      destroy: function () {
        input.removeEventListener('input', onInput); input.removeEventListener('focus', onFocus); input.removeEventListener('keydown', onKey);
        document.removeEventListener('pointerdown', onDown); if (form) form.removeEventListener('submit', onSubmit);
        (holder !== box ? holder : panel).remove(); delete box.__nslSuggest;
      },
      version: VERSION
    };
    box.__nslSuggest = api;
    return api;
  }

  /* ================================================================== show more (phones) */
  function loadMore(btn, local) {
    if (!btn || btn.__nslMore) return;
    btn.__nslMore = true;
    btn.addEventListener('click', function (e) {
      var L = merge(opts.labels, (local || {}).labels || {});   // read on click: NSLSearch.init() may come later
      var next = btn.getAttribute('data-next') || btn.getAttribute('href');
      if (!next || btn.getAttribute('aria-busy') === 'true') return;
      e.preventDefault();
      var list = document.querySelector(btn.getAttribute('data-target') || '[data-nsl-results]');
      var label = btn.querySelector('.nsl-btn__label') || btn, was = label.textContent;
      btn.setAttribute('aria-busy', 'true'); label.textContent = L.loading;
      fetch(next, { credentials: 'same-origin', headers: { 'X-Requested-With': 'XMLHttpRequest' } })
        .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); })
        .then(function (html) {
          var doc = new DOMParser().parseFromString(html, 'text/html');
          var src = doc.querySelector('[data-nsl-results]');
          var rows = src ? Array.prototype.slice.call(src.children) : [];
          if (!rows.length || !list) throw new Error('no rows');
          rows.forEach(function (r) { r.classList.add('is-new'); list.appendChild(document.importNode(r, true)); });
          /* keyboard and screen-reader users land on the first new result */
          var first = list.children[list.children.length - rows.length], link = first && first.querySelector('a[href]');
          if (link) { try { link.focus({ preventScroll: true }); } catch (err) { link.focus(); } }

          var count = document.querySelector('[data-nsl-count]');
          if (count) {
            var to = Number(count.getAttribute('data-to')) + rows.length;
            count.setAttribute('data-to', String(to));
            count.textContent = fmt(L.count, { from: count.getAttribute('data-from'), to: to, total: count.getAttribute('data-total') });
          }
          ['[data-nsl-pager-compact]', '[data-nsl-pager]'].forEach(function (sel) {
            var cur = document.querySelector(sel), fresh = doc.querySelector(sel);
            if (cur && fresh) cur.replaceWith(document.importNode(fresh, true));
          });
          var nextBtn = doc.querySelector('[data-nsl-more]');
          if (nextBtn && nextBtn.getAttribute('data-next')) {
            btn.setAttribute('data-next', nextBtn.getAttribute('data-next'));
            var nl = nextBtn.querySelector('.nsl-btn__label') || nextBtn;
            label.textContent = nl.textContent;
            btn.removeAttribute('aria-busy');
          } else btn.remove();
          emit(btn, 'more', { url: next, rows: rows.length });
        })
        .catch(function (err) {
          btn.removeAttribute('aria-busy'); label.textContent = was;
          emit(btn, 'more_error', { url: next, message: String(err && err.message || err) });
          global.location.href = next;          // the plain next page still works
        });
    });
  }

  /* ================================================================== init */
  function bind(root) {
    root = root || document;
    Array.prototype.forEach.call(root.querySelectorAll('[data-nsl-suggest]'), function (el) { suggest(el); });
    Array.prototype.forEach.call(root.querySelectorAll('[data-nsl-more]'), function (el) { loadMore(el); });
  }
  function init(options) {
    options = options || {};
    opts = merge(DEFAULTS, options);
    opts.labels = merge(DEFAULTS.labels, options.labels || {});
    /* fields bound by auto-init get the new options */
    Array.prototype.forEach.call(document.querySelectorAll('[data-nsl-suggest]'), function (el) { if (el.__nslSuggest) el.__nslSuggest.destroy(); });
    bind(document);
    return global.NSLSearch;
  }

  global.NSLSearch = { init: init, suggest: suggest, loadMore: loadMore, bind: bind, markTerms: markTerms, version: VERSION, defaults: DEFAULTS };

  function auto() { if (opts.autoInit) bind(document); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', auto); else setTimeout(auto, 0);
})(window);
