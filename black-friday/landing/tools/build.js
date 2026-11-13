#!/usr/bin/env node
/*
 * Black Friday landing demo — static build.
 *
 * Takes the canvas boards (src/*.dc.html: "BF Desktop" 1440 and "BF · Mobile 375"),
 * renders every NSL component to static markup with react-dom/server,
 * expands the template ({{holes}}, sc-for, sc-if) with the board's own renderVals()
 * and writes plain HTML pages with a small vanilla script for interactions.
 *
 *   NODE_PATH=/path/to/node_modules node tools/build.js
 *
 * Needs: react@18, react-dom@18, cheerio@1.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const React = require('react');
const S = require('react-dom/server');
const cheerio = require('cheerio');

const ROOT = path.resolve(__dirname, '..');
const DS = path.resolve(ROOT, '../../_shared/nsl');
const IMG = '../assets/server-r740xd-lit.webp';
const BLOB = /\/_blob\/9e7b0b8b0e23dc5930f383d36b439cab/g;

global.window = global; global.React = React;
global.document = { addEventListener() {}, removeEventListener() {}, documentElement: {} };
require(path.join(DS, 'bundle.js'));
const NSL = global.NSL;

// ---- board logic: run the board's own class to get renderVals() ----
function boardVals(src) {
  const code = src.match(/<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/)[1];
  class DCLogic { constructor(props) { this.props = props || {}; this.state = {}; } setState(s) { Object.assign(this.state, s); } }
  const Component = new Function('DCLogic', code + '\nreturn Component;')(DCLogic);
  return new Component({}).renderVals();
}

// ---- holes ----
const HOLE = /\{\{\s*([\s\S]+?)\s*\}\}/g;
function ev(expr, scope) {
  try { return new Function('s', 'with (s) { return (' + expr + '); }')(scope); }
  catch (e) { throw new Error('Cannot evaluate {{' + expr + '}}: ' + e.message); }
}
function whole(v) { const m = /^\s*\{\{\s*([\s\S]+?)\s*\}\}\s*$/.exec(v || ''); return m ? m[1] : null; }
function interp(str, scope) { return str.replace(HOLE, (_, e) => { const v = ev(e, scope); return v == null ? '' : String(v); }); }

const camel = (s) => s.replace(/-([a-z])/g, (_, c) => c.toUpperCase());

// ---- NSL component → static HTML ----
function renderImport($, el, scope) {
  const name = el.attribs['component-from-global-scope'].replace(/^NSL\./, '');
  const Comp = NSL[name];
  if (!Comp) throw new Error('Unknown component NSL.' + name);
  const props = {}; let style = '';
  for (const [k, v] of Object.entries(el.attribs)) {
    if (k === 'component-from-global-scope' || k.startsWith('hint-')) continue;
    if (k === 'style') { style = interp(v, scope); continue; }
    const w = whole(v);
    props[camel(k)] = w ? ev(w, scope) : interp(v, scope);
  }
  const text = $(el).text().trim();
  if (text) props.children = interp(text, scope);

  let openSet = null;
  if (name === 'Accordion') {           // render every panel, close the rest with CSS
    openSet = new Set(props.defaultOpen || []);
    props.defaultOpen = props.items.map((_, i) => i);
    props.multiple = true;
  }
  let html = S.renderToStaticMarkup(React.createElement(Comp, props));
  if (name === 'Footer' && props.variant === 'desktop') {
    // Wide screens get the DS wide footer (1530 container); CSS switches at 1680.
    const wide = S.renderToStaticMarkup(React.createElement(Comp, Object.assign({}, props, { variant: 'wide' })));
    return '<div class="bf-foot bf-foot--d">' + html + '</div><div class="bf-foot bf-foot--w">' + wide + '</div>';
  }
  const frag = cheerio.load(html, null, false);
  const root = frag.root().children().first();
  if (style) root.attr('style', ((root.attr('style') || '') + ';' + style).replace(/^;/, ''));
  if (openSet) {
    frag('.nsl-acc__item').each((i, it) => {
      if (!openSet.has(i)) { frag(it).removeClass('is-open'); frag(it).find('.nsl-acc__head').attr('aria-expanded', 'false'); }
    });
    root.attr('data-bf-acc', '');
  }
  return frag.html();
}

// ---- template walk ----
function walk($, nodes, scope) {
  let out = '';
  nodes.each((_, n) => { out += node($, n, scope); });
  return out;
}
function node($, n, scope) {
  if (n.type === 'text') return interp(n.data, scope);
  if (n.type === 'comment') return '';
  if (n.type !== 'tag' && n.type !== 'script' && n.type !== 'style') return '';
  const tag = n.name;
  if (tag === 'sc-if') return ev(whole(n.attribs.value), scope) ? walk($, $(n).contents(), scope) : '';
  if (tag === 'sc-for') {
    const list = ev(whole(n.attribs.list), scope) || [];
    const as = n.attribs.as || 'item';
    return list.map((item, i) => walk($, $(n).contents(), Object.assign(Object.create(scope), { [as]: item, $index: i }))).join('');
  }
  if (tag === 'x-import') return renderImport($, n, scope);
  if (tag === 'helmet') return '';
  let attrs = '';
  for (const [k, v] of Object.entries(n.attribs)) {
    if (/^on[a-z]+$/.test(k)) {
      if (k === 'onclick') attrs += ' data-bf-toggle';
      if (k === 'onmousemove' || k === 'onpointermove') attrs += ' data-bf-hero';
      continue;
    }
    let val = interp(v, scope).replace(BLOB, IMG);
    if (val === 'url(#spotTouch)' || val === 'url(#spotMouse)') val = 'url(#spotIdle)';
    attrs += ' ' + k + '="' + val.replace(/&/g, '&amp;').replace(/"/g, '&quot;') + '"';
    if (k === 'stroke' && /url\(#\{\{\s*spot/.test(v)) attrs += ' data-bf-spot';
  }
  const VOID = /^(img|br|hr|input|meta|link|source|wbr)$/;
  if (VOID.test(tag)) return '<' + tag + attrs + '>';
  const inner = (tag === 'style' || tag === 'script') ? $(n).html() : walk($, $(n).contents(), scope);
  return '<' + tag + attrs + '>' + inner + '</' + tag + '>';
}

// ---- fixed board → fluid page ----
const FLUID = [
  // desktop: root, header, footer
  ["width: 1440px; display: flex; flex-direction: column", "width: 100%; display: flex; flex-direction: column"],
  ["style=\"width: 1440px; height: 112px; flex-shrink: 0\"", "style=\"width: 100%; height: 112px; flex-shrink: 0\""],
  ["style=\"width: 1440px; flex-shrink: 0\"", "style=\"width: 100%; flex-shrink: 0\""],
  // desktop decor: server photo stays 1440 and centred, mark centred
  ["left: 0; top: 360px; width: 1440px", "left: 50%; margin-left: -720px; top: 360px; width: 1440px"],
  ["left: 0; top: -300px; width: 1440px", "left: 50%; margin-left: -720px; top: -300px; width: 1440px"],
  ["left: 540px; top: 50px; width: 360px", "left: 50%; margin-left: -180px; top: 50px; width: 360px"],
  // desktop: content container follows the DS breakpoints (1170, wide 1530 from 1680)
  ["width: 1170px", "width: var(--bf-container)"],
  // mobile: root, header, footer
  ["width: 375px; display: flex; flex-direction: column", "width: 100%; display: flex; flex-direction: column"],
  ["style=\"width: 375px; height: 48px;", "style=\"width: 100%; height: 48px;"],
  ["variant=\"mobile\" style=\"width: 375px; flex-shrink: 0\"", "variant=\"mobile\" style=\"width: 100%; max-width: none; flex-shrink: 0\""],
  // mobile decor centred
  ["left: 48px; top: 48px; width: 279px", "left: 50%; margin-left: -139.5px; top: 48px; width: 279px"],
  ["left: -210px; top: -70px; width: 795px", "left: 50%; margin-left: -397.5px; top: -70px; width: 795px"],
  ["left: -210px; top: -170px; width: 795px", "left: 50%; margin-left: -397.5px; top: -170px; width: 795px"]
];

// ---- page ----
const FONTS = 'https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&family=IBM+Plex+Sans:wght@400;500;600;700&family=Montserrat:wght@900&display=swap';
const RUNTIME = fs.readFileSync(path.join(ROOT, 'src/landing.js'), 'utf8');
const BASE_CSS = fs.readFileSync(path.join(ROOT, 'src/landing.css'), 'utf8');

const postcss = require('postcss');

// Render one canvas board to static markup + its own CSS.
function renderBoard(srcFile, cls, idSuffix) {
  let src = fs.readFileSync(path.join(ROOT, 'src', srcFile), 'utf8');
  // Full-width layout: the canvas boards are fixed-width; on the page the bands stretch
  // to the window, content stays in the DS container, decor stays centred.
  for (const [a, z] of FLUID) src = src.split(a).join(z);
  const vals = boardVals(src);
  const $ = cheerio.load(src);
  let css = $('x-dc helmet style').map((_, s) => $(s).html()).get().join('\n');
  const root = $('x-dc').children().filter((_, c) => c.name !== 'helmet').first();
  let body = node($, root[0], vals);
  body = body.replace(/^<div /, '<div class="bf-board ' + cls + '" ');
  if (idSuffix) {
    // SVG defs are per board: rename them so the hidden board never owns the gradients the visible one uses.
    const ids = ['mk', 'lg', 'spotIdle', 'spotTouch', 'spotMouse', 'bl', 'au'];
    for (const id of ids) {
      body = body.split('id="' + id + '"').join('id="' + id + idSuffix + '"')
        .split('url(#' + id + ')').join('url(#' + id + idSuffix + ')')
        .split('href="#' + id + '"').join('href="#' + id + idSuffix + '"');
    }
  }
  // Scope the board's CSS to its own wrapper, so desktop and mobile overrides never collide.
  const ast = postcss.parse(css);
  ast.walkRules((r) => {
    if (r.parent && r.parent.type === 'atrule' && /keyframes/.test(r.parent.name)) return;
    r.selectors = r.selectors.map((s) => s.trim() === 'body' ? s : '.' + cls + ' ' + s);
  });
  return { body, css: ast.toString() };
}

// One page: the desktop board, plus an optional mobile board swapped in below 720px.
// Writes the demo page (inline CSS/JS, links the repo DS) and, with opts.pkg, the developer copy in dist/.
const PKG_PAGES = [];
function build(outFile, opts) {
  const parts = [renderBoard(opts.desktop, 'bf-board--d', '')];
  if (opts.mobile) parts.push(renderBoard(opts.mobile, 'bf-board--m', '-m'));
  const boardCss = parts.map((p) => p.css.trim()).join('\n');
  const bodyHtml = parts.map((p) => p.body).join('\n');
  const head = (title, links) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<meta name="robots" content="noindex">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${FONTS}">
${links}`;
  const html = head(opts.title, `<link rel="stylesheet" href="../../_shared/nsl/tokens.css">
<link rel="stylesheet" href="../../_shared/nsl/bundle.css">
<style>
${BASE_CSS}
/* from the canvas boards */
${boardCss}
</style>
</head>`) + `
<body class="bf${opts.mobile ? ' bf--responsive' : ''}">
${bodyHtml}
<script>
${RUNTIME}
</script>
</body>
</html>
`;
  fs.writeFileSync(path.join(ROOT, outFile), html);
  console.log(outFile, (html.length / 1024).toFixed(1) + ' KB');
  if (opts.pkg) PKG_PAGES.push({ name: opts.pkg, title: opts.title, css: BASE_CSS + '\n/* sections (from the canvas boards) */\n' + boardCss, body: bodyHtml, head });
}

// Developer package: plain HTML + CSS + vanilla JS, no React, no build step needed to use it.
function writePackage() {
  const { execSync } = require('child_process');
  const terser = require('terser');
  const VERSION = require(path.join(ROOT, 'package.json')).version;
  const DIST = path.join(ROOT, 'dist');
  fs.rmSync(DIST, { recursive: true, force: true });
  ['css', 'js', 'assets'].forEach((d) => fs.mkdirSync(path.join(DIST, d), { recursive: true }));
  const fix = (s) => s.split('../assets/').join('assets/');
  // DS: tokens in full, components only what the pages use
  const used = new Set();
  PKG_PAGES.forEach((p) => (p.body.match(/class="([^"]+)"/g) || []).forEach((m) => m.slice(7, -1).split(/\s+/).forEach((c) => used.add(c))));
  ['is-open', 'is-active'].forEach((c) => used.add(c));
  const ds = fs.readFileSync(path.join(DS, 'tokens.css'), 'utf8') + '\n' + subset(fs.readFileSync(path.join(DS, 'bundle.css'), 'utf8'), used);
  fs.writeFileSync(path.join(DIST, 'css/nsl-ds.css'), '/* NSL Design System: tokens + the component styles this landing uses (subset of bundle.css) */\n' + ds);
  fs.writeFileSync(path.join(DIST, 'js/bf-landing.js'), '/*! nsl-bf-landing v' + VERSION + ' */\n' + RUNTIME);
  return terser.minify(RUNTIME, { compress: true, mangle: true }).then((min) => {
    fs.writeFileSync(path.join(DIST, 'js/bf-landing.min.js'), '/*! nsl-bf-landing v' + VERSION + ' */\n' + min.code);
    fs.copyFileSync(path.join(ROOT, '../assets/server-r740xd-lit.webp'), path.join(DIST, 'assets/server-r740xd-lit.webp'));
    for (const p of PKG_PAGES) {
      fs.writeFileSync(path.join(DIST, 'css/' + p.name + '.css'), '/* Black Friday landing · ' + p.name + ' */\n' + p.css);
      const html = p.head(p.title, `<link rel="stylesheet" href="css/nsl-ds.css">
