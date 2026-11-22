// Our LGCY family landing page (TW-1153): the family list sign up.
//
// STORE OF RECORD: the family's private list, held in Twistor Core.
// Submissions are PII. They are never rendered back on any public
// surface and never sold. The Core intake route (Dre, follow-on
// ticket) appends each submission to the private store only, with
// contact fields hashed at ingestion per the medallion doctrine.
//
// GO-LIVE WIRING (TW-1154, done): the live intake URL is set in
// family-config.js as window.LGCY_SIGNUP_ENDPOINT (POST, JSON,
// expects a 2xx response) and read below. When the global is unset
// or empty this page runs in honest preview mode: it validates for
// real, then shows the preview receipt and stores nothing, exactly
// like the Reference Center claim form.
// A submit never pretends to save what it did not save: if the POST
// fails, the visitor keeps their answers and gets an email fallback.
(function () {
  "use strict";

  var ENDPOINT =
    (typeof window !== "undefined" && window.LGCY_SIGNUP_ENDPOINT) || "";

  var form = document.getElementById("family-form");
  if (!form) return;
  var submitBtn = document.getElementById("family-submit");
  var previewNote = document.getElementById("family-preview-note");
  var errorNote = document.getElementById("family-error-note");
  var thanks = document.getElementById("family-thanks");
  var mailto = document.getElementById("family-mailto");

  var FIELDS = {
    email: {
      el: document.getElementById("f-email"),
      ok: function (v) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
      },
    },
    phone: {
      el: document.getElementById("f-phone"),
      ok: function (v) {
        var digits = v.replace(/\D/g, "");
        return digits.length >= 7 && digits.length <= 15;
      },
    },
    state: {
      el: document.getElementById("f-state"),
      ok: function (v) {
        return v !== "";
      },
    },
  };

  function mark(key, valid) {
    var wrap = form.querySelector('[data-field="' + key + '"]');
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

  function values() {
    var out = {};
    Object.keys(FIELDS).forEach(function (key) {
      out[key] = FIELDS[key].el.value.trim();
    });
    return out;
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    errorNote.classList.remove("show");
    previewNote.classList.remove("show");

    var firstBad = null;
    Object.keys(FIELDS).forEach(function (key) {
      var valid = mark(key, FIELDS[key].ok(FIELDS[key].el.value));
      if (!valid && !firstBad) firstBad = FIELDS[key].el;
    });
    if (firstBad) {
      firstBad.focus();
      return;
    }

    var payload = values();
    payload.source = "ourlgcy-family-landing";
    payload.submitted_at = new Date().toISOString();

    // Preview mode: no endpoint wired yet. Validate, receipt, store nothing.
    if (!ENDPOINT) {
      previewNote.classList.add("show");
      previewNote.setAttribute("tabindex", "-1");
      previewNote.focus();
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Sending...";
    fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then(function (res) {
        if (!res.ok) throw new Error("intake " + res.status);
        // TW-1276: hand the email to the records flow below, so
        // starting a tree does not ask for it twice.
        try {
          window.sessionStorage.setItem("lgcy-signup-email", payload.email);
        } catch (err) {}
        var recEmail = document.getElementById("r-email");
        if (recEmail && !recEmail.value) recEmail.value = payload.email;
        form.hidden = true;
        thanks.hidden = false;
        thanks.classList.add("show");
        var h = thanks.querySelector("h2");
        if (h) {
          h.setAttribute("tabindex", "-1");
          h.focus();
        }
      })
      .catch(function () {
        // Nothing was saved. Say so, keep the answers, offer email.
        var body =
          "Email: " + payload.email +
          "\nPhone: " + payload.phone +
          "\nState: " + payload.state;
        mailto.href =
          "mailto:holla@twistor.co?subject=" +
          encodeURIComponent("Our LGCY family list") +
          "&body=" +
          encodeURIComponent(body);
        errorNote.classList.add("show");
        errorNote.setAttribute("tabindex", "-1");
        errorNote.focus();
      })
      .then(function () {
        submitBtn.disabled = false;
        submitBtn.textContent = "Add me to the family list";
      });
  });
})();
