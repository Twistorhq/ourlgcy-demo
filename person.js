// Our LGCY profile cards (TW-1241).
//
// person.html as authored is the story page's blank state:
// "A Life, Told Fully", waiting for its first person. Every
// figure in the world and every card on the tree links here
// with ?id=<their id>, and this script renders THAT person's
// card from the same lineage pack the tree is built from
// (data/lineage-phase1.json): their cited facts with statuses,
// the questions the record has not settled, and their family
// named at the end of the page as links to their own cards,
// per the card direction (TW-1227).
//
// If a card cannot be loaded, this script says so plainly; it
// never shows the wrong person. Living people are masked in
// the pack and get no card here either.

(function () {
  "use strict";

  var id = new URLSearchParams(window.location.search).get("id");
  if (!id) return; // the authored blank page stands

  var FIELD_LABELS = {
    birth_date: "Born", birth_year: "Born", birth_year_alt: "Born, the other reading",
    birth_place: "Birthplace", death_date: "Died", death_year: "Died",
    death_place: "Place of death", death_place_candidate: "Place of death, a candidate",
    last_residence: "Last residence", burial: "Burial",
    residence: "Residence", residence_1940: "Residence, 1940",
    household_1940: "Household, 1940", household_role: "In the household",
    migration: "Migration", family_account: "Family account",
    name_variant: "Name variant", name_variants: "Name variants",
    birth_name: "Birth name", later_name: "Later name",
    name_as_indexed_1940: "Name as indexed, 1940",
    vital_status: "Vital status", documentation_status: "Documentation",
    caution_namesakes: "A caution on namesakes",
    identity_candidate: "Identity candidate"
  };
  var KIN_FIELDS = {
    father: 1, mother: 1, spouse: 1, children: 1,
    father_name: 1, mother_name: 1, mother_candidate: 1, father_candidate: 1
  };
  var SOURCE_LABELS = {
    "seed-tree": "Family tree",
    "demo": "Demo sample"
  };
  var CHIP_CLASS = { Documented: "record", Probable: "family", Lead: "lead" };

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  function sourceLabel(src) {
    if (SOURCE_LABELS[src]) return SOURCE_LABELS[src];
    if (src && src.indexOf("people/") === 0) return "Family record";
    return src || "";
  }
  function chip(fact) {
    var cls = CHIP_CLASS[fact.status] || "family";
    return '<span class="src ' + cls + '">' + esc(fact.status) + " · " +
      esc(sourceLabel(fact.source)) + "</span>";
  }
  function yearOf(value) {
    var m = /\b(1[5-9]\d\d|20\d\d)\b/.exec(String(value || ""));
    return m ? m[1] : "";
  }
  function factOf(person, fields) {
    for (var i = 0; i < person.facts.length; i++) {
      if (fields.indexOf(person.facts[i].field) >= 0) return person.facts[i];
    }
    return null;
  }

  function notice(title, text) {
    document.title = title + ": Our LGCY";
    var main = document.getElementById("main");
    if (main) {
      main.innerHTML = '<div class="wrap"><div class="person-head"><div>' +
        '<p class="eyebrow">History book page</p><h1>' + esc(title) + "</h1>" +
        '<p class="lede" style="max-width:44em">' + esc(text) + "</p>" +
        "</div></div></div>";
    }
  }

  fetch("data/lineage-phase1.json")
    .then(function (r) { if (!r.ok) throw new Error("pack fetch " + r.status); return r.json(); })
    .then(function (pack) {
      var people = pack.people || [];
      var byId = {};
      people.forEach(function (p) { byId[p.id] = p; });
      var person = byId[id];
      if (!person) { notice("Not in this tree yet", "That person is not in this tree yet. A story page appears here when a family adds their people."); return; }
      if (person.living || person.masked) {
        notice(person.name, "Living people are masked in this preview, under the family's own privacy rule: no dates and no card. Their place in the tree is held, and that is all this page says.");
        return;
      }
      render(pack, person, byId);
    })
    .catch(function () {
      notice("Profile unavailable", "This profile could not be loaded from the research pack. The world links here by name, and this page will not guess whose card to show instead.");
    });

  function render(pack, person, byId) {
    document.title = person.name + ": Our LGCY";
    var banner = document.querySelector(".demo-banner span");
    if (banner) {
      banner.textContent = "This page tells " + person.name + "'s life from the research pack. Every fact is cited with its status, and the questions the records have not answered yet are left open, on purpose.";
    }

    var birth = factOf(person, ["birth_date", "birth_year"]);
    var death = factOf(person, ["death_date", "death_year"]);
    var birthPlace = factOf(person, ["birth_place"]);

    var ledeParts = [];
    if (birth) ledeParts.push("Born " + birth.value + " (" + birth.status.toLowerCase() + ")");
    if (birthPlace) ledeParts.push("in " + birthPlace.value);
    var lede = ledeParts.length ? ledeParts.join(" ") + ". " : "";
    if (death) lede += "Died " + death.value + " (" + death.status.toLowerCase() + "). ";
    lede += person.line + ". This card is built from the research pack, fact by fact; where the record is silent, the card says so.";

    var meta = "";
    if (birth) meta += "<div><dt>Born</dt><dd>" + esc(birth.value) + " (" + esc(birth.status) + ")</dd></div>";
    if (death) meta += "<div><dt>Died</dt><dd>" + esc(death.value) + " (" + esc(death.status) + ")</dd></div>";
    meta += "<div><dt>Line</dt><dd>" + esc(person.line) + "</dd></div>";
    if (birth && death && birth.status === "Documented" && death.status === "Documented") {
      var by = parseInt(yearOf(birth.value), 10), dy = parseInt(yearOf(death.value), 10);
      if (by && dy) meta += "<div><dt>Kept at</dt><dd>The age of " + (dy - by) + ", as they were when they passed</dd></div>";
    }

    var items = "";
    person.facts.forEach(function (fact) {
      if (fact.field === "name" || KIN_FIELDS[fact.field]) return;
      var label = FIELD_LABELS[fact.field] || fact.field.replace(/_/g, " ");
      var value = fact.value;
      if (byId[value]) value = byId[value].name; // a fact that names a person by id
      items += "<li><div class=\"yr\">" + esc(yearOf(fact.value)) + "</div>" +
        "<div class=\"dot\" aria-hidden=\"true\"></div><div class=\"what\">" +
        "<p><strong>" + esc(label) + ".</strong> " + esc(value) +
        (fact.note ? " " + esc(fact.note) : "") + "</p>" + chip(fact) + "</div></li>";
    });

    var open = "";
    (pack.conflicts || []).forEach(function (c) {
      if (c.person !== person.id) return;
      var readings = (c.readings || []).map(function (r) {
        return "<p><strong>" + esc(r.value) + "</strong> (" + esc(r.status) + ")" +
          (r.note ? " " + esc(r.note) : "") + "</p>";
      }).join("");
      open += "<li><div class=\"yr\">Open</div><div class=\"dot\" aria-hidden=\"true\"></div>" +
        "<div class=\"what\">" + readings +
        "<p>Decider: " + esc(c.decider) + "</p></div></li>";
    });
    (pack.gaps || []).forEach(function (g) {
      if (g.person !== person.id) return;
      open += "<li><div class=\"yr\">Open</div><div class=\"dot\" aria-hidden=\"true\"></div>" +
        "<div class=\"what\"><p><strong>Missing.</strong> " + esc(g.missing) + "</p>" +
        "<p>Decider: " + esc(g.decider) + "</p></div></li>";
    });

    // Family named on this page, as links at the end (the
    // card law): parents, spouses, children, each opening
    // their own card.
    var kin = "";
    function kinLink(pid, role) {
      var p = byId[pid];
      if (!p) return "";
      return "<li><a class=\"roster-btn\" href=\"person.html?id=" + encodeURIComponent(pid) +
        "\" aria-label=\"" + esc(role) + ": " + esc(p.name) + ". Open their profile.\">" +
        "<span class=\"roster-name\">" + esc(p.name) + "</span>" +
        "<span class=\"roster-meta\">" + esc(role) + " · " + esc(p.line) + "</span></a></li>";
    }
    function kinText(name, role) {
      return "<li><span class=\"roster-btn\" aria-disabled=\"true\">" +
        "<span class=\"roster-name\">" + esc(name) + "</span>" +
        "<span class=\"roster-meta\">" + esc(role) + " · Named in the record; no card in this preview</span></span></li>";
    }
    if (person.father_id) kin += kinLink(person.father_id, "Father");
    else {
      var fn = factOf(person, ["father_name"]);
      if (fn) kin += kinText(fn.value, "Father");
    }
    if (person.mother_id) kin += kinLink(person.mother_id, "Mother");
    else {
      var mn = factOf(person, ["mother_name", "mother_candidate"]);
      if (mn) kin += kinText(mn.value, "Mother");
    }
    (person.spouse_ids || []).forEach(function (sid) { kin += kinLink(sid, "Spouse"); });
    (pack.people || []).forEach(function (p) {
      if (p.father_id === person.id || p.mother_id === person.id) kin += kinLink(p.id, "Child");
    });

    var main = document.getElementById("main");
    main.innerHTML =
      '<div class="wrap">' +
      '<div class="person-head">' +
      '<div class="portrait" role="img" aria-label="Placeholder portrait frame with the initials ' +
      esc(person.initials) + '. A scanned portrait belongs here when the family has one.">' +
      '<div class="initials">' + esc(person.initials) + "</div>" +
      '<div class="note">No portrait is in the record set yet</div></div>' +
      "<div>" +
      '<p class="eyebrow">History book page · ' + esc(person.line) + "</p>" +
      "<h1>" + esc(person.name) + "</h1>" +
      '<p class="lede" style="max-width:44em">' + esc(lede) + "</p>" +
      '<dl class="person-meta">' + meta + "</dl>" +
      "</div></div>" +
      '<p style="margin-top:22px"><strong>How to read this page:</strong> every fact carries its status. ' +
      '<span class="src record">Documented</span> means a captured record states it. ' +
      '<span class="src family">Probable</span> means family reported, corroborated short of a primary record. ' +
      '<span class="src lead">Lead</span> means a candidate with evidence and a named decider, never presented as a connection. ' +
      "When the record is silent, the page says so, plainly.</p>" +
      '<div class="layout-rail" style="margin-top:26px"><div>' +
      "<h2>Their life, in the record</h2>" +
      '<ol class="timeline">' + items + "</ol>" +
      (open ? "<h2>What the record has not settled</h2>" + '<ol class="timeline">' + open + "</ol>" : "") +
      (kin ? "<h2>Family named on this page</h2>" + '<ul class="roster-list">' + kin + "</ul>" : "") +
      "</div></div></div>";
  }
})();

