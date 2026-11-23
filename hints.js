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
// NOTO SWAP (founder's word, Nov 23, 2026): the hand-drawn
// leaf is replaced by the 🍁 artwork itself, from Google's
// Noto Emoji library (googlefonts/noto-emoji,
// 2D/svg/emoji_u1f341.svg), inlined below — self-hosted, no
// external request. License as verified in the repo: its
// README describes the image resources as Apache License 2.0;
// the repo LICENSE file (replaced 2024-07-29, commit 254596e5)
// is the SIL Open Font License 1.1. Full record in the README
// credits and the TW-1307 gate note. The artwork is optimized
// in-house (SVGO: Illustrator metadata stripped, coordinates
// at 3 decimals); its geometry and paint are Google's.
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

  // The maple leaf, drawn once and reused: Google's Noto
  // Emoji 🍁 (U+1F341), the artwork itself, inlined.
  // Copyright Google LLC; source googlefonts/noto-emoji,
  // 2D/svg/emoji_u1f341.svg; license record in the header
  // comment above and in the README credits. Optimized
  // in-house with SVGO through the pocket-design gate
  // (Illustrator metadata and its private PGF blob stripped,
  // coordinates rounded to 3 decimals, gradient ids renamed
  // into this file's namespace): 55,280 source bytes to a
  // 3,482-byte inline string. Every instance carries its own
  // identical gradient defs, so the paint resolves the same
  // wherever instances come and go.
  var LEAF =
    '<svg viewBox="0 0 128 128" aria-hidden="true" focusable="false">' +
    '<linearGradient id="lgcy-noto-a" x1="64.466" x2="64.466" y1="91.429" y2="112.358" gradientUnits="userSpaceOnUse"><stop offset="0" style="stop-color:#df7c1a"/><stop offset=".348" style="stop-color:#cf721b"/><stop offset="1" style="stop-color:#a6581c"/></linearGradient>' +
    '<path fill="url(#lgcy-noto-a)" d="M59.686 122.154c.2.99 1.31 1.87 4.39 2.07s5.15-.3 5.23-1.95c.09-1.65-1.14-3.49-1.34-4.88s-.99-10.74-1.19-15.61-.36-14.16-.36-14.16l-4.07.43s.06 9.65-.14 14.52-1.01 12.01-1.11 13.89c-.09 1.71-1.83 3.61-1.41 5.69"/>' +
    '<radialGradient id="lgcy-noto-b" cx="65.836" cy="38.176" r="62.079" gradientTransform="rotate(180.773 .01 71.3)scale(-1 1.2816)" gradientUnits="userSpaceOnUse"><stop offset=".002" style="stop-color:#ffbe06"/><stop offset=".12" style="stop-color:#ffb907"/><stop offset=".26" style="stop-color:#ffaa09"/><stop offset=".412" style="stop-color:#ff920d"/><stop offset=".571" style="stop-color:#ff7113"/><stop offset=".679" style="stop-color:#ff5617"/><stop offset="1" style="stop-color:#df1024"/></radialGradient>' +
    '<path fill="url(#lgcy-noto-b)" d="M64.396 89.454s-5.57 6.36-9.55 8.75-9.55 5.27-10.54 4.57 1.39-5.57 1.39-5.57-8.32 1.88-17.53-.79c-8.82-2.55-14.09-6.37-13.69-7.47s4.57-1.69 8.65-3.28 9.55-4.18 9.55-4.18-7.83-2.84-12.3-5.62-7.29-5.41-7.39-6.31c-.1-.89 6.26-2.49 6.26-2.49s-3.48-2.39-6.07-10.14-3.27-13.63-2.78-14.21c1.18-1.37 11.73 2.28 14.72 3.85 2.88 1.51 7.55 4.5 7.55 4.5s-.3-5.97.7-5.97c.99 0 3.58 2.39 5.87 5.37s9.05 13.32 10.74 12.53c1.69-.8.09-5.78-2.28-10.67-1.49-3.08-3.59-8.23-4.78-14.29-1.18-6-.5-10.94.2-11.53.7-.6 7.46 4.67 7.46 4.67s-.54-5.79.55-10.76 2.03-6.46 2.62-6.56c.6-.1 2.99 3.4 2.99 3.4s.92-4.95 2.91-8.43 3.75-5.09 4.64-5.09 3.52 3.49 4.71 7.17 1.88 6.73 1.88 6.73 1.51-3.09 2.18-3.2c.57-.09 2.58 2.16 3.57 7.43s.99 8.91.99 8.91 4.28-4.47 5.07-4.57c.8-.1 2.79 5.07 1.3 12.13s-5.37 13.88-6.27 17.56c-.89 3.68-1.69 7.29-.2 7.69s3-4.1 6.18-9.08 7.54-10.21 8.14-9.82c.6.4 1.49 2.29 1.69 3.28s.3 2.88.3 2.88 4.57-3.08 8.55-4.57 12.93-4.77 14.82-3.18-1.49 10.14-3.48 14.52-6.36 10.93-6.36 10.93 5.95 1.14 5.85 2.03-4.95 4.89-9.33 7.18-9.96 4.13-9.96 4.13 2.49 1.69 8.35 3.58c5.87 1.89 10.74 2.49 11.14 3.48s-2.29 4.47-11.24 6.86-18.93 1.06-19.43 1.55c-.5.5 2.43 4.41 1.63 5.51s-6.17-.42-10.34-3.98c-5.35-4.56-9.63-9.43-9.63-9.43"/>' +
    '<radialGradient id="lgcy-noto-c" cx="65.7" cy="86.334" r="42.364" gradientTransform="matrix(1 0 0 1.54133 0 -46.736)" gradientUnits="userSpaceOnUse"><stop offset=".42" style="stop-color:#df7c1a"/><stop offset=".717" style="stop-color:#c0681b"/><stop offset="1" style="stop-color:#a6581c"/></radialGradient>' +
    '<path fill="url(#lgcy-noto-c)" d="M64.486 91.914s1.82-1.4 5.59-2.16c2.07-.42 4.88-.47 7.95-.4 8.24.17 17.03 1.71 21.65 1.87 4.62.15 8.86 0 8.78-1s-7.16-.54-12.55-1.54-13.17-2.08-16.41-2.23c-8.37-.41-10.09.77-10.09.77s10.78-9.55 14.79-12.63 10.47-8.12 16.41-13.4c5.17-4.6 14.63-14.33 14.02-15.17-.62-.85-12.25 10.24-16.48 13.63-4.24 3.39-9.85 7.6-18.55 14.46s-13.34 11.35-13.34 11.35-.69-25.8-.92-31.89c-.23-6.08-.23-28.87-.39-31.64s.39-14.26-1-14.19c-1.39.08-1.62 9.4-1.77 14.1s-.15 24.49-.31 30.58.23 32.73.23 32.73-16.56-12.46-22.72-17.39-16.47-14.18-17.86-15.34-6.71-6.11-7.33-5.49 7.17 8.88 10.1 11.5 16.15 14.09 21.85 18.78 12.88 9.92 12.88 9.92-6.78-.77-15.92.05c-6.93.62-13.43 1.42-16.28 1.65s-7.24.31-7.39.92c-.15.62 3.54 1.54 10.94 1.08 7.39-.46 11.26-.79 16.64-1.05 7.32-.35 12.02-.1 13.86.36 1.85.46 3.62 1.77 3.62 1.77"/>' +
    '</svg>';

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
