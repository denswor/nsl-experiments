# nsl-ask.js — форма «Ask a specialist»

Запрос помощи специалиста для newserverlife.com: полная форма для конфигуратора и короткая (`variant: 'simple'`) для поиска и других страниц без сборки. Один файл на чистом JS, без React и других зависимостей, около 13 КБ в gzip.
Стили изолированы в Shadow DOM: CSS шаблона Bitrix не влияет на форму, а стили формы не протекают на сайт. Цвета, шрифты и отступы — токены NSL Design System, тема Primary.

- **Десктоп (от 1024 px):** панель 440 px справа без затемнения, конфигуратор остаётся рабочим. От 1280 px у правого края висит вертикальный таб «Ask a specialist».
- **Телефон и планшет:** шит снизу поверх затемнения.
- Появление с небольшим отскоком, закрытие — быстрый уезд без отскока. При `prefers-reduced-motion` анимации нет.

Демо на странице с нарочно «враждебным» CSS: https://denswor.github.io/nsl-experiments/ask-specialist/component/

**Архив для разработчика:** https://denswor.github.io/nsl-experiments/ask-specialist/component/nsl-ask-1.1.0.zip
(минифицированный и исходный файлы, пример, заготовки для Bitrix, README, CHANGELOG)

## Подключение

```html
<!-- в конце <body> на странице конфигуратора -->
<script src="/local/templates/nsl/js/nsl-ask.min.js" defer></script>
<script>
  document.addEventListener('DOMContentLoaded', function () {
    window.nslAsk = NSLAsk.mount({
      endpoint: '/ajax/ask-specialist.php',
      extraFields: { sessid: BX.bitrix_sessid() },   // CSRF-токен Bitrix
      privacyUrl: '/privacy/',
      // текущая сборка; функция вызывается при каждом открытии формы
      build: function () {
        return {
          title: 'PowerEdge R760xd2 24LFF + 4LFF',
          meta: '$15,239 · 9 of 16 set · not chosen yet: Drives, PCI, BOSS',
          lines: [ /* что угодно для менеджера: [{ section: 'CPU', value: '2× Xeon Silver 4410Y', price: 3000 }, …] */ ]
        };
      }
    });
  });
</script>
```

Контейнер не нужен: компонент сам добавляет `<div class="nsl-ask-host">` в конец `<body>`. Если хочется свой — `NSLAsk.mount('#my-host', { … })`.

## Короткая форма: `variant: 'simple'`

Для страниц, где нет сборки: поиск, каталог, блог. Так она работает на странице результатов поиска (пакет nsl-search).

```js
NSLAsk.mount({ variant: 'simple', endpoint: '/ajax/ask-specialist.php', extraFields: { sessid: BX.bitrix_sessid() } });
```

Отличия от полной формы:

- Нет карточки сборки, «Add details», проблем (`data-nsl-ask-area` игнорируется), канала и срочности.
- Бюджет сразу в форме, помечен «(optional)», 5 ступеней: `<$5k · $5–10k · $10–20k · $20–50k · $50k+`. Если слайдер не трогали, `budget` уходит пустым.
- Телефон всегда необязательный; если введён, в нём должно быть хотя бы 6 цифр.
- Email называется просто «Email», без подзаголовка под названием панели.
- Успех: «Request sent — A NewServerLife specialist will reply within one business hour.», кнопка «Back to results».
- В запросе `variant=simple`, `channel` и `timing` пустые. `bitrix/ask-specialist.php` из архива это учитывает.

Всё это можно переопределить обычными опциями (`budgets`, `labels` и т. д.).

## Как открыть

Любой элемент с атрибутом `data-nsl-ask` открывает форму, ничего вешать не нужно:

```html
<!-- ссылка под сводкой -->
<a href="#" data-nsl-ask>Not sure? Ask a specialist</a>

<!-- «Stuck here?» в заголовке секции: раскрывает «Add details», отмечает проблему и показывает «Opened from Drive cage» -->
<a href="#" data-nsl-ask data-nsl-ask-area="storage" data-nsl-ask-from="Drive cage">Stuck here?</a>
```

