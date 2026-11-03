# nsl-dotw.js — баннер «Deal of the Week»

Выезжающий слева баннер с формой email для newserverlife.com. Один файл, без зависимостей, около 10 КБ в gzip без минификации.
Стили изолированы в Shadow DOM: CSS шаблона Bitrix не влияет на баннер, а стили баннера не протекают на сайт.

Демо, в том числе на странице с нарочно «враждебным» CSS: https://denswor.github.io/nsl-experiments/dotw/component/

**Архив для разработчика:** https://denswor.github.io/nsl-experiments/dotw/component/nsl-dotw-1.1.0.zip
(минифицированный и исходный файлы, примеры, заготовки для Bitrix, README, CHANGELOG)

## Подключение

```html
<!-- в конце <body>, на страницах, где нужен баннер (не на корзине и не в checkout) -->
<div id="nsl-dotw"></div>
<script src="/local/templates/nsl/js/nsl-dotw.js" defer></script>
<script>
  document.addEventListener('DOMContentLoaded', function () {
    NSLDotw.mount('#nsl-dotw', {
      dealId: '2026-w44-r640',                     // уникальный ID сделки
      title: 'DELL PowerEdge R640',
      tagline: ['One compact server.', 'Any workload.'],
      uses: 'Virtualization · Databases · Cloud Apps',
      badge: '−20% OFF',
      image: { src: '/upload/dotw/r640-crop.webp', alt: 'Dell PowerEdge R640' },
      endpoint: '/ajax/dotw-claim.php',
      extraFields: { sessid: BX.bitrix_sessid() },  // CSRF-токен Bitrix
      privacyUrl: '/privacy/'
    });
  });
</script>
```

Данные сделки удобнее отдавать из инфоблока: компонент Bitrix выводит этот же вызов с полями из элемента.

## Опции

| опция | по умолчанию | что делает |
| --- | --- | --- |
| `dealId` | — (обязательно) | ID сделки. Новый ID — баннер снова показывается всем, кто скрывал предыдущий |
| `title`, `tagline`, `uses` | | Модель, слоган (строка или массив строк), сценарии использования |
| `badge` | `''` | Бейдж скидки поверх картинки, например `'−20% OFF'`. Влетает после контента и покачивается; пусто — без бейджа |
| `image` | `null` | `{ src, alt }`. PNG/WebP с прозрачным фоном **с того же домена**: блик использует картинку как CSS-маску |
| `endpoint` | `''` | URL для POST. Пусто и нет `submit` — демо-режим, отправка всегда «успешна» |
| `encoding` | `'form'` | `'form'` (x-www-form-urlencoded) или `'json'` |
| `extraFields` | `null` | Доп. поля в запрос, например `{ sessid }` |
| `submit` | `null` | `async (payload) => {}`. Своя отправка вместо `endpoint`; бросить ошибку — показать ошибку в форме |
| `privacyUrl` | `''` | Добавляет под кнопкой «By claiming the deal you agree to our Privacy Policy.» |
| `autoOpen` | `false` | Через сколько мс открыть баннер самому (например, `2500`). Затем он сворачивается в язычок |
| `autoCollapse` | `8000` | Сколько мс авто-открытый баннер ждёт перед сворачиванием. Ховер — пауза, фокус в поле — отмена |
| `hideAfterClaim` | `3500` | Сколько мс висит «Deal claimed» перед скрытием до следующей сделки |
| `offsetTop` / `offsetTopMobile` | `136` / `64` | Отступ сверху в px (под шапкой) на десктопе и на телефоне (≤ 480 px) |
| `zIndex` | `1000` | Над контентом, но под модалками сайта. Cookie-баннер и чат стоит держать выше или ниже по договорённости |
| `shadow` | `true` | `false` — рендер в обычный DOM с теми же BEM-классами (если нужно переопределять стили снаружи; изоляции тогда нет) |
| `storage` | `true` | Запоминать «скрыто для этой сделки» в localStorage (`nsl_dotw_hidden`) |
| `onEvent` | `null` | `(type, detail) => {}` для аналитики |
| `labels` | англ. тексты | Все строки интерфейса; можно переопределить любые |

