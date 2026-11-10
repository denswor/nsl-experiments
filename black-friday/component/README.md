# nsl-bf — hero Black Friday на главной

Первый экран главной newserverlife.com на время Black Friday (вариант C) на NSL Design System. Чистый HTML, CSS и JS, без React и других зависимостей.

- **Тёмная полоса** под шапкой сайта: радиальный фон, почти чёрный в центре и тёмно-фиолетовый к краям.
- **Знак NSL** в центре, его край ловит свет под курсором. На телефоне свет идёт за пальцем, пока тот касается hero, а вертикальный скролл не блокируется. Без курсора блик сам медленно обходит контур.
- **Фото сервера** — декор. На десктопе оно лежит позади всего, шириной ровно 1440 px, и не растягивается: на широких экранах края растворяются в фон, на узких обрезаются. На телефоне фото стоит полосой между текстом и кнопкой, поэтому подпись под кнопкой не ложится на пёструю картинку.
- **Одна CTA** — кнопка DS `primary`, размер `xl`. На телефоне она становится `lg` и занимает всю ширину.
- Ниже hero идёт обычная страница сайта на белом фоне.

Демо: https://denswor.github.io/nsl-experiments/black-friday/component/demo/

## Что в архиве

```
dist/
  nsl-bf.css            токены NSL DS + стили кнопки DS + стили hero (~25 КБ, ~5 КБ gzip)
  nsl-bf.js             подсветка знака (исходник с комментариями); nsl-bf.min.js — для сайта (~2.5 КБ)
  assets/server-r740xd-lit.webp   фото сервера с прозрачным фоном, 1800×600, 70 КБ
snippets/bf-hero.html   разметка hero: вставить сразу под шапкой
bitrix/include/nsl-bf-hero.php   та же разметка как include для Bitrix, тексты меняются массивом $NSL_BF
demo/                   демо-страница: шапка DS (только для демо), hero, белая страница
src/, tools/build.js    исходники и сборка (запускается в репозитории nsl-experiments, см. последний раздел)
```

## Подключение

1. Файлы:
   - `dist/nsl-bf.css` → `/local/templates/nsl/css/nsl-bf.css`
   - `dist/nsl-bf.min.js` → `/local/templates/nsl/js/nsl-bf.min.js`
   - `dist/assets/server-r740xd-lit.webp` → `/local/templates/nsl/images/black-friday/`
   - `bitrix/include/nsl-bf-hero.php` → `/local/templates/nsl/include/`
2. В `<head>` главной (только на время акции):

```html
<link rel="stylesheet" href="/local/templates/nsl/css/nsl-bf.css">
<script src="/local/templates/nsl/js/nsl-bf.min.js" defer></script>
```

3. В шаблоне главной, сразу под шапкой, вместо обычного hero:

```php
<?php
$NSL_BF = [
    'dates'     => 'Nov 27 – Dec 1',
    'fine'      => 'Up to 40% off · ends Dec 1',
    'cta_href'  => '/black-friday/',
];
include $_SERVER['DOCUMENT_ROOT'] . '/local/templates/nsl/include/nsl-bf-hero.php';
?>
```

   Все ключи `$NSL_BF` необязательные:

   | ключ | по умолчанию | где |
   | --- | --- | --- |
   | `dates` | `[Nov 27 – Dec 1]` | строка над заголовком, после «Special offer» |
   | `lead` | текст про B2B-условия | абзац под заголовком |
   | `cta_label` | `Shop Black Friday deals` | кнопка |
   | `cta_href` | `/black-friday/` | ссылка кнопки |
   | `fine` | `Up to [X]% off · ends [Dec 1]` | строка под кнопкой |
   | `image` | `/local/templates/nsl/images/black-friday/server-r740xd-lit.webp` | фото сервера |

   Значения в квадратных скобках — заглушки, их заполняет маркетинг. Заголовок «BLACK FRIDAY» в разметке, не в настройках.
   Без Bitrix можно вставить `snippets/bf-hero.html` как есть и поправить тексты и путь к картинке руками.

4. Шрифты: IBM Plex Sans и IBM Plex Mono на сайте уже подключены. Для заголовка нужен ещё **Montserrat 900**:

```html
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Montserrat:wght@900&display=swap">
```

   Если Montserrat не подключить, заголовок наберётся IBM Plex Sans: раскладка не сломается, но выглядеть будет иначе.

## Раскладка

| ширина | что происходит |
| --- | --- |
| от 720 px | полоса высотой 648 px, всё по центру; заголовок от 64 до 112 px в зависимости от ширины; фото сервера 1440 px с верхом на 360 px, позади знака и текста |
| до 720 px | высота по содержимому: текст (верх на 145 px), полоса с фото высотой 150 px, кнопка во всю ширину, строка про скидку; знак 279 px за текстом |

Шапку сайта hero не трогает. На странице должен быть один hero: в SVG фиксированные id `nsl-bf-*`.

## Как работает подсветка

- Скрипт находит каждый `[data-nsl-bf]` сам, вызывать ничего не нужно.
- Курсор или палец переводится в координаты SVG знака (`getScreenCTM`), центр радиального градиента обновляется раз в кадр (`requestAnimationFrame`).
- Без курсора работает SMIL-анимация градиента прямо в разметке. Она ставится на паузу, когда hero уходит с экрана (`IntersectionObserver`). При `prefers-reduced-motion: reduce` блик стоит на месте, а за курсором и пальцем по-прежнему следует (это действие самого человека).
- Без JS hero выглядит так же, только свет не идёт за курсором.

## События для аналитики

`CustomEvent('nsl-bf')` всплывает от hero. Если на странице есть `window.dataLayer`, туда пушится `{ event: 'bf_<type>', … }`.

| type | когда |
| --- | --- |
| `view` | hero хотя бы наполовину на экране (один раз за загрузку страницы) |
| `cta_click` | клик по кнопке (`href`) |

## API

`NSLBlackFriday.bind(root)` — подхватить hero, добавленный на страницу позже. `NSLBlackFriday.mount(element)` — один hero, вернёт `{ destroy }`. `NSLBlackFriday.version` — версия.

## Совместимость

Последние версии Chrome, Edge, Firefox, Safari (desktop и iOS). Нужны Pointer Events, `mask-image` (в Safari с префиксом `-webkit-`, он есть в CSS) и SMIL-анимация в SVG.

## Пересборка из дизайн-системы

Сборка живёт в репозитории nsl-experiments (`black-friday/component/`) и берёт бандл DS из `_shared/nsl/`. Разметка кнопки рендерится из компонента `NSL.Button` через `react-dom/server`. В `dist/nsl-bf.css` из `bundle.css` попадают только правила, классы которых есть в разметке hero.

```
npm i && npm run build
```
