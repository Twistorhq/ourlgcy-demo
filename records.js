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

  var form = document.getElementById("record-form");
  if (!form) return;
  var submitBtn = document.getElementById("record-submit");
  var previewNote = document.getElementById("record-preview-note");
  var successNote = document.getElementById("record-success-note");
  var successTitle = document.getElementById("record-success-title");
  var successBody = document.getElementById("record-success-body");
  var countLine = document.getElementById("record-count");
  var errorNote = document.getElementById("record-error-note");
  var added = 0;

  function yearOk(v) {
    v = v.trim();
    if (v === "") return true;
    if (!/^\d{4}$/.test(v)) return false;
    var y = parseInt(v, 10);
    return y >= 1000 && y <= new Date().getFullYear();
  }

  // The intake contract takes years as integers or null, never as
  // strings: a blank field goes over the wire as null.
  function yearOrNull(v) {
    v = v.trim();
    return v === "" ? null : parseInt(v, 10);
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
        var b = document.getElementById("r-birth-year").value.trim();
        if (v.trim() !== "" && /^\d{4}$/.test(b)) {
          return parseInt(v, 10) >= parseInt(b, 10);
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
    submitBtn.textContent = "Adding...";
    fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then(function (res) {
        if (!res.ok) throw new Error("records " + res.status);
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
        errorNote.classList.add("show");
        errorNote.setAttribute("tabindex", "-1");
        errorNote.focus();
      })
      .then(function () {
        submitBtn.disabled = false;
        submitBtn.textContent = "Add this record";
      });
  });
})();
