<?php
/**
 * nsl-search — search.page template "nsl" (NSL Design System markup, see demo/index.html).
 *
 *   $APPLICATION->IncludeComponent('bitrix:search.page', 'nsl', [
 *       'PAGE_RESULT_COUNT' => 10, 'DISPLAY_TOP_PAGER' => 'N', 'DISPLAY_BOTTOM_PAGER' => 'N',
 *       'USE_TITLE_RANK' => 'Y', 'DEFAULT_SORT' => 'rank', 'CHECK_DATES' => 'Y',
 *       'NSL_SUGGEST_URL' => '/ajax/search-suggest.php',
 *       // 'NSL_SEARCH_CONFIG' => [ 'PRODUCT_IBLOCKS' => [...], 'BLOG_IBLOCKS' => [...] ],  // or edit result_modifier.php
 *   ]);
 *
 * Page scripts and styles: see README (nsl-search.css, nsl-search.js, nsl-ask.js).
 */
if (!defined('B_PROLOG_INCLUDED') || B_PROLOG_INCLUDED !== true) die();

$S = include __DIR__ . '/nsl_snippets.php';
$h = function ($s) { return htmlspecialcharsbx((string)$s); };

/* every word of the query marked on its own (DS SearchResult); Latin x and Cyrillic х count as one letter */
$mark = function ($text, $query) use ($h) {
    $words = preg_split('/\s+/u', trim((string)$query), -1, PREG_SPLIT_NO_EMPTY);
    $terms = array_filter($words, function ($w) use ($words) { return mb_strlen($w) > 1 || count($words) === 1; });
    usort($terms, function ($a, $b) { return mb_strlen($b) - mb_strlen($a); });
    $terms = array_map(function ($t) { return preg_replace('/[xх]/iu', '[xх]', preg_quote($t, '/')); }, $terms);
    if (!$terms) return $h($text);
    $parts = preg_split('/(' . implode('|', $terms) . ')/iu', (string)$text, -1, PREG_SPLIT_DELIM_CAPTURE);
    $out = '';
    foreach ($parts as $i => $p) $out .= $i % 2 ? '<mark class="nsl-sres__match">' . $h($p) . '</mark>' : $h($p);
    return $out;
};

$query = (string)($arResult['REQUEST']['~QUERY'] ?? '');
$rows = $arResult['NSL_ROWS'] ?? [];
$nav = $arResult['NSL_NAV'];
$url = function ($n) use ($APPLICATION, $nav) {
    return $APPLICATION->GetCurPageParam($n > 1 ? $nav['PARAM'] . '=' . (int)$n : '', [$nav['PARAM']]);
};
$suggestUrl = $arParams['NSL_SUGGEST_URL'] ?? '/ajax/search-suggest.php';
$ctaPreset = [
    'cart' => ['Add to Cart', $S['btnCart']],
    'configure' => ['Configure', $S['btnConfigure']],
    'quote' => ['Request for Quote', $S['btnQuote']],
];

$pageList = function ($cur, $total) {
    if ($total <= 7) return range(1, $total);
    $out = [1]; $a = max(2, $cur - 1); $b = min($total - 1, $cur + 1);
    if ($cur <= 3) { $a = 2; $b = 4; } if ($cur >= $total - 2) { $a = $total - 3; $b = $total - 1; }
    if ($a > 2) $out[] = '…'; for ($i = $a; $i <= $b; $i++) $out[] = $i; if ($b < $total - 1) $out[] = '…'; $out[] = $total;
    return $out;
};
$navLink = function ($cur, $dir) use ($nav, $url, $S, $h) {
    $t = $cur + $dir; $label = $dir < 0 ? 'Previous page' : 'Next page'; $ic = $dir < 0 ? $S['prev'] : $S['next'];
    if ($t < 1 || $t > $nav['PAGES']) return '<span class="nsl-page nsl-page--nav" aria-disabled="true" aria-label="' . $label . '">' . $ic . '</span>';
    return '<a class="nsl-page nsl-page--nav" href="' . $h($url($t)) . '#results" aria-label="' . $label . '" rel="' . ($dir < 0 ? 'prev' : 'next') . '">' . $ic . '</a>';
};
?>
<div class="nsl-srp__band">
  <div class="nsl-search-combo" data-nsl-suggest="<?= $h($suggestUrl) ?>">
    <form role="search" class="nsl-search" action="<?= $h($arResult['FORM_ACTION'] ?? $APPLICATION->GetCurPage()) ?>" method="get">
      <input type="search" name="q" value="<?= $h($query) ?>" aria-label="Search NewServerLife" placeholder="Search here..." autocomplete="off">
      <button type="submit" class="nsl-search__go" aria-label="Search"><?= $S['searchGo'] ?></button>
    </form>
  </div>
