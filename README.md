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
```

## Adding an experiment

Create a folder, load React 18, ReactDOM 18 and `_shared/nsl/bundle.js`, then mount NSL components.
Fonts come from Google Fonts (IBM Plex Mono, IBM Plex Sans); the `@font-face` rules from the design
system export were removed because they point at files that live only in the design system artifact.
Add a card for the new page to `index.html`.

To refresh the design system copy, replace the three files in `_shared/nsl/`.
