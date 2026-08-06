/* Offline fixtures. Loaded as a classic script BEFORE src/main.js runs, so the
   app boots against local files instead of the live CDN / octagon-api feeds.
   Keeps the harness deterministic and lets you develop with no network. */
(function () {
  var MAP = [
    [/ufc_fighter_tott\.csv/,    "fixtures/ufc_fighter_tott.csv"],
    [/ufc_fight_results\.csv/,   "fixtures/ufc_fight_results.csv"],
    [/ufc_event_details\.csv/,   "fixtures/ufc_event_details.csv"],
    [/octagon-api\.com\/fighters/, "fixtures/fighters.json"],
    [/octagon-api\.com\/rankings/, "fixtures/rankings.json"]
  ];
  var real = window.fetch.bind(window);
  window.fetch = function (input, init) {
    var url = typeof input === "string" ? input : (input && input.url) || "";
    for (var i = 0; i < MAP.length; i++) {
      if (MAP[i][0].test(url)) return real("test/" + MAP[i][1], init);
    }
    return real(input, init);
  };
  window.__FIXTURES__ = true;
})();
