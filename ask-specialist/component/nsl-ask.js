/*!
 * nsl-ask v1.0.0 — "Ask a specialist" help request for newserverlife.com
 * No dependencies. ES2017. Styles are isolated in a Shadow DOM.
 * Built on NSL Design System tokens (values inlined below), Primary theme.
 *
 * Desktop (>= 1024px): side panel docked to the right edge, opened by an edge tab (>= 1280px) or any trigger.
 * Phone and tablet: bottom sheet over a scrim.
 *
 *   <script src="/local/templates/nsl/js/nsl-ask.js" defer></script>
 *   <script>
 *     document.addEventListener('DOMContentLoaded', function () {
 *       NSLAsk.mount({ endpoint: '/ajax/ask-specialist.php', build: function () { return { title: '…', meta: '…' }; } });
 *     });
 *   </script>
 *
 *   Any element with data-nsl-ask opens it; data-nsl-ask-area="storage" preselects a problem area,
 *   data-nsl-ask-from="Drive cage" names the place it was opened from.
 */
(function (global) {
  'use strict';

  var VERSION = '1.0.0';

  var DEFAULTS = {
    endpoint: '',               // POST URL. Empty + no `submit` = demo mode (always succeeds)
    encoding: 'multipart',      // 'multipart' (FormData, carries the file) or 'json' (no file)
    extraFields: null,          // e.g. { sessid: BX.bitrix_sessid() }
    submit: null,               // async function (payload, formData) { … } — overrides `endpoint`; throw to show an error
    build: null,                // { title, meta, lines? } or function returning it, read on every open: the build attached to the request
    areas: [
      { value: 'cpu', label: 'Processor' }, { value: 'ram', label: 'Memory' },
      { value: 'storage', label: 'Storage & RAID' }, { value: 'gpu', label: 'GPU' },
      { value: 'net', label: 'Network' }, { value: 'power', label: 'Power & cooling' },
      { value: 'compat', label: 'Part compatibility' }, { value: 'budget', label: 'Fitting the budget' }
    ],
    budgets: ['Under $500', '$500–2k', '$2–5k', '$5–10k', '$10–20k', '$20–50k', '$50–100k', '$100–250k', '$250–500k', '$500k+'],
    budgetTicks: [{ at: 0, label: '<$500' }, { at: 5, label: '$20k' }, { at: 9, label: '$500k+' }],
    budgetDefault: 4,           // index in `budgets`
    channels: [{ value: 'phone', label: 'Phone call' }, { value: 'email', label: 'Email' }, { value: 'whatsapp', label: 'WhatsApp' }],
    timings: [{ value: 'today', label: 'Today' }, { value: 'norush', label: 'No rush' }],
    maxFileSize: 10 * 1024 * 1024,
    accept: '.pdf,.xls,.xlsx,.csv,.doc,.docx,.txt,image/*',
    edgeTab: true,              // show the vertical tab on the right edge
    edgeTabMinWidth: 1280,      // below this the page margin is too narrow for the tab
    tabTop: '42%',              // vertical position of the tab
    desktopMinWidth: 1024,      // side panel from here, bottom sheet below
    width: 440,                 // side panel width, px
    zIndex: 1000,
    motion: true,               // slide in with a small bounce; off anyway with prefers-reduced-motion
    privacyUrl: '',             // adds "By sending you agree to our Privacy Policy." under the button
    remember: true,             // keep name / email / phone / channel in localStorage for the next request
    shadow: true,               // false = light DOM with the same BEM classes (no isolation)
    onEvent: null,              // function (type, detail) — also a `nsl-ask` CustomEvent on the host and a dataLayer push
    labels: {
      tab: 'Ask a specialist',
      title: 'Ask a specialist',
      subtitle: 'Write it your way — a real engineer will reply.',
      close: 'Close',
      buildEyebrow: 'Your current build is attached automatically',
      buildSentEyebrow: 'Sent with your message',
      message: 'Describe what you need',
      messagePlaceholder: 'In your own words — what are you building, and where are you stuck?',
      messageHelper: 'Plain language is perfect — no exact specs needed.',
      attach: 'Attach a spec, RFQ or screenshot',
      attachMobile: 'Attach a spec, photo or RFQ',
      attachHint: 'PDF, Excel, Word or images · optional',
      attachHintMobile: 'Camera, PDF, Excel, Word · optional',
      attachReady: 'ready to send',
      removeFile: 'Remove {name}',
      details: 'Add details',
      optional: 'Optional',
      detailsHint: 'Speeds up the reply · problem area and budget, ~10 seconds',
      detailsNoted: 'Speeds up the reply · already noted: {list}',
      openedFrom: 'Opened from {from} — it’s preselected.',
      areas: 'Where are you stuck?',
      areasHint: 'Select all that apply',
      budget: 'Budget',
      noBudget: 'No fixed budget',
      contact: 'How should we reach you?',
      name: 'Name',
      namePlaceholder: 'Jane Smith',
      email: 'Work email',
      emailPlaceholder: 'jane@company.com',
      phone: 'Phone',
      phonePlaceholder: '+1 (555) 000-0000',
      phoneOptional: '(optional)',
      channel: 'Preferred channel',
      timing: 'How soon?',
      send: 'Send to a specialist',
      sending: 'Sending…',
      note: 'Goes straight to a NewServerLife specialist — a person, not a bot.',
      privacy: 'By sending you agree to our {link}.',
      privacyLink: 'Privacy Policy',
      back: 'Back to configuring',
      reopenNote: 'You can reopen this panel any time from the tab on the right.',
      errorMessage: 'Write a few words or attach a file',
      errorName: 'Enter your name',
      errorEmail: 'Enter a valid email',
      errorPhone: 'Enter a phone number, or choose Email',
      errorFileSize: 'The file is larger than {size} MB',
      errorSubmit: 'Couldn’t send. Please try again.',
      successTitle: 'Message sent',
      successText: 'A specialist will read your message and contact you by {channel} {timing}. Your build{attachment} already with them.',
      channelText: { phone: 'phone', email: 'email', whatsapp: 'WhatsApp' },
      timingText: { today: 'today', norush: 'when convenient' }
    }
  };
  var STORE_KEY = 'nsl_ask_contact';

  /* ------------------------------------------------------------------ styles */
  var CSS = `
:host { all: initial; }
.nsl-ask, .nsl-ask * { box-sizing: border-box; }
.nsl-ask {
  --c-brand: #b91f69; --c-brand-hover: #db1f79; --c-brand-active: #9b1a58; --c-focus: #f77fb8; --c-brand-soft: #fdf2f7;
  --c-text: #18304c; --c-text-2: #6b7280; --c-text-3: #9ca3af; --c-on-brand: #ffffff;
  --c-bg: #ffffff; --c-subtle: #f9fafb; --c-muted: #f3f4f6;
  --c-border: #e5e7eb; --c-control: #d1d5db; --c-strong: #6b7280;
  --c-error: #dc2626; --c-ok-bg: #d1fae5; --c-ok: #047857; --c-info-bg: #b9daff; --c-info: #18599e;
  --scrim: rgba(0, 0, 0, .5);
  --f-sans: "IBM Plex Sans", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  --f-mono: "IBM Plex Mono", ui-monospace, "SF Mono", Menlo, monospace;
  --r: 8px; --r-sm: 4px; --r-xl: 16px; --focus: 0 0 0 3px var(--c-focus);
  --sh-lg: 0 10px 15px rgba(0,0,0,.10), 0 4px 6px rgba(0,0,0,.05), 0 -1px 4px rgba(0,0,0,.05);
  --sh-xl: 0 20px 25px rgba(0,0,0,.10), 0 10px 10px rgba(0,0,0,.04);
  --w: 440px;
  font: 400 16px/24px var(--f-sans); color: var(--c-text); text-align: left; letter-spacing: normal; text-transform: none;
  -webkit-font-smoothing: antialiased;
}
/* resets at zero specificity, so component rules below always win */
:where(.nsl-ask) :where(button, input, textarea) { font: inherit; color: inherit; margin: 0; letter-spacing: inherit; text-transform: none; }
:where(.nsl-ask) :where(button) { cursor: pointer; }
:where(.nsl-ask) :where(svg) { display: block; flex: none; width: auto; height: auto; }
:where(.nsl-ask) :where(h2, h3, p) { margin: 0; text-transform: none; }
.nsl-ask [hidden] { display: none !important; }
.nsl-ask__sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }

/* edge tab */
.nsl-ask__tab { position: fixed; right: 0; top: var(--tab-top, 42%); z-index: calc(var(--z) + 1); display: flex; flex-direction: column; align-items: center; gap: 12px;
  width: 44px; padding: 16px 0; border: 1px solid var(--c-border); border-right: 0; border-radius: var(--r) 0 0 var(--r);
  background: var(--c-bg); color: var(--c-text); box-shadow: var(--sh-lg); font: 600 14px/20px var(--f-sans); }
.nsl-ask__tab svg { color: var(--c-brand); }
.nsl-ask__tab span { writing-mode: vertical-rl; transform: rotate(180deg); letter-spacing: .02em; white-space: nowrap; }
.nsl-ask__tab:hover { color: var(--c-brand); background: var(--c-subtle); }
.nsl-ask__tab:focus-visible { outline: none; box-shadow: var(--focus); }
.nsl-ask__tab[aria-expanded="true"] { right: var(--w); color: var(--c-brand); box-shadow: none; }
.nsl-ask.is-leaving .nsl-ask__tab { right: 0; }

/* panel (desktop) */
.nsl-ask__panel { position: fixed; top: 0; right: 0; bottom: 0; z-index: var(--z); width: var(--w); max-width: 100%;
  display: flex; flex-direction: column; background: var(--c-bg); box-shadow: var(--sh-xl); }
.nsl-ask__scrim { display: none; }

/* sheet (phone, tablet) */
.nsl-ask.is-sheet .nsl-ask__scrim { display: block; position: fixed; inset: 0; z-index: var(--z); background: var(--scrim); }
.nsl-ask.is-sheet .nsl-ask__panel { top: auto; left: 0; width: auto; max-height: calc(100% - 24px); max-height: calc(100dvh - 24px); z-index: calc(var(--z) + 1);
  border-radius: var(--r-xl) var(--r-xl) 0 0; }
.nsl-ask__grab { display: none; }
.nsl-ask.is-sheet .nsl-ask__grab { display: block; align-self: center; width: 36px; height: 4px; margin-top: 8px; border-radius: 9999px; background: var(--c-strong); opacity: .5; flex: none; }

.nsl-ask__head { flex: none; display: flex; align-items: flex-start; gap: 12px; padding: 16px 16px 16px 24px; border-bottom: 1px solid var(--c-border); }
.nsl-ask.is-sheet .nsl-ask__head { padding: 12px 12px 12px 16px; }
.nsl-ask__titles { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
.nsl-ask__title { font: 600 20px/24px var(--f-mono); letter-spacing: -0.01em; color: var(--c-text); }
.nsl-ask.is-sheet .nsl-ask__title { font-size: 18px; }
.nsl-ask__sub { font: 400 14px/20px var(--f-sans); color: var(--c-text-2); }
.nsl-ask__close { flex: none; width: 32px; height: 32px; margin-top: -4px; display: grid; place-items: center; border: 0; border-radius: var(--r-sm); background: transparent; color: var(--c-text); padding: 0; }
.nsl-ask__close:hover { background: var(--c-muted); }
.nsl-ask__close:focus-visible { outline: none; box-shadow: var(--focus); }
.nsl-ask__body { flex: 1; min-height: 0; overflow-y: auto; overscroll-behavior: contain; padding: 16px 24px 32px; }
.nsl-ask.is-sheet .nsl-ask__body { padding: 16px 16px 24px; }
.nsl-ask__foot { flex: none; display: flex; flex-direction: column; gap: 8px; padding: 16px 24px; border-top: 1px solid var(--c-border); background: var(--c-bg); }
.nsl-ask.is-sheet .nsl-ask__foot { padding: 12px 16px; padding-bottom: max(16px, env(safe-area-inset-bottom, 0px)); }
.nsl-ask__note { font: 400 12px/16px var(--f-sans); color: var(--c-text-2); text-align: center; }
.nsl-ask__note a { color: var(--c-brand); }

/* form */
.nsl-ask__form { display: flex; flex-direction: column; gap: 24px; }
.nsl-ask__block { display: flex; flex-direction: column; gap: 16px; }
.nsl-ask__h { font: 600 16px/24px var(--f-mono); letter-spacing: -0.01em; color: var(--c-text); }
.nsl-ask__field { display: flex; flex-direction: column; gap: 4px; }
.nsl-ask__label { font: 500 14px/20px var(--f-sans); color: var(--c-text); padding-bottom: 4px; }
.nsl-ask__label small { font: 400 12px/16px var(--f-sans); color: var(--c-text-2); }
.nsl-ask__helper { font: 400 12px/16px var(--f-sans); color: var(--c-text-2); }
.nsl-ask__error { font: 400 12px/16px var(--f-sans); color: var(--c-error); }
.nsl-ask__input, .nsl-ask__textarea { display: block; width: 100%; min-height: 40px; padding: 7px 16px; border: 1px solid var(--c-border); border-radius: var(--r);
  background: var(--c-bg); color: var(--c-text); font: 400 16px/24px var(--f-sans); outline: none; transition: border-color .12s; -webkit-appearance: none; appearance: none; box-shadow: none; }
.nsl-ask__textarea { min-height: 128px; padding: 12px 16px; resize: vertical; }
.nsl-ask__input::placeholder, .nsl-ask__textarea::placeholder { color: var(--c-text-2); opacity: 1; }
.nsl-ask__input:hover, .nsl-ask__textarea:hover { border-color: var(--c-strong); }
.nsl-ask__input:focus, .nsl-ask__textarea:focus { border: 1.5px solid var(--c-brand); box-shadow: var(--focus); }
.nsl-ask__input[aria-invalid="true"], .nsl-ask__textarea[aria-invalid="true"] { border-color: var(--c-error); }

/* context card */
.nsl-ask__ctx { display: flex; align-items: flex-start; gap: 12px; padding: 12px 16px; border-radius: var(--r); background: var(--c-subtle); color: var(--c-text-2); }
.nsl-ask__ctx svg { margin-top: 2px; }
.nsl-ask__ctx-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.nsl-ask__ctx-eyebrow, .nsl-ask__ctx-meta { font: 400 12px/16px var(--f-sans); color: var(--c-text-2); }
.nsl-ask__ctx-title { font: 600 14px/20px var(--f-mono); color: var(--c-text); }

/* attachment */
.nsl-ask__drop { position: relative; display: flex; align-items: center; gap: 12px; min-height: 56px; padding: 12px 16px; border: 1px dashed var(--c-control); border-radius: var(--r);
  background: var(--c-subtle); color: var(--c-text-2); cursor: pointer; transition: border-color .12s, background .12s; }
.nsl-ask__drop:hover, .nsl-ask__drop.is-over { border-color: var(--c-brand); background: var(--c-bg); }
.nsl-ask__drop:focus-within { border-style: solid; border-color: var(--c-brand); box-shadow: var(--focus); }
.nsl-ask__drop input { position: absolute; width: 1px; height: 1px; opacity: 0; pointer-events: none; }
.nsl-ask__drop-text, .nsl-ask__file-text { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.nsl-ask__drop-title, .nsl-ask__file-name { font: 600 14px/20px var(--f-sans); color: var(--c-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.nsl-ask__drop-hint, .nsl-ask__file-meta { font: 400 12px/16px var(--f-sans); color: var(--c-text-2); }
.nsl-ask__file { display: flex; align-items: center; gap: 12px; min-height: 56px; padding: 8px 8px 8px 16px; border: 1px solid var(--c-border); border-radius: var(--r); background: var(--c-bg); color: var(--c-text-2); }

/* details (disclosure) */
.nsl-ask__disc { border: 1px solid var(--c-border); border-radius: var(--r); background: var(--c-bg); }
.nsl-ask__disc-head { display: flex; width: 100%; align-items: center; gap: 12px; min-height: 64px; padding: 12px 16px; border: 0; border-radius: var(--r); background: var(--c-subtle); color: var(--c-text); text-align: left; }
.nsl-ask__disc.is-open .nsl-ask__disc-head { border-radius: var(--r) var(--r) 0 0; }
.nsl-ask__disc-head:focus-visible { outline: none; box-shadow: var(--focus); }
.nsl-ask__disc-head:hover .nsl-ask__disc-title { color: var(--c-brand); }
.nsl-ask__disc-text { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.nsl-ask__disc-title { font: 600 16px/24px var(--f-mono); letter-spacing: -0.01em; }
.nsl-ask__disc-desc { font: 400 12px/16px var(--f-sans); color: var(--c-text-2); }
.nsl-ask__disc-badge { font: 500 12px/16px var(--f-mono); color: var(--c-text-2); }
.nsl-ask__disc-chev { color: var(--c-text-2); transition: transform .15s; }
.nsl-ask__disc.is-open .nsl-ask__disc-chev { transform: rotate(180deg); }
.nsl-ask__disc-panel { padding: 16px; border-top: 1px solid var(--c-border); display: flex; flex-direction: column; gap: 24px; }
.nsl-ask__info { display: flex; gap: 8px; align-items: flex-start; padding: 8px 12px; border-radius: var(--r); background: var(--c-info-bg); color: var(--c-info); font: 400 14px/20px var(--f-sans); }
.nsl-ask__info svg { margin-top: 2px; }

/* checkbox / radio */
.nsl-ask fieldset { margin: 0; padding: 0; border: 0; min-width: 0; }
.nsl-ask legend { padding: 0 0 8px; font: 500 14px/20px var(--f-sans); color: var(--c-text); }
.nsl-ask legend small { font: 400 12px/16px var(--f-sans); color: var(--c-text-2); }
.nsl-ask__opts { display: flex; flex-direction: column; gap: 12px; }
.nsl-ask__opts--grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); column-gap: 16px; }
.nsl-ask__opts--row { flex-direction: row; flex-wrap: wrap; column-gap: 24px; }
.nsl-ask__check { position: relative; display: inline-flex; align-items: center; gap: 8px; cursor: pointer; font: 400 14px/20px var(--f-sans); color: var(--c-text); }
.nsl-ask.is-sheet .nsl-ask__check { font-size: 16px; line-height: 24px; }
.nsl-ask__check input { position: absolute; opacity: 0; width: 1px; height: 1px; margin: 0; }
.nsl-ask__box { flex: none; display: inline-grid; place-items: center; width: 16px; height: 16px; border: 1.5px solid var(--c-control); border-radius: var(--r-sm); background: var(--c-bg); color: var(--c-on-brand); transition: background-color .12s, border-color .12s; }
.nsl-ask.is-sheet .nsl-ask__box { width: 20px; height: 20px; }
.nsl-ask__check--radio .nsl-ask__box { border-radius: 50%; }
.nsl-ask__box svg { opacity: 0; }
.nsl-ask__dot { width: 6px; height: 6px; border-radius: 50%; background: var(--c-on-brand); transform: scale(0); transition: transform .12s; }
.nsl-ask.is-sheet .nsl-ask__dot { width: 8px; height: 8px; }
.nsl-ask__check:hover .nsl-ask__box { border-color: var(--c-strong); }
.nsl-ask__check input:checked + .nsl-ask__box { background: var(--c-brand); border-color: var(--c-brand); }
.nsl-ask__check input:checked + .nsl-ask__box svg { opacity: 1; }
.nsl-ask__check input:checked + .nsl-ask__box .nsl-ask__dot { transform: scale(1); }
.nsl-ask__check input:focus-visible + .nsl-ask__box { box-shadow: var(--focus); }
.nsl-ask__two { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }

/* budget slider */
.nsl-ask__budget { display: flex; flex-direction: column; gap: 12px; }
.nsl-ask__budget-head { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; }
.nsl-ask__budget-head label { font: 500 14px/20px var(--f-sans); }
.nsl-ask__budget-val { font: 600 14px/20px var(--f-mono); color: var(--c-text); white-space: nowrap; }
.nsl-ask__budget.is-off .nsl-ask__budget-val { color: var(--c-text-2); font-weight: 500; }
.nsl-ask__rail { position: relative; height: 24px; margin: 0 10px; }
.nsl-ask__track, .nsl-ask__fill { position: absolute; top: 10px; height: 4px; border-radius: 9999px; }
.nsl-ask__track { left: 0; right: 0; background: var(--c-border); }
.nsl-ask__fill { left: 0; background: var(--c-brand); }
.nsl-ask__stop { position: absolute; top: 8px; width: 8px; height: 8px; margin-left: -4px; border-radius: 50%; background: var(--c-bg); border: 1.5px solid var(--c-control); }
.nsl-ask__stop.is-on { background: var(--c-brand); border-color: var(--c-bg); }
.nsl-ask__thumb { position: absolute; top: 2px; width: 20px; height: 20px; margin-left: -10px; border-radius: 50%; background: var(--c-bg); border: 1.5px solid var(--c-brand); box-shadow: 0 1px 3px rgba(24,48,76,.25); pointer-events: none; }
.nsl-ask__range { position: absolute; left: -10px; right: -10px; top: 0; width: calc(100% + 20px); height: 24px; margin: 0; opacity: 0; cursor: pointer; }
.nsl-ask__range:focus-visible ~ .nsl-ask__thumb { box-shadow: var(--focus); }
.nsl-ask__budget.is-off .nsl-ask__fill, .nsl-ask__budget.is-off .nsl-ask__stop.is-on { background: var(--c-control); }
.nsl-ask__budget.is-off .nsl-ask__thumb { border-color: var(--c-control); }
.nsl-ask__budget.is-off .nsl-ask__range { cursor: not-allowed; }
.nsl-ask__ticks { position: relative; height: 16px; margin: 0 10px; font: 400 12px/16px var(--f-mono); color: var(--c-text-2); }
.nsl-ask__ticks span { position: absolute; top: 0; transform: translateX(-50%); white-space: nowrap; }
.nsl-ask__ticks span.is-start { transform: translateX(-10px); }
.nsl-ask__ticks span.is-end { transform: translateX(calc(-100% + 10px)); }

/* buttons */
.nsl-ask__btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; width: 100%; min-height: 48px; padding: 0 24px; border: 1px solid transparent; border-radius: var(--r);
  font: 600 16px/24px var(--f-sans); text-decoration: none; transition: background-color .12s, border-color .12s, color .12s; }
.nsl-ask.is-sheet .nsl-ask__btn { min-height: 40px; }
.nsl-ask__btn--primary { background: var(--c-brand); color: var(--c-on-brand); }
.nsl-ask__btn--primary:hover { background: var(--c-brand-hover); }
.nsl-ask__btn--primary:active { background: var(--c-brand-active); }
.nsl-ask__btn--primary[aria-busy="true"] { opacity: .8; cursor: progress; }
.nsl-ask__btn--ghost { background: var(--c-bg); border-color: var(--c-brand); color: var(--c-brand); }
.nsl-ask__btn--ghost:hover { background: var(--c-brand-soft); }
.nsl-ask__btn:focus-visible { outline: none; box-shadow: var(--focus); }
.nsl-ask__hp { position: absolute; left: -10000px; width: 1px; height: 1px; overflow: hidden; }

/* success */
.nsl-ask__done { display: flex; flex-direction: column; gap: 24px; padding-top: 32px; }
.nsl-ask__done-main { display: flex; flex-direction: column; align-items: center; gap: 12px; text-align: center; }
.nsl-ask__done-icon { width: 64px; height: 64px; border-radius: 50%; display: grid; place-items: center; background: var(--c-ok-bg); color: var(--c-ok); }
.nsl-ask__done-title { font: 600 18px/24px var(--f-mono); color: var(--c-text); }
.nsl-ask__done-text { max-width: 340px; font: 400 14px/20px var(--f-sans); color: var(--c-text-2); }
.nsl-ask__form-error { padding: 8px 12px; border-radius: var(--r); background: #fee2e2; color: #b91c1c; font: 400 14px/20px var(--f-sans); }

/* motion: slide in with one small overshoot, quick slide out without it */
.nsl-ask.has-motion .nsl-ask__tab { transition: right 480ms cubic-bezier(.22, 1, .36, 1), color .15s, background-color .15s; }
.nsl-ask.has-motion.is-leaving .nsl-ask__tab { transition: right 220ms cubic-bezier(.4, 0, 1, 1); }
.nsl-ask.has-motion.is-entering .nsl-ask__panel { animation: nsl-ask-in-x 480ms cubic-bezier(.22, 1, .36, 1) both; }
.nsl-ask.has-motion .nsl-ask__panel::after { content: ""; position: absolute; top: 0; bottom: 0; left: 100%; width: 24px; background: var(--c-bg); }
.nsl-ask.has-motion.is-leaving .nsl-ask__panel { animation: nsl-ask-out-x 220ms cubic-bezier(.4, 0, 1, 1) both; }
.nsl-ask.has-motion.is-entering.is-sheet .nsl-ask__panel { animation-name: nsl-ask-in-y; }
.nsl-ask.has-motion.is-sheet .nsl-ask__panel::after { top: 100%; bottom: auto; left: 0; right: 0; width: auto; height: 24px; }
.nsl-ask.has-motion.is-sheet.is-leaving .nsl-ask__panel { animation-name: nsl-ask-out-y; }
.nsl-ask.has-motion.is-entering.is-sheet .nsl-ask__scrim { animation: nsl-ask-fade 240ms ease-out both; }
.nsl-ask.has-motion.is-sheet.is-leaving .nsl-ask__scrim { animation: nsl-ask-fade 220ms ease-in reverse both; }
@keyframes nsl-ask-in-x { 0% { transform: translateX(100%); } 62% { transform: translateX(-12px); } 82% { transform: translateX(3px); } 100% { transform: translateX(0); } }
@keyframes nsl-ask-out-x { from { transform: translateX(0); } to { transform: translateX(100%); } }
@keyframes nsl-ask-in-y { 0% { transform: translateY(100%); } 62% { transform: translateY(-10px); } 82% { transform: translateY(2px); } 100% { transform: translateY(0); } }
@keyframes nsl-ask-out-y { from { transform: translateY(0); } to { transform: translateY(100%); } }
@keyframes nsl-ask-fade { from { opacity: 0; } to { opacity: 1; } }
@media (prefers-reduced-motion: reduce) {
  .nsl-ask .nsl-ask__panel, .nsl-ask .nsl-ask__scrim { animation: none !important; }
  .nsl-ask .nsl-ask__tab, .nsl-ask .nsl-ask__disc-chev, .nsl-ask__dot { transition: none !important; }
}
`;

  /* ------------------------------------------------------------------ icons (Feather, 1.5 stroke) */
  function svg(paths, size) {
    return '<svg width="' + (size || 20) + '" height="' + (size || 20) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + paths + '</svg>';
  }
  var I = {
    help: '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01"/>',
    chevRight: '<path d="m9 18 6-6-6-6"/>',
    chevDown: '<path d="m6 9 6 6 6-6"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    server: '<rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/><path d="M6 6h.01M6 18h.01"/>',
    clip: '<path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>',
    info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
    send: '<path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z"/>',
    check: '<path d="M20 6 9 17l-5-5"/>'
  };

  /* ------------------------------------------------------------------ helpers */
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function fmt(s, vars) { return String(s).replace(/\{(\w+)\}/g, function (_, k) { return vars[k] != null ? vars[k] : ''; }); }
  function merge(a, b) { var o = {}; Object.keys(a).forEach(function (k) { o[k] = a[k]; }); Object.keys(b || {}).forEach(function (k) { if (b[k] !== undefined) o[k] = b[k]; }); return o; }
  function fileMeta(f) {
    var ext = (String(f.name).split('.').pop() || '').toUpperCase(), s = f.size;
    var sz = s >= 1048576 ? (s / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(s / 1024)) + ' KB';
    return ext + ' · ' + sz;
  }
  function mq(q) { return global.matchMedia ? global.matchMedia(q) : { matches: false, addEventListener: function () {} }; }
  var uid = 0;

  /* ------------------------------------------------------------------ mount */
  function mount(target, options) {
    if (target && typeof target === 'object' && !(target instanceof Element)) { options = target; target = null; }
    var o = merge(DEFAULTS, options || {});
    o.labels = merge(DEFAULTS.labels, (options || {}).labels || {});
    var L = o.labels, id = 'nsl-ask-' + (++uid);

    var host = typeof target === 'string' ? document.querySelector(target) : target;
    var ownHost = false;
    if (!host) { host = document.createElement('div'); host.className = 'nsl-ask-host'; document.body.appendChild(host); ownHost = true; }
    var root = o.shadow && host.attachShadow ? (host.shadowRoot || host.attachShadow({ mode: 'open' })) : host;
    var style = document.createElement('style'); style.textContent = CSS; root.appendChild(style);
    var wrap = document.createElement('div');
    wrap.className = 'nsl-ask';
    wrap.style.setProperty('--z', String(o.zIndex));
    wrap.style.setProperty('--w', o.width + 'px');
    wrap.style.setProperty('--tab-top', o.tabTop);
    root.appendChild(wrap);

    var reduced = mq('(prefers-reduced-motion: reduce)'), desktopMq = mq('(min-width: ' + o.desktopMinWidth + 'px)'), tabMq = mq('(min-width: ' + o.edgeTabMinWidth + 'px)');

    var stored = {};
    if (o.remember) { try { stored = JSON.parse(global.localStorage.getItem(STORE_KEY) || '{}') || {}; } catch (e) {} }
    function fresh() {
      return { msg: '', file: null, details: false, areas: [], from: '', budget: o.budgetDefault, noBudget: false,
        name: stored.name || '', email: stored.email || '', phone: stored.phone || '', channel: stored.channel || o.channels[0].value, timing: o.timings[0].value };
    }
    var st = { open: false, leaving: false, sent: false, sending: false, errors: {}, formError: '', f: fresh() };
    var lastTrigger = null, leaveTimer = null, enterTimer = null, build = null;
    function byId(x) { return root.getElementById ? root.getElementById(x) : wrap.querySelector('#' + x); }

    function emit(type, detail) {
      detail = merge({ type: type }, detail || {});
      try { host.dispatchEvent(new CustomEvent('nsl-ask', { detail: detail, bubbles: true, composed: true })); } catch (e) {}
      if (typeof o.onEvent === 'function') { try { o.onEvent(type, detail); } catch (e) {} }
      try { if (Array.isArray(global.dataLayer)) global.dataLayer.push(merge({ event: 'ask_specialist_' + type }, detail)); } catch (e) {}
    }
    function readBuild() { try { return typeof o.build === 'function' ? o.build() : o.build; } catch (e) { return null; } }
    function isSheet() { return !desktopMq.matches; }
    function motionOn() { return o.motion && !reduced.matches; }

    /* --------------- render (whole widget; cheap: one panel) */
    function areaLabel(v) { for (var i = 0; i < o.areas.length; i++) if (o.areas[i].value === v) return o.areas[i].label; return v; }

    function htmlCheck(type, name, value, label, checked) {
      return '<label class="nsl-ask__check' + (type === 'radio' ? ' nsl-ask__check--radio' : '') + '"><input type="' + type + '" name="' + name + '" value="' + esc(value) + '"' + (checked ? ' checked' : '') + '>' +
        '<span class="nsl-ask__box">' + (type === 'radio' ? '<span class="nsl-ask__dot"></span>' : svg(I.check, 12).replace('stroke-width="1.5"', 'stroke-width="3"')) + '</span><span>' + esc(label) + '</span></label>';
    }

    function htmlBuild(eyebrow) {
      if (!build || !build.title) return '';
      return '<div class="nsl-ask__ctx">' + svg(I.server) + '<div class="nsl-ask__ctx-body"><span class="nsl-ask__ctx-eyebrow">' + esc(eyebrow) + '</span>' +
        '<span class="nsl-ask__ctx-title">' + esc(build.title) + '</span>' + (build.meta ? '<span class="nsl-ask__ctx-meta">' + esc(build.meta) + '</span>' : '') + '</div></div>';
    }

    function htmlForm() {
      var f = st.f, e = st.errors, sheet = isSheet();
      var picked = f.areas.map(areaLabel);
      var pct = function (i) { return (i / (o.budgets.length - 1)) * 100; };
      var stops = o.budgets.map(function (_, i) { return '<span class="nsl-ask__stop' + (i <= f.budget ? ' is-on' : '') + '" style="left:' + pct(i) + '%"></span>'; }).join('');
      var ticks = o.budgetTicks.map(function (t) { var x = pct(t.at); return '<span class="' + (x <= 0 ? 'is-start' : x >= 100 ? 'is-end' : '') + '" style="left:' + x + '%">' + esc(t.label) + '</span>'; }).join('');
      var err = function (k) { return e[k] ? '<span class="nsl-ask__error" id="' + id + '-' + k + '-err">' + esc(e[k]) + '</span>' : ''; };
      var inv = function (k) { return e[k] ? ' aria-invalid="true" aria-describedby="' + id + '-' + k + '-err"' : ''; };
      var phoneOpt = f.channel === 'email';
      var radios = function (name, list, val, row) {
        return '<div class="nsl-ask__opts' + (row ? ' nsl-ask__opts--row' : '') + '">' + list.map(function (x) { return htmlCheck('radio', id + '-' + name, x.value, x.label, x.value === val); }).join('') + '</div>';
      };
      return '<form class="nsl-ask__form" novalidate>' +
        (st.formError ? '<div class="nsl-ask__form-error" role="alert">' + esc(st.formError) + '</div>' : '') +
        htmlBuild(L.buildEyebrow) +
        '<div class="nsl-ask__field"><label class="nsl-ask__label" for="' + id + '-msg">' + esc(L.message) + '</label>' +
          '<textarea class="nsl-ask__textarea" id="' + id + '-msg" name="message" rows="' + (sheet ? 5 : 6) + '" placeholder="' + esc(L.messagePlaceholder) + '"' + inv('msg') + '>' + esc(f.msg) + '</textarea>' +
          (e.msg ? err('msg') : '<span class="nsl-ask__helper">' + esc(L.messageHelper) + '</span>') + '</div>' +
        '<div class="nsl-ask__field">' + (f.file
          ? '<div class="nsl-ask__file">' + svg(I.clip) + '<span class="nsl-ask__file-text"><span class="nsl-ask__file-name">' + esc(f.file.name) + '</span><span class="nsl-ask__file-meta">' + esc(fileMeta(f.file)) + ' · ' + esc(L.attachReady) + '</span></span>' +
            '<button type="button" class="nsl-ask__close" data-act="unfile" aria-label="' + esc(fmt(L.removeFile, { name: f.file.name })) + '">' + svg(I.x) + '</button></div>'
          : '<label class="nsl-ask__drop" data-drop><input type="file" name="file" accept="' + esc(o.accept) + '">' + svg(I.clip, 24) +
            '<span class="nsl-ask__drop-text"><span class="nsl-ask__drop-title">' + esc(sheet ? L.attachMobile : L.attach) + '</span><span class="nsl-ask__drop-hint">' + esc(sheet ? L.attachHintMobile : L.attachHint) + '</span></span></label>') +
          err('file') + '</div>' +
        '<div class="nsl-ask__disc' + (f.details ? ' is-open' : '') + '">' +
          '<button type="button" class="nsl-ask__disc-head" data-act="details" aria-expanded="' + f.details + '" aria-controls="' + id + '-details">' +
            '<span class="nsl-ask__disc-text"><span class="nsl-ask__disc-title">' + esc(L.details) + '</span><span class="nsl-ask__disc-desc" data-disc-desc>' + esc(picked.length ? fmt(L.detailsNoted, { list: picked.join(', ') }) : L.detailsHint) + '</span></span>' +
            '<span class="nsl-ask__disc-badge">' + esc(L.optional) + '</span><span class="nsl-ask__disc-chev">' + svg(I.chevDown) + '</span></button>' +
          '<div class="nsl-ask__disc-panel" id="' + id + '-details"' + (f.details ? '' : ' hidden') + '>' +
            (f.from ? '<div class="nsl-ask__info">' + svg(I.info, 16) + '<span>' + esc(fmt(L.openedFrom, { from: f.from })) + '</span></div>' : '') +
            '<fieldset><legend>' + esc(L.areas) + ' <small>' + esc(L.areasHint) + '</small></legend><div class="nsl-ask__opts' + (sheet ? '' : ' nsl-ask__opts--grid') + '">' +
              o.areas.map(function (a) { return htmlCheck('checkbox', 'areas', a.value, a.label, f.areas.indexOf(a.value) > -1); }).join('') + '</div></fieldset>' +
            '<div class="nsl-ask__budget' + (f.noBudget ? ' is-off' : '') + '"><div class="nsl-ask__budget-head"><label for="' + id + '-budget">' + esc(L.budget) + '</label><span class="nsl-ask__budget-val" data-budget-val>' + esc(f.noBudget ? L.noBudget : o.budgets[f.budget]) + '</span></div>' +
              '<div class="nsl-ask__rail"><span class="nsl-ask__track"></span><span class="nsl-ask__fill" style="width:' + pct(f.budget) + '%"></span>' + stops +
                '<input class="nsl-ask__range" id="' + id + '-budget" type="range" min="0" max="' + (o.budgets.length - 1) + '" step="1" value="' + f.budget + '" aria-valuetext="' + esc(o.budgets[f.budget]) + '"' + (f.noBudget ? ' disabled' : '') + '>' +
                '<span class="nsl-ask__thumb" style="left:' + pct(f.budget) + '%"></span></div>' +
              '<div class="nsl-ask__ticks" aria-hidden="true">' + ticks + '</div>' +
              htmlCheck('checkbox', 'nobudget', '1', L.noBudget, f.noBudget) + '</div>' +
          '</div></div>' +
        '<div class="nsl-ask__block"><h3 class="nsl-ask__h">' + esc(L.contact) + '</h3>' +
          '<div class="nsl-ask__field"><label class="nsl-ask__label" for="' + id + '-name">' + esc(L.name) + '</label><input class="nsl-ask__input" id="' + id + '-name" name="name" autocomplete="name" placeholder="' + esc(L.namePlaceholder) + '" value="' + esc(f.name) + '"' + inv('name') + '>' + err('name') + '</div>' +
          '<div class="nsl-ask__field"><label class="nsl-ask__label" for="' + id + '-email">' + esc(L.email) + '</label><input class="nsl-ask__input" id="' + id + '-email" name="email" type="email" autocomplete="email" inputmode="email" placeholder="' + esc(L.emailPlaceholder) + '" value="' + esc(f.email) + '"' + inv('email') + '>' + err('email') + '</div>' +
          '<div class="nsl-ask__field"><label class="nsl-ask__label" for="' + id + '-phone">' + esc(L.phone) + ' <small data-phone-opt' + (phoneOpt ? '' : ' hidden') + '>' + esc(L.phoneOptional) + '</small></label><input class="nsl-ask__input" id="' + id + '-phone" name="phone" type="tel" autocomplete="tel" inputmode="tel" placeholder="' + esc(L.phonePlaceholder) + '" value="' + esc(f.phone) + '"' + inv('phone') + '>' + err('phone') + '</div>' +
          (sheet
            ? '<div class="nsl-ask__two"><fieldset><legend>' + esc(L.channel) + '</legend>' + radios('channel', o.channels, f.channel) + '</fieldset><fieldset><legend>' + esc(L.timing) + '</legend>' + radios('timing', o.timings, f.timing) + '</fieldset></div>'
            : '<fieldset><legend>' + esc(L.channel) + '</legend>' + radios('channel', o.channels, f.channel, true) + '</fieldset><fieldset><legend>' + esc(L.timing) + '</legend>' + radios('timing', o.timings, f.timing, true) + '</fieldset>') +
        '</div>' +
        '<div class="nsl-ask__hp" aria-hidden="true"><label>Website <input name="website" tabindex="-1" autocomplete="off"></label></div>' +
        '</form>';
    }

    function htmlDone() {
      var f = st.f;
      return '<div class="nsl-ask__done"><div class="nsl-ask__done-main" role="status"><span class="nsl-ask__done-icon">' + svg(I.check, 32) + '</span>' +
        '<h3 class="nsl-ask__done-title">' + esc(L.successTitle) + '</h3>' +
        '<p class="nsl-ask__done-text">' + esc(fmt(L.successText, { channel: L.channelText[f.channel] || f.channel, timing: L.timingText[f.timing] || '', attachment: f.file ? ' and attachment are' : ' is' })) + '</p></div>' +
        htmlBuild(L.buildSentEyebrow) + '</div>';
    }

    function htmlFoot() {
      if (st.sent) return '<button type="button" class="nsl-ask__btn nsl-ask__btn--ghost" data-act="close">' + esc(L.back) + '</button>' + (!isSheet() && showTab() ? '<span class="nsl-ask__note">' + esc(L.reopenNote) + '</span>' : '');
      var note = esc(L.note);
      if (o.privacyUrl) note += '<br>' + fmt(esc(L.privacy), { link: '<a href="' + esc(o.privacyUrl) + '" target="_blank" rel="noopener">' + esc(L.privacyLink) + '</a>' });
      return '<button type="button" class="nsl-ask__btn nsl-ask__btn--primary" data-act="send"' + (st.sending ? ' aria-busy="true"' : '') + '>' + svg(I.send) + '<span>' + esc(st.sending ? L.sending : L.send) + '</span></button><span class="nsl-ask__note">' + note + '</span>';
    }

    function showTab() { return o.edgeTab && tabMq.matches; }

    function render(keepScroll) {
      var body = wrap.querySelector('.nsl-ask__body'), scroll = keepScroll && body ? body.scrollTop : 0;
      var active = keepScroll && root.activeElement ? root.activeElement : null;
      var activeId = active && (active.id || (active.name ? 'name:' + active.name + ':' + active.value : ''));
      wrap.classList.toggle('is-sheet', isSheet());
      wrap.classList.toggle('is-open', st.open);
      wrap.classList.toggle('is-leaving', st.leaving);
      wrap.classList.toggle('has-motion', motionOn());
      var tabOpen = st.open && !st.leaving && !isSheet();
      var html = '';
      if (showTab()) html += '<button type="button" class="nsl-ask__tab" data-act="tab" aria-expanded="' + tabOpen + '" aria-controls="' + id + '-panel">' + svg(tabOpen ? I.chevRight : I.help) + '<span>' + esc(L.tab) + '</span></button>';
      if (st.open) {
        html += '<div class="nsl-ask__scrim" data-act="scrim"></div>' +
          '<section class="nsl-ask__panel" id="' + id + '-panel" role="dialog" aria-modal="' + isSheet() + '" aria-labelledby="' + id + '-title">' +
          '<span class="nsl-ask__grab" aria-hidden="true"></span>' +
          '<div class="nsl-ask__head"><div class="nsl-ask__titles"><h2 class="nsl-ask__title" id="' + id + '-title">' + esc(L.title) + '</h2><p class="nsl-ask__sub">' + esc(L.subtitle) + '</p></div>' +
          '<button type="button" class="nsl-ask__close" data-act="close" aria-label="' + esc(L.close) + '">' + svg(I.x) + '</button></div>' +
          '<div class="nsl-ask__body">' + (st.sent ? htmlDone() : htmlForm()) + '</div>' +
          '<div class="nsl-ask__foot">' + htmlFoot() + '</div></section>';
      }
      wrap.innerHTML = html;
      var nb = wrap.querySelector('.nsl-ask__body');
      if (nb && scroll) nb.scrollTop = scroll;
      if (activeId) {
        var el = activeId.indexOf('name:') === 0
          ? wrap.querySelector('input[name="' + activeId.split(':')[1] + '"][value="' + activeId.split(':').slice(2).join(':') + '"]')
          : byId(activeId);
        if (el && el.focus) { try { el.focus({ preventScroll: true }); } catch (e) { el.focus(); } }
      }
    }

    /* --------------- open / close */
    function open(opts) {
      opts = opts || {};
      clearTimeout(leaveTimer);
      if (st.sent) { st.sent = false; st.f = fresh(); }
      var f = st.f;
      f.from = opts.from || '';
      if (opts.area) { f.details = true; if (f.areas.indexOf(opts.area) < 0) f.areas = f.areas.concat([opts.area]); }
      if (opts.message && !f.msg) f.msg = opts.message;
      build = opts.build || readBuild();
      st.errors = {}; st.formError = '';
      var was = st.open && !st.leaving;
      st.open = true; st.leaving = false;
      lastTrigger = opts.trigger || (document.activeElement !== document.body ? document.activeElement : null);
      if (!was && motionOn()) { wrap.classList.add('is-entering'); clearTimeout(enterTimer); enterTimer = setTimeout(function () { wrap.classList.remove('is-entering'); }, 500); }
      render();
      if (!was) {
        var ta = byId(id + '-msg');
        setTimeout(function () { if (ta && st.open) { try { ta.focus({ preventScroll: true }); } catch (e) {} } }, motionOn() ? 120 : 0);
        if (isSheet()) { document.documentElement.style.overflow = 'hidden'; }
        emit('open', { source: opts.source || 'api', area: opts.area || null, from: f.from || null });
      }
    }
    function close(source) {
      if (!st.open || st.leaving) return;
      var done = function () {
        st.open = false; st.leaving = false; render();
        document.documentElement.style.overflow = '';
        var t = lastTrigger && lastTrigger.isConnected && !wrap.contains(lastTrigger) ? lastTrigger : wrap.querySelector('.nsl-ask__tab');
        if (t && t.focus) { try { t.focus({ preventScroll: true }); } catch (e) {} }
      };
      emit('close', { source: source || 'api' });
      wrap.classList.remove('is-entering');
      if (motionOn()) { st.leaving = true; render(true); leaveTimer = setTimeout(done, 220); } else done();
    }

    /* --------------- validation + submit */
    function validate() {
      var f = st.f, e = {};
      if (!f.msg.trim() && !f.file) e.msg = L.errorMessage;
      if (!f.name.trim()) e.name = L.errorName;
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) e.email = L.errorEmail;
      if (f.channel !== 'email' && f.phone.replace(/\D/g, '').length < 6) e.phone = L.errorPhone;
      return e;
    }
    function payload() {
      var f = st.f;
      return {
        message: f.msg.trim(), areas: f.areas, budget: f.noBudget ? 'none' : o.budgets[f.budget],
        name: f.name.trim(), email: f.email.trim(), phone: f.phone.trim(), channel: f.channel, timing: f.timing,
        from: f.from || '', build: build || null, page: global.location ? global.location.href : '', fileName: f.file ? f.file.name : ''
      };
    }
    function send() {
      if (st.sending) return;
      var hp = wrap.querySelector('input[name="website"]');
      st.errors = validate(); st.formError = '';
      if (Object.keys(st.errors).length) {
        render(true);
        var first = wrap.querySelector('[aria-invalid="true"]'); if (first) first.focus();
        emit('invalid', { fields: Object.keys(st.errors) });
        return;
      }
      if (o.remember) { try { global.localStorage.setItem(STORE_KEY, JSON.stringify({ name: st.f.name, email: st.f.email, phone: st.f.phone, channel: st.f.channel })); stored = { name: st.f.name, email: st.f.email, phone: st.f.phone, channel: st.f.channel }; } catch (e) {} }
      var p = payload();
      if (hp && hp.value) { st.sent = true; render(); return; } // bot: pretend success
      var fd = new FormData();
      Object.keys(p).forEach(function (k) { var v = p[k]; fd.append(k, Array.isArray(v) ? v.join(',') : v && typeof v === 'object' ? JSON.stringify(v) : v == null ? '' : v); });
      if (st.f.file) fd.append('file', st.f.file, st.f.file.name);
      if (o.extraFields) Object.keys(o.extraFields).forEach(function (k) { fd.append(k, o.extraFields[k]); });
      st.sending = true; render(true);
      var job;
      if (typeof o.submit === 'function') job = Promise.resolve().then(function () { return o.submit(p, fd); });
      else if (o.endpoint) {
        var init = { method: 'POST', credentials: 'same-origin' };
        if (o.encoding === 'json') { init.headers = { 'Content-Type': 'application/json' }; init.body = JSON.stringify(merge(p, o.extraFields || {})); }
        else init.body = fd;
        job = fetch(o.endpoint, init).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); });
      } else job = new Promise(function (res) { setTimeout(res, 600); }); // demo mode
      job.then(function () {
        st.sending = false; st.sent = true; render();
        var b = wrap.querySelector('.nsl-ask__body'); if (b) b.scrollTop = 0;
        var btn = wrap.querySelector('[data-act="close"].nsl-ask__btn'); if (btn) btn.focus({ preventScroll: true });
        emit('send', { areas: p.areas, budget: p.budget, channel: p.channel, timing: p.timing, from: p.from, hasFile: !!st.f.file });
      }, function (err) {
        st.sending = false; st.formError = L.errorSubmit; render(true);
        var b = wrap.querySelector('.nsl-ask__body'); if (b) b.scrollTop = 0;
        emit('send_error', { message: String(err && err.message || err) });
      });
    }

    /* --------------- in-place updates: no re-render while the person is typing or tabbing through */
    var FIELD = { msg: 'msg', name: 'name', email: 'email', phone: 'phone' };
    function clearError(k) {
      if (!st.errors[k]) return;
      delete st.errors[k];
      var input = byId(id + '-' + FIELD[k]), errEl = byId(id + '-' + k + '-err');
      if (input) { input.removeAttribute('aria-invalid'); input.removeAttribute('aria-describedby'); }
      if (errEl) {
        if (k === 'msg') { errEl.className = 'nsl-ask__helper'; errEl.removeAttribute('id'); errEl.textContent = L.messageHelper; }
        else errEl.remove();
      }
    }
    function updateDetailsDesc() {
      var el = wrap.querySelector('[data-disc-desc]'), picked = st.f.areas.map(areaLabel);
      if (el) el.textContent = picked.length ? fmt(L.detailsNoted, { list: picked.join(', ') }) : L.detailsHint;
    }
    function updateBudget() {
      var f = st.f, b = wrap.querySelector('.nsl-ask__budget'); if (!b) return;
      var pct = (f.budget / (o.budgets.length - 1)) * 100, r = b.querySelector('.nsl-ask__range');
      b.classList.toggle('is-off', f.noBudget);
      b.querySelector('.nsl-ask__fill').style.width = pct + '%';
      b.querySelector('.nsl-ask__thumb').style.left = pct + '%';
      b.querySelectorAll('.nsl-ask__stop').forEach(function (x, i) { x.classList.toggle('is-on', i <= f.budget); });
      b.querySelector('[data-budget-val]').textContent = f.noBudget ? L.noBudget : o.budgets[f.budget];
      r.disabled = f.noBudget; r.setAttribute('aria-valuetext', o.budgets[f.budget]);
    }

    /* --------------- events (delegated inside the widget) */
    function setFile(file) {
      if (!file) return;
      if (file.size > o.maxFileSize) { st.errors.file = fmt(L.errorFileSize, { size: Math.round(o.maxFileSize / 1048576) }); render(true); return; }
      st.f.file = file; delete st.errors.file; delete st.errors.msg; render(true);
      emit('attach', { size: file.size, mime: file.type });
    }
    wrap.addEventListener('click', function (e) {
      var t = e.target.closest('[data-act]'); if (!t || !wrap.contains(t)) return;
      var a = t.getAttribute('data-act');
      if (a === 'tab') { st.open && !st.leaving ? close('tab') : open({ source: 'tab', trigger: t }); }
      else if (a === 'close') close(t.classList.contains('nsl-ask__btn') ? 'back' : 'close-button');
      else if (a === 'scrim') close('scrim');
      else if (a === 'details') {
        st.f.details = !st.f.details;
        t.setAttribute('aria-expanded', String(st.f.details));
        t.parentNode.classList.toggle('is-open', st.f.details);
        var pnl = byId(id + '-details'); if (pnl) pnl.hidden = !st.f.details;
      }
      else if (a === 'unfile') { st.f.file = null; render(true); var d = wrap.querySelector('[data-drop] input'); if (d) d.focus(); }
      else if (a === 'send') send();
    });
    wrap.addEventListener('input', function (e) {
      var t = e.target, f = st.f;
      if (t.name === 'message') { f.msg = t.value; if (t.value.trim()) clearError('msg'); }
      else if (t.name === 'name' || t.name === 'email' || t.name === 'phone') { f[t.name] = t.value; if (st.errors[t.name] && !validate()[t.name]) clearError(t.name); }
      else if (t.type === 'range') { f.budget = Number(t.value); updateBudget(); }
    });
    wrap.addEventListener('change', function (e) {
      var t = e.target, f = st.f;
      if (t.type === 'file') { setFile(t.files && t.files[0]); t.value = ''; }
      else if (t.name === 'areas') { f.areas = t.checked ? f.areas.concat([t.value]) : f.areas.filter(function (x) { return x !== t.value; }); updateDetailsDesc(); }
      else if (t.name === 'nobudget') { f.noBudget = t.checked; updateBudget(); }
      else if (t.name === id + '-channel') {
        f.channel = t.value;
        var opt = wrap.querySelector('[data-phone-opt]'); if (opt) opt.hidden = f.channel !== 'email';
        if (f.channel === 'email') clearError('phone');
      }
      else if (t.name === id + '-timing') { f.timing = t.value; }
    });
    wrap.addEventListener('dragover', function (e) { var d = e.target.closest && e.target.closest('[data-drop]'); if (d) { e.preventDefault(); d.classList.add('is-over'); } });
    wrap.addEventListener('dragleave', function (e) { var d = e.target.closest && e.target.closest('[data-drop]'); if (d) d.classList.remove('is-over'); });
    wrap.addEventListener('drop', function (e) { var d = e.target.closest && e.target.closest('[data-drop]'); if (d) { e.preventDefault(); setFile(e.dataTransfer && e.dataTransfer.files[0]); } });
    wrap.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && st.open) { e.stopPropagation(); close('escape'); return; }
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && st.open && !st.sent) { e.preventDefault(); send(); return; }
      /* the sheet is modal: keep Tab inside it */
      if (e.key === 'Tab' && st.open && isSheet()) {
        var els = Array.prototype.filter.call(wrap.querySelectorAll('.nsl-ask__panel button, .nsl-ask__panel input:not([type=hidden]):not([tabindex="-1"]):not([disabled]), .nsl-ask__panel textarea, .nsl-ask__panel a[href]'), function (x) { return x.offsetParent !== null || x.type === 'radio' || x.type === 'checkbox' || x.type === 'file'; });
        if (!els.length) return;
        var first = els[0], last = els[els.length - 1], cur = root.activeElement;
        if (e.shiftKey && cur === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && cur === last) { e.preventDefault(); first.focus(); }
      }
    });
    wrap.addEventListener('submit', function (e) { e.preventDefault(); send(); });

    /* triggers anywhere on the page: <a href="#" data-nsl-ask data-nsl-ask-area="storage" data-nsl-ask-from="Drive cage"> */
    function onDocClick(e) {
      var t = e.target.closest && e.target.closest('[data-nsl-ask]');
      if (!t) return;
      e.preventDefault();
      open({ source: 'trigger', trigger: t, area: t.getAttribute('data-nsl-ask-area') || '', from: t.getAttribute('data-nsl-ask-from') || '' });
    }
    document.addEventListener('click', onDocClick);
    function onDocKey(e) { if (e.key === 'Escape' && st.open && !(e.composedPath && e.composedPath().indexOf(host) > -1)) close('escape'); }
    document.addEventListener('keydown', onDocKey);
    function onMq() { if (st.open && isSheet()) document.documentElement.style.overflow = 'hidden'; else document.documentElement.style.overflow = ''; render(true); }
    [desktopMq, tabMq].forEach(function (m) { if (m.addEventListener) m.addEventListener('change', onMq); else if (m.addListener) m.addListener(onMq); });

    render();
    emit('ready', { version: VERSION });

    var api = {
      open: function (opts) { open(merge({ source: 'api' }, opts || {})); },
      close: function () { close('api'); },
      toggle: function () { st.open && !st.leaving ? close('api') : open({ source: 'api' }); },
      setBuild: function (b) { o.build = b; if (st.open) { build = readBuild(); render(true); } },
      reset: function () { st.sent = false; st.f = fresh(); render(true); },
      destroy: function () {
        close('api'); clearTimeout(leaveTimer);
        document.removeEventListener('click', onDocClick); document.removeEventListener('keydown', onDocKey);
        [desktopMq, tabMq].forEach(function (m) { if (m.removeEventListener) m.removeEventListener('change', onMq); });
        document.documentElement.style.overflow = '';
        if (ownHost) host.remove(); else { root.innerHTML = ''; }
      },
      get state() { return st.open ? (st.sent ? 'sent' : 'open') : 'closed'; },
      version: VERSION
    };
    return api;
  }

  global.NSLAsk = { mount: mount, version: VERSION, defaults: DEFAULTS };
})(typeof window !== 'undefined' ? window : this);