Значения `data-nsl-ask-area`: `cpu`, `ram`, `storage`, `gpu`, `net`, `power`, `compat`, `budget` (список меняется опцией `areas`).
Соответствие секций конфигуратора, как в прототипе: Chassis, PCI, Installation → `compat`; CPU → `cpu`; RAM → `ram`; RAID, Drive cage, BOSS → `storage`; Network card → `net`; Power supply → `power`. Для iDRAC, TPM, OS, Colocation, Warranty, Payment ссылку можно не ставить.

Из JS: `nslAsk.open({ area: 'storage', from: 'Drive cage' })`.

## Опции

| опция | по умолчанию | что делает |
| --- | --- | --- |
| `variant` | `'full'` | `'full'` — форма конфигуратора; `'simple'` — короткая форма (см. выше) |
| `endpoint` | `''` | URL для POST. Пусто и нет `submit` — демо-режим, отправка всегда «успешна» |
| `encoding` | `'multipart'` | `'multipart'` (FormData, с файлом) или `'json'` (без файла) |
| `extraFields` | `null` | Доп. поля в запрос, например `{ sessid }` |
| `submit` | `null` | `async (payload, formData) => {}`. Своя отправка вместо `endpoint`; бросить ошибку — показать ошибку в форме |
| `build` | `null` | `{ title, meta, lines? }` или функция, которая его возвращает. Читается при каждом открытии; уходит в запрос как JSON |
| `areas` | 8 проблем | `[{ value, label }]` для «Where are you stuck?» |
| `budgets`, `budgetTicks`, `budgetDefault` | 10 ступеней, `<$500 · $20k · $500k+`, `4` | Ступени слайдера бюджета, подписи под ним и стартовая ступень ($10–20k) |
| `channels`, `timings` | Phone call / Email / WhatsApp; Today / No rush | Радиокнопки канала и срочности |
| `maxFileSize`, `accept` | 10 МБ; PDF, Excel, CSV, Word, TXT, картинки | Ограничения вложения (один файл) |
| `edgeTab`, `edgeTabMinWidth`, `tabTop` | `true`, `1280`, `'42%'` | Таб у правого края: показывать ли, с какой ширины, на какой высоте (выше чат-виджета) |
| `desktopMinWidth`, `width` | `1024`, `440` | С какой ширины панель вместо шита, ширина панели |
| `zIndex` | `1000` | Над контентом, но под модалками сайта. Чат и cookie-баннер — по договорённости |
| `motion` | `true` | Анимация появления с отскоком |
| `privacyUrl` | `''` | Добавляет под кнопкой «By sending you agree to our Privacy Policy.» |
| `remember` | `true` | Помнить имя, email, телефон и канал в localStorage (`nsl_ask_contact`) для следующего запроса |
| `shadow` | `true` | `false` — обычный DOM с теми же BEM-классами (`nsl-ask__panel`, `nsl-ask__btn`…), если нужно переопределять стили снаружи; изоляции тогда нет |
| `onEvent` | `null` | `(type, detail) => {}` для аналитики |
| `labels` | англ. тексты | Все строки интерфейса; можно переопределить любые |

## Форма и проверка

Порядок полей — по фидбеку продажников: сначала свободный текст и вложение, потом необязательные детали, потом контакты.

1. Карточка текущей сборки из `build`.
2. «Describe what you need» и вложение (клик, перетаскивание, камера на телефоне).
3. «Add details · Optional» (свёрнут; раскрыт, если форму открыли из секции): «Where are you stuck?» — чекбоксы в две колонки, на телефоне в одну; бюджет — 10 ступеней, «No fixed budget» отключает слайдер.
4. «How should we reach you?»: Name, Work email, Phone — столбиком (email бывает длинным); канал и срочность. При канале Email телефон помечается «(optional)».

