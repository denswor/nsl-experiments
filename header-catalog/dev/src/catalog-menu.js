/*
 * NSL catalog menu — open / close / switch with motion concept A ("curtain").
 * No dependencies. Works by data attributes:
 *
 *   [data-cm-toggle]            Catalog button (aria-controls = panel id)
 *   [data-cm]                   the panel (.nsl-catmenu), hidden when closed
 *   [data-cm-brand="i"]         brand tab
 *   [data-cm-brand-panel="i"]   content of brand i (categories row + category panels)
 *   [data-cm-cat="j"]           category chip inside a brand panel
 *   [data-cm-cat-panel="j"]     content of category j (columns + "All … servers" link)
 *
 * Events for analytics: CustomEvent('nsl-catalog') on document and window.dataLayer:
 *   cm_open, cm_close, cm_brand {brand}, cm_category {brand, category}.
 */
(function () {
  'use strict';

  var btn = document.querySelector('[data-cm-toggle]');
  var panel = document.querySelector('[data-cm]');
  if (!btn || !panel) return;
  var header = btn.closest('header') || btn.parentNode;
  var inner = panel.querySelector('.nsl-catmenu__in');

  var RM = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  var EASE_OUT = 'cubic-bezier(.2,.8,.2,1)';   // decelerate: things coming in
  var EASE_IN = 'cubic-bezier(.4,0,1,1)';      // accelerate: things leaving
  var canAnimate = typeof panel.animate === 'function';
  var busy = false;

  function track(action, data) {
    var detail = Object.assign({ event: action }, data || {});
    try { document.dispatchEvent(new CustomEvent('nsl-catalog', { detail: detail })); } catch (e) {}
    if (window.dataLayer && window.dataLayer.push) window.dataLayer.push(detail);
  }

  function anim(el, frames, opts) {
    if (!canAnimate) return { finished: Promise.resolve() };
    return el.animate(frames, opts);
  }

  function cancelAll() {
    if (!panel.getAnimations) return;
    panel.getAnimations({ subtree: true }).forEach(function (a) { a.cancel(); });
  }

  /* visible rows of the panel, top to bottom; columns count one by one */
  function rows(scope) {
    var out = [];
    (function walk(node) {
      Array.prototype.forEach.call(node.children, function (c) {
        if (c.hasAttribute('hidden')) return;
        if (c.hasAttribute('data-cm-brand-panel') || c.hasAttribute('data-cm-cat-panel')) { walk(c); return; }
        if (c.classList.contains('nsl-catmenu__cols')) { Array.prototype.forEach.call(c.children, function (col) { out.push(col); }); return; }
        out.push(c);
      });
    })(scope);
    return out;
  }

  function isOpen() { return !panel.hidden; }

  /* ---------- open / close ---------- */
  function open() {
    if (isOpen() || busy) return;
    cancelAll();
    panel.style.setProperty('--cm-header-bottom', Math.max(0, header.getBoundingClientRect().bottom) + 'px');
    panel.hidden = false;
    btn.setAttribute('aria-expanded', 'true');
    btn.classList.add('is-open');
    if (RM.matches) {
      anim(panel, [{ opacity: 0 }, { opacity: 1 }], { duration: 150 });
    } else {
      // curtain: reveal from the top edge, rows and columns follow in a cascade
      anim(panel, [{ clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0 0)' }], { duration: 320, easing: EASE_OUT });
      rows(inner).forEach(function (r, i) {
        anim(r, [{ opacity: 0, transform: 'translateY(-8px)' }, { opacity: 1, transform: 'none' }],
          { duration: 260, delay: 40 + i * 28, easing: EASE_OUT, fill: 'backwards' });
      });
      var icon = btn.querySelector('.cm-ic-close');
      if (icon) anim(icon, [{ transform: 'rotate(-90deg) scale(.6)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 240, easing: EASE_OUT });
    }
    track('cm_open');
  }

  function close(returnFocus) {
    if (!isOpen() || busy) return;
    busy = true;
    cancelAll();
    var done = function () {
      panel.hidden = true; busy = false;
      btn.setAttribute('aria-expanded', 'false');
      btn.classList.remove('is-open');
      if (returnFocus) btn.focus();
    };
    var a = RM.matches
      ? anim(panel, [{ opacity: 1 }, { opacity: 0 }], { duration: 120, fill: 'forwards' })
      : anim(panel, [{ clipPath: 'inset(0 0 0 0)' }, { clipPath: 'inset(0 0 100% 0)' }], { duration: 200, easing: EASE_IN, fill: 'forwards' });
    if (!RM.matches) anim(inner, [{ opacity: 1 }, { opacity: 0 }], { duration: 140, easing: EASE_IN, fill: 'forwards' });
    a.finished.then(function () { done(); cancelAll(); }, done);
    track('cm_close');
  }

  btn.addEventListener('click', function (e) {
    e.preventDefault();
    isOpen() ? close(false) : open();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && isOpen()) close(true);
  });
  document.addEventListener('click', function (e) {
    if (isOpen() && !header.contains(e.target)) close(false);
  });

  /* ---------- switching: shared axis X ---------- */
  // old content leaves towards the side opposite to the choice (110 ms),
  // then the new content comes in from the other side (240 ms)
  function swap(oldPanel, newPanel, dir, after) {
    var olds = rows(oldPanel);
    var finish = function () {
      oldPanel.hidden = true;
      olds.forEach(function (o) { o.style.opacity = ''; });
      newPanel.hidden = false;
      if (after) after();
      if (RM.matches) {
        rows(newPanel).forEach(function (f) { anim(f, [{ opacity: 0 }, { opacity: 1 }], { duration: 150, fill: 'backwards' }); });
        return;
      }
      rows(newPanel).forEach(function (f, i) {
        anim(f, [{ opacity: 0, transform: 'translateX(' + 24 * dir + 'px)' }, { opacity: 1, transform: 'none' }],
          { duration: 240, delay: i * 12, easing: EASE_OUT, fill: 'backwards' });
      });
    };
    if (!canAnimate || !olds.length) { finish(); return; }
    var outs = olds.map(function (o) {
      return RM.matches
        ? o.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 100, fill: 'forwards' })
        : o.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateX(' + -24 * dir + 'px)' }], { duration: 110, easing: EASE_IN, fill: 'forwards' });
    });
    Promise.all(outs.map(function (a) { return a.finished; })).then(function () {
      olds.forEach(function (o) { o.style.opacity = 0; });
      outs.forEach(function (a) { a.cancel(); });
      finish();
    }, finish);
  }

  function setActive(list, index, attr) {
    list.forEach(function (el, i) {
      var on = i === index;
      el.classList.toggle('is-active', on);
      el.setAttribute(attr, on ? 'true' : 'false');
    });
  }

  var brands = Array.prototype.slice.call(panel.querySelectorAll('[data-cm-brand]'));
  brands.forEach(function (b, i) {
    b.addEventListener('click', function () {
      var cur = brands.findIndex(function (x) { return x.classList.contains('is-active'); });
      if (i === cur) return;
      var from = panel.querySelector('[data-cm-brand-panel="' + cur + '"]');
      var to = panel.querySelector('[data-cm-brand-panel="' + i + '"]');
      setActive(brands, i, 'aria-selected');
      // a brand always opens on its first category
      var cats = Array.prototype.slice.call(to.querySelectorAll('[data-cm-cat]'));
      var catPanels = Array.prototype.slice.call(to.querySelectorAll('[data-cm-cat-panel]'));
      setActive(cats, 0, 'aria-pressed');
      catPanels.forEach(function (p, k) { p.hidden = k !== 0; });
      swap(from, to, i > cur ? 1 : -1);
      track('cm_brand', { brand: b.textContent.trim() });
    });
  });

  Array.prototype.forEach.call(panel.querySelectorAll('[data-cm-brand-panel]'), function (bp) {
    var cats = Array.prototype.slice.call(bp.querySelectorAll('[data-cm-cat]'));
    cats.forEach(function (c, j) {
      c.addEventListener('click', function () {
        var cur = cats.findIndex(function (x) { return x.classList.contains('is-active'); });
        if (j === cur) return;
        setActive(cats, j, 'aria-pressed');
        swap(bp.querySelector('[data-cm-cat-panel="' + cur + '"]'), bp.querySelector('[data-cm-cat-panel="' + j + '"]'), j > cur ? 1 : -1);
        var brand = panel.querySelector('[data-cm-brand].is-active');
        track('cm_category', { brand: brand ? brand.textContent.trim() : '', category: c.textContent.trim() });
      });
    });
  });

  /* ---------- wheel stays in the panel; page scroll is not locked (no scrollbar jump) ---------- */
  panel.addEventListener('wheel', function (e) {
    var up = e.deltaY < 0;
    var atTop = panel.scrollTop <= 0;
    var atEnd = panel.scrollTop + panel.clientHeight >= panel.scrollHeight - 1;
    if ((up && atTop) || (!up && atEnd)) e.preventDefault();
  }, { passive: false });

  /* ---------- Black Friday rim light follows the pointer ---------- */
  if (panel.classList.contains('nsl-catmenu--bf')) {
    var raf = 0, px = 0, py = 0;
    panel.addEventListener('pointermove', function (e) {
      px = e.clientX; py = e.clientY;
      if (raf) return;
      raf = requestAnimationFrame(function () {
        raf = 0;
        var r = panel.getBoundingClientRect();
        panel.style.setProperty('--cm-mx', (px - r.left) + 'px');
        panel.style.setProperty('--cm-my', (py - r.top + panel.scrollTop) + 'px');
      });
    });
  }

  window.addEventListener('resize', function () {
    if (isOpen()) panel.style.setProperty('--cm-header-bottom', Math.max(0, header.getBoundingClientRect().bottom) + 'px');
  });
})();
