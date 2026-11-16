#!/usr/bin/env node
/*
 * Catalog menu (Black Friday dark, badges variant 4) — static build for developers.
 *
 * Renders the DS Header and CatalogMenu with react-dom/server, expands the menu into
 * every brand × category panel (switched by js/catalog-menu.js), cuts the DS CSS down to
 * the classes used on the page and writes dist/ plus the zip.
 *
 *   NODE_PATH=/path/to/node_modules node tools/build.js
 *
 * Needs: react@18, react-dom@18, cheerio@1, postcss@8, terser@5, and `zip` on PATH.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const React = require('react');
const S = require('react-dom/server');
const cheerio = require('cheerio');
const postcss = require('postcss');
const { minify } = require('terser');

const ROOT = path.resolve(__dirname, '..');
const DS = path.resolve(ROOT, '../../_shared/nsl');
const DIST = path.join(ROOT, 'dist');
const VERSION = require(path.join(ROOT, 'package.json')).version;
const BANNER = path.resolve(ROOT, '../bf-banner.png');

// ---- DS bundle; DEFAULT_CATALOG is private, expose it for the build only ----
global.window = global; global.React = React;
const warn = console.error; console.error = (m, ...a) => { if (!/useLayoutEffect does nothing on the server/.test(String(m))) warn(m, ...a); };
global.document = { addEventListener() {}, removeEventListener() {}, documentElement: {} };
let src = fs.readFileSync(path.join(DS, 'bundle.js'), 'utf8');
const hook = 'function CatalogMenu(p) {';
if (!src.includes(hook)) throw new Error('CatalogMenu not found in bundle.js');
src = src.replace(hook, hook + ' window.__NSL_CATALOG = DEFAULT_CATALOG;');
new Function(src)();
const NSL = global.NSL;
const r = (C, p) => S.renderToStaticMarkup(React.createElement(C, p));

r(NSL.CatalogMenu, {});
const CATALOG = global.__NSL_CATALOG;
if (!CATALOG) throw new Error('DEFAULT_CATALOG not captured');

// ---- Header: closed markup + the open button icon ----
const $h = cheerio.load(r(NSL.Header, { cartCount: 0, catalogBestsellers: false }), null, false);
const $o = cheerio.load(r(NSL.Header, { cartCount: 0, catalogBestsellers: false, defaultOpen: 'catalog' }), null, false);
const btn = $h('.nsl-catalog');
const iconOpen = btn.children('svg').first();
const iconClose = $o('.nsl-catalog').children('svg').first();
iconOpen.addClass('cm-ic-open');
iconClose.addClass('cm-ic-close');
iconOpen.after($o.html(iconClose));
btn.attr({ 'data-cm-toggle': '', 'aria-controls': 'nsl-catalog-menu', 'aria-expanded': 'false' });

// ---- Catalog: one render per brand × category ----
function menu(brandIndex, catIndex) {
  const brands = JSON.parse(JSON.stringify(CATALOG));
  const cats = brands[brandIndex].categories;
  cats.unshift(cats.splice(catIndex, 1)[0]);           // the component shows category 0
  const html = r(NSL.CatalogMenu, { brands, defaultBrand: brandIndex, showBestsellers: false });
  return cheerio.load(html, null, false);
}
const $m = menu(0, 0);
const shell = $m('.nsl-catmenu');
shell.attr({ id: 'nsl-catalog-menu', 'data-cm': '', hidden: '' }).addClass('nsl-catmenu--bf');
const inner = shell.children('.nsl-catmenu__in');

// brand tabs: own label class, data attribute
inner.find('.nsl-catmenu__brand').each((i, el) => {
  $m(el).attr('data-cm-brand', String(i));
  $m(el).find('.nsl-catmenu__bname').attr('class', 'cm-brand-name');
});
// Black Friday banner at the end of the brand row
inner.children('.nsl-catmenu__brands').append(
  '<a class="cm-banner" href="#" aria-label="Black Friday: free 5-year warranty on Dell Gen 15, 16 and 17. View details">' +
  '<img src="assets/bf-banner.png" width="1144" height="128" alt=""></a>');

// replace cats / cols / all with brand panels
inner.children('.nsl-catmenu__cats, .nsl-catmenu__cols, .nsl-catmenu__all').remove();
let panels = '';
CATALOG.forEach((brand, b) => {
  let cats = '';
  let catPanels = '';
  brand.categories.forEach((cat, c) => {
    const $c = menu(b, c);
    const i2 = $c('.nsl-catmenu__in');
    if (c === 0 && brand.categories.length > 1) {
      // categories row in the original order, first one active
      const $r = cheerio.load(r(NSL.CatalogMenu, { brands: CATALOG, defaultBrand: b, showBestsellers: false }), null, false);
      const row = $r('.nsl-catmenu__cats');
      row.find('.nsl-catmenu__cat').each((k, el) => $r(el).attr('data-cm-cat', String(k)));
      cats = $r.html(row);
    }
    const body = i2.children('.nsl-catmenu__cols, .nsl-catmenu__all').toArray().map((el) => $c.html(el)).join('');
    catPanels += '<div data-cm-cat-panel="' + c + '"' + (c ? ' hidden' : '') + '>' + body + '</div>';
  });
  panels += '<div data-cm-brand-panel="' + b + '"' + (b ? ' hidden' : '') + '>' + cats + catPanels + '</div>';
});
inner.children('.nsl-catmenu__brands').after(panels);
$h('header.nsl-header').append($m.html(shell));

// ---- page ----
const page = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Catalog menu · Black Friday · NewServerLife</title>
<meta name="robots" content="noindex">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap">
<link rel="stylesheet" href="css/nsl-ds.css">
<link rel="stylesheet" href="css/catalog-menu.css">
<style>
/* demo page only */
body{margin:0;background:#fff;font-family:var(--font-sans);color:var(--text-primary)}
.demo-head{position:sticky;top:0;z-index:40}
.demo-page{max-width:1170px;margin:0 auto;padding:64px 0 120px}
.demo-page h1{margin:0 0 12px;font:var(--text-heading-xl)}
.demo-page p{margin:0 0 40px;font:var(--text-body-md);color:var(--text-secondary)}
.demo-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:30px}
.demo-grid i{display:block;height:320px;border-radius:2px;background:var(--bg-subtle)}
@media (min-width:1680px){.demo-page{max-width:1530px}}
</style>
</head>
<body>
<div class="demo-head">
${$h.html()}
</div>
<main class="demo-page">
<h1>Page content</h1>
<p>Click Catalog in the header. The menu covers the viewport under the header; Esc or a click outside closes it.</p>
<div class="demo-grid"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>
</main>
<script src="js/catalog-menu.min.js" defer></script>
</body>
</html>
`;

// ---- CSS: tokens + only the DS rules whose classes are on the page ----
const used = new Set();
page.replace(/class="([^"]+)"/g, (_, c) => c.split(/\s+/).forEach((x) => used.add(x)));
function keepSelector(sel) {
  // :where(a, b) / :is(a, b) pass when any of their classes is on the page
  let ok = true;
  sel = sel.replace(/:(where|is|not)\(([^()]*)\)/g, (m, fn, args) => {
    if (fn === 'not') return '';
    const cls = args.match(/\.[A-Za-z0-9_-]+/g) || [];
    if (cls.length && !cls.some((c) => used.has(c.slice(1)))) ok = false;
    return '';
  });
  if (!ok) return false;
  const classes = sel.match(/\.[A-Za-z0-9_-]+/g) || [];
  return classes.every((c) => used.has(c.slice(1)));
}
function trim(css) {
  const root = postcss.parse(css);
  root.walkAtRules('font-face', (a) => a.remove());
  root.walkRules((rule) => {
    if (rule.parent && rule.parent.type === 'atrule' && /keyframes/.test(rule.parent.name)) return;
    const keep = rule.selectors.filter(keepSelector);
    if (!keep.length) rule.remove(); else rule.selectors = keep;
  });
  root.walkAtRules((a) => { if (/media|supports|container/.test(a.name) && !a.nodes.length) a.remove(); });
  return root.toString();
}
const tokens = trim(fs.readFileSync(path.join(DS, 'tokens.css'), 'utf8'));
const comps = trim(fs.readFileSync(path.join(DS, 'bundle.css'), 'utf8'));
const dsCss = '/* NSL Design System: tokens + Header / CatalogMenu styles used on this page. Generated by tools/build.js */\n' + tokens + '\n' + comps;

// ---- write dist ----
(async () => {
  fs.rmSync(DIST, { recursive: true, force: true });
  ['css', 'js', 'assets'].forEach((d) => fs.mkdirSync(path.join(DIST, d), { recursive: true }));
  fs.writeFileSync(path.join(DIST, 'catalog-menu-dark.html'), page);
  fs.writeFileSync(path.join(DIST, 'css/nsl-ds.css'), dsCss);
  fs.copyFileSync(path.join(ROOT, 'src/catalog-menu.css'), path.join(DIST, 'css/catalog-menu.css'));
  const js = fs.readFileSync(path.join(ROOT, 'src/catalog-menu.js'), 'utf8');
  fs.writeFileSync(path.join(DIST, 'js/catalog-menu.js'), js);
  fs.writeFileSync(path.join(DIST, 'js/catalog-menu.min.js'), (await minify(js, { compress: true, mangle: true })).code + '\n');
  fs.copyFileSync(BANNER, path.join(DIST, 'assets/bf-banner.png'));
  ['README.md', 'CHANGELOG.md'].forEach((f) => fs.copyFileSync(path.join(ROOT, 'package', f), path.join(DIST, f)));

  const zip = 'nsl-catalog-menu-bf-' + VERSION + '.zip';
  fs.readdirSync(ROOT).filter((f) => /^nsl-catalog-menu-bf-.*\.zip$/.test(f)).forEach((f) => fs.unlinkSync(path.join(ROOT, f)));
  execSync('zip -qr -X ../' + zip + ' .', { cwd: DIST });
  console.log('dist/ written;', zip, (fs.statSync(path.join(ROOT, zip)).size / 1024).toFixed(1) + ' KB;',
    'nsl-ds.css', (dsCss.length / 1024).toFixed(1) + ' KB');
})();