</div>

<main class="nsl-container nsl-srp">
  <nav aria-label="Breadcrumb" class="nsl-crumbs"><ol>
    <li><a href="/">Home</a><?= $S['crumbSep'] ?></li>
    <li><span aria-current="page" class="nsl-crumbs__current">Search results for</span></li>
  </ol></nav>

  <div class="nsl-ssum"><div class="nsl-ssum__main">
    <h1 class="nsl-ssum__title">“<?= $h($query) ?>”<span class="nsl-ssum__count"><?= (int)$nav['TOTAL'] ?> <?= $nav['TOTAL'] === 1 ? 'result' : 'results' ?></span></h1>
  </div></div>

  <div class="nsl-srp__layout">
    <div class="nsl-srp__results" id="results">
<?php if (!$rows): ?>
      <div class="nsl-srp__empty">
        <p><?= $query === '' ? 'Type a model, part number or question in the search field.' : 'Nothing matched this search. Check the spelling, try a shorter query or a part number — or ask a specialist.' ?></p>
      </div>
<?php else: ?>
      <section class="nsl-srp__list" data-nsl-results aria-label="Search results">
<?php foreach ($rows as $r):
    $title = '<a href="' . $h($r['URL']) . '">' . $mark($r['TITLE'], $query) . '</a>';
    if ($r['KIND'] === 'page'): ?>
<article class="nsl-sres nsl-sres--page"><span class="nsl-sres__icon"><?= $S['fileText'] ?></span><div class="nsl-sres__body"><h3 class="nsl-sres__title nsl-sres__title--link"><?= $title ?></h3><?php if ($r['EXCERPT'] !== ''): ?><p class="nsl-sres__excerpt"><?= $h($r['EXCERPT']) ?></p><?php endif ?><?php if ($r['PATH']): ?><nav class="nsl-sres__path" aria-label="Page location"><?php foreach ($r['PATH'] as $k => $p): ?><?= $k ? '<span class="nsl-sres__sep" aria-hidden="true">/</span>' : '' ?><a href="<?= $h($p['URL']) ?>"><?= $h($p['LABEL']) ?></a><?php endforeach ?></nav><?php endif ?></div></article>
<?php elseif ($r['KIND'] === 'article'): ?>
<article class="nsl-sres nsl-sres--article"><a class="nsl-sres__media" href="<?= $h($r['URL']) ?>" tabindex="-1" aria-hidden="true"><div class="nsl-img" style="aspect-ratio:3 / 2"><?= $r['IMAGE'] ? '<img src="' . $h($r['IMAGE']) . '" alt="" loading="lazy" decoding="async">' : $S['placeholderArticle'] ?></div></a><div class="nsl-sres__body"><div class="nsl-sres__meta"><span class="nsl-sres__type"><?= $h($r['TYPE'] ?: 'Blog') ?></span><?php if ($r['META']): ?><span><?= $h($r['META']) ?></span><?php endif ?></div><h3 class="nsl-sres__title nsl-sres__title--sans"><?= $title ?></h3><?php if ($r['EXCERPT'] !== ''): ?><p class="nsl-sres__excerpt"><?= $h($r['EXCERPT']) ?></p><?php endif ?></div></article>
<?php else:
    [$ctaText, $ctaIcon] = $ctaPreset[$r['CTA']['TYPE']] ?? $ctaPreset['cart'];
    $ctaText = $r['CTA']['LABEL'] ?: $ctaText;
    $btnClass = 'nsl-btn nsl-btn--primary-subtle nsl-btn--md nsl-btn--full';
    $cta = $r['CTA']['TYPE'] === 'cart'
        ? '<button type="button" class="' . $btnClass . '" data-nsl-cart="' . (int)$r['ID'] . '">' . $ctaIcon . '<span class="nsl-btn__label">' . $h($ctaText) . '</span></button>'
        : '<a class="' . $btnClass . '" href="' . $h($r['URL']) . '">' . $ctaIcon . '<span class="nsl-btn__label">' . $h($ctaText) . '</span></a>'; ?>
