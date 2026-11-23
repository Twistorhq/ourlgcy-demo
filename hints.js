// Our LGCY hints (TW-1307): the maple-leaf hint language.
//
// A hint is a CLUE, never a fact. Wherever a hint renders it is
// labeled as one: a maple-leaf badge on the card or tree person
// it belongs to, carrying the word "Hint". The leaf is drawn
// inline, in the site's own flat line style, filled in maple
// rust. It is not an emoji and not anyone else's leaf.
//
// FOUNDER RULING (Nov 23, 2026): notifications live ONLY on the
// tree. There is no site-chrome indicator: the header stays
// clean on every page. The leaf badge sits at the UPPER RIGHT
// corner of each tree card that carries a hint, and the tree
// view itself carries a leaf indicator with the hint count in
// its own upper right corner (the your-tree section of the tree
// page). On every other surface this layer renders nothing.
//
// FOUNDER REFINEMENT (Nov 23, 2026): the notifications also live
// in the PROFILE, at the top right of the tree there, and the
// indicator's form is settled: a MAPLE LEAF carrying the count
// as a number on the leaf itself, never a plain circle badge.
// The tree page's corner indicator takes the same form, so the
// member meets one indicator everywhere it exists: the leaf,
// with their number on it.
//
// THE SEAM. Hints arrive from SOURCES. A source is a function
// load(email) returning a promise of hint objects:
//   { id, kind, subjectName, text, source }
// subjectName names the tree person the hint belongs to (badges
// match cards by the person's name); text is the clue itself, in
// the producing engine's own words. Rendering never edits a
// clue's words and never upgrades one into a claim.
//
// Source one, today: the member's pending kin questions
// (TW-1278), read from window.LGCY_KIN_QUESTIONS_ENDPOINT in the
// same contract shape kin-questions.js consumes: the response is
// an array, or { questions: [...] }, each question
// { id, phrase, subject_name, candidate_relation, ancestor? }.
// The kin layer owns answering; this layer only points at the
// waiting question, from the person's card and the tree's own
// corner flag, and its links land where the questions live, the
// Community.
//
// Source two, next: survey-seeded hints (TW-1307 part 3). When
// Dre's endpoint lands, that lane registers its loader through
// window.LGCYHints.registerSource("survey", loadFn) and its
// hints render through this same badge and count with no rework
// here: registration is the whole integration.
//
// No identity, no endpoint, no hints, or a failed read: the
// layer stays inert. No empty chrome, no badge, no fake count,
// and nothing about the page changes.
(function () {
  "use strict";

  var S = window.LGCYSession || null;

  function sessionEmail() {
    if (S) return S.getEmail();
    try {
      return window.sessionStorage.getItem("lgcy-signup-email") || "";
    } catch (e) {
      return "";
    }
  }
  function normName(s) {
    return String(s == null ? "" : s).trim().replace(/\s+/g, " ").toLowerCase();
  }

  // The maple leaf, drawn once and reused: a stylized eleven-
  // point leaf with its stem, symmetric around its centre line.
  var LEAF =
    '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
    '<path d="M12 0.6l1.6 3.6 4-2-1.2 3.2 5.4 1-3 2.4 1.8 3.8-3.4-.4.4 5.2 ' +
    '-3.7-2v6.2h-2.2v-6.2l-3.7 2 .4-5.2-3.4.4 1.8-3.8-3-2.4 5.4-1-1.2-3.2 ' +
    '4 2z" fill="currentColor" ' +
    'stroke="currentColor" stroke-width="0.7" stroke-linejoin="round"/></svg>';

  var sources = [];
  var hints = [];

  function kinSource(email) {
    var endpoint = window.LGCY_KIN_QUESTIONS_ENDPOINT || "";
    if (!endpoint) return Promise.resolve([]);
    return fetch(endpoint + "?email=" + encodeURIComponent(email), {
      headers: { Accept: "application/json" },
    })
      .then(function (res) {
        if (!res.ok) return [];
        return res.json();
      })
      .then(function (data) {
        var list = Array.isArray(data) ? data : (data && data.questions) || [];
        return list
          .filter(function (q) {
            return q && q.id != null && q.subject_name;
          })
          .map(function (q) {
            return {
              id: "kin-" + q.id,
              kind: "kin-question",
              subjectName: q.subject_name,
              text:
                q.phrase ||
                "A question is waiting about " + q.subject_name + ".",
              source: "kin-question",
            };
          });
      })
      .catch(function () {
        return [];
      });
  }
  sources.push({ name: "kin-question", load: kinSource });

  function loadAll() {
    var email = sessionEmail();
    if (!email) return Promise.resolve([]);
    return Promise.all(
      sources.map(function (s) {
        try {
          return Promise.resolve(s.load(email)).catch(function () {
            return [];
          });
        } catch (e) {
          return Promise.resolve([]);
        }
      })
    ).then(function (parts) {
      var out = [];
      parts.forEach(function (p) {
        if (Array.isArray(p)) out = out.concat(p);
      });
      return out;
    });
  }

  // --- The leaf-count indicator: a maple leaf carrying the
  // hint count as a number on the leaf itself. It mounts in
  // exactly two places, both of them on a tree: the upper right
  // corner of the tree view (the your-tree section of the tree
  // page) and the top right of the tree block on the profile.
  // Per the founder ruling there is no other aggregate
  // indicator: no header, no other page carries one. ---
  function leafCountEl(n) {
    var a = document.createElement("a");
    a.className = "leaf-count";
    a.href = "community.html";
    a.setAttribute(
      "aria-label",
      n +
        (n === 1 ? " hint is" : " hints are") +
        " waiting. A hint is a clue from your family's records, not a fact. See your hints in the Community."
    );
    a.innerHTML =
      LEAF + '<span class="leaf-num" aria-hidden="true">' + n + "</span>";
    return a;
  }

  function renderLeafCounts() {
    Array.prototype.forEach.call(
      document.querySelectorAll(".leaf-count"),
      function (el) {
        el.remove();
      }
    );
    if (!hints.length) return;
    var n = hints.length;
    var section = document.getElementById("your-tree");
    if (section) section.appendChild(leafCountEl(n));
    var people = document.getElementById("profile-people");
    if (people && people.parentElement) {
      var block = people.parentElement;
      block.classList.add("leaf-anchor");
      var el = leafCountEl(n);
      el.classList.add("in-profile");
      block.appendChild(el);
    }
  }

  // --- The badge: a leaf and the word Hint at the UPPER RIGHT
  // corner of the tree card of the person a hint belongs to.
  // Cards are matched by the person's name, the one identifier
  // every tree card already carries (the sample tree's cards and
  // your-tree's cards alike). ---
  function badgeFor(list) {
    var first = list[0];
    var span = document.createElement("span");
    span.className = "hint-badge";
    span.setAttribute("role", "note");
    span.setAttribute(
      "aria-label",
      "Hint, not a fact: " + first.text
    );
    span.title = "Hint: " + first.text;
    span.innerHTML =
      LEAF +
      "<span>Hint" + (list.length > 1 ? " ×" + list.length : "") + "</span>";
    return span;
  }

  function decorate(root) {
    if (!hints.length) return;
    var byName = {};
    hints.forEach(function (h) {
      var k = normName(h.subjectName);
      if (!k) return;
      if (!byName[k]) byName[k] = [];
      byName[k].push(h);
    });
    var cards = root.querySelectorAll(".pcard");
    Array.prototype.forEach.call(cards, function (card) {
      var nameEl = card.querySelector(".pname, .roster-name");
      if (!nameEl) return;
      var list = byName[normName(nameEl.textContent)];
      var old = card.querySelector(".hint-badge");
      if (!list) {
        if (old) old.remove();
        card.classList.remove("has-hint");
        return;
      }
      if (old && old.getAttribute("data-hint-ids") ===
          list.map(function (h) { return h.id; }).join(",")) return;
      if (old) old.remove();
      var badge = badgeFor(list);
      badge.setAttribute(
        "data-hint-ids",
        list.map(function (h) { return h.id; }).join(",")
      );
      card.appendChild(badge);
      card.classList.add("has-hint");
    });
  }

  function refresh() {
    return loadAll().then(function (list) {
      hints = list;
      renderLeafCounts();
      decorate(document);
    });
  }

  window.LGCYHints = {
    registerSource: function (name, load) {
      if (typeof load !== "function") return;
      sources.push({ name: name, load: load });
      refresh();
    },
    refresh: refresh,
    list: function () {
      return hints.slice();
    },
  };

  // Tree cards arrive late: your-tree renders its cards after
  // the pack lands. Watch for new cards and badge them as they
  // land; watch the body class for sign-in and sign-out
  // (session.js stamps lgcy-own / lgcy-demo) and re-read then.
  if (window.MutationObserver && document.body) {
    var cardTimer = false;
    var cardMo = new MutationObserver(function (muts) {
      var newCards = false;
      muts.forEach(function (m) {
        Array.prototype.forEach.call(m.addedNodes || [], function (node) {
          if (node.nodeType !== 1) return;
          if (node.classList && node.classList.contains("pcard")) {
            newCards = true;
          } else if (node.querySelector && node.querySelector(".pcard")) {
            newCards = true;
          }
        });
      });
      if (!newCards || cardTimer) return;
      cardTimer = true;
      window.setTimeout(function () {
        cardTimer = false;
        decorate(document);
      }, 60);
    });
    cardMo.observe(document.body, { childList: true, subtree: true });

    // The body's own class carries the mode stamp: session.js
    // flips lgcy-own / lgcy-demo there on sign-in and sign-out.
    // Other body classes come and go with scrolling, so re-read
    // only when the identity itself actually changed.
    var lastIdentity = sessionEmail();
    var modeMo = new MutationObserver(function () {
      var now = sessionEmail();
      if (now === lastIdentity) return;
      lastIdentity = now;
      refresh();
    });
    modeMo.observe(document.body, {
      attributes: true,
      attributeFilter: ["class"],
    });
  }

  refresh();
})();
