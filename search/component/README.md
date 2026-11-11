# nsl-search — страница результатов поиска

Страница поиска newserverlife.com на NSL Design System, свёрстанная на чистом JS без React и других зависимостей. Готова к переносу в шаблон Bitrix.

- **Predictive search.** Пока человек печатает в поле поиска (от 2 символов), под полем открывается панель подсказок по группам: Server models, Chassis, Storages, Articles. Каждое слово запроса подсвечено отдельно. Латинская x и кириллическая х считаются одной буквой («8х nvme»).
- **Выдача.** Один список по релевантности, как отдаёт `search.page`. У каждой строки своя плотность: товар (фото, тип, бейджи, одна кнопка), статья (обложка, время чтения, отрывок), страница (иконка, отрывок, путь).
- **Десктоп (от 1024 px):** нумерованная пагинация ссылками, справа карточка «Can’t find the right configuration?».
- **Телефон и планшет:** поле поиска прилипает сверху. Кнопка «Show 10 more» подгружает следующую страницу и дописывает строки в список, под ней счётчик «Showing 1–20 of 47» и компактная пагинация.
- **Помощь специалиста:** кнопка «Request a Configuration» и таб у края открывают короткую форму `nsl-ask` (`variant: 'simple'`). На десктопе это панель справа, на телефоне шит снизу.

Демо (статические страницы 1–5, подсказки из локального списка): https://denswor.github.io/nsl-experiments/search/component/demo/
Попробуйте набрать `dl380 nvme`, `r740`, `8х` и пройти по подсказкам стрелками.

## Что в архиве

```
dist/
  nsl-search.css        токены NSL DS + только нужные странице компоненты DS + раскладка страницы (~36 КБ, ~6 КБ gzip)
  nsl-search.js         подсказки и «Show 10 more» (исходник с комментариями); .min.js — для сайта
  nsl-ask.js            форма «Ask a specialist» v1.1 (с короткой формой); .min.js — для сайта
bitrix/
  components/bitrix/search.page/nsl/
    template.php        шаблон search.page: разметка DS один в один с демо
    result_modifier.php тип строки (товар / статья / страница), картинки, бейджи, пагинация. Здесь указать ID инфоблоков
    nsl_snippets.php    иконки и бейджи DS (SVG); генерируется сборкой, руками не править
  ajax/search-suggest.php  эндпоинт подсказок (JSON, сгруппированный по типам, с кешем)
demo/                   статическая страница: index.html и page-2…5.html, картинки, demo-suggest.js
src/, tools/build.js    исходники и сборка (запускается в репозитории nsl-experiments, см. последний раздел)
```

## Подключение на сайте

1. Шаблон: скопировать `bitrix/components/bitrix/search.page/nsl/` в `/local/templates/<шаблон сайта>/components/bitrix/search.page/nsl/`.
2. Эндпоинт: `bitrix/ajax/search-suggest.php` положить в `/ajax/search-suggest.php`.
3. ID инфоблоков указать в двух местах:
   - `result_modifier.php`, массив `$NSL`: какие инфоблоки — товары (тип, кнопка) и какие — блог. Можно передать параметром `NSL_SEARCH_CONFIG` из вызова компонента.
   - `search-suggest.php`, массив `$GROUPS`: инфоблоки для групп подсказок.
4. Стили и скрипты — на странице поиска (или во всём шаблоне, если подсказки нужны в шапке на всех страницах):

```html
<link rel="stylesheet" href="/local/templates/nsl/css/nsl-search.css">
<script src="/local/templates/nsl/js/nsl-ask.min.js" defer></script>
<script src="/local/templates/nsl/js/nsl-search.min.js" defer></script>
<script>
  document.addEventListener('DOMContentLoaded', function () {
    NSLAsk.mount({ variant: 'simple', endpoint: '/ajax/ask-specialist.php', extraFields: { sessid: BX.bitrix_sessid() } });
  });
</script>
```

5. Вызов компонента на `/search/index.php`:

```php
$APPLICATION->IncludeComponent('bitrix:search.page', 'nsl', [
    'PAGE_RESULT_COUNT' => 10,
    'DISPLAY_TOP_PAGER' => 'N', 'DISPLAY_BOTTOM_PAGER' => 'N',   // пагинацию рисует шаблон
    'USE_TITLE_RANK' => 'Y', 'DEFAULT_SORT' => 'rank', 'CHECK_DATES' => 'Y',
    'NSL_SUGGEST_URL' => '/ajax/search-suggest.php',
]);
```

Контент страницы стоит в `.nsl-container`: от 1680 px он становится широким (1530 px, поля 75). Футер сайта в этот момент тоже должен переключаться на широкий контейнер, иначе края контента и футера разъедутся. В демо так и сделано: от 1680 px показывается Footer `wide`.

Шрифты IBM Plex Sans и IBM Plex Mono берутся со страницы: на сайте они уже подключены. `@font-face` в CSS нет.

### Подсказки в шапке сайта

Шапка остаётся вашей. Достаточно пометить обёртку поля поиска атрибутом:

```html
<div class="header-search" data-nsl-suggest="/ajax/search-suggest.php">
  <form action="/search/" method="get"><input type="search" name="q" …><button …></button></form>
</div>
```

