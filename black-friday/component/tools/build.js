/*
 * Builds the nsl-bf package (Black Friday hero) from the NSL Design System bundle:
 *   dist/nsl-bf.css               — DS tokens + the DS Button rules the CTA uses + hero styles (src/bf.css)
 *   dist/nsl-bf.js, .min.js       — rim light (src/nsl-bf.js)
 *   dist/assets/                  — server photo
 *   snippets/bf-hero.html         — the hero markup to paste into any template
 *   bitrix/include/nsl-bf-hero.php — the same markup as a Bitrix include with settings
 *   demo/index.html, demo-chrome.css — the hero under the DS header, white page below (demo only)
 *   nsl-bf-<version>.zip          — everything above for developers
 *
 *   NODE_PATH=<dir with react@18 react-dom@18 cheerio postcss terser> node tools/build.js
 */
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const React = require('react'), Server = require('react-dom/server');
const cheerio = require('cheerio'), postcss = require('postcss'), terser = require('terser');

const PKG = path.resolve(__dirname, '..'), REPO = path.resolve(PKG, '../..');
const DS = path.join(REPO, '_shared/nsl');
const VERSION = require(path.join(PKG, 'package.json')).version;
const out = (p, s) => { fs.mkdirSync(path.dirname(path.join(PKG, p)), { recursive: true }); fs.writeFileSync(path.join(PKG, p), s); };

/* ---------- DS components in Node */
global.window = global; global.React = React;
global.document = { addEventListener() {}, removeEventListener() {}, documentElement: {} };
require(path.join(DS, 'bundle.js'));
const N = global.NSL, h = React.createElement;
const html = el => Server.renderToStaticMarkup(el);

/* ---------- copy (placeholders in [brackets] are for marketing to fill in) */
const COPY = {
  dates: 'Nov 16 – 30',
  lead: 'Five years of hardware warranty, on us. A 5-year extension normally costs +20% of the server price. This Black Friday, it’s included on selected Dell and HPE servers.',
  ctaLabel: 'Shop Black Friday deals',
  ctaHref: '/black-friday/',
  fine: 'Offer ends November 30, 2026',
  image: '/local/templates/nsl/images/black-friday/server-r740xd-lit.webp'
};
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const MARK = 'M21.9512 685C18.1566 685 14.374 684.016 10.9756 682.06C4.19091 678.136 0 670.901 0 663.053V433.646C0 379.924 28.1595 332.441 75.3043 306.642C122.473 280.843 177.663 282.715 222.971 311.646L261.698 336.377C293.268 356.548 331.742 357.856 364.609 339.869C397.476 321.882 417.098 288.787 417.098 251.348V59.9317L252.451 154.908V255.668C252.451 267.788 242.628 277.603 230.5 277.603C218.372 277.603 208.549 267.788 208.549 255.668V142.249C208.549 134.413 212.74 127.165 219.524 123.253L428.073 2.93389C434.87 -0.977963 443.24 -0.977963 450.024 2.93389C456.821 6.85774 461 14.0935 461 21.9292V251.336C461 305.058 432.84 352.541 385.696 378.352C338.539 404.151 283.337 402.279 238.029 373.348L199.302 348.617C167.732 328.458 129.246 327.15 96.3789 345.125C63.5121 363.1 43.8905 396.195 43.8905 433.646V625.062L208.525 530.074V429.314C208.525 417.194 218.348 407.379 230.476 407.379C242.604 407.379 252.427 417.194 252.427 429.314V542.733C252.427 550.569 248.236 557.817 241.452 561.729L32.9269 682.06C29.5405 684.016 25.7459 685 21.9512 685Z';

/* the CTA is the DS Button (primary, xl, arrow right); the hook data-nsl-bf-cta is for the click event */
function ctaButton(href, label) {
  const $ = cheerio.load(html(h(N.Button, { variant: 'primary', size: 'xl', iconRight: 'arrow-right', href: '__HREF__' }, '__LABEL__')), null, false);
  $('a').attr('data-nsl-bf-cta', '');
  return $.html().replace('__HREF__', href).replace('__LABEL__', label);
}