Обязательно: текст **или** файл, имя, email, телефон (кроме канала Email). Ошибки показываются под полями при отправке и исчезают, как только поле исправлено. Ctrl/⌘ + Enter отправляет.

## Отправка

POST на `endpoint`. По умолчанию `multipart/form-data` с полями:

| поле | пример |
| --- | --- |
| `variant` | `full` / `simple` |
| `message` | `Need 28 drives for backups, RAID 6?` |
| `areas` | `storage,ram` |
| `budget` | `$10–20k`, `none` или пусто (simple: слайдер не трогали) |
| `name`, `email`, `phone` | |
| `channel` | `phone` / `email` / `whatsapp` (пусто в simple) |
| `timing` | `today` / `norush` (пусто в simple) |
| `from` | `Drive cage` (откуда открыли, если из секции) |
| `build` | JSON из опции `build` |
| `page` | URL страницы |
| `file` | файл, если приложен (`fileName` — его имя) |

плюс всё из `extraFields`. Любой ответ 2xx — успех, остальное — «Couldn’t send. Please try again.» над формой, введённое сохраняется.
Скрытое honeypot-поле `website`: если бот его заполнил, запрос не уходит, но пользователь видит успех.

Обработчик для Bitrix — `bitrix/ask-specialist.php` в архиве (набросок: проверка sessid и email, сохранение файла, письмо менеджеру).

## События

На хосте срабатывает `CustomEvent('nsl-ask')` (всплывает до `document`) с `detail.type`. Если на странице есть `window.dataLayer`, туда пушится `{ event: 'ask_specialist_<type>', … }`.

| type | когда |
| --- | --- |
| `ready` | компонент смонтирован |
| `open` / `close` | открыт (`source`: `tab`, `trigger`, `api`; `area`, `from`) или закрыт (`source`: `close-button`, `back`, `escape`, `scrim`, `tab`, `api`) |
| `attach` | приложен файл (`size`, `mime`) |
| `invalid` | отправка не прошла проверку (`fields`) |
| `send` / `send_error` | запрос отправлен (`areas`, `budget`, `channel`, `timing`, `from`, `hasFile`) или ошибка |

```js
document.addEventListener('nsl-ask', function (e) { console.log(e.detail.type, e.detail); });
```

## API

```js
var ask = NSLAsk.mount({ … });
ask.open({ area: 'storage', from: 'Drive cage' }); ask.close(); ask.toggle();
ask.setBuild({ title: '…', meta: '…' }); // или функцию; обновит открытую форму
ask.reset();     // очистить форму
ask.destroy();   // убрать компонент и слушатели
ask.state;       // 'closed' | 'open' | 'sent'
```

## Что уже сделано внутри

- **Изоляция.** Shadow DOM, внутри BEM (`nsl-ask__*`). Значения токенов NSL DS зашиты в CSS компонента. Шрифты IBM Plex берутся со страницы (на сайте они уже подключены).
- **Доступность.** Таб — `<button aria-expanded aria-controls>`. Панель — `role="dialog"`, на телефоне модальная: фокус не уходит из шита, страница не скроллится. При открытии фокус в поле сообщения, при закрытии — обратно на то, чем открыли. Esc закрывает. У полей есть `<label>`, ошибки связаны через `aria-describedby`, слайдер озвучивает ступень через `aria-valuetext`.
- **Состояния.** Форма → отправка → «Message sent» с текстом под выбранный канал и срок. После отправки следующее открытие начинает с чистой формы, контакты подставляются.
- **Безопасные ре-рендеры.** Пока человек печатает или переключает опции, DOM меняется точечно — фокус, позиция курсора и автозаполнение браузера не сбиваются.

## Совместимость

Последние версии Chrome, Edge, Firefox, Safari (desktop и iOS). Нужны Shadow DOM, `fetch`, `FormData`, `:where()`.
Если есть CSP, разрешите inline-стили в Shadow DOM: `style-src 'self' 'unsafe-inline'`.