## Отправка формы

POST на `endpoint` с полями `email`, `dealId`, `page` (URL страницы) и всем из `extraFields`. Любой ответ 2xx считается успехом, всё остальное — ошибкой («Couldn't send. Please try again.»).
Скрытое honeypot-поле `website`: если бот его заполнил, запрос не уходит, но пользователь видит успех.

Пример обработчика `/ajax/dotw-claim.php` (набросок):

```php
<?php
require $_SERVER['DOCUMENT_ROOT'].'/bitrix/modules/main/include/prolog_before.php';
if (!check_bitrix_sessid() || !filter_var($_POST['email'] ?? '', FILTER_VALIDATE_EMAIL)) { http_response_code(400); exit; }
// сохранить лид / отправить письмо с конфигурацией и ценой по $_POST['dealId']
http_response_code(204);
```

## События

На контейнере срабатывает `CustomEvent('nsl-dotw')` с `detail.type`. Если на странице есть `window.dataLayer`, туда же пушится `{ event: 'dotw_<type>', dealId, … }`.

| type | когда |
| --- | --- |
| `view` | баннер смонтирован (`mode: 'tab'` или `'auto'`) |
| `skip` | не показан: посетитель уже скрыл или забрал эту сделку |
| `open` / `close` | открыт или закрыт (`source`: `user`, `auto`, `tab`, `close-button`, `escape`, `api`) |
| `claim` / `claim_error` | email отправлен или ошибка отправки |
| `dismiss` | нажато «Not interested this week» |
| `hide` | скрыт до следующей сделки (`reason`: `claimed`, `dismiss`, `api`) |

```js
document.getElementById('nsl-dotw').addEventListener('nsl-dotw', function (e) { console.log(e.detail.type, e.detail); });
```

## API

```js
var dotw = NSLDotw.mount('#nsl-dotw', { … });
dotw.open(); dotw.close(); dotw.hide(); dotw.destroy(); dotw.state; // 'closed' | 'open' | 'gone' | 'skipped'
NSLDotw.isHidden('2026-w44-r640'); // посетитель скрыл / забрал эту сделку?
NSLDotw.reset();                    // забыть флаг (для QA)
```

## Что уже сделано внутри

- **Изоляция.** Shadow DOM на обычном `<div>`, внутри BEM: `nsl-dotw__panel`, `nsl-dotw__tab`, `nsl-dotw__cta`… Значения токенов NSL Design System зашиты в CSS компонента. Шрифты IBM Plex берутся со страницы.
- **Состояния.** Свёрнут в язычок → открыт → «Deal claimed» → скрыт до следующей сделки. Ещё «Not interested this week» и авто-открытие.
- **Доступность.** Язычок — `<button aria-expanded aria-controls>`. Закрытая панель `inert`. Esc закрывает и возвращает фокус на язычок. У поля есть `<label>`, ошибки озвучиваются через `aria-live`.
- **Анимации.** Каскад при открытии и отставание контента при закрытии, подёргивание язычка, блик на сервере, живое пламя. Всё отключается при `prefers-reduced-motion`.
- **Телефон (≤ 480 px).** Компактная раскладка, помещается на 375×667. Язычок дёргается один раз.

## Совместимость

Последние версии Chrome, Edge, Firefox, Safari (desktop и iOS). Нужны Shadow DOM, `fetch`, `:where()`, `inert`. Без `inert` (старый Safari < 15.5) закрытая панель всё равно скрыта через `aria-hidden` и уезжает за экран.

Если есть CSP, разрешите inline-стили в Shadow DOM: `style-src 'self' 'unsafe-inline'`, либо вынесите CSS в файл.
