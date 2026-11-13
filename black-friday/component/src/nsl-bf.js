/*! nsl-bf v1.1.0 — Black Friday hero for newserverlife.com: rim light on the NSL mark. Plain JS, no dependencies. */
/*
 * Markup: see snippets/bf-hero.html (or bitrix/include/nsl-bf-hero.php). The script finds every [data-nsl-bf] on the page.
 *
 *  - The edge of the mark catches the light under the pointer: the mouse on desktop, a finger while it touches the hero on phones
 *    (vertical scrolling keeps working: the hero has touch-action: pan-y).
 *  - Without a pointer the highlight drifts around the contour on its own. The markup keeps a SMIL <animate> as a
 *    no-JS fallback; with JS the light is rebuilt as a soft dot moving under a mask cut from the mark outline,
 *    because Safari does not repaint strokes when their gradient changes (SMIL or script, and never through <use>).
 *    It pauses while the hero is off screen and stays still with prefers-reduced-motion.
 *  - Events: CustomEvent('nsl-bf') bubbles from the hero, detail = { type, ... }; also pushed to window.dataLayer as { event: 'bf_<type>' }.
 *      view       — the hero was at least half on screen (once per page)
 *      cta_click  — the CTA was clicked (href)
 *
 * API: NSLBlackFriday.bind(root = document) — mount heroes added later; NSLBlackFriday.mount(el) → { destroy }.
 */
