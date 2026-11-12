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

// ---- page ----
const FONTS = 'https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&family=IBM+Plex+Sans:wght@400;500;600;700&family=Montserrat:wght@900&display=swap';
const RUNTIME = fs.readFileSync(path.join(ROOT, 'src/landing.js'), 'utf8');
const BASE_CSS = fs.readFileSync(path.join(ROOT, 'src/landing.css'), 'utf8');

function build(srcFile, outFile, opts) {
  const src = fs.readFileSync(path.join(ROOT, 'src', srcFile), 'utf8');
  const vals = boardVals(src);
  const $ = cheerio.load(src);
  const css = $('x-dc helmet style').map((_, s) => $(s).html()).get().join('\n');
  const root = $('x-dc').children().filter((_, c) => c.name !== 'helmet').first();
  let body = node($, root[0], vals);
  body = body.replace(/^<div /, '<div class="bf-board" ');
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="${opts.viewport}">
<title>${opts.title}</title>
<meta name="robots" content="noindex">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${FONTS}">
<link rel="stylesheet" href="../../_shared/nsl/tokens.css">
<link rel="stylesheet" href="../../_shared/nsl/bundle.css">
<style>
${BASE_CSS}
${opts.css || ''}
/* from the canvas board */
${css.trim()}
</style>
</head>
<body class="${opts.bodyClass}" data-bf-width="${opts.width}">
${body}
<script>
${RUNTIME}
</script>
</body>
</html>
`;
  fs.writeFileSync(path.join(ROOT, outFile), html);
  console.log(outFile, (html.length / 1024).toFixed(1) + ' KB');
}

build('desktop.dc.html', 'desktop.html', {
  title: 'Black Friday 2026 · desktop · NewServerLife',
  viewport: 'width=1440',
  width: 1440,
  bodyClass: 'bf bf--desktop'
});
build('mobile.dc.html', 'mobile.html', {
  title: 'Black Friday 2026 · mobile · NewServerLife',
  viewport: 'width=device-width, initial-scale=1',
  width: 375,
  bodyClass: 'bf bf--mobile'
});