<link rel="stylesheet" href="css/${p.name}.css">
</head>`) + `
<body class="bf bf--responsive">
${fix(p.body)}
<script src="js/bf-landing.min.js" defer></script>
</body>
</html>
`;
      fs.writeFileSync(path.join(DIST, p.name + '.html'), html);
    }
    for (const f of ['README.md', 'CHANGELOG.md']) fs.copyFileSync(path.join(ROOT, 'package', f), path.join(DIST, f));
    const zip = 'nsl-bf-landing-' + VERSION + '.zip';
    fs.readdirSync(ROOT).filter((f) => /^nsl-bf-landing-.*\.zip$/.test(f)).forEach((f) => fs.unlinkSync(path.join(ROOT, f)));
    execSync('zip -qr -X ../' + zip + ' .', { cwd: DIST });
    console.log(zip, (fs.statSync(path.join(ROOT, zip)).size / 1024).toFixed(1) + ' KB');
  });
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

build('desktop.html', { title: 'Black Friday 2026 · NewServerLife', desktop: 'desktop.dc.html', mobile: 'mobile.dc.html', pkg: 'dark' });
build('light.html', { title: 'Black Friday 2026 · NewServerLife', desktop: 'light.dc.html', mobile: 'light-mobile.dc.html', pkg: 'light' });
writePackage();
