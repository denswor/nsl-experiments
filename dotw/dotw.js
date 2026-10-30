/* Deal of the Week — left-edge banner prototype.
   Needs: React 18, ReactDOM 18, htm, NSL bundle (window.NSL).
   Usage: DOTW.mount(document.getElementById('app'), { auto: false }) */
(function () {
  var html = htm.bind(React.createElement);
  var useState = React.useState, useEffect = React.useEffect, useRef = React.useRef;
  var NSL = window.NSL;
  var ASSETS = '../assets/';

  /* ---------- Page backdrop: newserverlife.com home, first screen ---------- */
  function Site() {
    var nav = ['HARDWARE', 'CLOUD', 'COLOCATION', 'SOLUTIONS', 'WARRANTY', 'DELIVERY', 'FOR BUSINESS', 'FINANCING', 'ITAD', 'ABOUT US'];
    var chip = function (icon, text) {
      return html`<span class="chip"><${NSL.Icon} name=${icon} size=${16} />${text}</span>`;
    };
    var feature = function (icon, title, text) {
      return html`<div class="feature"><${NSL.Icon} name=${icon} size=${32} />
        <div><div class="feature__title">${title}</div><div class="feature__text">${text}</div></div></div>`;
    };
    return html`
      <div class="site">
        <${NSL.Header} nav=${nav} active="HARDWARE" online=${true} cartCount=${0}
          email="sales@newserverlife.com" phone="+1 (786) 755-8181" />
        <main class="hero">
          <section class="hero__text">
            <div class="chips">
              ${chip('nsl-gear', 'Flexible configurations')}
              ${chip('star', 'Great value for money')}
              ${chip('shield', 'Tested enterprise hardware')}
            </div>
            <h1>Refurbished servers built for <span class="c-blue">value</span> & <span class="c-violet">reliability</span></h1>
            <p class="lead">Get <b>Enterprise-class performance</b> at a fraction of OEM prices. Fully stress-tested and custom-built to your exact workload requirements.</p>
            <div class="hero__ctas">
              <${NSL.Button} variant="primary" size="lg" iconLeft="nsl-gear">Configure a Server<//>
              <${NSL.Button} variant="primary-subtle" size="lg" iconLeft="nsl-user">Request Expert Help<//>
            </div>
          </section>
          <section class="hero__media">
            <img src=${ASSETS + 'hero-offers.webp'} alt="Stack of Dell PowerEdge servers wrapped in a Special Offer ribbon" />
            <div class="ratings">
              <div class="rating"><span class="rating__mark rating__mark--tp"><${NSL.Icon} name="star" size=${30} /></span>
                <div><div class="rating__name">Trustpilot Rating</div><div class="rating__val rating__val--tp">4.7 ★★★★★</div><div class="rating__sub">See all our reviews</div></div></div>
              <div class="rating"><span class="rating__mark rating__mark--g">G</span>
                <div><div class="rating__name">Google Rating</div><div class="rating__val rating__val--g">4.9 ★★★★★</div><div class="rating__sub">See all our reviews</div></div></div>
            </div>
          </section>
        </main>
        <div class="features">
          ${feature('shield', 'Up to 5 Years of Warranty', '1 year free. Paid extensions available.')}
          ${feature('sliders', 'Flexible Configs', 'CPU, RAM & Storage custom built to your workload.')}
          ${feature('check-circle', 'Proven Quality', 'Rigorous stress-testing and refurbishment process.')}
        </div>
        <${CookieBanner} />
        <div class="chat">
          <div class="chat__bubble">Got any questions? I'm happy to help.</div>
          <button type="button" class="chat__btn" aria-label="Open chat"><${NSL.Icon} name="message-square" size=${24} /></button>
        </div>
      </div>`;
  }

  function CookieBanner() {
    var s = useState(true); var shown = s[0], setShown = s[1];
    if (!shown) return null;
    return html`
      <div class="cookie" role="region" aria-label="Cookie notice">
        <div class="cookie__head"><div class="cookie__title">Your privacy</div>
          <${NSL.CloseButton} label="Close cookie notice" onClick=${function () { setShown(false); }} /></div>
        <p>We use cookies to improve your experience according to our <a href="#">Cookie Policy</a>.</p>
        <div><${NSL.Button} variant="primary" size="md" onClick=${function () { setShown(false); }}>Accept all cookies<//></div>
      </div>`;
  }

  /* ---------- The banner ---------- */

  /* Animated flame. The body morphs between three shapes (SMIL <animate> on "d"),
     the light core morphs on a faster rhythm, and three small tongues break off the tips,
     rise and fade out (CSS). Reduced motion: static shape, no tongues. */
  var REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var BODY = [
    'M12 29C6.6 29 4 25.4 4 21.4C4 16.4 8 13.9 9.4 9.2C10.2 11.7 11 12.8 12.4 13.6C12.4 9.6 13.6 5.4 16.2 2.2C15.6 7.6 20 11.2 20 19.2C20 25.2 17 29 12 29Z',
    'M12 29C6.6 29 4 25.4 4 21.4C4 16.8 7.4 13.2 8.2 8.2C9.6 11.2 10.7 12.2 12.2 12.8C12.9 8.6 14.6 4.8 17.8 1.6C16.2 7.4 20.6 11.6 20 19.2C20 25.2 17 29 12 29Z',
    'M12 29C6.6 29 4 25.4 4 21.4C4 15.8 8.6 14.2 10.6 10.2C11 12.2 11.6 13.2 12.8 14.2C12 10.2 12.4 6.6 14.4 3.2C15.2 8.6 20 10.8 20 19.2C20 25.2 17 29 12 29Z'
  ];
  var CORE = [
    'M12 28C9.6 28 8 26.2 8 24C8 21.4 10 20 11 17.4C12 19.4 16 21 16 24C16 26.2 14.4 28 12 28Z',
    'M12 28C9.6 28 8 26.2 8 24C8 20.9 9.6 19.4 10.4 16.4C12.6 19 16 20.9 16 24C16 26.2 14.4 28 12 28Z',
    'M12 28C9.6 28 8 26.2 8 24C8 21.9 10.6 20.4 12.2 17.9C12.6 19.8 16 21.4 16 24C16 26.2 14.4 28 12 28Z'
  ];
  var TONGUE = 'M0 -3.6C1.5 -1.4 2.1 0 2.1 1A2.1 2.1 0 0 1 -2.1 1C-2.1 0 -1.5 -1.4 0 -3.6Z';
  var SPLINES = '.45 0 .55 1;.45 0 .55 1;.45 0 .55 1';
  function loop(a) { return [a[0], a[1], a[2], a[0]].join(';'); }
  var FlameIcon = html`<svg class="flame" aria-hidden="true" width="24" height="30" viewBox="0 0 24 30">
    ${REDUCED ? null : html`<g>
      <g transform="translate(16.4 4.5)"><path class="flame__tongue flame__tongue--1" fill="currentColor" d=${TONGUE}></path></g>
      <g transform="translate(9.2 8.5)"><path class="flame__tongue flame__tongue--2" fill="currentColor" d=${TONGUE}></path></g>
      <g transform="translate(13.4 6.5)"><path class="flame__tongue flame__tongue--3" fill="currentColor" d=${TONGUE}></path></g>
    </g>`}
    <path fill="currentColor" d=${BODY[0]}>
      ${REDUCED ? null : html`<animate attributeName="d" dur="1.7s" repeatCount="indefinite" calcMode="spline" keyTimes="0;.33;.66;1" keySplines=${SPLINES} values=${loop(BODY)} />`}
    </path>
    <path fill="#ffffff" opacity=".55" d=${CORE[0]}>
      ${REDUCED ? null : html`<animate attributeName="d" dur="1.1s" repeatCount="indefinite" calcMode="spline" keyTimes="0;.33;.66;1" keySplines=${SPLINES} values=${loop(CORE)} />`}
    </path>
  </svg>`;

  /* "Hide until the next deal": a flag keyed by the deal's id, not by a 7-day timer —
     when marketing publishes a new Deal of the Week with a new id, the banner comes back by itself. */
  var STORE_KEY = 'nsl_dotw_hidden';
  function readHidden() { try { return localStorage.getItem(STORE_KEY); } catch (e) { return null; } }
  function writeHidden(id) { try { if (id) localStorage.setItem(STORE_KEY, id); else localStorage.removeItem(STORE_KEY); } catch (e) {} }
  var AUTO_HIDE_MS = 3500;

  function DotwBanner(props) {
    var auto = !!props.auto;
    var delay = props.delay || 2500;
    var dealId = props.dealId || '2026-w44-r640';
    if (/[?&]reset\b/.test(location.search) && readHidden() === dealId) writeHidden(null);
    var s0 = useState(readHidden() === dealId); var gone = s0[0], setGone = s0[1];
    var s1 = useState(auto ? false : !!props.startOpen); var open = s1[0], setOpen = s1[1];
    var s2 = useState(!auto); var started = s2[0], setStarted = s2[1];
    var s3 = useState(false); var counting = s3[0], setCounting = s3[1];
    var s4 = useState(false); var sent = s4[0], setSent = s4[1];
    var s5 = useState(''); var email = s5[0], setEmail = s5[1];
    var s6 = useState(''); var err = s6[0], setErr = s6[1];
    var timer = useRef(null), hideTimer = useRef(null);

    useEffect(function () {
      if (!auto || gone) return;
      timer.current = setTimeout(function () { setStarted(true); setOpen(true); setCounting(true); }, delay);
      return function () { clearTimeout(timer.current); clearTimeout(hideTimer.current); };
    }, []);

    function toggle() { clearTimeout(timer.current); setStarted(true); setCounting(false); setOpen(!open); }
    function hideForWeek() {
      clearTimeout(timer.current); clearTimeout(hideTimer.current);
      writeHidden(dealId); setStarted(true); setCounting(false); setOpen(false); setGone(true);
    }
    function send(e) {
      if (e) e.preventDefault();
      if (!/^\S+@\S+\.\S+$/.test(email)) { setErr('Enter a valid email'); return; }
      setErr(''); setSent(true); setCounting(false);
      hideTimer.current = setTimeout(hideForWeek, AUTO_HIDE_MS);
    }
    function resetDemo() { writeHidden(null); setSent(false); setEmail(''); setGone(false); setStarted(true); setOpen(false); }

    var state = gone ? 'is-gone' : (open ? 'is-open' : (started ? 'is-closed' : 'is-pre'));

    return html`
      <${React.Fragment}>
      <div class=${'dotw ' + state} aria-hidden=${gone ? true : undefined}>
        <aside class="dotw__panel" aria-label="Deal of the Week" aria-hidden=${!open} inert=${open ? undefined : ''}
          onFocus=${function () { if (counting) setCounting(false); }}>
          <div class="dotw__bg" aria-hidden="true"></div>
          <div class="dotw__close"><${NSL.CloseButton} label="Hide deal" onClick=${toggle} /></div>
          <div class="dotw__deal dotw__in" style=${{ '--i': 0 }}>DEAL</div>
          <div class="dotw__week dotw__in" style=${{ '--i': 1 }}>of the Week</div>
          <div class="dotw__img">
            <img src=${ASSETS + 'r640-crop.webp'} alt="Dell PowerEdge R640, front panel close-up" />
            <span class="dotw__shine" aria-hidden="true"></span>
          </div>
          <h2 class="dotw__model dotw__in" style=${{ '--i': 3 }}>DELL PowerEdge R640</h2>
          <p class="dotw__tagline dotw__in" style=${{ '--i': 4 }}>One compact server.<br />Any workload.</p>
          <p class="dotw__uses dotw__in" style=${{ '--i': 5 }}>Virtualization · Databases · Cloud Apps</p>
          ${sent
            ? html`<div class="dotw__done dotw__in" role="status" style=${{ '--i': 6 }}>
                <span class="dotw__done-icon"><${NSL.Icon} name="check-circle" size=${24} /></span>
                <div><div class="dotw__done-title">Deal claimed</div>
                <div class="dotw__done-text">Check your inbox: the R640 offer and spec are on their way. We'll tuck this banner away until next week's deal.</div></div></div>`
            : html`<form class="dotw__form dotw__in" style=${{ '--i': 6 }} onSubmit=${send} noValidate>
                <${NSL.Input} type="email" aria-label="Your email" placeholder="Your email" iconLeft="mail" size="lg"
                  value=${email} onValueChange=${setEmail} error=${err || undefined} />
                <${NSL.Button} type="submit" variant="primary" size="lg" fullWidth=${true} iconLeft="tag">Claim the Deal<//>
                <span class="dotw__note">We'll email you this week's price and the full spec.</span>
                <button type="button" class="nsl-link nsl-link--dashed dotw__dismiss" onClick=${hideForWeek}>
                  <span class="nsl-link__label">Not interested this week</span>
                </button>
              </form>`}
          ${counting && open ? html`<div class="dotw__timer" aria-hidden="true">
              <div class="dotw__timer-bar" onAnimationEnd=${function () { setCounting(false); setOpen(false); }}></div></div>` : null}
        </aside>
        <button type="button" class=${'dotw__tab' + (open ? '' : ' dotw__tab--idle')} aria-expanded=${open}
          aria-label="Deal of the Week" onClick=${toggle} tabIndex=${gone ? -1 : undefined}>
          ${FlameIcon}
          <span class="dotw__tab-label">Deal of the Week</span>
        </button>
      </div>
      ${gone ? html`<div class="dotw-demo" role="note">Deal of the Week is hidden until the next deal.
        <button type="button" class="nsl-link nsl-link--dashed" onClick=${resetDemo}><span class="nsl-link__label">Show it again (demo)</span></button></div>` : null}
      <//>`;
  }

  window.DOTW = {
    mount: function (el, opts) {
      opts = opts || {};
      ReactDOM.createRoot(el).render(html`<${React.Fragment}><${Site} /><${DotwBanner} ...${opts} /><//>`);
    }
  };
})();