/* v: already-escaped values (HTML) or PHP echo tags */
function hero(v) {
  return `<section class="nsl-bf nsl-on-dark" data-nsl-bf aria-labelledby="nsl-bf-title">
  <svg class="nsl-bf__mark" data-nsl-bf-mark viewBox="0 0 461 685" aria-hidden="true" focusable="false">
    <defs>
      <path id="nsl-bf-mk" d="${MARK}"/>
      <linearGradient id="nsl-bf-lg" x1="230" y1="685" x2="230" y2="0" gradientUnits="userSpaceOnUse">
        <stop stop-color="#2e67b1"/><stop offset=".28" stop-color="#558fcb"/><stop offset=".67" stop-color="#92278e"/><stop offset="1" stop-color="#cb1c68"/>
      </linearGradient>
      <radialGradient id="nsl-bf-spot-idle" cx="230" cy="340" r="210" gradientUnits="userSpaceOnUse">
        <stop stop-color="#fff"/><stop offset=".35" stop-color="#ff7be3"/><stop offset="1" stop-color="#7b5cff" stop-opacity="0"/>
        <animate attributeName="cx" values="20;440;300;20" dur="9s" repeatCount="indefinite"/>
        <animate attributeName="cy" values="620;80;420;620" dur="9s" repeatCount="indefinite"/>
      </radialGradient>
      <radialGradient id="nsl-bf-spot" data-nsl-bf-spot cx="230" cy="340" r="210" gradientUnits="userSpaceOnUse">
        <stop stop-color="#fff"/><stop offset=".35" stop-color="#ff7be3"/><stop offset="1" stop-color="#7b5cff" stop-opacity="0"/>
      </radialGradient>
      <filter id="nsl-bf-bl" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="9"/></filter>
      <filter id="nsl-bf-au" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="50"/></filter>
    </defs>
    <use href="#nsl-bf-mk" fill="url(#nsl-bf-lg)" opacity=".22" filter="url(#nsl-bf-au)"/>
    <use class="nsl-bf__rim-base" href="#nsl-bf-mk" fill="#0e0919" stroke="url(#nsl-bf-lg)" stroke-opacity=".5"/>
    <use class="nsl-bf__rim-glow" data-nsl-bf-rim href="#nsl-bf-mk" fill="none" stroke="url(#nsl-bf-spot-idle)" filter="url(#nsl-bf-bl)"/>
    <use class="nsl-bf__rim-line" data-nsl-bf-rim href="#nsl-bf-mk" fill="none" stroke="url(#nsl-bf-spot-idle)"/>
  </svg>

  <div class="nsl-bf__stack">
    <div class="nsl-bf__text">
      <p class="nsl-bf__eyebrow">Special offer<span class="nsl-bf__d"> · </span><br class="nsl-bf__m">${v.dates}</p>
      <h1 class="nsl-bf__title" id="nsl-bf-title">BLACK<span class="nsl-bf__d"> </span><br class="nsl-bf__m">FRIDAY</h1>
      <p class="nsl-bf__lead">${v.lead}</p>
    </div>
    <div class="nsl-bf__media" aria-hidden="true"><img class="nsl-bf__server" src="${v.image}" alt="" width="1800" height="600" decoding="async" fetchpriority="low"></div>
    <div class="nsl-bf__action">
      ${ctaButton(v.ctaHref, v.ctaLabel)}
      <p class="nsl-bf__fine">${v.fine}</p>
    </div>
  </div>
</section>`;
}

const htmlValues = o => Object.fromEntries(Object.entries(o).map(([k, s]) => [k, esc(s)]));