// TW-1284: the stories page in own mode. A signed-in visitor never
// meets the demo here: the "Your people" block (data-own-only in
// person.html, so it only exists on screen for them) fills from
// their own pack, and stands as an honest empty state until their
// first record lands.
(function () {
  "use strict";

  var list = document.getElementById("your-people-list");
  var empty = document.getElementById("your-people-empty");
  if (!list) return;
  var S = window.LGCYSession;
  var PACK_EP =
    (typeof window !== "undefined" && window.LGCY_PACK_ENDPOINT) || "";
  if (!S || !S.isSignedIn() || !PACK_EP) return;

  function esc(s) {
    return S.esc(s);
  }

  fetch(PACK_EP + "?email=" + encodeURIComponent(S.getEmail()), {
    headers: { Accept: "application/json" },
  })
    .then(function (res) {
      if (!res.ok) throw new Error("pack " + res.status);
      return res.json();
    })
    .then(function (pack) {
      var people = (pack && pack.people) || [];
      if (!people.length) return; // the empty state already stands
      if (empty) empty.style.display = "none";
      list.innerHTML = people
        .map(function (p) {
          var meta =
            p.living || p.masked
              ? "Living, held private"
              : p.born
                ? "b. " + p.born
                : "Dates not yet on file";
          return (
            '<li><span class="pp-name">' + esc(p.name) + "</span>" +
            '<span class="pp-meta">' + esc(meta) + "</span></li>"
          );
        })
        .join("");
    })
    .catch(function () {
      // The empty state wording covers a quiet failure too: it
      // invites the first record rather than inventing a list.
    });
})();
