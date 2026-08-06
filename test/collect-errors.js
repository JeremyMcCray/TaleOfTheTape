/* Drains anything the page throws into #__errs so a --dump-dom run can read it. */
(function () {
  var errs = [];
  function push(s) { errs.push(String(s).slice(0, 400)); render(); }
  function render() {
    var n = document.getElementById("__errs");
    if (!n) { n = document.createElement("pre"); n.id = "__errs"; (document.body || document.documentElement).appendChild(n); }
    n.textContent = errs.length ? errs.join("\n") : "";
    n.setAttribute("data-count", errs.length);
  }
  window.addEventListener("error", function (e) {
    /* Ignore <img>/<link> load failures: offline, remote photos never resolve. */
    if (e.target && e.target !== window && e.target.tagName) return;
    push("ERROR: " + (e.message || "") + " @ " + (e.filename || "") + ":" + (e.lineno || ""));
  }, true);
  window.addEventListener("unhandledrejection", function (e) { push("REJECT: " + (e.reason && e.reason.message || e.reason)); });
  var ce = console.error;
  console.error = function () { push("console.error: " + Array.prototype.join.call(arguments, " ")); ce.apply(console, arguments); };
  document.addEventListener("DOMContentLoaded", render);
})();
