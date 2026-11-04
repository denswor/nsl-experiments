(function () {
const html = htm.bind(React.createElement);
const { useState, useRef, useLayoutEffect, useEffect } = React;
const { Button, Breadcrumbs, StarRating, Icon, ButtonGroup } = NSL;
const IMG = {"amd-bg": "assets/amd-bg.webp", "coloc-bg": "assets/coloc-bg.webp", "dell-stack": "assets/dell-stack.webp", "hpe-stack": "assets/hpe-stack.webp", "logo-dell": "assets/logo-dell.webp", "logo-google": "assets/logo-google.webp", "logo-hpe": "assets/logo-hpe.webp", "logo-trustpilot": "assets/logo-trustpilot.webp", "nvme-bg": "assets/nvme-bg.webp", "palm": "assets/palm.webp", "summer-ill": "assets/summer-ill.webp"};

/* =================== Proposed components =================== */

const TURN = { settings: '90deg', cpu: '-90deg', percent: '-20deg' };
function EyebrowPill({ icon, children, hover, state, href = '#' }) {
  const inner = html`${icon && html`<span class="nslp__icon" style=${{ '--pill-turn': TURN[icon] || '-14deg' }}><${Icon} name=${icon} size=${18} /></span>`}${children}`;
  if (!hover) return html`<span class="nslp">${inner}</span>`;
  const cls = 'nslp nslp--interactive nslp--hover-' + hover + (state === 'hover' ? ' is-hover' : '');
  return html`<a class=${cls} href=${href} onClick=${e => e.preventDefault()}>${inner}</a>`;
}
const STAR = html`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l2.9 6.6 7.1.6-5.4 4.7 1.6 7-6.2-3.7-6.2 3.7 1.6-7L2 9.7l7.1-.6z"/></svg>`;
function TrustStars({ value }) {
  return html`<span class="nslr__tp" role="img" aria-label=${value + ' out of 5'}>${[0, 1, 2, 3, 4].map(i => {
    const f = Math.max(0, Math.min(1, value - i)) * 100;
    return html`<i key=${i} style=${{ '--f': f + '%' }}>${STAR}</i>`;
  })}</span>`;
}
function VendorLogo({ vendor, size }) {
  const src = IMG['logo-' + vendor];
  const alt = { dell: 'Dell EMC', hpe: 'HPE' }[vendor] || vendor;
  return html`<img class=${'nslv' + (size ? ' nslv--' + size : '')} src=${src} alt=${alt} />`;
}
function GradientText({ children }) { return html`<span class="nsl-gradient-text">${children}</span>`; }
function Mark({ children }) { return html`<mark class="nsl-mark">${children}</mark>`; }
function StatCallout({ pre, value, post, size, placement = 'overlay' }) {
  const cls = 'nsls' + (size === 'sm' ? ' nsls--sm' : '') + (placement === 'static' ? ' nsls--static' : '');
  return html`<div class=${cls}>${pre && html`<span class="nsls__pre">${pre}</span>`}<span class="nsls__value">${value}</span>${post && html`<span class="nsls__post">${post}</span>`}</div>`;
}
function BenefitItem({ variant = 'inline', icon = 'shield', title, text }) {
  return html`<div class=${'nslbi nslbi--' + variant}>
    <span class="nslbi__slot" title="Icon slot: element from Icons"><${Icon} name=${icon} size=${variant === 'chip' ? 20 : variant === 'card' ? 32 : 24} /></span>
    <span class="nslbi__body"><span class="nslbi__title">${title}</span>${text && html`<span class="nslbi__text">${text}</span>`}</span>
  </div>`;
}
const SOURCES = { google: { name: 'Google Rating', logo: 'logo-google', alt: 'Google', score: 4.9 }, trustpilot: { name: 'Trustpilot Rating', logo: 'logo-trustpilot', alt: 'Trustpilot', score: 4.7 } };
function RatingBadge({ variant = 'card', source = 'google', score, className = '' }) {
  const src = SOURCES[source]; const sc = score || src.score;
  const stars = sz => source === 'trustpilot' ? html`<${TrustStars} value=${sc} />` : html`<${StarRating} value=${sc} size=${sz} />`;
  if (variant === 'compact') {
    return html`<a class=${'nslr nslr--compact ' + className} href="#reviews" onClick=${e => e.preventDefault()}>
      <span class="nslr__lead"><img class="nslr__g" src=${IMG[src.logo]} alt=${src.alt} /><span class="nslr__label">${src.name}</span></span>
      <span class="nslr__score"><span class="nslr__num">${sc}</span>${stars(14)}</span>
    </a>`;
  }
  return html`<a class=${'nslr' + (variant === 'card' ? ' nslr--card' : '') + ' ' + className} href="#reviews" onClick=${e => e.preventDefault()}>
    <img class="nslr__g" src=${IMG[src.logo]} alt=${src.alt} />
    <span class="nslr__body">
      <span class="nslr__label">${src.name}</span>
      <span class="nslr__score"><span class="nslr__num">${sc}</span>${stars(18)}</span>
      <span class="nslr__link">See all our reviews</span>
    </span>
  </a>`;
}
function BenefitBar({ appearance = 'plain', items, rating = true, ratings = ['google'], hover }) {
  if (appearance === 'pills') {
    return html`<div class="nslb nslb--pills"><div class="nslb__items"><div class="nslp-row">${items.map((it, i) => html`<${EyebrowPill} key=${i} icon=${it.icon} hover=${hover}>${it.title}<//>`)}</div></div></div>`;
  }
  const variant = { plain: 'inline', card: 'inline', cards: 'card', columns: 'column', chips: 'chip' }[appearance];
  const ratingVariant = appearance === 'cards' ? 'card' : appearance === 'card' ? 'plain' : 'card';
  return html`<div class=${'nslb nslb--' + appearance} style=${{ '--n': items.length }}>
    <div class="nslb__row">
      <div class="nslb__items">${items.map((it, i) => html`<${BenefitItem} key=${i} variant=${variant} ...${it} />`)}</div>
      ${rating && html`<div class="nslb__rating">
        ${ratings.map(r => html`<${React.Fragment} key=${r}>
          <${RatingBadge} source=${r} variant=${ratingVariant} className="nslr--main" />
          <${RatingBadge} source=${r} variant="compact" className="nslr--alt" />
        <//>`)}
      </div>`}
    </div>
  </div>`;
}
const GridCtx = React.createContext(false);
function LayoutGrid() {
  return html`<div class="nslg" aria-hidden="true"><div class="nslg__cols">${Array.from({ length: 12 }, (_, i) => html`<i key=${i}></i>`)}</div></div>`;
}
function Hero(p) {
  const { layout = 'split', surface = 'light', base, crumbs, eyebrow, logo, title, titleSize = 'display', subhead, lead,
    actions, fine, chips, media, mediaAlt = '', stat, bg, bgPos, decor, benefits, benefitsPlacement = 'inside' } = p;
  const dark = surface === 'dark';
  return html`<section class=${'nslh nslh--' + layout + (dark ? ' nsl-on-dark' : '')} style=${base ? { '--hero-base': base } : null}>
    ${bg && html`<div class="nslh__bg" style=${{ '--bg-pos': bgPos || 'center' }}><img src=${bg} alt="" /></div>`}
    ${decor && html`<img class="nslh__decor" src=${decor} alt="" />`}
    <div class="nslh__inner">
      ${crumbs && html`<div class="nslh__crumbs"><${Breadcrumbs} items=${crumbs} /></div>`}
      ${layout === 'cover' && html`<div class="nslh__spacer" aria-hidden="true"></div>`}
      ${eyebrow && html`<div class="nslh__eyebrow"><div class="nslp-row">${eyebrow.map((e, i) => html`<${EyebrowPill} key=${i} icon=${e.icon} hover=${e.hover}>${e.label}<//>`)}</div></div>`}
      <div class="nslh__content">
        ${logo && html`<div class="nslh__logo"><${VendorLogo} vendor=${logo} /></div>`}
        <h1 class=${'nslh__title nslh__title--' + titleSize}>${title}</h1>
        ${subhead && html`<p class="nslh__subhead">${subhead}</p>`}
        ${lead && html`<p class="nslh__lead">${lead}</p>`}
        ${actions && html`<div class="nslh__actions">${actions}</div>`}
        ${fine && html`<p class="nslh__fine">${fine}</p>`}
        ${chips && html`<div class="nslh__chips">${chips}</div>`}
      </div>
      ${media && html`<div class="nslh__media"><img src=${media} alt=${mediaAlt} />${stat}</div>`}
      ${benefits && benefitsPlacement === 'inside' && html`<div class="nslh__benefits">${benefits}</div>`}
    </div>
    ${benefits && benefitsPlacement === 'band' && html`<div class="nslh__band"><div class="nslh__band-inner">${benefits}</div></div>`}
  </section>`;
}
function PageHeader({ crumbs, title, lead, aside }) {
  return html`<header class="nslph"><div class="nslph__inner">
    ${crumbs && html`<div class="nslph__crumbs"><${Breadcrumbs} items=${crumbs} /></div>`}
    <div class="nslph__main"><h1 class="nslph__title">${title}</h1>${lead && html`<p class="nslph__lead">${lead}</p>`}</div>
    ${aside && html`<div class="nslph__aside">${aside}</div>`}
  </div></header>`;
}

/* =================== Content =================== */
const TRUST = [
  { icon: 'shield', title: 'Warranty', text: '& Quality' },
  { icon: 'truck', title: 'Free Shipping:', text: 'US and Canada' },
  { icon: 'message-square', title: 'Expert', text: 'Support' },
  { icon: 'settings', title: 'Custom', text: 'Configurations' },
];
const HOME_CARDS = [
  { icon: 'shield', title: 'Up to 5 Years of Warranty', text: '1 year free. Paid extensions available.' },
  { icon: 'sliders', title: 'Flexible Configs', text: 'CPU, RAM & Storage custom built to your workload.' },
  { icon: 'check-circle', title: 'Proven Quality', text: 'Rigorous stress-testing and refurbishment process.' },
  { icon: 'credit-card', title: '0% Installment Plan', text: '12 equal monthly payments. No credit check required.' },
];
const SUMMER_COLS = [
  { icon: 'globe', title: 'Summer is the right time to sort out your infrastructure.', text: 'Lighter workloads, less internal pressure, more time to evaluate properly. Order in July and your infrastructure is in place before Q4 hits.' },
  { icon: 'shield', title: '3-year warranty. Included automatically.', text: 'No add-ons, no separate agreement. Configure any Dell Gen 15 or Gen 16 server in July and it’s already in your order.' },
  { icon: 'settings', title: 'Refurbished, tested, and ready to deploy.', text: 'Every unit goes through our full quality process before it ships. The extended warranty is the final layer.' },
];
const COLOC_CHIPS = [
  { icon: 'percent', title: '0% Interest Rate' },
  { icon: 'shield', title: 'No Credit Check' },
  { icon: 'clock', title: '1-2 Business Days to Approve' },
];
const crumbs = (...xs) => xs.map((label, i) => (i < xs.length - 1 ? { label, href: '#' } : { label }));

const COMPOSITIONS = [
  { id: 'home', name: 'Главная', note: 'layout="split" на белом · eyebrow в одну строку, заходит на фото · GradientText на двух словах · Mark в лиде · StatCallout · BenefitBar appearance="cards" + Google и Trustpilot', el: () => html`<${Hero}
      eyebrow=${[{ icon: 'settings', label: 'Flexible configurations', hover: 'icon' }, { icon: 'percent', label: 'Great value for money', hover: 'icon' }, { icon: 'cpu', label: 'Tested enterprise hardware', hover: 'icon' }]}
      title=${html`Refurbished servers built for <${GradientText}>value<//> & <${GradientText}>reliability<//>`}
      lead=${html`Get <${Mark}>Enterprise-class performance<//> at a fraction of OEM prices. Fully stress-tested and custom-built to your exact workload requirements.`}
      actions=${html`<${Button} variant="primary" size="lg" iconLeft="settings">Configure a Server<//><${Button} variant="ghost" size="lg" iconLeft="tag">Unlock Volume Discount<//>`}
      media=${IMG['dell-stack']} mediaAlt="Stack of Dell PowerEdge servers"
      stat=${html`<${StatCallout} pre="Save up to" value="70–90%" post="vs New OEM Prices" />`}
      benefits=${html`<${BenefitBar} appearance="cards" items=${HOME_CARDS} ratings=${['google', 'trustpilot']} />`} />` },
  { id: 'nvme', name: 'NVMe Servers', note: 'layout="cover" · фото справа, scrim слева · BenefitBar appearance="card" внутри героя', el: () => html`<${Hero}
      layout="cover" surface="dark" base="#2a0845" bg=${IMG['nvme-bg']} bgPos="70% 40%"
      crumbs=${crumbs('Home', 'Servers', 'NVMe Servers')}
      title="Refurbished NVMe Rack Servers"
      lead="Speed-optimized servers with NVMe storage — fully tested and ready for demanding, data-intensive workloads"
      actions=${html`<${Button} variant="primary" size="lg">Get consultation<//>`}
      benefits=${html`<${BenefitBar} appearance="card" items=${TRUST} />`} />` },
  { id: 'amd', name: 'AMD-Based Servers', note: 'тот же cover, другой base-цвет под фото', el: () => html`<${Hero}
      layout="cover" surface="dark" base="#1e2a48" bg=${IMG['amd-bg']} bgPos="60% 40%"
      crumbs=${crumbs('Home', 'Servers', 'AMD-Based Servers')}
      title="AMD-Based Refurbished Servers"
      lead="High-performance refurbished AMD servers — ideal for multitasking, virtualization, and compute-heavy tasks."
      actions=${html`<${Button} variant="primary" size="lg">Get consultation<//>`}
      benefits=${html`<${BenefitBar} appearance="card" items=${TRUST} />`} />` },
  { id: 'dell', name: 'Dell Servers', note: 'layout="split" · VendorLogo · BenefitBar appearance="plain"', el: () => html`<${Hero}
      crumbs=${crumbs('Home', 'Servers', 'Dell Servers')} logo="dell"
      title="Refurbished Dell PowerEdge Servers"
      lead="Fully tested Dell PowerEdge servers with warranty — reliable, cost-effective solutions for any workload."
      actions=${html`<${Button} variant="primary" size="lg">Get consultation<//>`}
      media=${IMG['dell-stack']} mediaAlt="Stack of Dell PowerEdge servers"
      benefits=${html`<${BenefitBar} appearance="plain" items=${TRUST} />`} />` },
  { id: 'hpe', name: 'HPE Servers', note: 'тот же split, другой логотип и фото', el: () => html`<${Hero}
      crumbs=${crumbs('Home', 'Servers', 'HPE Servers')} logo="hpe"
      title="Refurbished HPE ProLiant Servers"
      lead="Enterprise-grade HPE servers — refurbished, tested, and backed by warranty for performance you can trust."
      actions=${html`<${Button} variant="primary" size="lg">Get consultation<//>`}
      media=${IMG['hpe-stack']} mediaAlt="Stack of HPE ProLiant servers"
      benefits=${html`<${BenefitBar} appearance="plain" items=${TRUST} />`} />` },
  { id: 'summer', name: 'Summer Offer', note: 'layout="split" titleSize="page" · subhead · FinePrint · decor · BenefitBar appearance="columns"', el: () => html`<${Hero}
      crumbs=${crumbs('Home', 'Promo', 'Summer offer')} titleSize="page"
      title="3-Year Extended Warranty"
      subhead="Included on DELL Gen 15 and Gen 16. This July only. Totally FREE."
      lead="Order any Dell Gen 15 or Gen 16 server this month and receive an extended 3-year warranty — included automatically, no extra cost."
      actions=${html`<${Button} variant="primary" size="md" iconLeft="settings">Configure your server<//><${Button} variant="text" size="md" iconLeft="chevron-down">See all eligible models below<//>`}
      fine="Offer valid through July 31, 2026."
      media=${IMG['summer-ill']} mediaAlt="Server stack on a beach table next to a deck chair"
      decor=${IMG['palm']}
      benefits=${html`<${BenefitBar} appearance="columns" rating=${false} items=${SUMMER_COLS} />`} />` },
  { id: 'coloc', name: 'Colocation', note: 'layout="cover" без benefit-полосы · BenefitBar appearance="chips" в слоте chips · вторая кнопка primary-ghost-inverted (предложение)', el: () => html`<${Hero}
      layout="cover" surface="dark" base="#0a1a30" bg=${IMG['coloc-bg']} bgPos="40% 50%"
      crumbs=${crumbs('Home', 'For business')}
      title="Buy a Server for Colocation — Pay in 12 Months"
      lead="Dedicated hardware in our data center from day one. No leasing company, no credit check, one direct agreement — split into 12 equal payments at 0% interest."
      actions=${html`<${Button} variant="primary" size="lg">Get my installment offer<//><${Button} variant="primary-ghost-inverted" size="lg">See how it works<//>`}
      chips=${html`<${BenefitBar} appearance="chips" rating=${false} items=${COLOC_CHIPS} />`} />` },
  { id: 'coloc-pills', name: 'Colocation — вариант с пилюлями', note: 'опция: те же бенефиты как EyebrowPill между крошками и заголовком, как на главной (слот eyebrow, hover="icon"). На мобильном — одна строка со скроллом под фото', el: () => html`<${Hero}
      layout="cover" surface="dark" base="#0a1a30" bg=${IMG['coloc-bg']} bgPos="40% 50%"
      crumbs=${crumbs('Home', 'For business')}
      title="Buy a Server for Colocation — Pay in 12 Months"
      lead="Dedicated hardware in our data center from day one. No leasing company, no credit check, one direct agreement — split into 12 equal payments at 0% interest."
      actions=${html`<${Button} variant="primary" size="lg">Get my installment offer<//><${Button} variant="primary-ghost-inverted" size="lg">See how it works<//>`}
      eyebrow=${COLOC_CHIPS.map(c => ({ icon: c.icon, label: c.title, hover: 'icon' }))} />` },
];

/* =================== Frames =================== */
const WIDTHS = { desktop: 1440, tablet: 768, mobile: 375 };
const LABELS = { desktop: 'Desktop', tablet: 'Tablet', mobile: 'Mobile' };

function Frame({ w, label, children }) {
  const outer = useRef(null), inner = useRef(null);
  const [s, setS] = useState({ k: 1, h: 200 });
  const grid = React.useContext(GridCtx);
  useLayoutEffect(() => {
    const fit = () => {
      if (!outer.current || !inner.current) return;
      const k = Math.min(1, outer.current.clientWidth / w);
      const h = Math.ceil(inner.current.offsetHeight * k);
      setS(prev => (Math.abs(prev.k - k) > 0.001 || prev.h !== h ? { k, h } : prev));
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(outer.current); ro.observe(inner.current);
    return () => ro.disconnect();
  }, [w]);
  return html`<figure class="frame">
    <figcaption class="frame__cap"><span>${label}</span><span>${w}px${s.k < 0.999 ? ' · ' + Math.round(s.k * 100) + '%' : ''}</span></figcaption>
    <div class="frame__vp" ref=${outer} style=${{ height: s.h + 'px', width: Math.round(w * s.k) + 'px', maxWidth: '100%' }}>
      <div class="frame__inner" ref=${inner} style=${{ width: w + 'px', transform: 'scale(' + s.k + ')' }}>${children}${grid && html`<${LayoutGrid} />`}</div>
    </div>
  </figure>`;
}
function Frames({ mode, render, widths = WIDTHS }) {
  if (mode !== 'all') return html`<div class="pg-frames"><${Frame} w=${widths[mode]} label=${LABELS[mode]}>${render(mode)}<//></div>`;
  return html`<div class="pg-frames">
    <${Frame} w=${widths.desktop} label="Desktop">${render('desktop')}<//>
    <div class="pg-frames--row">
      <${Frame} w=${widths.tablet} label="Tablet">${render('tablet')}<//>
      <${Frame} w=${widths.mobile} label="Mobile">${render('mobile')}<//>
    </div>
  </div>`;
}
const DW = { desktop: 1234, tablet: 768, mobile: 375 }; // component demos: desktop container + 32px sides

/* =================== Docs =================== */
function Spec({ rows }) {
  return html`<div class="pg-spec">${rows.map(([k, v], i) => html`<div class="pg-spec__cell" key=${i}><div class="pg-spec__k">${k}</div><div class="pg-spec__v">${v}</div></div>`)}</div>`;
}
function Block({ id, name, status, desc, spec, note, children }) {
  const st = { new: ['Новый', 'pg-status--new'], ext: ['Расширение', 'pg-status--ext'], exc: ['Исключение', 'pg-status--exc'], style: ['Стиль текста', ''], core: ['В основную DS', 'pg-status--ext'] }[status];
  return html`<section class="pg-block" id=${id}>
    <div class="pg-block__head"><h3 class="pg-h3">${name}</h3><span class=${'pg-status ' + st[1]}>${st[0]}</span></div>
    ${desc && html`<p class="pg-desc">${desc}</p>`}
    ${spec && html`<${Spec} rows=${spec} />`}
    ${note && html`<p class="pg-note">${note}</p>`}
    ${children}
  </section>`;
}
const C = ({ children }) => html`<code>${children}</code>`;
const ul = (...xs) => html`<ul>${xs.map((x, i) => html`<li key=${i}>${x}</li>`)}</ul>`;

function App() {
  const [mode, setMode] = useState(() => { try { return localStorage.getItem('hero-mode') || 'desktop'; } catch (e) { return 'desktop'; } });
  const [theme, setTheme] = useState('primary');
  const [grid, setGrid] = useState(() => { try { return localStorage.getItem('hero-grid') === 'on'; } catch (e) { return false; } });
  useEffect(() => { try { localStorage.setItem('hero-grid', grid ? 'on' : 'off'); } catch (e) {} }, [grid]);
  useEffect(() => { try { localStorage.setItem('hero-mode', mode); } catch (e) {} }, [mode]);
  const F = (render, widths) => html`<${Frames} mode=${mode} render=${render} widths=${widths} />`;

  return html`<${GridCtx.Provider} value=${grid}><div class="pg" data-theme=${theme === 'secondary' ? 'secondary' : undefined}>
    <header class="pg-head">
      <div class="pg-eyebrow">NSL Design System · Hero · набросок</div>
      <h1 class="pg-h1">Hero: новые компоненты</h1>
      <p class="pg-lead">Компоненты, которых не хватает для героев сайта, собраны на токенах и компонентах NSL DS. Каждый подстраивается под свою ширину: десктоп от 1024, планшет 720–1023, мобильный до 720. Внизу семь героев с сайта, собранные из этих частей. Иконки в бенефитах — заглушки: в слот встанут элементы из Icons.</p>
    </header>

    <div class="pg-bar">
      <div class="pg-ctl"><span class="pg-ctl__label">Ширина</span>
        <${ButtonGroup} size="md" icons=${false} value=${mode} onChange=${setMode}
          items=${[{ label: '1440', value: 'desktop' }, { label: '768', value: 'tablet' }, { label: '375', value: 'mobile' }, { label: 'Все три', value: 'all' }]} /></div>
      <div class="pg-ctl"><span class="pg-ctl__label">Тема</span>
        <${ButtonGroup} size="md" icons=${false} value=${theme} onChange=${setTheme}
          items=${[{ label: 'Primary', value: 'primary' }, { label: 'Secondary', value: 'secondary' }]} /></div>
      <div class="pg-ctl"><span class="pg-ctl__label">Сетка</span>
        <${ButtonGroup} size="md" icons=${false} value=${grid ? 'on' : 'off'} onChange=${v => setGrid(v === 'on')}
          items=${[{ label: 'Выкл', value: 'off' }, { label: 'Вкл', value: 'on' }]} /></div>
      <nav class="pg-toc"><a href="#components">Компоненты</a><a href="#cta">Пары кнопок</a><a href="#builds">Сборки</a><a href="#tokens">Токены</a></nav>
    </div>

    <section class="pg-section" id="components">
      <h2 class="pg-h2">Компоненты</h2>
      <p class="pg-h2-lead">Порядок: контейнеры, затем то, что живёт внутри героя, затем блок преимуществ.</p>

      <${Block} id="layoutgrid" name="LayoutGrid" status="core"
        desc="Сетка макета — общая для всей DS, уже в ней с версии 1.3.0 (компонент LayoutGrid, токены, стили Grid в Figma). Здесь включается переключателем «Сетка» сверху и накладывается на все макеты на странице."
        spec=${[
          ['wide · от 1680', '12 колонок × 100, gutter 30, контейнер 1530, поля 75'],
          ['desktop · 1440', html`12 колонок, gutter 30, контейнер 1170 (<${C}>container-desktop<//>), поля 135`],
          ['tablet · 1024', '12 колонок, gutter 30, поля 35, контейнер резиновый до 1170'],
          ['tablet-portrait · 720–1023', '8 колонок, gutter 24, поля 32'],
          ['mobile · до 720', '4 колонки, gutter 16, поля 16'],
        ]}
        note="Hero выровнен по этой сетке: от 1024 текст и фото по 6 колонок, на tablet-portrait 5 + 3. Брейкпоинты наброска совпадают с DS: 1024 и 720." />

      <${Block} id="hero" name="Hero" status="new"
        desc="Контейнер первого экрана. Одна разметка, две раскладки и промо-вариант; на каждой ширине раскладка перестраивается сама."
        spec=${[
          ['Раскладки', ul(html`<${C}>split<//> — текст слева, фото справа (главная, Dell, HPE, промо)`, html`<${C}>cover<//> — фото на фоне, текст на scrim (NVMe, AMD, Colocation)`, html`промо — это <${C}>split<//> с <${C}>titleSize="page"<//>, <${C}>subhead<//> и <${C}>decor<//>`)],
          ['Слоты', html`<${C}>crumbs<//> <${C}>eyebrow<//> <${C}>logo<//> <${C}>title<//> <${C}>subhead<//> <${C}>lead<//> <${C}>actions<//> <${C}>fine<//> <${C}>chips<//> <${C}>media<//> + <${C}>stat<//> <${C}>bg<//> + <${C}>base<//> <${C}>decor<//> <${C}>benefits<//> (<${C}>inside<//> | <${C}>band<//>)`],
          ['≥ 1024', ul('Колонки 6 + 6 по 12-колоночной сетке, контейнер 1170. Eyebrow идёт строкой над текстом и может заходить на фото справа', html`Title <${C}>heading-display<//> 56/64, page-размер <${C}>heading-2xl<//>`, html`Lead <${C}>body-lg<//>, фото до 480px`)],
          ['720–1023', ul('tablet-portrait: колонки 5 : 3 по 8-колоночной сетке, gutter 24, поля 32', html`Title <${C}>heading-2xl<//>, lead <${C}>body-md<//>`, 'cover: фото шире (78%), scrim плотнее; decor меньше')],
          ['< 720', ul('Одна колонка, поля 16. Порядок: crumbs → eyebrow → logo → title → lead → media → actions → fine → chips → benefits', html`Title <${C}>heading-xl<//>, кнопки на всю ширину столбиком`, 'cover: фото уходит в верхнюю полосу и гаснет в base-цвет; eyebrow — одна строка со скроллом; decor скрыт')],
        ]}
        note=${html`Живые примеры — в разделе <a href="#builds">Сборки</a>. <${C}>base<//> — цвет под конкретное фото, его задаёт тот, кто ставит картинку; scrim строится из него, отдельный токен на каждую фотографию не нужен.`} />

      <${Block} id="pageheader" name="PageHeader" status="new"
        desc="Шапка страницы без медиа: каталог, служебные страницы, статьи. Тот же ритм, что у Hero, но без первого экрана."
        spec=${[['Слоты', html`<${C}>crumbs<//> <${C}>title<//> <${C}>lead<//> <${C}>aside<//> (счётчик, сортировка, вторичная кнопка)`], ['Адаптив', html`Title <${C}>heading-2xl<//> → <${C}>heading-xl<//> → <${C}>heading-lg<//>; на мобильном aside уходит под текст`]]}>
        ${F(() => html`<${PageHeader} crumbs=${crumbs('Home', 'Servers')} title="Refurbished Servers"
            lead="Dell PowerEdge, HPE ProLiant, Supermicro and Lenovo servers, tested and configured to order. Filter by brand, form factor and drive bays."
            aside=${html`<span class="nslph__meta">1,248 models</span><${Button} variant="ghost" size="md" iconLeft="filter">Filters<//>`} />`, DW)}
      <//>

      <${Block} id="eyebrow" name=${'EyebrowPill → Tag variant="eyebrow"'} status="ext"
        desc="Пилюли над заголовком. Это новый вариант Tag: Mono uppercase, иконка слева. Ряд всегда в одну строку и может заходить поверх фото в правой колонке."
        spec=${[
          ['Ряд', 'Без переноса. Десктоп: строка над текстом, z-index выше фото. Планшет: высота 36. Мобильный: 32, горизонтальный скролл без полосы, поля 16 по краям'],
          ['hover', html`<${C}>hover="icon"<//> — красится иконка (brand-default) и рамка (border-brand-subtle). <${C}>hover="fill"<//> — красится вся пилюля (brand-default, текст и иконка белые). Без <${C}>hover<//> — статичная подпись`],
          ['Анимация', html`Подъём на 2px + shadow-md, иконка поворачивается и чуть увеличивается с пружинкой (0.45s). Угол на иконку: шестерёнка 90°, чип −90°, остальные −14°. <${C}>prefers-reduced-motion<//> — только смена цвета`],
          ['Когда hover', 'Только если пилюля ведёт куда-то: якорь к разделу, страница о гарантии. Это ссылка, не кнопка, и она не считается вторым CTA'],
        ]}
        note="В демо ниже вторые пилюли в каждом ряду показаны в состоянии hover; на остальные можно навести мышь.">
        ${F(() => html`<div class="nslx"><div class="dx-stack">
            <div><div class="dx-label">hover="icon"</div><div class="nslp-row"><${EyebrowPill} hover="icon" icon="settings">Flexible configurations<//><${EyebrowPill} hover="icon" state="hover" icon="percent">Great value for money<//><${EyebrowPill} hover="icon" icon="cpu">Tested enterprise hardware<//></div></div>
            <div><div class="dx-label">hover="fill"</div><div class="nslp-row"><${EyebrowPill} hover="fill" icon="settings">Flexible configurations<//><${EyebrowPill} hover="fill" state="hover" icon="percent">Great value for money<//><${EyebrowPill} hover="fill" icon="cpu">Tested enterprise hardware<//></div></div>
            <div><div class="dx-label">static</div><div class="nslp-row"><${EyebrowPill} icon="settings">Flexible configurations<//><${EyebrowPill} icon="percent">Great value for money<//></div></div>
          </div></div>
          <div class="nslx nslx--dark nsl-on-dark"><div class="dx-label">на тёмном / на фото</div><div class="nslp-row"><${EyebrowPill} hover="icon" icon="settings">Flexible configurations<//><${EyebrowPill} hover="fill" state="hover" icon="percent">Great value for money<//></div></div>`, DW)}
      <//>

      <${Block} id="logo" name="VendorLogo" status="new"
        desc="Логотип производителя над заголовком на страницах брендов. В ассетах сейчас только логотипы NSL; нужны Dell EMC, HPE, AMD, NVMe Express, Supermicro, Lenovo — цветные и белые."
        spec=${[['Props', html`<${C}>vendor<//>, <${C}>tone<//> = color | white, <${C}>size<//> = lg 48 | md 40 | sm 28`], ['В Hero', 'Размер берётся из ширины: 48 → 40 → 28']]}>
        ${F(() => html`<div class="nslx"><div class="dx-row"><${VendorLogo} vendor="dell" /><${VendorLogo} vendor="hpe" /><${VendorLogo} vendor="dell" size="md" /><${VendorLogo} vendor="hpe" size="sm" /></div></div>`, DW)}
      <//>

      <${Block} id="gradient" name="GradientText" status="exc"
        desc="Брендовый градиент на отдельных словах заголовка. Разрешён только в Hero главной страницы; правило «градиент только в шапке, футере и логотипе» дополняется этим одним исключением."
        spec=${[['Где', 'Только title Hero на главной, только на ключевых словах (value, reliability). Остальной заголовок — text-primary. Не в лидах, не в кнопках, не на других страницах'], ['Градиент', html`На каждом слове свой: <${C}>gradient-blue<//> → <${C}>gradient-violet<//> → <${C}>gradient-magenta<//>, при переносе слово не рвёт градиент (box-decoration-break: clone). Самый светлый участок на белом ≈ 5.7:1`]]}>
        ${F(() => html`<div class="nslx"><h1 class="nslh__title" style=${{ maxWidth: '640px' }}>Refurbished servers built for <${GradientText}>value<//> & <${GradientText}>reliability<//></h1></div>`, DW)}
      <//>

      <${Block} id="mark" name="TextHighlight" status="new"
        desc="Выделение цветом внутри лида. Один фрагмент на абзац."
        spec=${[['Токены', html`<${C}>text-highlight<//> = secondary-default на светлом, secondary-200 на тёмном (через <${C}>.nsl-on-dark<//>)`], ['Почему синий', 'Бренд-розовый остаётся за CTA; синий в DS уже значит «информация»']]}>
        ${F(() => html`<div class="nslx nslx--black nsl-on-dark"><p class="nslh__lead">Get <${Mark}>Enterprise-class performance<//> at a fraction of OEM prices.</p></div>
          <div class="nslx"><p class="nslh__lead">Get <${Mark}>Enterprise-class performance<//> at a fraction of OEM prices.</p></div>`, DW)}
      <//>

      <${Block} id="stat" name="StatCallout" status="new"
        desc="Цифра поверх фото товара: экономия, срок, гарантия. Синий фон — это цена и выгода, не действие."
        spec=${[['Props', html`<${C}>pre<//> <${C}>value<//> <${C}>post<//>, <${C}>size<//> = lg | sm, <${C}>placement<//> = overlay | static`], ['Адаптив', html`Value <${C}>heading-xl<//> → <${C}>heading-lg<//> → <${C}>heading-md<//>; на мобильном прижимается к низу фото`]]}>
        ${F(() => html`<div class="nslx nslx--subtle"><div class="dx-row"><${StatCallout} placement="static" pre="Save up to" value="70–90%" post="vs New OEM Prices" /><${StatCallout} placement="static" size="sm" pre="Save up to" value="70–90%" post="vs New OEM Prices" /><${StatCallout} placement="static" value="3 years" post="warranty included" /></div></div>`, DW)}
      <//>

      <${Block} id="fine" name="FinePrint" status="style"
        desc=${html`Условия акции под кнопками. Достаточно стиля <${C}>body-xs<//> + <${C}>hero-fg-2<//>, компонент не нужен. Если появится таймер до конца акции — тогда это будет компонент.`} />

      <${Block} id="benefititem" name="BenefitItem" status="new"
        desc="Одно преимущество: иконка и текст. Четыре варианта по плотности; иконка — слот 56 / 72 / 28 / 44 px под элементы из Icons."
        spec=${[['Варианты', ul(html`<${C}>inline<//> — иконка + две строки (бренды, категории)`, html`<${C}>card<//> — карточка с иллюстрацией, заголовком и описанием (главная)`, html`<${C}>chip<//> — компактная рамка, Mono-подпись (Colocation)`, html`<${C}>column<//> — иконка над заголовком и абзацем (промо)`)], ['Props', html`<${C}>variant<//> <${C}>icon<//> <${C}>title<//> <${C}>text<//>`]]}>
        ${F(() => html`<div class="nslx"><div class="dx-stack">
            <div><div class="dx-label">inline</div><div class="dx-row"><${BenefitItem} icon="shield" title="Warranty" text="& Quality" /><${BenefitItem} icon="truck" title="Free Shipping:" text="US and Canada" /></div></div>
            <div><div class="dx-label">card</div><div style=${{ maxWidth: '360px' }}><${BenefitItem} variant="card" ...${HOME_CARDS[0]} /></div></div>
            <div><div class="dx-label">column</div><div style=${{ maxWidth: '360px' }}><${BenefitItem} variant="column" ...${SUMMER_COLS[1]} /></div></div>
          </div></div>
          <div class="nslx nslx--dark nsl-on-dark"><div class="dx-label">chip · на тёмном</div><div class="dx-row"><${BenefitItem} variant="chip" ...${COLOC_CHIPS[0]} /><${BenefitItem} variant="chip" ...${COLOC_CHIPS[2]} /></div></div>`, DW)}
      <//>

      <${Block} id="benefitbar" name="BenefitBar" status="new"
        desc="Ряд преимуществ, справа один или несколько RatingBadge (ratings=['google', 'trustpilot']). Внешний вид задаёт и вариант BenefitItem внутри."
        spec=${[
          ['appearance', ul(html`<${C}>plain<//> — без подложки (Dell, HPE)`, html`<${C}>card<//> — белая карточка поверх фото (NVMe, AMD)`, html`<${C}>cards<//> — карточки 2 × 2 + колонка рейтингов (главная)`, html`<${C}>columns<//> — 3 колонки текста (промо)`, html`<${C}>chips<//> — компактные рамки под кнопками (Colocation)`, html`<${C}>pills<//> — те же бенефиты как EyebrowPill в одну строку, с <${C}>hover<//> (вариант для Colocation)`)],
          ['720–1023', html`plain / card: сетка 2 × 2, рейтинг справа. cards: 2 × 2, рейтинги строкой под карточками`],
          ['< 720', html`plain / card: 2 × 2, иконка над текстом, рейтинг одной строкой внизу. cards: карточки столбиком, рейтинги компактными строками. columns и chips — в один столбец`],
        ]}>
        ${F(() => html`<div class="nslx nslx--subtle"><div class="dx-stack">
            <div><div class="dx-label">plain</div><${BenefitBar} appearance="plain" items=${TRUST} /></div>
            <div><div class="dx-label">card</div><${BenefitBar} appearance="card" items=${TRUST} /></div>
            <div><div class="dx-label">cards</div><${BenefitBar} appearance="cards" items=${HOME_CARDS} ratings=${['google', 'trustpilot']} /></div>
          </div></div>`, DW)}
      <//>

      <${Block} id="rating" name="RatingBadge" status="new"
        desc="Рейтинг площадки отзывов со ссылкой на отзывы: Google и Trustpilot. Google рисует звёзды через StarRating из DS, Trustpilot — своими зелёными квадратами с частичной заливкой последнего (4.7). Число набрано text-primary: оранжевый и зелёный как текст на белом не проходят по контрасту."
        spec=${[['Props', html`<${C}>source<//> = google | trustpilot, <${C}>score<//>, <${C}>variant<//> = card | plain | compact`], ['Варианты', html`<${C}>card<//> (по умолчанию), <${C}>plain<//> — внутри белой карточки, <${C}>compact<//> — одна строка для мобильного`], ['Ассеты и токены', html`Логотипы Google и Trustpilot в Logos; токен <${C}>rating-trustpilot<//> (#00b67a) только для звёзд`]]}>
        ${F(() => html`<div class="nslx nslx--subtle"><div class="dx-stack"><div class="dx-row"><${RatingBadge} /><${RatingBadge} source="trustpilot" /><${RatingBadge} variant="plain" /><${RatingBadge} source="trustpilot" variant="plain" /></div><div class="dx-stack" style=${{ maxWidth: '343px', gap: '8px' }}><${RatingBadge} variant="compact" /><${RatingBadge} source="trustpilot" variant="compact" /></div></div></div>`, DW)}
      <//>
    </section>

    <section class="pg-section" id="cta">
      <h2 class="pg-h2">Пары кнопок в герое</h2>
      <p class="pg-h2-lead">Правило одного CTA не меняется: одна залитая primary, вторая ступенью ниже. Какая именно вторая — зависит от фона и от того, что это за действие.</p>
      <div class="pairs">
        <div class="pair"><div class="pair__demo pair__demo--light"><${Button} variant="primary" size="md" iconLeft="settings">Configure a Server<//><${Button} variant="ghost" size="md" iconLeft="tag">Unlock Volume Discount<//></div>
          <div class="pair__body"><div class="pair__title">primary + ghost <span class="verdict verdict--ok">Светлый фон</span></div><p>Вторая — равноправная альтернатива (другой путь покупки). Так на главной.</p></div></div>
        <div class="pair"><div class="pair__demo pair__demo--light"><${Button} variant="primary" size="md" iconLeft="settings">Configure your server<//><${Button} variant="text" size="md" iconLeft="chevron-down">See all eligible models below<//></div>
          <div class="pair__body"><div class="pair__title">primary + text <span class="verdict verdict--rec">Предлагаю</span></div><p>Если вторая ведёт вниз по странице или на соседний раздел, это не альтернатива, а навигация. Text с иконкой не спорит с CTA, а на мобильном почти не добавляет высоты.</p></div></div>
        <div class="pair"><div class="pair__demo pair__demo--black"><${Button} variant="primary" size="md" iconLeft="settings">Configure a Server<//><${Button} variant="ghost" size="md" iconLeft="tag">Unlock Volume Discount<//></div>
          <div class="pair__body"><div class="pair__title">primary + ghost на тёмном <span class="verdict verdict--warn">Не стоит</span></div><p>Розовый текст на чёрном — 3.5:1, ниже 4.5:1 для подписи 16px. На тёмных героях (NVMe, AMD, Colocation) ghost лучше заменить вариантом справа.</p></div></div>
        <div class="pair"><div class="pair__demo pair__demo--photo"><${Button} variant="primary" size="md">Get my installment offer<//><${Button} variant="primary-ghost-inverted" size="md">See how it works<//></div>
          <div class="pair__body"><div class="pair__title">primary + primary-ghost-inverted <span class="verdict verdict--rec">Предлагаю для тёмных</span></div><p>Белая обводка и текст: читается на чёрном и на фото (21:1), вторая роль видна, акцент остаётся один. Для NVMe, AMD и Colocation.</p></div></div>
      </div>
      <p class="pg-desc" style=${{ marginTop: '16px' }}>На мобильном обе кнопки на всю ширину, primary сверху; text-вариант можно оставить по ширине текста.</p>
    </section>

    <section class="pg-section" id="builds">
      <h2 class="pg-h2">Сборки</h2>
      <p class="pg-h2-lead">Семь героев с сайта, собранные только из компонентов выше. Переключи ширину сверху или выбери «Все три».</p>
      ${COMPOSITIONS.map(c => html`<section class="pg-block" id=${'b-' + c.id} key=${c.id}>
        <div class="pg-block__head"><h3 class="pg-h3">${c.name}</h3></div>
        <p class="pg-desc">${c.note}</p>
        ${F(() => c.el())}
      </section>`)}
    </section>

    <section class="pg-section" id="tokens">
      <h2 class="pg-h2">Что добавить в токены и ассеты</h2>
      <ul class="pg-list">
        <li><code>grid-columns</code>, <code>grid-gutter</code>, <code>grid-margin</code> для трёх брейкпоинтов и компонент LayoutGrid — в основную DS.</li>
        <li><code>rating-trustpilot</code> (#00b67a) — только звёзды Trustpilot.</li>
        <li><code>text-highlight</code> (secondary-default / on-dark: secondary-200) для TextHighlight.</li>
        <li><code>hero-fg</code>, <code>hero-fg-2</code> как алиасы на text-primary/secondary и on-dark-primary/secondary — или переиспользовать on-surface-*, если у них появятся нормальные светлые значения (сейчас оба указывают на label-default).</li>
        <li>Исключение для градиента: запись в README рядом с правилом «градиент только в шапке, футере и логотипе».</li>
        <li>Ассеты: логотипы вендоров (цвет + белый), логотипы Google и Trustpilot. Иконки бенефитов — твоими элементами в Icons; слоты 56 / 72 / 28 / 44 px.</li>
        <li>Без нового токена: <code>base</code> героя — цвет конкретного фото, задаётся пропсом.</li>
      </ul>
    </section>
  </div><//>`;
}

ReactDOM.createRoot(document.getElementById('root')).render(html`<${App} />`);
})();
