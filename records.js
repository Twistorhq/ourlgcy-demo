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

  // TW-1282 signup gate: no identity, no entry. Identity is the
  // completed signup: the sessionStorage key family.js sets, or the
  // in-page unlock family.js performs the moment a signup succeeds
  // (which also covers a browser that refused the storage write).
  // The form itself is already hidden from first paint by the
  // lgcy-gate-locked class (family.html head script, styles.css);
  // what lives here is the routing: send the visitor to the signup
  // form, say why, and never let a submit post without identity.
  var GATE_KEY = "lgcy-signup-email";
  function sessionEmail() {
    try {
      return window.sessionStorage.getItem(GATE_KEY) || "";
    } catch (e) {
      return "";
    }
  }
  function hasIdentity() {
    if (sessionEmail()) return true;
    return !!(window.LGCY_GATE && window.LGCY_GATE.unlockedBySignup);
  }
  function routeToSignup() {
    var why = document.getElementById("gate-why");
    if (why) why.hidden = false;
    var emailField = document.getElementById("f-email");
    if (emailField) {
      emailField.focus();
    } else {
      var signupForm = document.getElementById("family-form");
      if (signupForm) signupForm.scrollIntoView();
    }
  }

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

  // TW-1282: arriving aimed at the records flow (the #start-tree
  // anchor) with no identity routes to the signup form immediately.
  if (!hasIdentity() && window.location.hash === "#start-tree") {
    routeToSignup();
    // The browser's own fragment jump can settle after this script
    // runs and drop the focus it just took; re-assert the route when
    // the load completes. The records form was never usable in the
    // interval (display:none from first paint), so this only settles
    // where the visitor lands, never what they could touch.
    window.addEventListener("load", function () {
      if (!hasIdentity()) routeToSignup();
    });
  }
  // Any control that opens the records flow routes instead while
  // locked, and the gate note's own button routes with the why line.
  document.addEventListener("click", function (e) {
    var t = e.target;
    if (!t || typeof t.closest !== "function") return;
    if (t.closest("#gate-to-signup")) {
      e.preventDefault();
      routeToSignup();
      return;
    }
    if (!hasIdentity() && t.closest('a[href="#start-tree"]')) {
      e.preventDefault();
      routeToSignup();
    }
  });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    // TW-1282: a submit attempted without identity routes to the
    // signup form instead of posting, whatever state the page is in.
    if (!hasIdentity()) {
      routeToSignup();
      return;
    }
    // With identity, the record is entered under the session
    // identity: the key on the wire is the signup email.
    var identity = sessionEmail();
    if (identity) FIELDS.email.el.value = identity;
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
