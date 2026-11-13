/*! nsl-bf-landing v1.0.0 */
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

  /* 4. Rim light on the NSL mark: follows the cursor or finger, otherwise circles the contour by itself.
     Safari does not repaint a stroke when the gradient it uses changes (neither SMIL nor setAttribute,
     and not at all through <use>). So the light is rebuilt as geometry: a soft radial "dot" that moves
     under a mask cut from the mark's outline. Moving a circle repaints everywhere, Safari included. */
  var NS = 'http://www.w3.org/2000/svg', uid = 0, spots = [], kfCache = {};
  function keyframes(g) {
    if (kfCache[g.id]) return kfCache[g.id];
    var k = { cx: null, cy: null, dur: 9000, x: +g.getAttribute('cx') || 230, y: +g.getAttribute('cy') || 340, r: +g.getAttribute('r') || 210, stops: [] };
    g.querySelectorAll('animate').forEach(function (a) {
      k[a.getAttribute('attributeName')] = a.getAttribute('values').split(';').map(Number);
      k.dur = parseFloat(a.getAttribute('dur')) * 1000 || k.dur;
    });
    g.querySelectorAll('stop').forEach(function (s) { k.stops.push([s.getAttribute('offset') || '0', s.getAttribute('stop-color'), s.getAttribute('stop-opacity')]); });
    return (kfCache[g.id] = k);
  }
  function el(tag, attrs) { var e = document.createElementNS(NS, tag); for (var k in attrs) e.setAttribute(k, attrs[k]); return e; }
  document.querySelectorAll('svg').forEach(function (svg) {
    var uses = [].filter.call(svg.querySelectorAll('use'), function (u) { return /^url\(#spot/.test(u.getAttribute('stroke') || ''); });
    if (!uses.length) return;
    var gid = uses[0].getAttribute('stroke').slice(5, -1).replace(/^spot(Mouse|Touch)/, 'spotIdle');
    var g = document.getElementById(gid), mk = document.getElementById((uses[0].getAttribute('href') || '').slice(1));
    if (!g || !mk) return;
    var k = keyframes(g), n = ++uid, d = mk.getAttribute('d');
    var defs = el('defs', {});
    var dot = el('radialGradient', { id: 'bfDot' + n });
    k.stops.forEach(function (s) { var st = el('stop', { offset: s[0], 'stop-color': s[1] }); if (s[2] != null) st.setAttribute('stop-opacity', s[2]); dot.appendChild(st); });
    var mask = el('mask', { id: 'bfMask' + n, maskUnits: 'userSpaceOnUse', x: -300, y: -300, width: 1100, height: 1300 });
    uses.forEach(function (u) {
      var p = el('path', { d: d, fill: 'none', stroke: '#fff', 'stroke-width': u.getAttribute('stroke-width') || 3 });
      if (u.getAttribute('filter')) p.setAttribute('filter', u.getAttribute('filter'));
      mask.appendChild(p);
    });
    defs.appendChild(dot); defs.appendChild(mask); svg.insertBefore(defs, svg.firstChild);
    var grp = el('g', { mask: 'url(#bfMask' + n + ')' });
    var c = el('circle', { cx: k.x, cy: k.y, r: k.r, fill: 'url(#bfDot' + n + ')' });
    grp.appendChild(c);
    uses[0].parentNode.insertBefore(grp, uses[0]);
    uses.forEach(function (u) { u.remove(); });
    spots.push({ svg: svg, c: c, k: k, follow: null });
  });
  document.querySelectorAll('radialGradient[id^="spotIdle"] animate').forEach(function (a) { a.remove(); });
  function lerpVals(v, t) {                 // values spread evenly over the loop, linear like calcMode="linear"
    var n = v.length - 1, x = t * n, i = Math.min(Math.floor(x), n - 1), f = x - i;
    return v[i] + (v[i + 1] - v[i]) * f;
  }
  if (spots.length) {
    var t0 = performance.now();
    (function tick(now) {
      if (!document.hidden) spots.forEach(function (s) {
        var x, y;
        if (s.follow) { x = s.follow.x; y = s.follow.y; }
        else if (!reduce && s.k.cx && s.k.cy) {
          var t = (((now - t0) % s.k.dur + s.k.dur) % s.k.dur) / s.k.dur;   // rAF time can be a hair before t0
          x = lerpVals(s.k.cx, t); y = lerpVals(s.k.cy, t);
        } else return;
        s.c.setAttribute('cx', x.toFixed(1)); s.c.setAttribute('cy', y.toFixed(1));
      });
      requestAnimationFrame(tick);
    })(t0);
  }
  document.querySelectorAll('[data-bf-hero]').forEach(function (hero) {
    var own = spots.filter(function (s) { return hero.contains(s.svg); });
    if (!own.length) return;
    function on(e) {
      own.forEach(function (s) {
        var m = s.svg.getScreenCTM(); if (!m) return;
        var pt = s.svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
        var p = pt.matrixTransform(m.inverse());
        s.follow = { x: p.x, y: p.y };
      });
    }
    function off() { own.forEach(function (s) { s.follow = null; }); }
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
