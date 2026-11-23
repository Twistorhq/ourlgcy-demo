// Our LGCY records flow (TW-1276): the add-a-record form on
// family.html. Each record POSTs to the intake API's /records
// endpoint (window.LGCY_RECORDS_ENDPOINT, set in family-config.js),
// keyed by the visitor's signup email. The records a person adds are
// what make their own tree living; they are never rendered back on
// any public surface.
//
// Honesty rules, same as family.js: when the endpoint global is
// unset this runs in preview mode (validates, shows the preview
// receipt, stores nothing), and a failed POST never pretends to have
// saved: the visitor keeps their answers and hears it plainly.
(function () {
  "use strict";

  var ENDPOINT =
    (typeof window !== "undefined" && window.LGCY_RECORDS_ENDPOINT) || "";
  var PACK_ENDPOINT =
    (typeof window !== "undefined" && window.LGCY_PACK_ENDPOINT) || "";

  var form = document.getElementById("record-form");
  if (!form) return;
  var submitBtn = document.getElementById("record-submit");
  var previewNote = document.getElementById("record-preview-note");
  var successNote = document.getElementById("record-success-note");
  var successTitle = document.getElementById("record-success-title");
  var successBody = document.getElementById("record-success-body");
  var countLine = document.getElementById("record-count");
  var errorNote = document.getElementById("record-error-note");
  var treeNote = document.getElementById("record-tree-note");
  var treeList = document.getElementById("record-tree-list");
  var errorDetail = document.getElementById("record-error-detail");
  var added = 0;

  // TW-1284: after a record lands, read the tree back and show who
  // stands on it. The receipt alone asked the visitor to trust the
  // push; the read-back proves it, on the same page, no reload.
  function showTreeSoFar(email) {
    if (!PACK_ENDPOINT || !treeNote || !treeList) return;
    fetch(PACK_ENDPOINT + "?email=" + encodeURIComponent(email), {
      headers: { Accept: "application/json" },
    })
      .then(function (res) {
        if (!res.ok) throw new Error("pack " + res.status);
        return res.json();
      })
      .then(function (pack) {
        var people = (pack && pack.people) || [];
        if (!people.length) return;
        treeList.innerHTML = people
          .map(function (p) {
            var name = String(p.name == null ? "" : p.name)
              .replace(/&/g, "&amp;")
              .replace(/</g, "&lt;")
              .replace(/>/g, "&gt;");
            return "<li>" + name + "</li>";
          })
          .join("");
        treeNote.classList.add("show");
      })
      .catch(function () {
        // The record itself saved; a failed read-back never
        // rewrites that. The tree page will show it.
      });
  }

  // A refusal from the archive carries its reason, field by field.
  // The visitor hears THAT reason in plain words, never a generic
  // "check your connection" for a record the archive read and
  // refused: a wrong diagnosis sends her retrying forever.
  function refusalText(errors) {
    if (!errors || typeof errors !== "object") return null;
    if (errors.relation === "self already recorded") {
      return "You already have a record for yourself on your tree, and there is one record for you. Add the next person instead.";
    }
    if (errors.email === "not signed up") {
      return "We do not have a signup under the email in this form yet. Sign up above with that same email first, or check the spelling here.";
    }
    if (errors.death_year === "before birth year") {
      return "The death year is before the birth year. Check those two years and send again. Your answers are still in the form.";
    }
    var parts = [];
    Object.keys(errors).forEach(function (field) {
      parts.push(field.replace("_", " ") + ": " + errors[field]);
    });
    if (!parts.length) return null;
    return "The archive could not take it (" + parts.join("; ") + "). Your answers are still in the form; fix that part and send again.";
  }

  function showError(detail) {
    if (errorDetail && detail) errorDetail.textContent = detail;
    errorNote.classList.add("show");
    errorNote.setAttribute("tabindex", "-1");
    errorNote.focus();
  }

  // Years arrive the way family memory holds them: "1941", but also
  // "about 1941", "c. 1941", "1941?", "around 1941". Any of those is
  // a year the family reports, and the pack already carries record
  // facts as family-reported ("Probable"), so the honest move is to
  // take the year out of the words and send the integer. A value
  // with no four-digit year in it is not a year at all.
  function yearParse(v) {
    v = v.trim();
    if (v === "") return null;
    var m = v.match(/(1\d{3}|20\d{2})/);
    if (!m) return NaN;
    var y = parseInt(m[1], 10);
    if (y < 1000 || y > new Date().getFullYear()) return NaN;
    return y;
  }

  function yearOk(v) {
    if (v.trim() === "") return true;
    return !isNaN(yearParse(v));
  }

  // The intake contract takes years as integers or null, never as
  // strings: a blank field goes over the wire as null.
  function yearOrNull(v) {
    var y = yearParse(v);
    return y === null || isNaN(y) ? null : y;
  }

  var FIELDS = {
    email: {
      el: document.getElementById("r-email"),
      ok: function (v) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
      },
    },
    full_name: {
      el: document.getElementById("r-name"),
      ok: function (v) {
        return v.trim().length > 1;
      },
    },
    relation: {
      el: document.getElementById("r-relation"),
      ok: function (v) {
        return v !== "";
      },
    },
    birth_year: {
      el: document.getElementById("r-birth-year"),
      ok: function (v) {
        return yearOk(v);
      },
    },
    death_year: {
      el: document.getElementById("r-death-year"),
      ok: function (v) {
        if (!yearOk(v)) return false;
        var d = yearParse(v);
        var b = yearParse(document.getElementById("r-birth-year").value);
        if (d !== null && b !== null && !isNaN(d) && !isNaN(b)) {
          return d >= b;
        }
        return true;
      },
    },
    source_label: {
      el: document.getElementById("r-source"),
      ok: function (v) {
        return v !== "";
      },
    },
  };

  var PLAIN = {
    birth_place: document.getElementById("r-birth-place"),
    death_place: document.getElementById("r-death-place"),
    notes: document.getElementById("r-notes"),
  };

  function mark(key, valid) {
    var wrap = form.querySelector('[data-rfield="' + key + '"]');
    if (wrap) wrap.classList.toggle("invalid", !valid);
    FIELDS[key].el.setAttribute("aria-invalid", valid ? "false" : "true");
    return valid;
  }

  Object.keys(FIELDS).forEach(function (key) {
    var ev = FIELDS[key].el.tagName === "SELECT" ? "change" : "input";
    FIELDS[key].el.addEventListener(ev, function () {
      mark(key, FIELDS[key].ok(FIELDS[key].el.value));
    });
  });

  // A returning visitor, or one who just signed up above, should not
  // have to retype the email their tree keys to.
  try {
    var saved = window.sessionStorage.getItem("lgcy-signup-email");
    if (saved && !FIELDS.email.el.value) FIELDS.email.el.value = saved;
  } catch (e) {}

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    errorNote.classList.remove("show");
    previewNote.classList.remove("show");
    successNote.classList.remove("show");

    var firstBad = null;
    Object.keys(FIELDS).forEach(function (key) {
      var valid = mark(key, FIELDS[key].ok(FIELDS[key].el.value));
      if (!valid && !firstBad) firstBad = FIELDS[key].el;
    });
    if (firstBad) {
      firstBad.focus();
      return;
    }

    // The payload is the intake README's /records contract exactly:
    // full_name and source_label, years as integers or null.
    var payload = {
      email: FIELDS.email.el.value.trim(),
      full_name: FIELDS.full_name.el.value.trim(),
      relation: FIELDS.relation.el.value,
      birth_year: yearOrNull(FIELDS.birth_year.el.value),
      birth_place: PLAIN.birth_place.value.trim() || null,
      death_year: yearOrNull(FIELDS.death_year.el.value),
      death_place: PLAIN.death_place.value.trim() || null,
      source_label: FIELDS.source_label.el.value,
      notes: PLAIN.notes.value.trim(),
    };

    // Preview mode: no endpoint wired. Validate, receipt, store nothing.
    if (!ENDPOINT) {
      previewNote.classList.add("show");
      previewNote.setAttribute("tabindex", "-1");
      previewNote.focus();
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Saving to your tree...";
    fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then(function (res) {
        if (!res.ok) {
          // Read the refusal's reasons before showing anything: the
          // body is the archive saying exactly what it refused.
          return res
            .json()
            .catch(function () {
              return {};
            })
            .then(function (body) {
              showError(
                refusalText(body && body.errors) ||
                  "Your answers are still in the form. Check your connection and send again."
              );
              return null;
            });
        }
        return res;
      })
      .then(function (res) {
        if (!res) return;
        // The contract answers 201 when the record is stored and 200
        // when that exact record was already on the tree; the receipt
        // says which one happened.
        if (res.status === 200) {
          successTitle.textContent =
            "Already on your tree: " + payload.full_name + ".";
          successBody.textContent =
            "That exact record was already there, so nothing changed. Add the next person whenever you are ready.";
        } else {
          added += 1;
          successTitle.textContent = "Added: " + payload.full_name + ".";
          successBody.textContent =
            "That record is on your tree now. Add the next person whenever you are ready.";
        }
        countLine.textContent =
          added === 1
            ? "1 record added in this visit."
            : added + " records added in this visit.";
        successNote.classList.add("show");
        // The record keys to this email; the session takes it, so
        // the tree page opens in their own mode from here on.
        if (window.LGCYSession) {
          window.LGCYSession.setEmail(payload.email);
        } else {
          try {
            window.sessionStorage.setItem("lgcy-signup-email", payload.email);
          } catch (err) {}
        }
        showTreeSoFar(payload.email);
        // Keep the email and the rhythm; clear the person fields.
        ["full_name", "relation", "birth_year", "death_year", "source_label"].forEach(
          function (key) {
            FIELDS[key].el.value = "";
            mark(key, true);
          }
        );
        PLAIN.birth_place.value = "";
        PLAIN.death_place.value = "";
        PLAIN.notes.value = "";
        FIELDS.full_name.el.focus();
      })
      .catch(function () {
        // The fetch itself failed: no answer came back at all. Only
        // here is "check your connection" the true sentence.
        showError(
          "Your answers are still in the form. Check your connection and send again."
        );
      })
      .then(function () {
        submitBtn.disabled = false;
        submitBtn.textContent = "Add to my tree";
      });
  });
})();
