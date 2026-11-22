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

  var FIELDS = {
    email: {
      el: document.getElementById("r-email"),
      ok: function (v) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
      },
    },
    person_name: {
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
    source: {
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

    var payload = {
      email: FIELDS.email.el.value.trim(),
      person_name: FIELDS.person_name.el.value.trim(),
      relation: FIELDS.relation.el.value,
      birth_year: FIELDS.birth_year.el.value.trim(),
      birth_place: PLAIN.birth_place.value.trim(),
      death_year: FIELDS.death_year.el.value.trim(),
      death_place: PLAIN.death_place.value.trim(),
      source: FIELDS.source.el.value,
      notes: PLAIN.notes.value.trim(),
      submitted_at: new Date().toISOString(),
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
        added += 1;
        successTitle.textContent = "Added: " + payload.person_name + ".";
        successBody.textContent =
          "That record is on your tree now. Add the next person whenever you are ready.";
        countLine.textContent =
          added === 1
            ? "1 record added in this visit."
            : added + " records added in this visit.";
        successNote.classList.add("show");
        // Keep the email and the rhythm; clear the person fields.
        ["person_name", "relation", "birth_year", "death_year", "source"].forEach(
          function (key) {
            FIELDS[key].el.value = "";
            mark(key, true);
          }
        );
        PLAIN.birth_place.value = "";
        PLAIN.death_place.value = "";
        PLAIN.notes.value = "";
        FIELDS.person_name.el.focus();
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
