<?php
/**
 * nsl-search — search.page "nsl": prepares $arResult["NSL_ROWS"] for template.php.
 *
 * search.page returns one list ordered by relevance (products, articles, pages mixed); it can't be grouped,
 * so every row gets its own kind and density instead: product / article / page (DS SearchResult).
 *
 * ▸ Adjust NSL_SEARCH_CONFIG to your iblock IDs. Everything else works as is.
 */
if (!defined('B_PROLOG_INCLUDED') || B_PROLOG_INCLUDED !== true) die();

use Bitrix\Main\Loader;

$NSL = [
    /* catalog iblocks: ID => [type label, CTA: 'configure' | 'cart' | 'quote', CTA label or null for the default] */
    'PRODUCT_IBLOCKS' => [
        // 12 => ['Server model', 'configure', 'Choose Chassis'],
        // 13 => ['Chassis', 'configure', null],
        // 14 => ['Server', 'cart', null],
        // 15 => ['Component', 'cart', null],
    ],
    /* blog iblocks: ID => type label */
    'BLOG_IBLOCKS' => [
        // 20 => 'Blog',
    ],
    'READ_TIME_PROPERTY' => 'READ_TIME',   // blog: number of minutes → "7 min read"; empty = not shown
    'PREBUILD_PROPERTY'  => 'PREBUILD',    // servers: Y → PRECONFIGURED badge; empty = not shown
    'IMAGE_SIZE'         => ['width' => 320, 'height' => 214],
    'EXCERPT_LENGTH'     => 200,
];
if (isset($arParams['NSL_SEARCH_CONFIG']) && is_array($arParams['NSL_SEARCH_CONFIG'])) $NSL = array_replace($NSL, $arParams['NSL_SEARCH_CONFIG']);

$rows = [];
$elementIds = [];
foreach ((array)$arResult['SEARCH'] as $i => $item) {
    $iblockId = (int)$item['PARAM2'];
    $isElement = $item['MODULE_ID'] === 'iblock' && ctype_digit((string)$item['ITEM_ID']);
    $kind = 'page';
    if ($isElement && isset($NSL['PRODUCT_IBLOCKS'][$iblockId])) $kind = 'product';
    elseif ($isElement && isset($NSL['BLOG_IBLOCKS'][$iblockId])) $kind = 'article';

    $excerpt = trim(preg_replace('/\s+/u', ' ', strip_tags(htmlspecialcharsback((string)$item['BODY_FORMATED']))));
    if (mb_strlen($excerpt) > $NSL['EXCERPT_LENGTH']) $excerpt = rtrim(mb_substr($excerpt, 0, $NSL['EXCERPT_LENGTH'])) . '…';

    $row = [
        'KIND'    => $kind,
        'ID'      => (int)$item['ITEM_ID'],
        'TITLE'   => trim(strip_tags(htmlspecialcharsback((string)$item['TITLE']))),
        'URL'     => (string)$item['URL'],
        'EXCERPT' => $kind === 'product' ? '' : $excerpt,   // product rows: title + action only
        'TYPE'    => '',
        'META'    => '',
        'IMAGE'   => '',
        'BADGES'  => [],
        'CTA'     => null,
        'PATH'    => [],
    ];
    if ($kind === 'product') {
        [$type, $cta, $ctaLabel] = $NSL['PRODUCT_IBLOCKS'][$iblockId] + [null, 'cart', null];
        $row['TYPE'] = $type;
        $row['CTA'] = ['TYPE' => $cta, 'LABEL' => $ctaLabel];
    } elseif ($kind === 'article') {
        $row['TYPE'] = $NSL['BLOG_IBLOCKS'][$iblockId];
    } else {
        /* page location under the excerpt: "Home / Service / Testing" from the search chain */
        if (!empty($item['CHAIN_PATH']) && preg_match_all('#<a[^>]*href="([^"]*)"[^>]*>(.*?)</a>#u', $item['CHAIN_PATH'], $m, PREG_SET_ORDER)) {
            foreach ($m as $a) $row['PATH'][] = ['LABEL' => trim(strip_tags($a[2])), 'URL' => $a[1]];
        }
    }
    if ($isElement && $kind !== 'page') $elementIds[$row['ID']] = $i;
    $rows[$i] = $row;
}

/* pictures, stock, read time — one query for the whole page */
if ($elementIds && Loader::includeModule('iblock')) {
    $select = ['ID', 'IBLOCK_ID', 'PREVIEW_PICTURE', 'DETAIL_PICTURE'];
    if ($NSL['READ_TIME_PROPERTY']) $select[] = 'PROPERTY_' . $NSL['READ_TIME_PROPERTY'];
    if ($NSL['PREBUILD_PROPERTY']) $select[] = 'PROPERTY_' . $NSL['PREBUILD_PROPERTY'];
    $hasCatalog = Loader::includeModule('catalog');
    if ($hasCatalog) $select[] = 'AVAILABLE';
    $res = CIBlockElement::GetList([], ['ID' => array_keys($elementIds)], false, false, $select);
    while ($el = $res->Fetch()) {
        $i = $elementIds[(int)$el['ID']];
        $row = &$rows[$i];
        $pic = (int)($el['PREVIEW_PICTURE'] ?: $el['DETAIL_PICTURE']);
        if ($pic) {
            /* products: whole photo on white (contain); articles: cover cropped to 3:2 */
            $mode = $row['KIND'] === 'article' ? BX_RESIZE_IMAGE_EXACT : BX_RESIZE_IMAGE_PROPORTIONAL;
            $img = CFile::ResizeImageGet($pic, $NSL['IMAGE_SIZE'], $mode, true);
            $row['IMAGE'] = $img['src'] ?? '';
        }
        if ($row['KIND'] === 'product') {
            if ($NSL['PREBUILD_PROPERTY'] && ($el['PROPERTY_' . $NSL['PREBUILD_PROPERTY'] . '_VALUE'] ?? '') !== '') $row['BADGES'][] = 'prebuild';
            if ($hasCatalog && ($el['AVAILABLE'] ?? 'N') === 'Y') $row['BADGES'][] = 'in-stock';
        }
        if ($row['KIND'] === 'article' && $NSL['READ_TIME_PROPERTY']) {
            $min = (int)($el['PROPERTY_' . $NSL['READ_TIME_PROPERTY'] . '_VALUE'] ?? 0);
            if ($min > 0) $row['META'] = $min . ' min read';
        }
        unset($row);
    }
}

$arResult['NSL_ROWS'] = array_values($rows);

/* paging: total, current page, URLs for the desktop pager, "Show 10 more" and the compact pager */
$nav = $arResult['NAV_RESULT'] ?? null;
$total = $nav ? (int)$nav->NavRecordCount : count($rows);
$pageSize = $nav ? max(1, (int)$nav->NavPageSize) : max(1, count($rows));
$pageNum = $nav ? max(1, (int)$nav->NavPageNomer) : 1;
$pageCount = $nav ? max(1, (int)$nav->NavPageCount) : 1;
$param = 'PAGEN_' . ($nav ? (int)$nav->NavNum : 1);
$arResult['NSL_NAV'] = [
    'TOTAL' => $total,
    'PAGE' => $pageNum,
    'PAGES' => $pageCount,
    'FROM' => $total ? ($pageNum - 1) * $pageSize + 1 : 0,
    'TO' => ($pageNum - 1) * $pageSize + count($rows),
    'LEFT' => max(0, $total - $pageNum * $pageSize),
    'PAGE_SIZE' => $pageSize,
    'PARAM' => $param,      // PAGEN_n; the template builds page URLs with it (no closures here: arResult may be cached)
];
