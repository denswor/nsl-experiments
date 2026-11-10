/* Demo only: suggestions from a local list, in the same JSON shape /ajax/search-suggest.php returns.
   Every word of the query must occur in the label (Cyrillic "х" counts as Latin x). */
(function () {
  var CATALOG = [
    { title: 'Server models', noun: 'server models', items: ['HPE ProLiant DL380 Gen10', 'HPE ProLiant DL380 Gen10 Plus', 'HPE ProLiant DL360 Gen10', 'HPE ProLiant DL380 Gen9', 'HPE ProLiant DL560 Gen10', 'Dell PowerEdge R740xd', 'Dell PowerEdge R740', 'Dell PowerEdge R640', 'Dell PowerEdge R750'] },
    { title: 'Chassis', noun: 'chassis', items: ['HPE ProLiant DL380 Gen10 8SFF', 'HPE ProLiant DL380 Gen10 16SFF (8x NVMe)', 'HPE ProLiant DL380 Gen10 24SFF (24x NVMe)', 'HPE ProLiant DL380 Gen10 12LFF', 'HPE ProLiant DL380 Gen10 Plus 8SFF NVMe', 'HPE ProLiant DL360 Gen10 10SFF (10x NVMe)', 'Dell PowerEdge R740xd 24SFF (24x NVMe)', 'Dell PowerEdge R640 10SFF (8x NVMe)'] },
    { title: 'Storages', noun: 'storages', items: ['HPE 1.92TB NVMe U.2 SFF Drive', 'HPE 3.84TB NVMe U.2 SFF Drive', 'HPE 960GB NVMe U.2 SFF Drive', 'HPE DL380 Gen10 8SFF NVMe Drive Cage Kit', 'HPE DL380 Gen10 Secondary NVMe Riser', 'Samsung PM983 1.92TB NVMe U.2', 'Intel P4510 4TB NVMe U.2', 'Dell 1.92TB NVMe U.2 SFF Drive'] },
    { title: 'Articles', noun: 'articles', items: ['NVMe in the DL380 Gen10: which cages and risers you need for 8, 16 and 24 drives', 'Gen10 or Gen10 Plus: what changed in the storage subsystem', 'How we test NVMe drives before shipping', 'Dell R740xd vs HPE DL380 Gen10 for storage-heavy builds'] }
  ];
  function norm(t) { return t.toLowerCase().replace(/\u0445/g, 'x'); }   /* Cyrillic "х" in "8х" counts as Latin x */
  function suggest(q) {
    var words = norm(q || '').split(/\s+/).filter(Boolean);
    if (!words.length) return [];
    return CATALOG.map(function (g) {
      var hits = g.items.filter(function (l) { var n = norm(l); return words.every(function (w) { return n.indexOf(w) >= 0; }); });
      return hits.length && { title: g.title, items: hits.slice(0, 3).map(function (l) { return { label: l, href: 'index.html?q=' + encodeURIComponent(l) }; }),
        more: hits.length > 3 ? { label: 'Show all ' + g.noun + ' (' + hits.length + ')', href: 'index.html' } : undefined };
    }).filter(Boolean);
  }
  window.demoSuggest = function (q) { return new Promise(function (res) { setTimeout(function () { res({ groups: suggest(q) }); }, 80); }); };
})();