Скрипт сам найдёт `input`, добавит ARIA-атрибуты и положит панель внутрь обёртки, под поле, во всю его ширину. Обёртке ставится `position: relative`. У предков не должно быть `overflow: hidden`, иначе панель обрежется.
В шаблоне `search.page` на телефоне есть своё прилипающее поле с подсказками. На десктопе оно скрыто, там работает поле в шапке.

## Как работают подсказки

- Запрос: `GET /ajax/search-suggest.php?q=…` после 150 мс тишины, от 2 символов. Устаревший запрос отменяется. Ответы кешируются в памяти страницы, на сервере — в кеше Bitrix на 10 минут.
- Ответ:

```json
{
  "groups": [
    { "title": "Chassis",
      "items": [ { "label": "HPE ProLiant DL380 Gen10 16SFF (8x NVMe)", "href": "/catalog/…/" } ],
      "more": { "label": "Show all chassis (13)", "href": "/search/?q=dl380%20nvme" } }
  ],
  "all": { "label": "All Results", "href": "/search/?q=dl380%20nvme" }
}
```

  Группы выводятся в порядке ответа, не больше 4 строк в группе (DS: 2–4). Пустые группы не показываются. Строка «All Results» есть всегда.
- В отличие от `search.page`, подсказки можно группировать: эндпоинт делает по маленькому поиску на группу (`CSearch` с `PARAM2` = инфоблоки группы).
- Кириллическая «х» рядом с цифрой («8х») на сервере заменяется на латинскую. Это тот же случай, что обсуждали с Инной.
- **Клавиатура:** ↓ ↑ ходят по пунктам, Enter открывает пункт, Esc закрывает панель, Tab уходит дальше. Enter без выбранного пункта отправляет форму как обычно.
- **Доступность:** поле — `role="combobox"` с `aria-expanded`, `aria-controls`, `aria-activedescendant`. Панель — `role="listbox"`, группы — `role="group"` с названием.
- **Без JS** поле остаётся обычной формой `GET /search/?q=`.

## Как работает «Show 10 more»

Кнопка `data-nsl-more` знает адрес следующей страницы (`data-next`, обычный `?PAGEN_1=2`). Скрипт загружает эту страницу целиком, берёт строки из `[data-nsl-results]` и дописывает их в список. Потом обновляет счётчик `[data-nsl-count]`, компактную пагинацию и адрес для следующего нажатия. Новые строки коротко подсвечиваются, фокус переходит на первую из них.
Отдельный AJAX-режим на сервере не нужен. Если загрузка не удалась, браузер просто открывает следующую страницу.

## Кнопки в строках товаров

- `Configure` / `Choose Chassis` — ссылка на товар.
- `Add to Cart` — `<button data-nsl-cart="ID">`. Вашему скрипту корзины нужно повесить обработчик на `[data-nsl-cart]` (делегированием на `document`, чтобы ловить и строки, догруженные «Show 10 more»).

## Опции `NSLSearch.init()`

Ничего вызывать не обязательно: разметка с `data-nsl-suggest` и `data-nsl-more` подхватывается сама. `init` нужен, только чтобы поменять настройки.

| опция | по умолчанию | что делает |
| --- | --- | --- |
| `suggestUrl` | из `data-nsl-suggest` | URL эндпоинта подсказок |
| `source` | `null` | `function (query, signal) → Promise<ответ>` вместо `suggestUrl` (демо, тесты, другой бэкенд) |
| `queryParam` | `'q'` | имя параметра запроса |
| `minChars`, `delay` | `2`, `150` | с какой длины и через сколько мс тишины спрашивать |
| `maxPerGroup` | `4` | строк в группе |
| `searchUrl` | `action` формы | куда ведёт «All Results», если сервер его не прислал |
| `labels` | англ. тексты | `panel`, `allResults`, `more`, `loading`, `count`, `loadError` |
| `onEvent` | `null` | `(type, detail) => {}` для аналитики |

API: `NSLSearch.suggest(element, options)` — подключить одно поле вручную (вернёт `{ open, close, destroy }`). `NSLSearch.loadMore(button)` — одну кнопку. `NSLSearch.bind(root)` — подхватить разметку, добавленную на страницу позже.

## События

`CustomEvent('nsl-search')` всплывает от поля или кнопки. Если на странице есть `window.dataLayer`, туда пушится `{ event: 'search_<type>', … }`.

| type | когда |
| --- | --- |
| `suggest_open` | панель открылась (`query`, `groups`) |
| `suggest_click` | выбран пункт (`query`, `label`, `href`, `keyboard`) |
| `submit` | форма отправлена (`query`) |
| `more` / `more_error` | догружена страница (`url`, `rows`) или ошибка |

Форма специалиста шлёт свои события `nsl-ask` (см. README nsl-ask).

## Совместимость

Последние версии Chrome, Edge, Firefox, Safari (desktop и iOS). Нужны `fetch`, `AbortController`, `DOMParser`, container queries (подсказки на узком экране).

## Пересборка из дизайн-системы

Сборка живёт в репозитории nsl-experiments (`search/component/`): ей нужны бандл DS из `_shared/nsl/` и `ask-specialist/component/nsl-ask.js`. Разметка демо и PHP-сниппеты собираются из React-компонентов NSL DS (`_shared/nsl/bundle.js`) через `react-dom/server`. CSS — из `bundle.css`: в `dist/nsl-search.css` попадают только правила, классы которых есть на странице. Поэтому после изменений в DS:

```
npm i && npm run build
```
