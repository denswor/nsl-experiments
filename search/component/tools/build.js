/*
 * Builds the nsl-search package from the NSL Design System bundle:
 *   dist/nsl-search.js, .min.js      — from src/
 *   dist/nsl-search.css              — DS tokens + only the DS rules the search page content uses
 *   dist/nsl-ask.js, .min.js         — copied from ../../ask-specialist/component (v1.1, variant 'simple')
 *   demo/index.html, page-2..5.html  — static pages, markup rendered by the DS React components (react-dom/server)
 *   demo/demo-chrome.css             — header / footer rules, only for the demo (the live site has its own)
 *
 *   NODE_PATH=<dir with react@18 react-dom@18 cheerio postcss terser> node tools/build.js
 */
const fs = require('fs'), path = require('path');
const React = require('react'), Server = require('react-dom/server');
const cheerio = require('cheerio'), postcss = require('postcss'), terser = require('terser');

const PKG = path.resolve(__dirname, '..'), REPO = path.resolve(PKG, '../..');
const DS = path.join(REPO, '_shared/nsl');
const out = (p, s) => { fs.mkdirSync(path.dirname(path.join(PKG, p)), { recursive: true }); fs.writeFileSync(path.join(PKG, p), s); };

/* ---------- DS components in Node */
global.window = global; global.React = React;
global.document = { addEventListener() {}, removeEventListener() {}, documentElement: {} };
require(path.join(DS, 'bundle.js'));
const N = global.NSL, h = React.createElement;
const html = el => Server.renderToStaticMarkup(el);
const icon = (name, size) => html(h(N.Icon, { name, size }));

/* ---------- mock index: the same rows as the prototype */
const TOTAL = 47, PER = 10, PAGES = Math.ceil(TOTAL / PER), QUERY = 'dl380 8x nvme';
const A = 'assets/';
const BASE = [
  { id: 101, kind: 'product', typeLabel: 'Chassis', image: A + 'dl380-16sff.webp', title: 'HPE ProLiant DL380 Gen10 16SFF (8x NVMe)', badges: ['in-stock'], ctaType: 'configure' },
  { id: 102, kind: 'product', typeLabel: 'Server model', image: A + 'dl380-8sff.webp', title: 'HPE ProLiant DL380 Gen10', ctaType: 'configure', cta: 'Choose Chassis' },
  { id: 201, kind: 'article', typeLabel: 'Blog', meta: '7 min read', image: A + 'blog-datacenter.webp', title: 'NVMe in the DL380 Gen10: which cages and risers you need for 8, 16 and 24 drives', excerpt: 'Drive cage options, PCIe lane limits and what to pick for a database or a virtualization host.' },
  { id: 103, kind: 'product', typeLabel: 'Server', image: A + 'dl-bezel.webp', title: 'DL380 Gen10 · 2x Gold 6248 · 256GB · 8x 1.92TB NVMe', badges: ['prebuild', 'in-stock'], ctaType: 'cart' },
  { id: 301, kind: 'page', title: 'How we test NVMe drives before shipping', breadcrumbs: ['Home', 'Service', 'Testing'], excerpt: 'Every drive passes a SMART check, a full write pass and a speed test. Here is what goes into the report.' },
  { id: 104, kind: 'product', typeLabel: 'Chassis', image: A + 'dl380-24sff.webp', title: 'HPE ProLiant DL380 Gen10 24SFF (24x NVMe)', badges: ['in-stock'], ctaType: 'configure' },
  { id: 105, kind: 'product', typeLabel: 'Component', image: A + 'cage-8sff-nvme.webp', title: 'HPE DL380 Gen10 8SFF NVMe Drive Cage Kit', badges: ['in-stock'], ctaType: 'cart' },
  { id: 202, kind: 'article', typeLabel: 'Blog', meta: '5 min read', image: A + 'blog-cpu.webp', title: 'Gen10 or Gen10 Plus: what changed in the storage subsystem', excerpt: 'PCIe 4.0, new drive cages and what it means for NVMe-heavy builds on the DL380.' },
  { id: 106, kind: 'product', typeLabel: 'Component', image: A + 'nvme-drive.webp', title: 'HPE 1.92TB NVMe U.2 SFF Drive', badges: ['in-stock'], ctaType: 'cart' },
  { id: 302, kind: 'page', title: 'Delivery and payment', breadcrumbs: ['Home', 'Delivery'], excerpt: 'Delivery times, packaging and freight insurance; payment options for companies.' }
];
const ORDERS = [[0,1,2,3,4,5,6,7,8,9], [5,7,2,9,0,3,8,4,6,1], [8,3,6,0,9,2,1,7,4,5], [3,9,4,6,1,8,0,5,2,7], [6,0,8,1,5,9,3,2,7,4]];
const pageRows = n => ORDERS[n - 1].slice(0, Math.min(PER, TOTAL - (n - 1) * PER)).map(i => BASE[i]);
const pageUrl = n => n === 1 ? 'index.html' : `page-${n}.html`;

