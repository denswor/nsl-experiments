/* Black Friday landing demo · interactions (vanilla, no dependencies) */
(function () {
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var mobileMQ = window.matchMedia('(max-width: 719px)');

  /* 1. Desktop board: full width; below the container + margins (1230) it is scaled down as a whole. */
  var desk = document.querySelector('.bf-board--d'), MIN = 1230;
  function fit() {
    if (!desk) return;
    var vw = document.documentElement.clientWidth;
    desk.style.zoom = (!mobileMQ.matches && vw < MIN) ? String(vw / MIN) : '';
  }
  fit(); window.addEventListener('resize', fit);

  /* 2. Generation rows: toggle open/closed. */
  document.querySelectorAll('[data-bf-toggle]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var row = btn.parentElement, open = !row.classList.contains('is-open');
      row.classList.toggle('is-open', open);
      btn.setAttribute('aria-expanded', String(open));
      track('gen_toggle', { gen: btn.getAttribute('aria-controls') || '', open: open });
    });
  });

  /* 3. FAQ (NSL Accordion markup). */
  document.querySelectorAll('[data-bf-acc] .nsl-acc__head').forEach(function (head) {
    var item = head.parentElement, panel = item.querySelector('.nsl-acc__panel');
    function done(e) { if (e.target === panel && e.propertyName === 'height') panel.style.height = ''; }
    if (panel) panel.addEventListener('transitionend', done);
    head.addEventListener('click', function () {
      var open = !item.classList.contains('is-open');
      head.setAttribute('aria-expanded', String(open));
      if (!panel || reduce) { item.classList.toggle('is-open', open); return; }
      if (open) {
        item.classList.add('is-open');               // padding and visibility come back
        var h = panel.scrollHeight;                   // full height with padding
        panel.style.height = '0px';
        panel.offsetHeight;                           // commit the start frame
        panel.style.height = h + 'px';                // animate to content; reset to auto on transitionend
        track('faq_open', { q: head.textContent.trim() });
      } else {
        panel.style.height = panel.offsetHeight + 'px';
        panel.offsetHeight;
        item.classList.remove('is-open');
        panel.style.height = '0px';
      }
    });
  });

  /* 4. Rim light on the NSL mark: follows the cursor or finger, otherwise circles the contour by itself. */
  if (reduce) document.querySelectorAll('radialGradient[id^="spotIdle"] animate').forEach(function (a) { a.remove(); });
  document.querySelectorAll('[data-bf-hero]').forEach(function (hero) {
    var uses = hero.querySelectorAll('[data-bf-spot]');
    var grad = hero.querySelector('radialGradient[id^="spotMouse"], radialGradient[id^="spotTouch"]');
    var idle = hero.querySelector('radialGradient[id^="spotIdle"]');
    if (!uses.length || !grad || !idle) return;
    var svg = uses[0].ownerSVGElement, pt = svg.createSVGPoint(), raf = 0, last = null;
    function paint() {
      raf = 0; if (!last) return;
      var m = svg.getScreenCTM(); if (!m) return;
      pt.x = last.x; pt.y = last.y;
      var p = pt.matrixTransform(m.inverse());
      grad.setAttribute('cx', Math.round(p.x)); grad.setAttribute('cy', Math.round(p.y));
    }
    function on(e) {
      last = { x: e.clientX, y: e.clientY };
      uses.forEach(function (u) { u.setAttribute('stroke', 'url(#' + grad.id + ')'); });
      if (!raf) raf = requestAnimationFrame(paint);
    }
    function off() { last = null; uses.forEach(function (u) { u.setAttribute('stroke', 'url(#' + idle.id + ')'); }); }
    hero.addEventListener('pointermove', on);
    hero.addEventListener('pointerdown', on);
    hero.addEventListener('pointerleave', off);
    hero.addEventListener('pointercancel', off);
  });

  /* 5. Analytics stub: CustomEvent + dataLayer, same names as the hero package. */
  function track(name, data) {
    try {
      document.dispatchEvent(new CustomEvent('nsl-bf', { detail: Object.assign({ action: name }, data) }));
      (window.dataLayer = window.dataLayer || []).push(Object.assign({ event: 'bf_' + name }, data));
    } catch (e) {}
  }
  document.querySelectorAll('.bf-board .nsl-btn, .bf-board .nsl-pcard a').forEach(function (a) {
    a.addEventListener('click', function () { track('cta_click', { label: a.textContent.trim() }); });
  });
  track('view', { layout: mobileMQ.matches ? 'mobile' : 'desktop' });
})();
