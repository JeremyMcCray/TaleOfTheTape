/* Scripted smoke run. Loaded by test/harness.html?drive=1 as a classic script.
   Clicks through the dream-card flow the same way a user would and writes the
   result into #__probe, so a headless --dump-dom run can assert on it. */
(function () {
  if (!/[?&]drive=1/.test(location.search)) return;
  var log = [];
  function say(s) {
    log.push(s);
    var n = document.getElementById("__probe");
    if (!n) { n = document.createElement("pre"); n.id = "__probe"; document.body.appendChild(n); }
    n.textContent = log.join("\n");
  }
  function waitFor(fn, ms, label) {
    return new Promise(function (res) {
      var t0 = Date.now();
      (function tick() {
        var v; try { v = fn(); } catch (e) { v = null; }
        if (v) return res(v);
        if (Date.now() - t0 > ms) { say("TIMEOUT waiting for " + label); return res(null); }
        setTimeout(tick, 120);
      })();
    });
  }
  var $ = function (s) { return document.querySelector(s); };
  var n = function (s) { return document.querySelectorAll(s).length; };

  /* The community gallery falls back to a localStorage adapter when no
     Firebase project is configured — including its publish rate limit. Wipe
     it so a second run in the same browser profile is not blocked by the
     first run's cooldown. */
  try {
    ["cards", "votes", "rate", "handle", "localuid"].forEach(function (k) {
      localStorage.removeItem("tott.community." + k);
    });
    /* The builder now restores its last card on load. Drop it too, or the run
       reopens the previous run's card instead of starting at the setup step. */
    localStorage.removeItem("tott.card.draft");
  } catch (e) {}

  window.addEventListener("load", function () { setTimeout(run, 500); });

  async function run() {
    if (!await waitFor(function () { return !$("#loader"); }, 25000, "boot")) return say("DONE");
    say("boot: ok, fighters rendered=" + (!!$("#card-a .fname")));

    $("#rankToggle").click();
    await waitFor(function () { return n(".rkrow") > 0; }, 5000, "rankings rows");
    say("rankings: rows=" + n(".rkrow") + " pills=" + n(".divpill"));

    $("#btnRandom").click();
    say("random matchup: card-a=" + ($("#card-a .fname") || {}).textContent);

    document.querySelectorAll(".tab").forEach(function (t) { t.click(); });
    say("tabs: h2h=" + n("#p-h2h .co") + " breakdown=" + n(".bdrow"));

    $("#btnDreamCard").click();
    await waitFor(function () { return $("#cardview").classList.contains("open"); }, 5000, "card view");
    say("cardview: open, step=setup, szopts=" + n(".szopt"));

    $("#setupRandom").click();
    await waitFor(function () { return n(".pbout") > 0; }, 15000, "poster");
    say("poster: bouts=" + n(".pbout") + " filled=" + n(".pbout:not(.tbd)") + " sections=" + n(".psec"));

    /* The draft is what makes a refresh non-destructive. A reload would end
       this run, so assert on what a reload would read back instead. */
    say("draft: " + (function () {
      try {
        var d = JSON.parse(localStorage.getItem("tott.card.draft"));
        if (!d) return "MISSING";
        /* norm() strips non-alphanumerics from fighter keys, so the only
           hyphens in the encoding are the one per bout that joins a corner
           to b corner */
        return "step=" + d.step + " open=" + d.open +
               " bouts=" + ((d.card || "").match(/-/g) || []).length +
               " setup=" + JSON.stringify(d.setup);
      } catch (e) { return "ERR " + e.message; }
    })());

    /* ---- the poster credit: build step field -> PNG signature ---- */
    $("#cvEdit").click();
    await waitFor(function () { return !!$("#cardCredit"); }, 5000, "credit field");
    var cred = $("#cardCredit");
    if (cred) {
      var fire = function (v) { cred.value = v; cred.dispatchEvent(new Event("input", { bubbles: true })); };
      fire("Drive Tester");
      var stored = "", draftCred = "";
      try { stored = localStorage.getItem("tott.community.handle") || ""; } catch (e) {}
      try { draftCred = (JSON.parse(localStorage.getItem("tott.card.draft")) || {}).credit; } catch (e) {}
      say("credit: handle=" + JSON.stringify(stored) + " draft=" + JSON.stringify(draftCred));

      /* A URL is a mistake, not an attack: inline error, nothing stored. */
      fire("https://spam.example");
      var after = "";
      try { after = localStorage.getItem("tott.community.handle") || ""; } catch (e) {}
      say("credit reject: err=" + JSON.stringify(((($(".crediterr") || {}).textContent) || "").slice(0, 34)) +
          " kept=" + JSON.stringify(after));

      fire("Drive Tester");
      $("#buildGo").click();
      await waitFor(function () { return !!$(".pcredit"); }, 8000, "poster credit line");
      say("poster credit: " + JSON.stringify((($(".pcredit") || {}).textContent || "")));
    } else say("credit: FIELD MISSING");

    var b = document.querySelector(".pbout:not(.tbd)");
    if (b) {
      b.click();
      await waitFor(function () { return $("#tapemodal").classList.contains("open"); }, 5000, "tape modal");
      say("tapemodal: open, statrows=" + n("#tmstats .srow") + " cards=" + (!!$("#tm-card-a .fname")));
      $("#tmNext").click();
      say("tapemodal: next ok, label=" + ($("#tmlbl") || {}).textContent);
      $("#tmClose").click();
    } else say("tapemodal: SKIPPED (no filled bout)");

    $("#postPng").click();
    await waitFor(function () {
      var t = ($("#pngnote") || {}).textContent || "";
      return /saved|failed|ready|done|error|couldn/i.test(t) || window.__PNG_DONE;
    }, 60000, "png export");
    say("png export: note=" + JSON.stringify((($("#pngnote") || {}).textContent || "").slice(0, 120)));

    /* ---- community: publish the card we just built, then vote on it ---- */
    $("#postPublish").click();
    await waitFor(function () { return $("#pubmodal").classList.contains("open"); }, 5000, "publish modal");
    $("#pubName").value = "Harness Card";
    $("#pubWho").value = "drive";
    $("#pubGo").click();
    await waitFor(function () { return $("#community").classList.contains("open"); }, 8000, "gallery after publish");
    await waitFor(function () { return n(".ccard") > 0; }, 8000, "published tile");
    say("publish: tiles=" + n(".ccard") + " name=" + (($(".ccname") || {}).textContent || ""));

    var before = ($(".ccscore") || {}).textContent;
    $(".ccv.up").click();
    await waitFor(function () { return ($(".ccscore") || {}).textContent !== before; }, 5000, "vote applied");
    say("vote: " + before + " -> " + ($(".ccscore") || {}).textContent +
        " mine=" + !!$(".ccv.up.on"));

    /* The rate limit is real even in the local adapter — prove it fires, then
       step over it so the rest of the run can keep publishing. */
    $("#comClose").click();
    $("#postPublish").click();
    await waitFor(function () { return $("#pubmodal").classList.contains("open"); }, 5000, "publish modal 2");
    $("#pubName").value = "Rate Limited Card";
    $("#pubGo").click();
    await waitFor(function () { return /minutes|breather/.test(($("#puberr") || {}).textContent || ""); }, 8000, "rate limit");
    say("rate limit: " + JSON.stringify((($("#puberr") || {}).textContent || "").slice(0, 60)));
    try { localStorage.removeItem("tott.community.rate"); } catch (e) {}
    $("#pubCancel").click();

    /* A second publish needs *different* matchups or the fingerprint dedupe
       correctly points it at the card already up. Roll a fresh random card. */
    $("#cvRestart").click();
    await waitFor(function () { return !!$("#setupRandom"); }, 5000, "setup step");
    $("#setupRandom").click();
    await waitFor(function () { return !!$("#postPublish"); }, 15000, "poster again");

    /* A blocklisted name must publish *silently*: same success path, card
       visible to its author, absent from the public tabs, waiting in Review. */
    $("#postPublish").click();
    await waitFor(function () { return $("#pubmodal").classList.contains("open"); }, 5000, "publish modal 3");
    $("#pubName").value = "Fuck It Card";
    $("#pubGo").click();
    await waitFor(function () { return $("#community").classList.contains("open") && n(".ccard") > 1; }, 8000, "held card published");
    say("held: mine tiles=" + n(".ccard") + " flagged=" + n(".ccard.held") +
        " err=" + JSON.stringify((($("#puberr") || {}).textContent || "")));

    $('.comtab[data-sort="top"]').click();
    await waitFor(function () { return n(".ccard") === 1; }, 5000, "held card hidden from Top");
    say("held hidden from public: top tiles=" + n(".ccard"));

    $('.comtab[data-sort="held"]').click();
    await waitFor(function () { return n(".ccard") > 0; }, 5000, "review queue");
    say("review queue: tiles=" + n(".ccard") + " approve=" + n("[data-act='release']"));
    $("[data-act='release']").click();
    await waitFor(function () { return n(".ccard") === 0; }, 5000, "queue drained");
    say("approved: queue now=" + n(".ccard"));

    $('.comtab[data-sort="new"]').click();
    await waitFor(function () { return n(".ccard") > 1; }, 5000, "newest tab");
    say("gallery: tabs=" + n(".comtab") + " newest tiles=" + n(".ccard"));
    $(".ccard .act[data-act='open']").click();
    await waitFor(function () { return $("#cardview").classList.contains("open") && n(".pbout") > 0; }, 8000, "opened community card");
    say("opened community card: bouts=" + n(".pbout"));

    $("#cvEdit").click();
    say("build step: slots=" + n(".slot") + " fslots=" + n(".fslot"));
    $("#cvClose").click();
    say("closed: cardview open=" + $("#cardview").classList.contains("open"));
    say("DONE");
  }
})();
