/*! nsl-bf v1.0.0 — Black Friday hero for newserverlife.com: rim light on the NSL mark. Plain JS, no dependencies. */
/*
 * Markup: see snippets/bf-hero.html (or bitrix/include/nsl-bf-hero.php). The script finds every [data-nsl-bf] on the page.
 *
 *  - The edge of the mark catches the light under the pointer: the mouse on desktop, a finger while it touches the hero on phones
 *    (vertical scrolling keeps working: the hero has touch-action: pan-y).
 *  - Without a pointer the highlight drifts around the contour on its own (SMIL <animate> in the markup).
 *    It pauses while the hero is off screen and stays still with prefers-reduced-motion.
 *  - Events: CustomEvent('nsl-bf') bubbles from the hero, detail = { type, ... }; also pushed to window.dataLayer as { event: 'bf_<type>' }.
 *      view       — the hero was at least half on screen (once per page)
 *      cta_click  — the CTA was clicked (href)
 *
 * API: NSLBlackFriday.bind(root = document) — mount heroes added later; NSLBlackFriday.mount(el) → { destroy }.
 */
(function () {
  'use strict';

  var VERSION = '1.0.0';
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

  function mount(hero) {
    if (!hero || (mounted && mounted.has(hero))) return mounted && mounted.get(hero);
    var mark = hero.querySelector('[data-nsl-bf-mark]');
    var spot = hero.querySelector('[data-nsl-bf-spot]');
    var rims = hero.querySelectorAll('[data-nsl-bf-rim]');
    if (!mark || !spot || !rims.length || !mark.getScreenCTM) return null;

    var idleRef = rims[0].getAttribute('stroke');           /* url(#nsl-bf-spot-idle) */
    var followRef = 'url(#' + spot.id + ')';
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var pt = mark.createSVGPoint(), raf = 0, last = null, following = false, visible = true;

    function setRef(ref) { for (var i = 0; i < rims.length; i++) rims[i].setAttribute('stroke', ref); }
    function idleAnimation() {
      if (!mark.pauseAnimations) return;
      if (reduce || !visible) mark.pauseAnimations(); else mark.unpauseAnimations();
    }
    function apply() {
      raf = 0;
      var m = mark.getScreenCTM(); if (!m || !last) return;
      pt.x = last.x; pt.y = last.y;
      var p = pt.matrixTransform(m.inverse());
      spot.setAttribute('cx', Math.round(p.x));
      spot.setAttribute('cy', Math.round(p.y));
    }
    function follow(e) {
      last = { x: e.clientX, y: e.clientY };
      if (!following) { following = true; setRef(followRef); }
      if (e.type === 'pointerdown') apply(); else if (!raf) raf = requestAnimationFrame(apply);
    }
    function release() { if (following) { following = false; setRef(idleRef); } }
    function up(e) { if (e.pointerType !== 'mouse') release(); }
    function cta(e) {
      var a = e.target.closest && e.target.closest('[data-nsl-bf-cta]');
      if (a) emit(hero, 'cta_click', { href: a.getAttribute('href') || '' });
    }

    hero.addEventListener('pointermove', follow);
    hero.addEventListener('pointerdown', follow);
    hero.addEventListener('pointerleave', release);
    hero.addEventListener('pointercancel', release);
    hero.addEventListener('pointerup', up);
    hero.addEventListener('click', cta);

    var io = null, seen = false;
    if ('IntersectionObserver' in window) {
      io = new IntersectionObserver(function (entries) {
        var en = entries[0];
        visible = en.isIntersecting;
        idleAnimation();
        if (!seen && en.intersectionRatio >= 0.5) { seen = true; emit(hero, 'view'); }
      }, { threshold: [0, 0.5] });
      io.observe(hero);
    }
    idleAnimation();

    var api = {
      destroy: function () {
        hero.removeEventListener('pointermove', follow);
        hero.removeEventListener('pointerdown', follow);
        hero.removeEventListener('pointerleave', release);
        hero.removeEventListener('pointercancel', release);
        hero.removeEventListener('pointerup', up);
        hero.removeEventListener('click', cta);
        if (io) io.disconnect();
        if (raf) cancelAnimationFrame(raf);
        setRef(idleRef);
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