<article class="nsl-sres nsl-sres--product"><a class="nsl-sres__media" href="<?= $h($r['URL']) ?>" tabindex="-1" aria-hidden="true"><div class="nsl-img" style="aspect-ratio:3 / 2"><?= $r['IMAGE'] ? '<img src="' . $h($r['IMAGE']) . '" alt="" loading="lazy" decoding="async">' : $S['placeholderProduct'] ?></div></a><div class="nsl-sres__body"><div class="nsl-sres__meta"><?php if ($r['TYPE']): ?><span class="nsl-sres__type"><?= $h($r['TYPE']) ?></span><?php endif ?><?php foreach ($r['BADGES'] as $b): ?><?= $S['badge:' . $b] ?? '' ?><?php endforeach ?></div><h3 class="nsl-sres__title"><?= $title ?></h3></div><div class="nsl-sres__buy nsl-sres__buy--cta"><?= $cta ?></div></article>
<?php endif; endforeach ?>
      </section>

<?php if ($nav['PAGES'] > 1): ?>
      <div class="nsl-srp__pager" data-nsl-pager><nav class="nsl-pagination" aria-label="Pagination"><?= $navLink($nav['PAGE'], -1) ?><?php foreach ($pageList($nav['PAGE'], $nav['PAGES']) as $n): ?><?php if ($n === '…'): ?><span class="nsl-page nsl-page--ellipsis">···</span><?php else: ?><a class="nsl-page<?= $n === $nav['PAGE'] ? ' is-active' : '' ?>" href="<?= $h($url($n)) ?>#results"<?= $n === $nav['PAGE'] ? ' aria-current="page"' : '' ?>><?= $n ?></a><?php endif ?><?php endforeach ?><?= $navLink($nav['PAGE'], 1) ?></nav></div>
<?php endif ?>
      <div class="nsl-srp__more">
<?php if ($nav['PAGE'] < $nav['PAGES']): ?>
        <button type="button" class="nsl-btn nsl-btn--ghost nsl-btn--lg nsl-btn--full" data-nsl-more data-next="<?= $h($url($nav['PAGE'] + 1)) ?>"><?= $S['btnMore'] ?><span class="nsl-btn__label">Show <?= min($nav['PAGE_SIZE'], $nav['LEFT']) ?> more</span></button>
<?php endif ?>
        <p class="nsl-srp__count" role="status" data-nsl-count data-from="<?= $nav['FROM'] ?>" data-to="<?= $nav['TO'] ?>" data-total="<?= $nav['TOTAL'] ?>">Showing <?= $nav['FROM'] ?>–<?= $nav['TO'] ?> of <?= $nav['TOTAL'] ?></p>
<?php if ($nav['PAGES'] > 1): ?>
        <nav class="nsl-pagination nsl-pagination--compact" aria-label="Pagination" data-nsl-pager-compact><?= $navLink($nav['PAGE'], -1) ?><span class="nsl-pagination__count"><b><?= $nav['PAGE'] ?></b> / <?= $nav['PAGES'] ?></span><?= $navLink($nav['PAGE'], 1) ?></nav>
<?php endif ?>
      </div>
<?php endif ?>
    </div>

    <aside class="nsl-srp__aside" aria-label="Help">
      <section class="nsl-srp__help" aria-labelledby="nsl-srp-help-t">
        <h2 id="nsl-srp-help-t">Can’t find the right configuration?</h2>
        <p>An engineer will pick a server for your workload.</p>
        <button type="button" class="nsl-btn nsl-btn--primary nsl-btn--md nsl-btn--full" data-nsl-ask data-nsl-ask-from="Search results"><?= $S['btnHelp'] ?><span class="nsl-btn__label">Request a Configuration</span></button>
      </section>
    </aside>
  </div>
</main>