/* ---------- CSS: keep only rules whose nsl-* classes are all used by the given markup (same approach as nsl-search) */
function classesOf(markup) {
  const set = new Set(); const re = /class="([^"]*)"/g; let m;
  while ((m = re.exec(markup))) m[1].split(/\s+/).filter(Boolean).forEach(c => set.add(c));
  return set;
}
function subset(css, used) {
  const root = postcss.parse(css);
  root.walkComments(c => c.remove());
  root.walkAtRules('font-face', r => r.remove());
  root.walkRules(rule => {
    if (rule.parent && rule.parent.type === 'atrule' && /keyframes/.test(rule.parent.name)) return;
    const keep = rule.selectors.filter(sel => {
      const where = sel.match(/:where\(([^)]*)\)/g);
      const plain = sel.replace(/:where\([^)]*\)/g, '');
      const cls = (plain.match(/\.(nsl-[\w-]+)/g) || []).map(c => c.slice(1));
      const wcls = where ? (where.join(' ').match(/\.(nsl-[\w-]+)/g) || []).map(c => c.slice(1)) : [];
      if (!cls.length && !wcls.length) return false;
      return cls.every(c => used.has(c)) && (!wcls.length || wcls.some(c => used.has(c)));
    });
    if (!keep.length) rule.remove(); else rule.selectors = keep;
  });
  for (let i = 0; i < 2; i++) root.walkAtRules(a => { if (!/keyframes|font-face/.test(a.name) && !a.nodes.length) a.remove(); });
  return root.toString().replace(/\n{2,}/g, '\n');
}

/* ---------- demo page (the live site keeps its own header) */
function demo(heroMarkup) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Black Friday — NewServerLife</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&family=IBM+Plex+Sans:wght@400;500;600;700&family=Montserrat:wght@900&display=swap">
<link rel="stylesheet" href="../dist/nsl-bf.css">
<link rel="stylesheet" href="demo-chrome.css">
</head>
<body>

<!-- ===== demo chrome: header (desktop ≥1024 / phone) — on the live site this is your own header ===== -->
<div class="demo-desk">${html(h(N.Header, { active: 'Home' }))}</div>
<div class="demo-mob">${html(h(N.MobileHeader, {}))}</div>

<!-- ===== Black Friday hero: snippets/bf-hero.html ===== -->
${heroMarkup}

<!-- ===== the regular page continues on white (placeholder) ===== -->
<main class="demo-page">
  <h2>Black Friday deals</h2>
  <p>[Здесь будут акционные товары]</p>
</main>

<script src="../dist/nsl-bf.js" defer></script>
<script>
  /* analytics hook example: the script also pushes { event: 'bf_view' | 'bf_cta_click' } to window.dataLayer */
  document.addEventListener('nsl-bf', function (e) { console.log('nsl-bf', e.detail); });
</script>
</body>
</html>
`;
}

/* ---------- Bitrix include */
function bitrix() {
  const php = {
    dates: '<?= $e($bf[\'dates\']) ?>', lead: '<?= $e($bf[\'lead\']) ?>', ctaLabel: '<?= $e($bf[\'cta_label\']) ?>',
    ctaHref: '<?= $e($bf[\'cta_href\']) ?>', fine: '<?= $e($bf[\'fine\']) ?>', image: '<?= $e($bf[\'image\']) ?>'
  };
  const q = s => "'" + String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";
  return `<?php
/*
 * nsl-bf v${VERSION} — Black Friday hero for newserverlife.com.
 * Generated by tools/build.js from the NSL Design System bundle: change the copy here or through $NSL_BF, not the markup.
 *
 * Usage (on the home page, right under the header):
 *   $NSL_BF = ['dates' => 'Nov 16 – 30', 'fine' => 'Offer ends November 30, 2026'];   // optional, overrides the defaults below
 *   include $_SERVER['DOCUMENT_ROOT'] . '/local/templates/nsl/include/nsl-bf-hero.php';
 * CSS and JS: /local/templates/nsl/css/nsl-bf.css and /local/templates/nsl/js/nsl-bf.min.js (see README).
 */
if (!defined('B_PROLOG_INCLUDED') || B_PROLOG_INCLUDED !== true) die();

$bf = array_merge([
    'dates'     => ${q(COPY.dates)},
    'lead'      => ${q(COPY.lead)},
    'cta_label' => ${q(COPY.ctaLabel)},
    'cta_href'  => ${q(COPY.ctaHref)},
    'fine'      => ${q(COPY.fine)},
    'image'     => ${q(COPY.image)},
], isset($NSL_BF) && is_array($NSL_BF) ? $NSL_BF : []);
$e = function ($s) { return htmlspecialcharsbx((string) $s); };
?>
${hero(php)}
`;
}

(async () => {
  /* markup */
  const snippetMarkup = hero(htmlValues(COPY));
  const demoMarkup = hero(htmlValues(Object.assign({}, COPY, { image: '../dist/assets/server-r740xd-lit.webp', ctaHref: '#deals' })));
  out('snippets/bf-hero.html', `<!-- nsl-bf v${VERSION}: Black Friday hero. Put it right under the site header.
     Needs dist/nsl-bf.css in <head> and dist/nsl-bf.min.js (defer). Fonts: IBM Plex Sans, IBM Plex Mono, Montserrat 900.
     Fill in the [placeholders]; point src at the uploaded server photo. One hero per page (the SVG uses fixed ids nsl-bf-*). -->
