/* Black Friday landing demo · interactions (vanilla, no dependencies) */
(function () {
  var body = document.body, board = document.querySelector('.bf-board');
  var W = +body.getAttribute('data-bf-width');
  var isMobile = W < 720;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* 1. Desktop page on a phone → mobile page (only when opened directly, not inside the review shell). */
  if (!isMobile && window.top === window.self && document.documentElement.clientWidth < 720 && !/[?&]stay\b/.test(location.search)) {
    location.replace('mobile.html' + location.hash); return;
  }

  /* 2. The layout is full width. Only below the 1170 container + margins (1230) is the desktop page scaled down. */
  var MIN = 1230;
  function fit() {
    if (isMobile) return;
    var vw = document.documentElement.clientWidth;
    board.style.zoom = vw < MIN ? String(vw / MIN) : '';
  }
  fit(); window.addEventListener('resize', fit);

  /* 3. Generation rows: toggle open/closed. */
  document.querySelectorAll('[data-bf-toggle]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var row = btn.parentElement, open = !row.classList.contains('is-open');
      row.classList.toggle('is-open', open);
      btn.setAttribute('aria-expanded', String(open));
      track('gen_toggle', { gen: (btn.getAttribute('aria-controls') || '').replace(/\D/g, ''), open: open });
    });
  });

  /* 4. FAQ (NSL Accordion markup). */
  document.querySelectorAll('[data-bf-acc] .nsl-acc__head').forEach(function (head) {
    head.addEventListener('click', function () {
      var item = head.parentElement, open = !item.classList.contains('is-open');
      item.classList.toggle('is-open', open);
      head.setAttribute('aria-expanded', String(open));
      if (open) track('faq_open', { q: head.textContent.trim() });
    });
  });

  /* 5. Rim light on the NSL mark: follows the cursor or finger, otherwise circles the contour by itself. */
  var hero = document.querySelector('[data-bf-hero]');
  var uses = hero ? hero.querySelectorAll('[data-bf-spot]') : [];
  var grad = document.getElementById('spotMouse') || document.getElementById('spotTouch');
  if (reduce) document.querySelectorAll('#spotIdle animate').forEach(function (a) { a.remove(); });
  if (hero && uses.length && grad) {
    var svg = uses[0].ownerSVGElement, pt = svg.createSVGPoint(), raf = 0, last = null;
    var paint = function () {
      raf = 0; if (!last) return;
      var m = svg.getScreenCTM(); if (!m) return;
      pt.x = last.x; pt.y = last.y;
      var p = pt.matrixTransform(m.inverse());
      grad.setAttribute('cx', Math.round(p.x)); grad.setAttribute('cy', Math.round(p.y));
    };
    var on = function (e) {
      last = { x: e.clientX, y: e.clientY };
      uses.forEach(function (u) { u.setAttribute('stroke', 'url(#' + grad.id + ')'); });
      if (!raf) raf = requestAnimationFrame(paint);
    };
    var off = function () { last = null; uses.forEach(function (u) { u.setAttribute('stroke', 'url(#spotIdle)'); }); };
    hero.addEventListener('pointermove', on);
    hero.addEventListener('pointerdown', on);
    hero.addEventListener('pointerleave', off);
    hero.addEventListener('pointercancel', off);
  }

  /* 6. Analytics stub: CustomEvent + dataLayer, same names as the hero package. */
  function track(name, data) {
    try {
      document.dispatchEvent(new CustomEvent('nsl-bf', { detail: Object.assign({ action: name }, data) }));
      (window.dataLayer = window.dataLayer || []).push(Object.assign({ event: 'bf_' + name }, data));
    } catch (e) {}
  }
  document.querySelectorAll('.bf-board .nsl-btn, .bf-board .nsl-pcard a').forEach(function (a) {
    a.addEventListener('click', function () { track('cta_click', { label: a.textContent.trim() }); });
  });
  track('view', { layout: isMobile ? 'mobile' : 'desktop' });
})();