/* ---------- one result row: DS SearchResult + live-site hooks (links, cart button data) */
function row(r) {
  const $ = cheerio.load(html(h(N.SearchResult, { kind: r.kind, query: QUERY, title: r.title, href: '#', typeLabel: r.typeLabel, image: r.image,
    badges: r.badges, excerpt: r.excerpt, meta: r.meta, breadcrumbs: r.breadcrumbs, ctaType: r.ctaType, cta: r.cta })), null, false);
  $('img').attr('alt', '').attr('loading', 'lazy').attr('decoding', 'async');
  const btn = $('.nsl-sres__buy .nsl-btn');
  if (r.ctaType === 'configure') { btn.get(0).tagName = 'a'; btn.removeAttr('type').attr('href', '#'); }
  else btn.attr('data-nsl-cart', String(r.id));   // the live cart script binds here
  return $.html();
}

/* ---------- pagination as links (DS Pagination renders buttons for the React app) */
function pageList(cur, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const out = [1]; let a = Math.max(2, cur - 1), b = Math.min(total - 1, cur + 1);
  if (cur <= 3) { a = 2; b = 4; } if (cur >= total - 2) { a = total - 3; b = total - 1; }
  if (a > 2) out.push('…'); for (let i = a; i <= b; i++) out.push(i); if (b < total - 1) out.push('…'); out.push(total); return out;
}
function navLink(cur, dir) {
  const t = cur + dir, label = dir < 0 ? 'Previous page' : 'Next page', ic = icon(dir < 0 ? 'chevron-left' : 'chevron-right', 16);
  return t < 1 || t > PAGES
    ? `<span class="nsl-page nsl-page--nav" aria-disabled="true" aria-label="${label}">${ic}</span>`
    : `<a class="nsl-page nsl-page--nav" href="${pageUrl(t)}" aria-label="${label}" rel="${dir < 0 ? 'prev' : 'next'}">${ic}</a>`;
}
function pager(cur) {
  return `<nav class="nsl-pagination" aria-label="Pagination">${navLink(cur, -1)}` +
    pageList(cur, PAGES).map(n => n === '…' ? '<span class="nsl-page nsl-page--ellipsis">···</span>'
      : n === cur ? `<a class="nsl-page is-active" href="${pageUrl(n)}" aria-current="page">${n}</a>` : `<a class="nsl-page" href="${pageUrl(n)}">${n}</a>`).join('') +
    `${navLink(cur, 1)}</nav>`;
}
function pagerCompact(cur) {
  return `<nav class="nsl-pagination nsl-pagination--compact" aria-label="Pagination" data-nsl-pager-compact>${navLink(cur, -1)}<span class="nsl-pagination__count"><b>${cur}</b> / ${PAGES}</span>${navLink(cur, 1)}</nav>`;
}

/* ---------- search field (form that works without JS: GET ?q=) */
function searchForm(cls) {
  const $ = cheerio.load(html(h(N.SearchField, { className: cls, defaultValue: QUERY, 'aria-label': 'Search NewServerLife' })), null, false);
  $('form').attr('action', 'index.html').attr('method', 'get');
  $('input').attr('name', 'q').attr('value', QUERY).attr('autocomplete', 'off');
  return $.html();
}

/* ---------- page chrome (demo only: the live site keeps its own header and footer) */
function header() {
  const $ = cheerio.load(html(h(N.Header, { active: 'Hardware', cartCount: 2, searchValue: QUERY })), null, false);
  $('.nsl-header__searchwrap').attr('data-nsl-suggest', '').html(searchForm('nsl-header__search'));
  return $.html();
}
const mobileHeader = () => html(h(N.MobileHeader, { cartCount: 2 }));
const footer = v => html(h(N.Footer, { variant: v }));

