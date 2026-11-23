// Our LGCY hints (TW-1307): the maple-leaf hint language.
//
// A hint is a CLUE, never a fact. On the tree it renders as a
// maple leaf alone at the upper right corner of the card of
// the person it belongs to: FOUNDER UX REFINEMENT (Nov 23,
// 2026) — no visible word "Hint" and no count on the badge;
// the leaf alone marks the card, its accessible name still
// says what it is, and the leaf is a LINK into that person's
// card (person.html?id=…#hint), landing on the hint inside.
// Inside the card the hint renders as a CONNECTION hint, in
// relational language composed from the link evidence itself
// (see connectionLine): a possible connection, never a proven
// one. The leaf is drawn inline. FIX ROUND (founder's eye,
// Nov 23, 2026): the first drawing read as a sunburst and was
// discarded; the leaf is now drawn to the classic maple
// silhouette of the 🍁 emoji — five pointed lobes, deep
// sinuses, serrated teeth, a clean stem — in a fall gradient,
// deep red at the crown to gold at the base, so it reads as
// THE maple leaf at a glance at badge size and at indicator
// size alike.
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
//   { id, kind, subjectName, text, source, relation?, ancestor? }
// subjectName names the tree person the hint belongs to (badges
// match cards by the person's name); text is the clue itself, in
// the producing engine's own words. Rendering never edits a
// clue's words and never upgrades one into a claim. A source may
// also carry the link evidence as fields — relation (the
// candidate relation the engine proposes) and ancestor
// ({ name, relation }, a documented speaker linked to the
// subject) — and the in-card presentation composes its
// relational line from exactly those fields, never from a
// relation the data does not carry.
//
// Source one, today: the member's pending kin questions
// (TW-1278), read from window.LGCY_KIN_QUESTIONS_ENDPOINT: the
// response is an array, or { questions: [...] }, each question
// { id, phrase, subject_name, candidate_relation, ancestor? },
// where candidate_relation is the relation the subject is
// proposed to be TO THE MEMBER ("Is June Park your cousin?")
// and ancestor is { id, name, relation } or null. The kin layer
// owns answering, in the Community; this layer marks the card,
// links into it, and presents the connection inside it.
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

  // The maple leaf, drawn once and reused: the classic maple
  // silhouette (the 🍁 shape) on a 100-unit grid, symmetric
  // around its centre line — a broad centre lobe with one tooth
  // a side, upper lobes angled up and out, lower lobes spread
  // wide, small basal lobes, deep sinuses between them, and a
  // clean stem. The fill is a fall gradient (deep red crown to
  // gold base) with a flat fall-orange fallback. Every instance
  // carries its own identical gradient defs, so the paint
  // resolves the same wherever instances come and go.
  var LEAF =
    '<svg viewBox="0 0 100 100" aria-hidden="true" focusable="false">' +
    '<defs><linearGradient id="lgcy-leaf-grad" x1="0" y1="0" x2="0.2" y2="1">' +
    '<stop offset="0" stop-color="#b8261a"/>' +
    '<stop offset="0.45" stop-color="#d84a15"/>' +
    '<stop offset="0.75" stop-color="#e87a1c"/>' +
    '<stop offset="1" stop-color="#f2a41f"/>' +
    "</linearGradient></defs>" +
    '<path d="M50 2 L55.5 11 L61 18 L56.5 24 L56 27 L58 31 ' +
    'L71 27 L81 16 L76 26 L64 42 L79 39 L95 46 L81 55 L66 56 ' +
    'L74 62 L74 70 L60 68 L53 74 L51.5 85 L51 95 L47 95.5 ' +
    'L47.5 85 L47 74 L40 68 L26 70 L26 62 L34 56 L19 55 L5 46 ' +
    'L21 39 L36 42 L24 26 L19 16 L29 27 L42 31 L44 27 L43.5 24 ' +
    'L39 18 L44.5 11 Z" fill="url(#lgcy-leaf-grad) #d95d16"/></svg>';

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
              relation: q.candidate_relation || null,
              ancestor:
                q.ancestor && q.ancestor.name
                  ? {
                      name: q.ancestor.name,
                      relation: q.ancestor.relation || "",
                    }
                  : null,
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

  // --- The badge: the maple leaf ALONE at the UPPER RIGHT
  // corner of the tree card of the person a hint belongs to
  // (founder UX refinement, Nov 23, 2026: no visible word, no
  // count; stacked hints on one card are counted inside the
  // card, not on the badge). The leaf is a link into that
  // person's card, landing on the hint inside (#hint); the
  // person's id comes from the card itself, whose element id
  // is "p-<person id>" on every tree (the sample journey's
  // cards and your-tree's cards alike). Cards are matched by
  // the person's name, the one identifier every tree card
  // already carries. The accessible name stays descriptive:
  // it says this is a hint, names the person, and keeps the
  // honesty line, a clue, not a fact. ---
  function badgeFor(list, card) {
    var name = list[0].subjectName;
    var label =
      (list.length > 1 ? list.length + " hints" : "Hint") +
      " for " +
      name +
      ". A hint is a clue, not a fact.";
    var pid =
      card && card.id && card.id.indexOf("p-") === 0
        ? card.id.slice(2)
        : "";
    var el;
    if (pid) {
      el = document.createElement("a");
      el.href = "person.html?id=" + encodeURIComponent(pid) + "#hint";
      el.setAttribute(
        "aria-label",
        label +
          " Open " +
          name +
          "'s card to see the possible connection" +
          (list.length > 1 ? "s" : "") +
          "."
      );
    } else {
      el = document.createElement("span");
      el.setAttribute("role", "note");
      el.setAttribute("aria-label", label);
    }
    el.className = "hint-badge";
    el.innerHTML = LEAF;
    return el;
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
      var badge = badgeFor(list, card);
      badge.setAttribute(
        "data-hint-ids",
        list.map(function (h) { return h.id; }).join(",")
      );
      card.appendChild(badge);
      card.classList.add("has-hint");
    });
  }

  // --- Inside the card: the CONNECTION hint (founder UX
  // refinement, Nov 23, 2026). On a person's card (person.html),
  // the hints that belong to that person render as a connection
  // block at the top of the card, anchored #hint so the tree's
  // corner leaf lands the visitor on it. Each hint's line is
  // composed from its own link evidence and nothing else:
  //   - a documented ancestor linked to the subject: the line
  //     names the ancestor and the link in the ancestor's own
  //     relation words, then the hedge, may be your family also;
  //   - a candidate relation: the subject may be your <relation>,
  //     in the engine's own relation vocabulary;
  //   - neither: the records link the subject to your family,
  //     and the subject may be your family also.
  // A relation the data does not carry is never composed. The
  // engine's question is quoted verbatim under its line, with
  // the path to answer it, and the block carries the honesty
  // line once: a possible connection, not a proven one. A
  // source with no evidence fields (the survey lane, when it
  // registers) presents its clue in its engine's own words
  // under the same heading, through this same block. ---
  var RELATION_WORD = {
    parent: "parent",
    grandparent: "grandparent",
    sibling: "brother or sister",
    cousin: "cousin",
  };

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function connectionLine(h) {
    var name = h.subjectName;
    if (h.ancestor && h.ancestor.name) {
      var link = h.ancestor.relation
        ? h.ancestor.name + " was " + h.ancestor.relation + " " + name
        : h.ancestor.name + " is linked to " + name;
      return (
        link +
        ", in your family's records — so " +
        name +
        " may be your family also."
      );
    }
    var word = h.relation ? RELATION_WORD[h.relation] : null;
    if (word) {
      return (
        "The records link " +
        name +
        " to your family — " +
        name +
        " may be your " +
        word +
        "."
      );
    }
    if (h.relation || h.kind === "kin-question") {
      return (
        "The records link " +
        name +
        " to your family — " +
        name +
        " may be your family also."
      );
    }
    return h.text;
  }

  function renderPersonHints() {
    var main = document.getElementById("main");
    if (!main) return true; // not a page with a person's card
    var head = main.querySelector(".person-head");
    var meta = main.querySelector(".person-meta");
    var h1 = head ? head.querySelector("h1") : null;
    if (!head || !meta || !h1) return false; // the card has not rendered yet
    var key = normName(h1.textContent);
    var list = hints.filter(function (h) {
      return normName(h.subjectName) === key;
    });
    var old = main.querySelector(".connection-hint");
    var ids = list
      .map(function (h) {
        return h.id;
      })
      .join(",");
    if (old && old.getAttribute("data-hint-ids") === ids) return true;
    if (old) old.remove();
    if (!list.length) return true;
    var items = list
      .map(function (h) {
        var html =
          '<div class="connection-item"><p class="connection-line">' +
          esc(connectionLine(h)) +
          "</p>";
        if (h.kind === "kin-question") {
          html +=
            '<p class="connection-question">A question is waiting: ' +
            esc(h.text) +
            ' <a href="community.html">Answer it in the Community</a></p>';
        }
        return html + "</div>";
      })
      .join("");
    var block = document.createElement("section");
    block.className = "connection-hint";
    block.id = "hint";
    block.setAttribute("data-hint-ids", ids);
    block.setAttribute(
      "aria-label",
      "Possible connection" +
        (list.length > 1 ? "s" : "") +
        " for " +
        h1.textContent.trim() +
        ". A hint is a clue, not a fact."
    );
    block.innerHTML =
      '<h2 class="connection-title">' +
      LEAF +
      "<span>A possible connection" +
      (list.length > 1 ? "s" : "") +
      "</span></h2>" +
      items +
      '<p class="connection-note">A hint is a clue, not a fact: ' +
      "nothing here joins your tree until the question is answered.</p>";
    head.parentNode.insertBefore(block, head.nextSibling);
    if (window.location.hash === "#hint") {
      block.scrollIntoView();
    }
    return true;
  }

  function refresh() {
    return loadAll().then(function (list) {
      hints = list;
      renderLeafCounts();
      decorate(document);
      renderPersonHints();
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

    // A person's card renders after its pack lands, which can
    // be after the hints do. Watch the card's mount until the
    // connection block settles (rendered, or the rendered card
    // is not a hinted person's), then stop; a card that never
    // renders settles nothing and the watch simply expires.
    var mainEl = document.getElementById("main");
    if (mainEl) {
      var personMo = new MutationObserver(function () {
        if (renderPersonHints()) personMo.disconnect();
      });
      personMo.observe(mainEl, { childList: true, subtree: true });
      window.setTimeout(function () {
        personMo.disconnect();
      }, 20000);
    }
  }

  refresh();
})();
