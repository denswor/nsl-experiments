<?php
/**
 * nsl-search — predictive search endpoint.  GET /ajax/search-suggest.php?q=dl380+nvme
 *
 * Unlike search.page, this short answer CAN be grouped by type: one small search per group.
 * Response (what nsl-search.js renders):
 *   { "groups": [ { "title": "Chassis", "items": [ { "label": "…", "href": "…" } ], "more": { "label": "Show all chassis (13)", "href": "…" } } ],
 *     "all": { "label": "All Results", "href": "/search/?q=…" } }
 *
 * ▸ Put it at /ajax/search-suggest.php (or anywhere: pass the URL in data-nsl-suggest / NSL_SUGGEST_URL).
 * ▸ Adjust $GROUPS to your iblock IDs. Order = the order people search in: models, chassis, storages, articles.
 */
define('STOP_STATISTICS', true);
define('NO_KEEP_STATISTIC', 'Y');
define('NO_AGENT_STATISTIC', 'Y');
define('NO_AGENT_CHECK', true);
define('PUBLIC_AJAX_MODE', true);
require $_SERVER['DOCUMENT_ROOT'] . '/bitrix/modules/main/include/prolog_before.php';

use Bitrix\Main\Application;
use Bitrix\Main\Data\Cache;
use Bitrix\Main\Loader;

$GROUPS = [
    ['title' => 'Server models', 'noun' => 'server models', 'iblocks' => [/* 12 */]],
    ['title' => 'Chassis',       'noun' => 'chassis',       'iblocks' => [/* 13 */]],
    ['title' => 'Storages',      'noun' => 'storages',      'iblocks' => [/* 15 */]],
    ['title' => 'Articles',      'noun' => 'articles',      'iblocks' => [/* 20 */]],
];
$SEARCH_PAGE = '/search/';   // search.page URL: "All Results" and "Show all … (N)"
$PER_GROUP = 4;              // DS: 2–4 items per group
$CACHE_TTL = 600;            // seconds; the same prefixes repeat a lot while people type

header('Content-Type: application/json; charset=UTF-8');
header('X-Robots-Tag: noindex');

$request = Application::getInstance()->getContext()->getRequest();
$q = trim((string)$request->getQuery('q'));
/* "8х" typed with a Cyrillic х (the layout people forget to switch) → "8x" */
$q = preg_replace('/(\d)[хХ]/u', '$1x', $q);
$q = preg_replace('/[хХ](\d)/u', 'x$1', $q);
$q = mb_substr(preg_replace('/\s+/u', ' ', $q), 0, 100);

$searchUrl = function ($query) use ($SEARCH_PAGE) { return $SEARCH_PAGE . '?q=' . rawurlencode($query); };
$answer = ['groups' => [], 'all' => ['label' => 'All Results', 'href' => $searchUrl($q)]];

if (mb_strlen($q) < 2 || !Loader::includeModule('search')) {
    echo json_encode($answer, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    die();
}

$cache = Cache::createInstance();
if ($cache->initCache($CACHE_TTL, 'nsl_suggest_' . SITE_ID . '_' . md5(mb_strtolower($q)), '/nsl/search-suggest')) {
    $answer = $cache->getVars();
} elseif ($cache->startDataCache()) {
    foreach ($GROUPS as $g) {
        if (!$g['iblocks']) continue;
        $search = new CSearch();
        $search->Search(
            ['QUERY' => $q, 'SITE_ID' => SITE_ID, 'MODULE_ID' => 'iblock', 'PARAM2' => $g['iblocks'], 'CHECK_DATES' => 'Y'],
            ['CUSTOM_RANK' => 'DESC', 'TITLE_RANK' => 'DESC', 'RANK' => 'DESC'],
            ['STEMMING' => true]
        );
        if ($search->errorno != 0) continue;
        $search->NavStart($PER_GROUP, false, 1);
        $items = [];
        while ($row = $search->GetNext()) {
            if (!ctype_digit((string)$row['ITEM_ID'])) continue;   // elements only, no sections
            $items[] = ['label' => trim(strip_tags($row['~TITLE'] ?? $row['TITLE'])), 'href' => $row['URL']];
        }
        if (!$items) continue;
        $count = (int)$search->NavRecordCount;
        $group = ['title' => $g['title'], 'items' => $items];
        if ($count > count($items)) $group['more'] = ['label' => 'Show all ' . $g['noun'] . ' (' . $count . ')', 'href' => $searchUrl($q)];
        $answer['groups'][] = $group;
    }
    $cache->endDataCache($answer);
}

echo json_encode($answer, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
die();
