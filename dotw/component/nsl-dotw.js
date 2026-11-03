/*!
 * nsl-dotw v1.1.1 — "Deal of the Week" left-edge banner for newserverlife.com
 * No dependencies. ES2017. Styles are isolated in a Shadow DOM attached to a plain container.
 * Built on NSL Design System tokens (values inlined below).
 *
 *   <div id="nsl-dotw"></div>
 *   <script src="/local/templates/nsl/js/nsl-dotw.js" defer></script>
 *   <script>
 *     document.addEventListener('DOMContentLoaded', function () {
 *       NSLDotw.mount('#nsl-dotw', { dealId: '2026-w44-r640', title: 'DELL PowerEdge R640', image: { src: '…' }, endpoint: '/ajax/dotw-claim.php' });
 *     });
 *   </script>
 */
(function (global) {
  'use strict';

  var VERSION = '1.1.1';
  var STORAGE_KEY = 'nsl_dotw_hidden';

  var DEFAULTS = {
    dealId: '',                 // required. Changing it (new deal) shows the banner again to everyone who hid it.
    title: '',                  // "DELL PowerEdge R640"
    tagline: ['One compact server.', 'Any workload.'], // string or array of lines
    uses: '',                   // "Virtualization · Databases · Cloud Apps" (optional)
    badge: '',                  // "−20% OFF" (optional): swaying discount badge over the server image
    image: null,                // { src, alt } — transparent PNG/WebP, same origin (the glint uses it as a CSS mask)
    endpoint: '',               // POST URL. Empty + no `submit` = demo mode (always succeeds)
    encoding: 'form',           // 'form' (x-www-form-urlencoded, Bitrix-friendly) or 'json'
    extraFields: null,          // e.g. { sessid: BX.bitrix_sessid() }
    submit: null,               // async function (payload) { … } — overrides `endpoint`; throw to show an error
    privacyUrl: '',             // adds "By claiming the deal you agree to our Privacy Policy." under the button
    autoOpen: false,            // false | ms after mount (e.g. 2500). Auto-opens once per deal; then folds into the tab
    autoCollapse: 8000,         // ms the auto-opened banner stays before folding (paused on hover, cancelled on focus)
    hideAfterClaim: 3500,       // ms the success message stays before the banner hides until the next deal
    offsetTop: 136,             // px from the viewport top on desktop (below the sticky header)
    offsetTopMobile: 64,        // px on phones (≤ 480px)
    zIndex: 1000,
    shadow: true,               // false = render into the light DOM (same BEM classes) if you want to restyle from outside
    storage: true,              // remember "hidden for this deal" in localStorage
    onEvent: null,              // function (type, detail) — also dispatched as `nsl-dotw` CustomEvent on the container and pushed to dataLayer
    labels: {
      deal: 'DEAL',
      ofTheWeek: 'of the Week',
      tab: 'Deal of the Week',
      region: 'Deal of the Week',
      close: 'Hide deal',
      emailLabel: 'Your email',
      emailPlaceholder: 'Your email',
      cta: 'Claim the Deal',
      sending: 'Sending…',
      note: "We'll email you this week's price and the full spec.",
      privacy: 'By claiming the deal you agree to our {link}.',
      privacyLink: 'Privacy Policy',
      dismiss: 'Not interested this week',
      errorEmail: 'Enter a valid email',
      errorSubmit: "Couldn't send. Please try again.",
      successTitle: 'Deal claimed',
      successText: "Check your inbox: the offer and spec are on their way. We'll tuck this banner away until next week's deal."
    }
  };

  /* ------------------------------------------------------------------ styles */
  var CSS = `
:host { all: initial; }
.nsl-dotw, .nsl-dotw * { box-sizing: border-box; }
.nsl-dotw {
  --c-brand: #b91f69; --c-brand-hover: #db1f79; --c-brand-active: #9b1a58; --c-focus: #f77fb8;
  --c-text: #18304c; --c-text-2: #6b7280; --c-on-brand: #ffffff;
  --c-bg: #ffffff; --c-muted: #f3f4f6; --c-panel: #e1efff; --c-panel-2: #b9daff;
  --c-border: #e5e7eb; --c-border-strong: #6b7280; --c-error: #dc2626; --c-error-bg: #fee2e2;
  --c-success: #10b981;
  --f-sans: "IBM Plex Sans", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  --f-mono: "IBM Plex Mono", ui-monospace, "SF Mono", Menlo, monospace;
  --radius: 8px; --focus: 0 0 0 3px var(--c-focus);
  --w: 400px;
  position: fixed; left: 0; top: var(--nsl-dotw-top, 136px); z-index: var(--nsl-dotw-z, 1000);
  width: var(--w);
  font: 400 16px/24px var(--f-sans); color: var(--c-text); text-align: left; letter-spacing: normal;
  -webkit-font-smoothing: antialiased;
  filter: drop-shadow(0 16px 32px rgba(24, 48, 76, .18)) drop-shadow(0 2px 6px rgba(24, 48, 76, .08));
  transition: transform .38s cubic-bezier(.2, .8, .2, 1);
}
/* zero-specificity resets so component rules always win */
:where(.nsl-dotw) button, :where(.nsl-dotw) input { font: inherit; color: inherit; margin: 0; }
.nsl-dotw svg { display: block; flex: none; }
.nsl-dotw--open { transform: translateX(0); transition: transform .62s cubic-bezier(.34, 1.3, .5, 1); }
.nsl-dotw--closed { transform: translateX(-100%); transition: transform .5s cubic-bezier(.6, 0, .8, .35); }
.nsl-dotw--pre { transform: translateX(calc(-100% - 60px)); transition: none; }
.nsl-dotw--gone { transform: translateX(calc(-100% - 60px)); transition: transform .6s cubic-bezier(.6, 0, .8, .35); pointer-events: none; }

/* panel */
.nsl-dotw__panel { position: relative; width: var(--w); padding: 28px 32px 32px; display: flex; flex-direction: column; outline: none; }
.nsl-dotw__bg { position: absolute; inset: 0; background: var(--c-panel); border-radius: 0 8px 8px 0; z-index: 0; }
.nsl-dotw__panel > :not(.nsl-dotw__bg) { z-index: 1; }
.nsl-dotw__panel > :not(.nsl-dotw__bg):not(.nsl-dotw__close):not(.nsl-dotw__timer):not(.nsl-dotw__badge) { position: relative; }
.nsl-dotw__panel > .nsl-dotw__badge { z-index: 3; }
.nsl-dotw__panel > .nsl-dotw__close { z-index: 2; }

.nsl-dotw__close { position: absolute; right: 16px; top: 16px; width: 32px; height: 32px; padding: 0; border: 0; border-radius: var(--radius);
  background: transparent; color: var(--c-text); display: inline-flex; align-items: center; justify-content: center; cursor: pointer; }
.nsl-dotw__close:hover { background: var(--c-muted); }
.nsl-dotw__close:focus-visible { outline: none; box-shadow: var(--focus); }

.nsl-dotw__title { display: flex; flex-direction: column; margin: 0; }
.nsl-dotw__deal { font-weight: 700; font-size: 84px; line-height: 76px; letter-spacing: -3px; }
.nsl-dotw__week { font-weight: 600; font-size: 40px; line-height: 48px; letter-spacing: -.5px; }
.nsl-dotw__media { width: 444px; margin: 12px 0 8px -32px; }
.nsl-dotw__img { display: block; width: 100%; height: auto; border: 0; }
.nsl-dotw__shine { position: absolute; inset: 0; pointer-events: none; opacity: 0; mix-blend-mode: screen;
  -webkit-mask: var(--nsl-dotw-mask) center / 100% 100% no-repeat; mask: var(--nsl-dotw-mask) center / 100% 100% no-repeat;
  background: linear-gradient(105deg, rgba(255,255,255,0) 42%, rgba(255,255,255,.75) 50%, rgba(255,255,255,0) 58%);
  background-size: 250% 100%; background-position: 100% 0; }
.nsl-dotw__badge { position: absolute; right: 12px; top: 160px; margin: 0; padding: 10px 20px; border-radius: 999px; background: var(--c-bg); color: var(--c-brand);
  font: 700 26px/32px var(--f-mono); letter-spacing: .5px; white-space: nowrap; pointer-events: none;
  box-shadow: 0 6px 16px rgba(24, 48, 76, .14), 0 1px 3px rgba(24, 48, 76, .08); rotate: -8deg; }
.nsl-dotw__model { margin: 0; font-weight: 700; font-size: 30px; line-height: 36px; }
.nsl-dotw__tagline { margin: 10px 0 0; font-weight: 600; font-size: 22px; line-height: 28px; }
.nsl-dotw__uses { margin: 10px 0 0; font-size: 17px; line-height: 24px; }

/* form */
.nsl-dotw__form { display: flex; flex-direction: column; gap: 10px; margin: 24px 0 0; }
.nsl-dotw__field { display: flex; align-items: center; gap: 8px; height: 56px; padding: 0 16px; background: var(--c-bg);
  border: 1px solid var(--c-border); border-radius: var(--radius); color: var(--c-text-2); transition: border-color .12s, box-shadow .12s; }
.nsl-dotw__field:hover { border-color: var(--c-border-strong); }
.nsl-dotw__field:focus-within { border: 1.5px solid var(--c-brand); box-shadow: var(--focus); color: var(--c-brand); }
.nsl-dotw__field--error { border-color: var(--c-error); color: var(--c-error); }
.nsl-dotw__field--error:focus-within { border-color: var(--c-error); box-shadow: 0 0 0 3px var(--c-error-bg); color: var(--c-error); }
.nsl-dotw__input { flex: 1; min-width: 0; height: 100%; border: 0; outline: 0; background: transparent; padding: 0; font: 400 16px/24px var(--f-sans); color: var(--c-text); }
.nsl-dotw__input::placeholder { color: var(--c-text-2); opacity: 1; }
.nsl-dotw__error { margin: -4px 0 0; font: 400 12px/16px var(--f-sans); color: var(--c-error); }
.nsl-dotw__error:empty { display: none; }
.nsl-dotw__cta { display: inline-flex; align-items: center; justify-content: center; gap: 8px; width: 100%; height: 56px; padding: 0 24px;
  border: 1.5px solid transparent; border-radius: var(--radius); background: var(--c-brand); color: var(--c-on-brand);
  font: 600 16px/24px var(--f-sans); white-space: nowrap; cursor: pointer; transition: background-color .12s, box-shadow .12s; }
.nsl-dotw__cta:hover { background: var(--c-brand-hover); }
.nsl-dotw__cta:active { background: var(--c-brand-active); }
.nsl-dotw__cta:focus-visible { outline: none; box-shadow: var(--focus); }
.nsl-dotw__cta[aria-busy="true"] { cursor: progress; opacity: .8; }
.nsl-dotw__note { margin: 0; font: 400 12px/16px var(--f-sans); color: var(--c-text-2); }
.nsl-dotw__note a { color: inherit; text-decoration: underline; text-underline-offset: 2px; }
.nsl-dotw__dismiss { align-self: flex-start; margin-top: 6px; padding: 0; border: 0; background: none; cursor: pointer;
  font: 400 14px/20px var(--f-sans); color: var(--c-text-2);
  text-decoration: underline dashed; text-underline-offset: 3px; }
.nsl-dotw__dismiss:hover { color: var(--c-text); }
.nsl-dotw__dismiss:focus-visible { outline: 2px solid var(--c-focus); outline-offset: 2px; border-radius: 2px; }
.nsl-dotw__hp { position: absolute !important; left: -9999px; width: 1px; height: 1px; opacity: 0; }
.nsl-dotw__sr { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; }

.nsl-dotw__done { display: flex; gap: 12px; align-items: flex-start; margin-top: 24px; padding: 16px; background: var(--c-bg); border-radius: var(--radius); }
.nsl-dotw__done[hidden], .nsl-dotw__form[hidden] { display: none; }
.nsl-dotw__done-icon { color: var(--c-success); }
.nsl-dotw__done-title { font: 600 16px/24px var(--f-sans); }
.nsl-dotw__done-text { font: 400 14px/20px var(--f-sans); color: var(--c-text-2); }

.nsl-dotw__timer { position: absolute; left: 0; right: 0; bottom: 0; height: 4px; overflow: hidden; background: var(--c-panel-2); border-radius: 0 0 8px 0; display: none; }
.nsl-dotw--counting .nsl-dotw__timer { display: block; }
.nsl-dotw__timer-bar { height: 4px; background: var(--c-brand); transform-origin: left center; }
.nsl-dotw--counting .nsl-dotw__timer-bar { animation: nslDotwCountdown var(--nsl-dotw-autocollapse, 8s) linear forwards; }
.nsl-dotw__panel:hover .nsl-dotw__timer-bar { animation-play-state: paused; }

/* tab */
.nsl-dotw__tab { position: absolute; left: 100%; top: 270px; width: 44px; padding: 24px 0; border: 0; border-radius: 0 12px 12px 0;
  background: var(--c-panel); color: var(--c-brand); display: flex; flex-direction: column; align-items: center; gap: 10px; cursor: pointer; }
.nsl-dotw__tab::after { content: ''; position: absolute; inset: 0; border-radius: inherit; pointer-events: none;
  background: linear-gradient(to left, var(--c-panel-2), rgba(185, 218, 255, 0)); opacity: 0; transition: opacity .2s ease; }
.nsl-dotw__tab:hover::after { opacity: 1; }
.nsl-dotw__tab > * { position: relative; z-index: 1; }
.nsl-dotw__tab:focus-visible { outline: none; box-shadow: var(--focus); }
.nsl-dotw__tab-label { writing-mode: vertical-rl; transform: rotate(180deg); font: 600 18px/20px var(--f-mono); white-space: nowrap; }
.nsl-dotw--closed .nsl-dotw__tab::before { content: ''; position: absolute; left: -24px; top: 0; bottom: 0; width: 24px; background: var(--c-panel); }

/* flame */
.nsl-dotw__flame { overflow: visible; }
.nsl-dotw__tongue { transform-box: fill-box; transform-origin: 50% 100%; opacity: 0; }
.nsl-dotw__tongue--1 { animation: nslDotwTongue1 1.6s ease-out infinite; }
.nsl-dotw__tongue--2 { animation: nslDotwTongue2 1.9s ease-out .55s infinite; }
.nsl-dotw__tongue--3 { animation: nslDotwTongue3 1.4s ease-out 1.05s infinite; }

/* motion: entrance cascade, exit trail, idle tug, glint */
.nsl-dotw__in { --i: 0; }
.nsl-dotw--open .nsl-dotw__in { animation: nslDotwIn .55s cubic-bezier(.25, 1.25, .5, 1) both; animation-delay: calc(140ms + var(--i) * 55ms); }
.nsl-dotw--open .nsl-dotw__media { animation: nslDotwImgIn .75s cubic-bezier(.2, 1.35, .4, 1) .22s both; }
.nsl-dotw--open .nsl-dotw__badge { animation: nslDotwBadgeIn .6s cubic-bezier(.3, 1.6, .5, 1) .55s both, nslDotwBadgeBob 1.7s cubic-bezier(.37, 0, .63, 1) 1.15s infinite alternate, nslDotwBadgeTilt 2.6s cubic-bezier(.37, 0, .63, 1) 1.15s infinite alternate; }
.nsl-dotw--closed .nsl-dotw__badge, .nsl-dotw--gone .nsl-dotw__badge { animation: nslDotwOut .2s cubic-bezier(.4, 0, .6, 1) both; }
.nsl-dotw--open .nsl-dotw__shine { opacity: 1; animation: nslDotwShine 5.5s cubic-bezier(.45, 0, .55, 1) 1.3s infinite; }
.nsl-dotw--closed .nsl-dotw__in, .nsl-dotw--gone .nsl-dotw__in { animation: nslDotwOut .34s cubic-bezier(.4, 0, .6, 1) both; animation-delay: calc((6 - var(--i)) * 28ms); }
.nsl-dotw--closed .nsl-dotw__close, .nsl-dotw--gone .nsl-dotw__close { animation: nslDotwOut .24s cubic-bezier(.4, 0, .6, 1) both; }
.nsl-dotw--closed .nsl-dotw__media, .nsl-dotw--gone .nsl-dotw__media { animation: nslDotwImgLag .6s cubic-bezier(.3, .6, .4, 1) both; }
.nsl-dotw--closed .nsl-dotw__tab { animation: nslDotwPullTab 7s cubic-bezier(.3, .7, .4, 1) 1.2s infinite; }
.nsl-dotw--closed .nsl-dotw__bg { animation: nslDotwPullBg 7s cubic-bezier(.3, .7, .4, 1) 1.32s infinite; }
.nsl-dotw--static .nsl-dotw__in, .nsl-dotw--static .nsl-dotw__close, .nsl-dotw--static .nsl-dotw__media { animation: none !important; }

@keyframes nslDotwIn { from { opacity: 0; transform: translateX(-28px); } to { opacity: 1; transform: none; } }
@keyframes nslDotwImgIn { from { opacity: 0; transform: translateX(-60px); } to { opacity: 1; transform: none; } }
@keyframes nslDotwOut { from { opacity: 1; transform: none; } to { opacity: 0; transform: translateX(40px); } }
@keyframes nslDotwImgLag { 0% { transform: none; } 35% { transform: translateX(34px); } 70% { transform: translateX(-4px); } 100% { transform: none; } }
@keyframes nslDotwShine { 0% { background-position: 100% 0; } 20%, 100% { background-position: 0% 0; } }
@keyframes nslDotwPullTab { 0% { transform: translateX(0); } 4.5% { transform: translateX(20px); } 7.5% { transform: translateX(-4px); } 10% { transform: translateX(7px); } 12.5% { transform: translateX(-1.5px); } 15%, 100% { transform: translateX(0); } }
@keyframes nslDotwPullBg { 0% { transform: translateX(0); } 5% { transform: translateX(13px); } 8.5% { transform: translateX(-2px); } 11% { transform: translateX(3px); } 14%, 100% { transform: translateX(0); } }
@keyframes nslDotwBadgeIn { from { opacity: 0; transform: translateY(10px) rotate(-22deg) scale(.5); } to { opacity: 1; transform: none; } }
/* "on the waves": bob and tilt run on different periods, so the motion never repeats exactly */
@keyframes nslDotwBadgeBob { from { translate: 0 2px; } to { translate: 0 -5px; } }
@keyframes nslDotwBadgeTilt { from { rotate: -13deg; } to { rotate: -3deg; } }
@keyframes nslDotwCountdown { from { transform: scaleX(1); } to { transform: scaleX(0); } }
@keyframes nslDotwTongue1 { 0% { transform: translate(0, 2px) scale(.6); opacity: 0; } 15% { opacity: 1; transform: translate(0, 0) scale(1); } 100% { transform: translate(2.5px, -11px) scale(.15) rotate(18deg); opacity: 0; } }
@keyframes nslDotwTongue2 { 0% { transform: translate(0, 2px) scale(.5); opacity: 0; } 18% { opacity: .9; transform: translate(0, 0) scale(.9); } 100% { transform: translate(-3px, -10px) scale(.1) rotate(-20deg); opacity: 0; } }
@keyframes nslDotwTongue3 { 0% { transform: translate(0, 2px) scale(.5); opacity: 0; } 12% { opacity: 1; transform: translate(0, 0) scale(.8); } 100% { transform: translate(.5px, -13px) scale(.1); opacity: 0; } }

/* short desktop screens */
@media (max-height: 820px) and (min-width: 481px) {
  .nsl-dotw { top: min(var(--nsl-dotw-top, 136px), 120px); }
  .nsl-dotw__panel { padding-top: 20px; padding-bottom: 24px; }
  .nsl-dotw__deal { font-size: 64px; line-height: 60px; }
  .nsl-dotw__week { font-size: 32px; line-height: 38px; }
  .nsl-dotw__badge { top: 128px; }
  .nsl-dotw__media { margin: 6px 0 4px -32px; }
  .nsl-dotw__tagline, .nsl-dotw__uses { margin-top: 6px; }
  .nsl-dotw__form { margin-top: 16px; }
}

/* phones */
@media (max-width: 480px) {
  .nsl-dotw { --w: calc(100vw - 44px); top: var(--nsl-dotw-top-mobile, 64px); }
  .nsl-dotw__panel { padding: 20px; }
  .nsl-dotw__close { right: 10px; top: 12px; }
  .nsl-dotw__title { flex-direction: row; align-items: baseline; gap: 8px; padding-right: 40px; }
  .nsl-dotw__deal { font-size: 44px; line-height: 44px; letter-spacing: -1.5px; }
  .nsl-dotw__week { font-size: 22px; line-height: 28px; letter-spacing: -.3px; }
  .nsl-dotw__media { width: calc(100% + 20px); margin: 10px 0 6px -20px; }
  .nsl-dotw__model { font-size: 22px; line-height: 28px; }
  .nsl-dotw__tagline { margin-top: 4px; font-size: 16px; line-height: 22px; }
  .nsl-dotw__tagline br { display: none; }
  .nsl-dotw__uses { margin-top: 4px; font-size: 14px; line-height: 20px; color: var(--c-text-2); }
  .nsl-dotw__form { gap: 8px; margin-top: 16px; }
  .nsl-dotw__field, .nsl-dotw__cta { height: 48px; }
  .nsl-dotw__done { margin-top: 16px; padding: 14px; }
  .nsl-dotw__tab { top: 112px; padding: 18px 0; }
  .nsl-dotw__tab-label { font-size: 16px; }
  .nsl-dotw__badge { top: 86px; right: 12px; padding: 6px 14px; font-size: 18px; line-height: 24px; }
  .nsl-dotw--closed .nsl-dotw__tab, .nsl-dotw--closed .nsl-dotw__bg { animation-iteration-count: 1; }
}

@media (prefers-reduced-motion: reduce) {
  .nsl-dotw, .nsl-dotw--open, .nsl-dotw--closed, .nsl-dotw--gone { transition: none; }
  .nsl-dotw *, .nsl-dotw *::before, .nsl-dotw *::after { animation: none !important; }
  .nsl-dotw--counting .nsl-dotw__timer-bar { animation: nslDotwCountdown var(--nsl-dotw-autocollapse, 8s) linear forwards !important; }
}
`;

  /* ------------------------------------------------------------------ icons (NSL set, Feather 1.5px) */
  function icon(paths, size, cls) {
    return '<svg' + (cls ? ' class="' + cls + '"' : '') + ' width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + paths + '</svg>';
  }
  var I = {
    x: '<path d="M18 6L6 18M6 6L18 18"/>',
    mail: '<path d="M22 6C22 4.9 21.1 4 20 4H4C2.9 4 2 4.9 2 6M22 6V18C22 19.1 21.1 20 20 20H4C2.9 20 2 19.1 2 18V6M22 6L12 13L2 6"/>',
    tag: '<path d="M7 7H7.01M20.59 13.41L13.42 20.58C13.2343 20.766 13.0137 20.9135 12.7709 21.0141C12.5281 21.1148 12.2678 21.1666 12.005 21.1666C11.7422 21.1666 11.4819 21.1148 11.2391 21.0141C10.9963 20.9135 10.7757 20.766 10.59 20.58L2 12V2H12L20.59 10.59C20.9625 10.9647 21.1716 11.4716 21.1716 12C21.1716 12.5284 20.9625 13.0353 20.59 13.41Z"/>',
    check: '<path d="M22 11.08V12C21.9988 14.1564 21.3005 16.2547 20.0093 17.9818C18.7182 19.709 16.9033 20.9725 14.8354 21.5839C12.7674 22.1953 10.5573 22.1219 8.53447 21.3746C6.51168 20.6273 4.78465 19.2461 3.61096 17.4371C2.43727 15.628 1.87979 13.4881 2.02168 11.3363C2.16356 9.18455 2.99721 7.13631 4.39828 5.49706C5.79935 3.85781 7.69279 2.71537 9.79619 2.24013C11.8996 1.7649 14.1003 1.98232 16.07 2.85999M22 4L12 14.01L9 11.01"/>'
  };

  /* Animated flame: body and core morph (SMIL), three small tongues break off and fade (CSS). */
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
  function flame(animate) {
    var spl = '.45 0 .55 1;.45 0 .55 1;.45 0 .55 1';
    var morph = function (a, dur) {
      return animate ? '<animate attributeName="d" dur="' + dur + '" repeatCount="indefinite" calcMode="spline" keyTimes="0;.33;.66;1" keySplines="' + spl + '" values="' + [a[0], a[1], a[2], a[0]].join(';') + '"/>' : '';
    };
    var tongues = animate ? [[16.4, 4.5, 1], [9.2, 8.5, 2], [13.4, 6.5, 3]].map(function (t) {
      return '<g transform="translate(' + t[0] + ' ' + t[1] + ')"><path class="nsl-dotw__tongue nsl-dotw__tongue--' + t[2] + '" fill="currentColor" d="' + TONGUE + '"/></g>';
    }).join('') : '';
    return '<svg class="nsl-dotw__flame" width="24" height="30" viewBox="0 0 24 30" aria-hidden="true" focusable="false">' + tongues +
      '<path fill="currentColor" d="' + BODY[0] + '">' + morph(BODY, '1.7s') + '</path>' +
      '<path fill="#ffffff" opacity=".55" d="' + CORE[0] + '">' + morph(CORE, '1.1s') + '</path></svg>';
  }

  /* ------------------------------------------------------------------ helpers */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function merge(base, extra) {
    var out = {}, k;
    for (k in base) out[k] = base[k];
    for (k in extra || {}) if (extra[k] !== undefined) out[k] = extra[k];
    out.labels = Object.assign({}, base.labels, (extra || {}).labels || {});
    return out;
  }
  function store(get, val) {
    try {
      if (get) return global.localStorage.getItem(STORAGE_KEY);
      if (val) global.localStorage.setItem(STORAGE_KEY, val); else global.localStorage.removeItem(STORAGE_KEY);
    } catch (e) { return null; }
  }
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  var uid = 0;

  /* ------------------------------------------------------------------ mount */
  function mount(target, options) {
    var host = typeof target === 'string' ? document.querySelector(target) : target;
    if (!host) throw new Error('NSLDotw: container not found');
    var o = merge(DEFAULTS, options);
    if (!o.dealId) throw new Error('NSLDotw: dealId is required');
    var L = o.labels;
    var reduced = global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var id = 'nsl-dotw-' + (++uid);

    if (o.storage && store(true) === o.dealId) { emit('skip', { reason: 'hidden-for-deal' }); return api(null); }

    var root = o.shadow && host.attachShadow ? (host.shadowRoot || host.attachShadow({ mode: 'open' })) : host;
    var lines = Array.isArray(o.tagline) ? o.tagline : String(o.tagline || '').split('\n');
    var tagline = lines.filter(Boolean).map(esc).join(' <br>');
    var privacy = o.privacyUrl ? ' ' + esc(L.privacy).replace('{link}', '<a href="' + esc(o.privacyUrl) + '" target="_blank" rel="noopener">' + esc(L.privacyLink) + '</a>') : '';

    root.innerHTML =
      '<style>' + CSS + '</style>' +
      '<div class="nsl-dotw nsl-dotw--pre nsl-dotw--static">' +
        '<aside class="nsl-dotw__panel" id="' + id + '-panel" role="region" aria-label="' + esc(L.region) + '" tabindex="-1">' +
          '<div class="nsl-dotw__bg"></div>' +
          '<button type="button" class="nsl-dotw__close" aria-label="' + esc(L.close) + '">' + icon(I.x, 20) + '</button>' +
          '<p class="nsl-dotw__title nsl-dotw__in" style="--i:0"><span class="nsl-dotw__deal">' + esc(L.deal) + '</span> <span class="nsl-dotw__week">' + esc(L.ofTheWeek) + '</span></p>' +
          (o.image && o.image.src ? '<div class="nsl-dotw__media"><img class="nsl-dotw__img" src="' + esc(o.image.src) + '" alt="' + esc(o.image.alt || o.title) + '" decoding="async"><span class="nsl-dotw__shine" aria-hidden="true"></span></div>' : '') +
          (o.badge ? '<p class="nsl-dotw__badge">' + esc(o.badge) + '</p>' : '') +
          (o.title ? '<h2 class="nsl-dotw__model nsl-dotw__in" style="--i:3">' + esc(o.title) + '</h2>' : '') +
          (tagline ? '<p class="nsl-dotw__tagline nsl-dotw__in" style="--i:4">' + tagline + '</p>' : '') +
          (o.uses ? '<p class="nsl-dotw__uses nsl-dotw__in" style="--i:5">' + esc(o.uses) + '</p>' : '') +
          '<form class="nsl-dotw__form nsl-dotw__in" style="--i:6" novalidate>' +
            '<label class="nsl-dotw__sr" for="' + id + '-email">' + esc(L.emailLabel) + '</label>' +
            '<div class="nsl-dotw__field">' + icon(I.mail, 20) +
              '<input class="nsl-dotw__input" id="' + id + '-email" name="email" type="email" inputmode="email" autocomplete="email" placeholder="' + esc(L.emailPlaceholder) + '" aria-describedby="' + id + '-error" required>' +
            '</div>' +
            '<input class="nsl-dotw__hp" name="website" type="text" tabindex="-1" autocomplete="off" aria-hidden="true">' +
            '<p class="nsl-dotw__error" id="' + id + '-error" aria-live="polite"></p>' +
            '<button type="submit" class="nsl-dotw__cta">' + icon(I.tag, 24) + '<span class="nsl-dotw__cta-label">' + esc(L.cta) + '</span></button>' +
            '<p class="nsl-dotw__note">' + esc(L.note) + privacy + '</p>' +
            '<button type="button" class="nsl-dotw__dismiss">' + esc(L.dismiss) + '</button>' +
          '</form>' +
          '<div class="nsl-dotw__done nsl-dotw__in" style="--i:6" role="status" hidden>' +
            '<span class="nsl-dotw__done-icon">' + icon(I.check, 24) + '</span>' +
            '<div><div class="nsl-dotw__done-title">' + esc(L.successTitle) + '</div><div class="nsl-dotw__done-text">' + esc(L.successText) + '</div></div>' +
          '</div>' +
          '<div class="nsl-dotw__timer" aria-hidden="true"><div class="nsl-dotw__timer-bar"></div></div>' +
        '</aside>' +
        '<button type="button" class="nsl-dotw__tab" aria-expanded="false" aria-controls="' + id + '-panel">' + flame(!reduced) +
          '<span class="nsl-dotw__tab-label">' + esc(L.tab) + '</span></button>' +
      '</div>';

    var $ = function (sel) { return root.querySelector(sel); };
    var el = $('.nsl-dotw'), panel = $('.nsl-dotw__panel'), tab = $('.nsl-dotw__tab'), form = $('.nsl-dotw__form'),
      input = $('.nsl-dotw__input'), field = $('.nsl-dotw__field'), err = $('.nsl-dotw__error'), cta = $('.nsl-dotw__cta'),
      ctaLabel = $('.nsl-dotw__cta-label'), done = $('.nsl-dotw__done'), bar = $('.nsl-dotw__timer-bar');

    el.style.setProperty('--nsl-dotw-top', o.offsetTop + 'px');
    el.style.setProperty('--nsl-dotw-top-mobile', o.offsetTopMobile + 'px');
    el.style.setProperty('--nsl-dotw-z', String(o.zIndex));
    el.style.setProperty('--nsl-dotw-autocollapse', (o.autoCollapse / 1000) + 's');
    if (o.image && o.image.src) el.style.setProperty('--nsl-dotw-mask', 'url("' + String(o.image.src).replace(/"/g, '%22') + '")');

    var state = 'pre', sent = false, autoTimer = 0, hideTimer = 0, destroyed = false;
    function active() { return root.activeElement !== undefined ? root.activeElement : document.activeElement; }

    function emit(type, detail) {
      detail = Object.assign({ dealId: o.dealId }, detail || {});
      try { if (typeof o.onEvent === 'function') o.onEvent(type, detail); } catch (e) {}
      try { host.dispatchEvent(new CustomEvent('nsl-dotw', { detail: Object.assign({ type: type }, detail), bubbles: true })); } catch (e) {}
      try { if (Array.isArray(global.dataLayer)) global.dataLayer.push(Object.assign({ event: 'dotw_' + type }, detail)); } catch (e) {}
    }
    function setState(next) {
      el.classList.remove('nsl-dotw--' + state);
      state = next;
      el.classList.add('nsl-dotw--' + state);
      var isOpen = state === 'open';
      tab.setAttribute('aria-expanded', String(isOpen));
      if (isOpen) { panel.removeAttribute('inert'); panel.removeAttribute('aria-hidden'); }
      else { panel.setAttribute('inert', ''); panel.setAttribute('aria-hidden', 'true'); }
      if (state === 'gone') { tab.setAttribute('tabindex', '-1'); tab.setAttribute('aria-hidden', 'true'); }
    }
    function counting(on) { el.classList.toggle('nsl-dotw--counting', !!on); }

    function open(source) {
      if (state === 'open' || state === 'gone') return;
      clearTimeout(autoTimer);
      el.classList.remove('nsl-dotw--static');
      setState('open');
      emit('open', { source: source || 'user' });
      if (source !== 'auto') { try { panel.focus({ preventScroll: true }); } catch (e) {} }
    }
    function close(source) {
      if (state !== 'open') return;
      var a = active(), hadFocus = a && panel.contains(a);
      counting(false);
      setState('closed');
      emit('close', { source: source || 'user' });
      if (hadFocus) tab.focus({ preventScroll: true });
    }
    function hideUntilNextDeal(reason) {
      clearTimeout(autoTimer); clearTimeout(hideTimer); counting(false);
      if (o.storage) store(false, o.dealId);
      el.classList.remove('nsl-dotw--static');
      setState('gone');
      emit('hide', { reason: reason });
    }
    function setError(msg) {
      err.textContent = msg || '';
      field.classList.toggle('nsl-dotw__field--error', !!msg);
      input.setAttribute('aria-invalid', msg ? 'true' : 'false');
    }
    function busy(on) {
      cta.disabled = on; cta.setAttribute('aria-busy', on ? 'true' : 'false');
      ctaLabel.textContent = on ? L.sending : L.cta;
    }
    function send(payload) {
      if (typeof o.submit === 'function') return Promise.resolve(o.submit(payload));
      if (!o.endpoint) return new Promise(function (res) { setTimeout(res, 500); }); // demo mode
      var body, headers = {};
      if (o.encoding === 'json') { headers['Content-Type'] = 'application/json'; body = JSON.stringify(payload); }
      else { headers['Content-Type'] = 'application/x-www-form-urlencoded;charset=UTF-8'; body = new URLSearchParams(payload).toString(); }
      return fetch(o.endpoint, { method: 'POST', headers: headers, body: body, credentials: 'same-origin' }).then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r;
      });
    }

    tab.addEventListener('click', function () { state === 'open' ? close('tab') : open('user'); });
    $('.nsl-dotw__close').addEventListener('click', function () { close('close-button'); });
    $('.nsl-dotw__dismiss').addEventListener('click', function () { emit('dismiss'); hideUntilNextDeal('dismiss'); });
    el.addEventListener('keydown', function (e) { if (e.key === 'Escape' && state === 'open') { e.stopPropagation(); close('escape'); } });
    panel.addEventListener('focusin', function () { counting(false); });
    bar.addEventListener('animationend', function () { if (el.classList.contains('nsl-dotw--counting')) { counting(false); close('auto'); } });
    input.addEventListener('input', function () { if (err.textContent) setError(''); });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (sent || cta.disabled) return;
      var email = input.value.trim();
      if (!EMAIL_RE.test(email)) { setError(L.errorEmail); input.focus(); return; }
      setError('');
      var hp = form.querySelector('.nsl-dotw__hp');
      var payload = Object.assign({ email: email, dealId: o.dealId, page: location.href }, o.extraFields || {});
      busy(true);
      (hp && hp.value ? Promise.resolve() : send(payload)).then(function () {
        sent = true; busy(false); counting(false);
        form.hidden = true; done.hidden = false;
        emit('claim');
        hideTimer = setTimeout(function () { hideUntilNextDeal('claimed'); }, o.hideAfterClaim);
      }, function (error) {
        busy(false); setError(L.errorSubmit);
        emit('claim_error', { message: String(error && error.message || error) });
      });
    });

    // first paint: off-screen, then settle into the closed tab (no transition), or auto-open
    setState('pre');
    requestAnimationFrame(function () {
      if (destroyed) return;
      if (o.autoOpen !== false && o.autoOpen != null) {
        autoTimer = setTimeout(function () { open('auto'); counting(true); }, +o.autoOpen || 0);
        emit('view', { mode: 'auto' });
      } else {
        setState('closed');
        requestAnimationFrame(function () { el.classList.remove('nsl-dotw--static'); });
        emit('view', { mode: 'tab' });
      }
    });

    return api({
      open: function () { open('api'); },
      close: function () { close('api'); },
      hide: function () { hideUntilNextDeal('api'); },
      destroy: function () { destroyed = true; clearTimeout(autoTimer); clearTimeout(hideTimer); root.innerHTML = ''; },
      get state() { return state; }
    });
  }

  function api(inst) {
    return inst || { open: noop, close: noop, hide: noop, destroy: noop, state: 'skipped' };
  }
  function noop() {}

  global.NSLDotw = {
    version: VERSION,
    mount: mount,
    /** true if the visitor hid (or claimed) this deal */
    isHidden: function (dealId) { return store(true) === dealId; },
    /** forget the "hidden for this deal" flag (QA / demo) */
    reset: function () { store(false, null); }
  };
})(window);
