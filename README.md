# NSL Experiments

UI prototypes for newserverlife.com built on NSL Design System. Published with GitHub Pages:
https://denswor.github.io/nsl-experiments/

## Structure

```
_shared/nsl/      NSL Design System: tokens.css, bundle.css, bundle.js (window.NSL)
dotw/             Deal of the Week — left-edge banner
  dotw.js         page backdrop + banner (React 18 + htm, no build step)
  dotw.css
  variant-e/      slide-out banner with form
  variant-f/      auto-open on first visit, then folds into the tab
hero/             Hero kit — first-screen components and the site heroes rebuilt
  app.js          components + page (React 18 + htm, no build step)
  hero.css        component styles (container queries: ≥1024, 720–1023, <720)
  page.css        page chrome
  assets/         product photos, backgrounds, vendor and review logos
configurator/     Configure-to-order tab of Dell PowerEdge R760xd2 24LFF + 4LFF
  index.html      review shell: frame width (Fit / 1440 / 1024 / 375), configurator theme, notes
  proto.html      the page itself (React 18, NSL bundle, plain createElement, no build step)
ask-specialist/   Ask a specialist help form on the R760xd2 configurator (Secondary theme), checkboxes and radios variant
  index.html      review shell: frame width, configurator theme (Secondary by default), notes
  proto.html      configurator/proto.html plus the full help form and "Stuck here?" in section heads
  component/      nsl-ask.js — the same form in vanilla JS for the live site (Shadow DOM, no dependencies; variant 'simple' for pages without a build), demo, ZIP for developers
search/           Search results page, variant 1.1 (one mixed list for Bitrix search.page)
  index.html      review shell: frame width (Fit / 1440 / 1024 / 375), notes
  proto.html      the page itself (React 18, NSL bundle, plain createElement, no build step)
  assets/         product photos and blog covers
  component/      nsl-search — the same page in vanilla JS for the live site: CSS, JS, Bitrix search.page template, suggest endpoint, demo, ZIP for developers
black-friday/     Black Friday home hero, variant C (dark band, mark with rim light following the pointer)
  index.html      review shell: frame width (Fit / 1440 / 1024 / 375), notes
  proto.html      the page itself (React 18 for Header / MobileHeader / Button, plain DOM for the hero)
  assets/         server photo with transparent background
  component/      nsl-bf — the same hero in vanilla JS for the live site: CSS, JS, HTML snippet, Bitrix include, demo, ZIP for developers
  landing/        full Black Friday landing: review shell, desktop.html (dark, 1440), light.html (light experiment, 1440) and mobile.html (375) built from the canvas boards
                  (src/*.dc.html → tools/build.js renders NSL components to static markup; src/landing.js is the only script)
header-catalog/   Header catalog menu, motion concept A (curtain), full-viewport, wide container from 1680
  index.html      light menu; #black-friday = dark Black Friday menu (React 18, real Header / CatalogMenu from the NSL bundle, motion with WAAPI)
  bf-banner.png   Black Friday banner in the brand row (both themes)
  review/         the same page with the review toolbar: concepts A/B/C, theme, slow-mo, reduced motion, Sale / discount badge variants
```

## Adding an experiment

Create a folder, load React 18, ReactDOM 18 and `_shared/nsl/bundle.js`, then mount NSL components.
Fonts come from Google Fonts (IBM Plex Mono, IBM Plex Sans); the `@font-face` rules from the design
system export were removed because they point at files that live only in the design system artifact.
Add a card for the new page to `index.html`.

To refresh the design system copy, replace the three files in `_shared/nsl/`.
