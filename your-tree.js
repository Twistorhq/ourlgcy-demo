// Our LGCY your-tree state (TW-1276, TW-1284): on index.html, a
// visitor who signed up sees THEIR tree, grown from the records
// they added, rendered with the same card markup the build tools
// generate for the sample tree (tools/build_journey.py). The pack
// comes from the intake API (window.LGCY_PACK_ENDPOINT, set in
// family-config.js) in the data/lineage-phase1.json schema.
//
// TW-1284 (founder feedback): the session decides. session.js is
// the one helper that knows the identity; when it is present at
// page load, this section loads their pack on its own, the sample
// journey steps aside, and the tree stands full strength, never
// grayed, never the demo wearing their name. A signed-in visitor
// with no records yet gets an honest empty state in the same
// place, still in own mode. The email form remains for a visitor
// who has not signed in on this device: a successful lookup there
// IS their sign-in, and the session takes the email from it.
//
// The sample tree stays the anonymous default. The demo note at
// the bottom belongs to the demo view only: it hides in your-tree
// mode. An email with no records gets a plain answer and a path
// to add some, never a sample tree wearing their name.
(function () {
  "use strict";

  var ENDPOINT =
    (typeof window !== "undefined" && window.LGCY_PACK_ENDPOINT) || "";

  var form = document.getElementById("yt-form");
  if (!form) return;
  var emailEl = document.getElementById("yt-email");
  var submitBtn = document.getElementById("yt-submit");
  var status = document.getElementById("yt-status");
  var results = document.getElementById("yt-results");
  var groupsEl = document.getElementById("yt-groups");
  var titleEl = document.getElementById("yt-title");
  var backBtn = document.getElementById("yt-back");
  var introEl = document.getElementById("yt-intro");
  var signedinEl = document.getElementById("yt-signedin");

  var S = window.LGCYSession || null;
  function sessionEmail() {
    if (S) return S.getEmail();
    try {
      return window.sessionStorage.getItem("lgcy-signup-email") || "";
    } catch (e) {
      return "";
    }
  }
  function esc(s) {
    if (S) return S.esc(s);
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  try {
    var saved = sessionEmail();
    if (saved && !emailEl.value) emailEl.value = saved;
  } catch (e) {}
  var fromHash = window.location.hash === "#your-tree";
  var params = new URLSearchParams(window.location.search);
  if (params.get("email")) emailEl.value = params.get("email");

  function metaFor(p, rootId) {
    if (p.id === rootId) return "Root of this family tree";
    if (p.living || p.masked) return "Living · held private";
    if (p.born) return "b. " + p.born;
    return "Dates not yet on file";
  }

  function relativesCount(p, people) {
    var rel = {};
    people.forEach(function (q) {
      if (q.id === p.id) {
        if (p.father_id) rel[p.father_id] = true;
        if (p.mother_id) rel[p.mother_id] = true;
        (p.spouse_ids || []).forEach(function (id) {
          rel[id] = true;
        });
      } else {
        if (q.father_id === p.id || q.mother_id === p.id) rel[q.id] = true;
        if ((q.spouse_ids || []).indexOf(p.id) !== -1) rel[q.id] = true;
      }
    });
    return Object.keys(rel).length;
  }

  // Generations above the root person: root is 0, parents 1, and so
  // on, following child links. Anyone not connected to the root yet
  // lands in a closing group of their own, honestly labelled.
  function generations(pack) {
    var people = pack.people || [];
    var byId = {};
    people.forEach(function (p) {
      byId[p.id] = p;
    });
    var rootId = pack.root_person || pack.focus_person || null;
    var gen = {};
    if (rootId && byId[rootId]) gen[rootId] = 0;
    var changed = true;
    var guard = 0;
    while (changed && guard < 50) {
      changed = false;
      guard += 1;
      people.forEach(function (p) {
        if (gen[p.id] == null) return;
        [p.father_id, p.mother_id].forEach(function (pid) {
          if (pid && byId[pid] && gen[pid] == null) {
            gen[pid] = gen[p.id] + 1;
            changed = true;
          }
        });
        (p.spouse_ids || []).forEach(function (sid) {
          if (byId[sid] && gen[sid] == null) {
            gen[sid] = gen[p.id];
            changed = true;
          }
        });
      });
    }
    var groups = {};
    people.forEach(function (p) {
      var g = gen[p.id] == null ? -1 : gen[p.id];
      if (!groups[g]) groups[g] = [];
      groups[g].push(p);
    });
    return { groups: groups, rootId: rootId, byId: byId };
  }

  function card(p, pack, rootId) {
    var n = relativesCount(p, pack.people || []);
    var cls = p.id === pack.focus_person ? "pcard focus" : "pcard";
    var html =
      '<article class="' + cls + '" id="p-' + esc(p.id) + '">' +
      '<span class="medal" aria-hidden="true">' + esc(p.initials || "") + "</span>" +
      '<span class="pcard-body">' +
      '<span class="pname">' + esc(p.name) + "</span>" +
      '<span class="pmeta">' + esc(metaFor(p, rootId)) + "</span>";
    if (n > 0) {
      html +=
        '<span class="relatives-count">+' + n +
        (n === 1 ? " relative" : " relatives") + " on your tree</span>";
    }
    return html + "</span></article>";
  }

  function ownChrome(email) {
    // The section speaks as the visitor's own place now: the demo
    // framing in the intro steps aside and the signed-in line
    // names whose tree this is.
    if (introEl) {
      introEl.textContent =
        "This is your tree, grown from your records alone. Nobody else sees it, and it grows every time you add a record.";
    }
    if (signedinEl) {
      signedinEl.innerHTML =
        "Signed in as " + esc(email) + ". " +
        '<a href="profile.html">Your profile, records, and uploads</a>';
    }
  }

  function render(pack) {
    var built = generations(pack);
    var keys = Object.keys(built.groups)
      .map(Number)
      .sort(function (a, b) {
        return b - a;
      });
    var html = "";
    keys.forEach(function (g) {
      var label =
        g === -1
          ? "Not yet placed"
          : g === 0
            ? "The root"
            : g === 1
              ? "Parents"
              : "Generation " + g + " above the root";
      html +=
        '<section class="yt-gen"><h3 class="yt-gen-title">' + esc(label) +
        '</h3><div class="clusters">';
      // Group by line inside the generation, as the sample tree does.
      var lines = {};
      built.groups[g].forEach(function (p) {
        var line = p.line || "Your family";
        if (!lines[line]) lines[line] = [];
        lines[line].push(p);
      });
      Object.keys(lines).forEach(function (line) {
        html +=
          '<div class="cluster"><p class="cluster-name" aria-hidden="true">' +
          esc(line) + "</p>";
        lines[line]
          .slice()
          .sort(function (a, b) {
            return (a.born || 9999) - (b.born || 9999);
          })
          .forEach(function (p) {
            html += card(p, pack, built.rootId);
          });
        html += "</div>";
      });
      html += "</div></section>";
    });
    groupsEl.innerHTML = html;
    var root = built.rootId ? built.byId[built.rootId] : null;
    titleEl.textContent = root
      ? "The tree of " + root.name
      : "Your tree";
    results.hidden = false;
    document.body.classList.add("your-tree-on");
    status.textContent =
      "Your tree, grown from your records alone. Nobody else sees it.";
  }

  function renderEmpty(email) {
    // Signed in, nothing added yet: own mode all the same, with an
    // honest empty state where their tree will stand.
    titleEl.textContent = "Your tree";
    groupsEl.innerHTML =
      '<div class="yt-empty"><p>Nothing here yet. Your tree grows from ' +
      "your records, and it begins with the first person you add.</p>" +
      '<p><a class="btn btn-pine" href="family.html#start-tree">' +
      "Add your first record</a></p></div>";
    results.hidden = false;
    document.body.classList.add("your-tree-on");
    status.textContent = "Your tree is waiting for its first record.";
  }

  function leave() {
    document.body.classList.remove("your-tree-on");
    results.hidden = true;
    groupsEl.innerHTML = "";
    status.textContent = "";
  }

  backBtn.addEventListener("click", leave);

  // One loader for every path in: the auto-load at page open for a
  // signed-in visitor, the form for everyone else, and the retry
  // after a failed load. mode "auto" keeps the visitor in own mode
  // through an empty pack; mode "form" keeps the TW-1276 answers.
  function load(email, mode) {
    if (!ENDPOINT) {
      status.textContent =
        "Preview mode: no tree lookup is wired here, so nothing was fetched and nothing was stored.";
      return Promise.resolve();
    }
    submitBtn.disabled = true;
    submitBtn.textContent = "Looking...";
    status.textContent = "";
    return fetch(ENDPOINT + "?email=" + encodeURIComponent(email), {
      headers: { Accept: "application/json" },
    })
      .then(function (res) {
        if (res.status === 404) {
          if (mode === "auto") {
            renderEmpty(email);
          } else {
            leave();
            status.innerHTML =
              "No records yet for that email. Your tree begins with the first one: " +
              '<a href="family.html#start-tree">add your first record</a>.';
          }
          return null;
        }
        if (!res.ok) throw new Error("pack " + res.status);
        return res.json();
      })
      .then(function (pack) {
        if (pack) {
          if (S) S.setEmail(email);
          ownChrome(email);
          render(pack);
          if (mode === "form") {
            results.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        }
      })
      .catch(function () {
        if (mode === "auto") {
          // Stay in own mode: the demo never comes back for a
          // signed-in visitor, even when the load fails.
          titleEl.textContent = "Your tree";
          groupsEl.innerHTML =
            '<div class="yt-empty"><p>Your tree could not be loaded ' +
            "just now. Check your connection, then try again.</p>" +
            '<p><button class="btn btn-pine" type="button" id="yt-retry">' +
            "Try again</button></p></div>";
          results.hidden = false;
          document.body.classList.add("your-tree-on");
          status.textContent = "";
          var retry = document.getElementById("yt-retry");
          if (retry) {
            retry.addEventListener("click", function () {
              load(email, "auto");
            });
          }
        } else {
          leave();
          status.textContent =
            "That lookup did not go through. Check your connection and try again.";
        }
      })
      .then(function () {
        submitBtn.disabled = false;
        submitBtn.textContent = "Show my tree";
      });
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var email = emailEl.value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      status.textContent = "That email does not look complete. Check it and try again.";
      emailEl.focus();
      return;
    }
    load(email, "form");
  });

  // The session path: signed in on this device means their tree
  // loads itself, no form, no second ask for the email.
  var identity = sessionEmail();
  if (identity) {
    ownChrome(identity);
    document.body.classList.add("your-tree-on");
    status.textContent = "Loading your tree...";
    load(identity, "auto");
  } else if (fromHash && emailEl.value) {
    form.requestSubmit();
  }

  window.LGCYYourTree = { load: load };
})();