function page(n) {
  const rows = pageRows(n), from = (n - 1) * PER + 1, to = from + rows.length - 1;
  const left = TOTAL - n * PER, next = n < PAGES ? pageUrl(n + 1) : '';
  const crumbs = html(h(N.Breadcrumbs, { items: [{ label: 'Home', href: '#' }, { label: 'Search results for' }] }));
  const summary = html(h(N.SearchSummary, { query: QUERY, count: TOTAL }));
  const help = `<section class="nsl-srp__help" aria-labelledby="nsl-srp-help-t">
        <h2 id="nsl-srp-help-t">Can’t find the right configuration?</h2>
        <p>An engineer will pick a server for your workload.</p>
        ${html(h(N.Button, { variant: 'primary', size: 'md', iconLeft: 'mail', fullWidth: true, 'data-nsl-ask': '', 'data-nsl-ask-from': 'Search results' }, 'Request a Configuration'))}
      </section>`;
  const more = next ? html(h(N.Button, { variant: 'ghost', size: 'lg', iconLeft: 'plus', fullWidth: true, 'data-nsl-more': '', 'data-next': next }, `Show ${Math.min(PER, left)} more`)) : '';
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Search results — ${QUERY}${n > 1 ? ' — page ' + n : ''}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap">
<link rel="stylesheet" href="../dist/nsl-search.css">
<link rel="stylesheet" href="demo-chrome.css">
</head>
<body class="nsl-srp-body">

<!-- ===== demo chrome: header (desktop ≥1024 / phone) — on the live site this is your own header ===== -->
<div class="demo-desk">${header()}</div>
<div class="demo-mob">${mobileHeader()}</div>

<!-- ===== search page: everything below goes into the search.page template ===== -->
<div class="nsl-srp__band">
  <div class="nsl-search-combo" data-nsl-suggest="">${searchForm()}</div>
</div>

<main class="nsl-container nsl-srp">
  ${crumbs}
  ${summary}
  <div class="nsl-srp__layout">
    <div class="nsl-srp__results" id="results">
      <section class="nsl-srp__list" data-nsl-results aria-label="Search results">
${rows.map(row).join('\n')}
      </section>
      <div class="nsl-srp__pager" data-nsl-pager>${pager(n)}</div>
      <div class="nsl-srp__more">
        ${more}
        <p class="nsl-srp__count" role="status" data-nsl-count data-from="${from}" data-to="${to}" data-total="${TOTAL}">Showing ${from}–${to} of ${TOTAL}</p>
        ${pagerCompact(n)}
      </div>
    </div>
    <aside class="nsl-srp__aside" aria-label="Help">
      ${help}
    </aside>
  </div>
</main>

<!-- ===== demo chrome: footer ===== -->
<!-- the footer goes wide (≥1680) together with .nsl-container -->
<div class="demo-desk demo-std">${footer('desktop')}</div>
<div class="demo-desk demo-wide">${footer('wide')}</div>
<div class="demo-mob">${footer('mobile')}</div>

<script src="../dist/nsl-ask.js" defer></script>
<script src="../dist/nsl-search.js" defer></script>
<script src="demo-suggest.js" defer></script>
<script>
document.addEventListener('DOMContentLoaded', function () {
  /* live site: NSLSearch works from data-nsl-suggest="/ajax/search-suggest.php" alone; the demo answers from a local list */
  NSLSearch.init({ source: window.demoSuggest });
  /* live site: endpoint: '/ajax/ask-specialist.php', extraFields: { sessid: BX.bitrix_sessid() } */
  NSLAsk.mount({ variant: 'simple' });
});
</script>
</body>
</html>
`;
}

/* ---------- CSS: keep only rules whose nsl-* classes are all used by the given markup */
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
      const wcls = where ? where.join(' ').match(/\.(nsl-[\w-]+)/g).map(c => c.slice(1)) : [];
      if (!cls.length && !wcls.length) return false;
      return cls.every(c => used.has(c)) && (!wcls.length || wcls.some(c => used.has(c)));
    });
    if (!keep.length) rule.remove(); else rule.selectors = keep;
  });
  root.walkAtRules(a => { if (!/keyframes|font-face/.test(a.name) && !a.nodes.length) a.remove(); });
  root.walkAtRules(a => { if (!/keyframes|font-face/.test(a.name) && !a.nodes.length) a.remove(); });
  return root.toString().replace(/\n{2,}/g, '\n');
}

(async () => {
  /* pages */
  const pages = [];
  for (let n = 1; n <= PAGES; n++) { pages.push(page(n)); out('demo/' + pageUrl(n), pages[n - 1]); }

  /* split the markup: page content vs demo chrome */
  const content = pages.map(p => { const $ = cheerio.load(p); $('.demo-desk, .demo-mob, .demo-wide, script').remove(); return $('body').html(); }).join('');
  const chrome = header() + mobileHeader() + footer('desktop') + footer('wide') + footer('mobile');
  const JS_CLASSES = ['nsl-search-combo', 'nsl-psearch', 'nsl-psearch__row', 'nsl-psearch__row--all', 'nsl-psearch__cat', 'nsl-psearch__items', 'nsl-psearch__item', 'nsl-psearch__meta', 'nsl-psearch__match', 'is-active', 'is-new'];
  const used = classesOf(content); JS_CLASSES.forEach(c => used.add(c));
  const chromeUsed = classesOf(chrome); ['nsl-header__suggest', 'nsl-psearch'].forEach(c => chromeUsed.add(c));

  const bundle = fs.readFileSync(path.join(DS, 'bundle.css'), 'utf8');
  const tokens = postcss.parse(fs.readFileSync(path.join(DS, 'tokens.css'), 'utf8'));
  tokens.walkComments(c => c.remove()); tokens.walkAtRules('font-face', r => r.remove());
  const contentCss = subset(bundle, used);
  /* chrome = rules the header/footer need that the content file does not already carry */
  const have = new Set(postcss.parse(contentCss).nodes.map(n => n.toString()));
  const chromeCss = postcss.parse(subset(bundle, new Set([...chromeUsed, ...used]))).nodes.filter(n => !have.has(n.toString())).map(n => n.toString()).join('\n');

  const pageCss = fs.readFileSync(path.join(PKG, 'src/page.css'), 'utf8');
  const v = require(path.join(PKG, 'package.json')).version;
  out('dist/nsl-search.css', `/*! nsl-search v${v} — NSL Design System tokens + the components the search results page uses (SearchField, PredictiveSearch, SearchSummary, SearchResult, Breadcrumbs, Pagination, Button, badges) + page layout. */\n` +
    '/* ---------- tokens ---------- */\n' + tokens.toString().replace(/\n{2,}/g, '\n') +
    '\n/* ---------- components (from the DS bundle) ---------- */\n' + contentCss +
    '\n/* ---------- search page ---------- */\n' + pageCss);
  out('demo/demo-chrome.css', '/* Demo only: DS Header, MobileHeader and Footer rules. The live site keeps its own header and footer. */\n' + chromeCss +
    '\n.demo-mob, .demo-wide { display: none; }\n@media (min-width: 1680px) { .demo-std { display: none; } .demo-wide { display: block; } }\n@media (max-width: 1023px) { .demo-desk { display: none; } .demo-mob { display: block; } .demo-mob .nsl-mheader { position: relative; z-index: 41; } }\n');

  /* scripts */
  const src = fs.readFileSync(path.join(PKG, 'src/nsl-search.js'), 'utf8');
  out('dist/nsl-search.js', src);
  out('dist/nsl-search.min.js', (await terser.minify(src, { format: { comments: /^!/ } })).code);
  const ask = path.join(REPO, 'ask-specialist/component');
  out('dist/nsl-ask.js', fs.readFileSync(path.join(ask, 'nsl-ask.js'), 'utf8'));
  const askMin = (await terser.minify(fs.readFileSync(path.join(ask, 'nsl-ask.js'), 'utf8'), { format: { comments: /^!/ } })).code;
  out('dist/nsl-ask.min.js', askMin);
  fs.writeFileSync(path.join(ask, 'nsl-ask.min.js'), askMin);

  /* demo assets */
  fs.mkdirSync(path.join(PKG, 'demo/assets'), { recursive: true });
  for (const f of fs.readdirSync(path.join(REPO, 'search/assets'))) fs.copyFileSync(path.join(REPO, 'search/assets', f), path.join(PKG, 'demo/assets', f));

  /* Bitrix: DS markup snippets the PHP templates print as is (icons, badges) */
  const php = s => "'" + s.replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";
  const snip = {
    crumbSep: html(h(N.Icon, { name: 'arrow-right', size: 12, className: 'nsl-crumbs__sep' })),
    prev: icon('chevron-left', 16), next: icon('chevron-right', 16),
    fileText: icon('file-text', 20), placeholderProduct: icon('hard-drive', 32), placeholderArticle: icon('file-text', 32),
    btnCart: icon('nsl-shopping-cart', 20), btnConfigure: icon('nsl-gear', 20), btnQuote: icon('mail', 20),
    btnMore: icon('plus', 24), btnHelp: icon('mail', 20), searchGo: icon('nsl-search', 20)
  };
  ['in-stock', 'new', 'hot', 'on-request', 'prebuild'].forEach(t => { snip['badge:' + t] = html(h(N.ProductBadge, { type: t })); });
  out('bitrix/components/bitrix/search.page/nsl/nsl_snippets.php', '<?php\n/* Generated by tools/build.js from the NSL Design System bundle — do not edit by hand. */\nif (!defined("B_PROLOG_INCLUDED") || B_PROLOG_INCLUDED !== true) die();\nreturn [\n' +
    Object.keys(snip).map(k => '    ' + php(k) + ' => ' + php(snip[k]) + ',').join('\n') + '\n];\n');

  console.log('pages', PAGES, '· css', Buffer.byteLength(fs.readFileSync(path.join(PKG, 'dist/nsl-search.css'))), 'B · chrome', chromeCss.length, 'B');
})();