(function () {
  'use strict';

  var VERSION = '1.1.0';
  var mounted = typeof WeakMap === 'function' ? new WeakMap() : null;

  function emit(el, type, detail) {
    var d = detail || {}; d.type = type;
    try { el.dispatchEvent(new CustomEvent('nsl-bf', { bubbles: true, detail: d })); } catch (e) { /* old browsers */ }
    if (window.dataLayer && typeof window.dataLayer.push === 'function') {
      var payload = { event: 'bf_' + type };
      for (var k in d) if (k !== 'type') payload[k] = d[k];
      window.dataLayer.push(payload);
    }
  }

  var NS = 'http://www.w3.org/2000/svg', uid = 0;
  function el(tag, attrs) { var e = document.createElementNS(NS, tag); for (var k in attrs) e.setAttribute(k, attrs[k]); return e; }
  function lerp(v, t) { var n = v.length - 1, x = t * n, i = Math.min(Math.floor(x), n - 1); return v[i] + (v[i + 1] - v[i]) * (x - i); }

  /* Replace the gradient-stroked rims with: mask (rim paths in white, same classes and filters) + a radial dot under it.
     Returns the dot and the idle keyframes read from the SMIL <animate>, which is then removed. */
  function buildLight(mark, rims) {
    var idle = document.getElementById((rims[0].getAttribute('stroke') || '').slice(5, -1));
    var src = document.getElementById((rims[0].getAttribute('href') || rims[0].getAttribute('xlink:href') || '').slice(1));
    if (!idle || !src) return null;
    var k = { x: +idle.getAttribute('cx') || 230, y: +idle.getAttribute('cy') || 340, r: +idle.getAttribute('r') || 210, dur: 9000, cx: null, cy: null };
    var anims = idle.querySelectorAll('animate');
    for (var i = 0; i < anims.length; i++) {
      k[anims[i].getAttribute('attributeName')] = anims[i].getAttribute('values').split(';').map(Number);
      k.dur = parseFloat(anims[i].getAttribute('dur')) * 1000 || k.dur;
      anims[i].parentNode.removeChild(anims[i]);
    }
    var n = ++uid, defs = el('defs', {});
    var dot = el('radialGradient', { id: 'nsl-bf-dot-' + n });
    var stops = idle.querySelectorAll('stop');
    for (i = 0; i < stops.length; i++) dot.appendChild(stops[i].cloneNode(false));
    var mask = el('mask', { id: 'nsl-bf-mask-' + n, maskUnits: 'userSpaceOnUse', x: -300, y: -300, width: 1100, height: 1300 });
    for (i = 0; i < rims.length; i++) {
      var p = el('path', { d: src.getAttribute('d'), fill: 'none', stroke: '#fff' });
      if (rims[i].getAttribute('class')) p.setAttribute('class', rims[i].getAttribute('class'));  /* stroke widths come from CSS */
      if (rims[i].getAttribute('filter')) p.setAttribute('filter', rims[i].getAttribute('filter'));
      mask.appendChild(p);
    }
    defs.appendChild(dot); defs.appendChild(mask); mark.appendChild(defs);
    var g = el('g', { mask: 'url(#nsl-bf-mask-' + n + ')' });
    var c = el('circle', { cx: k.x, cy: k.y, r: k.r, fill: 'url(#nsl-bf-dot-' + n + ')' });
    g.appendChild(c);
    rims[0].parentNode.insertBefore(g, rims[0]);
    for (i = 0; i < rims.length; i++) rims[i].parentNode.removeChild(rims[i]);
    return { dot: c, k: k, g: g, rims: rims };
  }

  function mount(hero) {
    if (!hero || (mounted && mounted.has(hero))) return mounted && mounted.get(hero);
    var mark = hero.querySelector('[data-nsl-bf-mark]');
    var rims = hero.querySelectorAll('[data-nsl-bf-rim]');
    if (!mark || !rims.length || !mark.getScreenCTM) return null;
    var light = buildLight(mark, rims);
    if (!light) return null;

    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var pt = mark.createSVGPoint(), raf = 0, follow = null, visible = true, t0 = 0;

    function place(x, y) { light.dot.setAttribute('cx', x.toFixed(1)); light.dot.setAttribute('cy', y.toFixed(1)); }
    function tick(now) {
      raf = 0;
      if (follow) place(follow.x, follow.y);
      else if (!reduce && light.k.cx && light.k.cy) {
        if (!t0) t0 = now;
        var t = (((now - t0) % light.k.dur) + light.k.dur) % light.k.dur / light.k.dur;
        place(lerp(light.k.cx, t), lerp(light.k.cy, t));
      }
      schedule();
    }
    function schedule() {
      /* loop only while the hero is on screen; with reduced motion only while following the pointer */
      if (!raf && visible && !document.hidden && (follow || !reduce)) raf = requestAnimationFrame(tick);
    }
    function move(e) {
      var m = mark.getScreenCTM(); if (!m) return;
      pt.x = e.clientX; pt.y = e.clientY;
      var p = pt.matrixTransform(m.inverse());
      follow = { x: p.x, y: p.y };
      if (e.type === 'pointerdown') place(p.x, p.y);
      schedule();
    }
    function release() { follow = null; }
    function up(e) { if (e.pointerType !== 'mouse') release(); }
    function cta(e) {
      var a = e.target.closest && e.target.closest('[data-nsl-bf-cta]');
      if (a) emit(hero, 'cta_click', { href: a.getAttribute('href') || '' });
    }
    function vis() { schedule(); }

    hero.addEventListener('pointermove', move);
    hero.addEventListener('pointerdown', move);
    hero.addEventListener('pointerleave', release);
    hero.addEventListener('pointercancel', release);
    hero.addEventListener('pointerup', up);
    hero.addEventListener('click', cta);
    document.addEventListener('visibilitychange', vis);

    var io = null, seen = false;
    if ('IntersectionObserver' in window) {
      io = new IntersectionObserver(function (entries) {
        var en = entries[0];
        visible = en.isIntersecting;
        schedule();
        if (!seen && en.intersectionRatio >= 0.5) { seen = true; emit(hero, 'view'); }
      }, { threshold: [0, 0.5] });
      io.observe(hero);
    }
    schedule();

    var api = {
      destroy: function () {
        hero.removeEventListener('pointermove', move);
        hero.removeEventListener('pointerdown', move);
        hero.removeEventListener('pointerleave', release);
        hero.removeEventListener('pointercancel', release);
        hero.removeEventListener('pointerup', up);
        hero.removeEventListener('click', cta);
        document.removeEventListener('visibilitychange', vis);
        if (io) io.disconnect();
        if (raf) cancelAnimationFrame(raf);
        /* put the original rims back */
        for (var i = 0; i < light.rims.length; i++) light.g.parentNode.insertBefore(light.rims[i], light.g);
        light.g.parentNode.removeChild(light.g);
        if (mounted) mounted.delete(hero);
      }
    };
    if (mounted) mounted.set(hero, api);
    return api;
  }

  function bind(root) {
    var list = (root || document).querySelectorAll('[data-nsl-bf]');
    for (var i = 0; i < list.length; i++) mount(list[i]);
  }

  window.NSLBlackFriday = { version: VERSION, mount: mount, bind: bind };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { bind(); });
  else bind();
})();