${snippetMarkup}
`);
  out('bitrix/include/nsl-bf-hero.php', bitrix());
  out('demo/index.html', demo(demoMarkup));

  /* CSS */
  const used = classesOf(snippetMarkup);
  const bundle = fs.readFileSync(path.join(DS, 'bundle.css'), 'utf8');
  const tokens = postcss.parse(fs.readFileSync(path.join(DS, 'tokens.css'), 'utf8'));
  tokens.walkComments(c => c.remove()); tokens.walkAtRules('font-face', r => r.remove());
  const dsCss = subset(bundle, used);
  const bfCss = fs.readFileSync(path.join(PKG, 'src/bf.css'), 'utf8');
  out('dist/nsl-bf.css', `/*! nsl-bf v${VERSION} — NSL Design System tokens + DS Button (the CTA) + Black Friday hero. */\n` +
    '/* ---------- tokens ---------- */\n' + tokens.toString().replace(/\n{2,}/g, '\n') +
    '\n/* ---------- components (from the DS bundle) ---------- */\n' + dsCss +
    '\n/* ---------- Black Friday hero ---------- */\n' + bfCss);

  /* demo chrome: header rules not already in nsl-bf.css */
  const chrome = html(h(N.Header, { active: 'Home' })) + html(h(N.MobileHeader, {}));
  const have = new Set(postcss.parse(dsCss).nodes.map(n => n.toString()));
  const chromeCss = postcss.parse(subset(bundle, new Set([...classesOf(chrome), ...used]))).nodes.filter(n => !have.has(n.toString())).map(n => n.toString()).join('\n');
  out('demo/demo-chrome.css', '/* Demo only: DS Header and MobileHeader rules and the white page. The live site keeps its own header. */\n' + chromeCss +
    '\nbody { margin: 0; background: var(--bg-default); color: var(--text-primary); font-family: "IBM Plex Sans", system-ui, sans-serif; }' +
    '\n.demo-mob { display: none; }\n@media (max-width: 1023px) { .demo-desk { display: none; } .demo-mob { display: block; } }' +
    '\n.demo-page { padding: 64px 24px 96px; text-align: center; }\n.demo-page h2 { margin: 0; font: var(--text-heading-2xl); letter-spacing: -0.02em; }' +
    '\n.demo-page p { margin: 12px 0 0; font: var(--text-body-md); color: var(--text-secondary); }' +
    '\n@media (max-width: 719px) { .demo-page { padding: 40px 16px 64px; } .demo-page h2 { font: var(--text-heading-lg); } }\n');

  /* JS */
  const src = fs.readFileSync(path.join(PKG, 'src/nsl-bf.js'), 'utf8');
  out('dist/nsl-bf.js', src);
  out('dist/nsl-bf.min.js', (await terser.minify(src, { format: { comments: /^!/ } })).code);

  /* assets */
  fs.mkdirSync(path.join(PKG, 'dist/assets'), { recursive: true });
  fs.copyFileSync(path.join(PKG, 'src/server-r740xd-lit.webp'), path.join(PKG, 'dist/assets/server-r740xd-lit.webp'));

  /* ZIP for developers */
  const zip = `nsl-bf-${VERSION}.zip`;
  try { fs.unlinkSync(path.join(PKG, zip)); } catch (e) {}
  execSync(`zip -qr -X ${zip} README.md CHANGELOG.md package.json dist snippets bitrix demo src tools`, { cwd: PKG });

  console.log('css', Buffer.byteLength(fs.readFileSync(path.join(PKG, 'dist/nsl-bf.css'))), 'B · js min',
    Buffer.byteLength(fs.readFileSync(path.join(PKG, 'dist/nsl-bf.min.js'))), 'B · zip', fs.statSync(path.join(PKG, zip)).size, 'B');
})();
