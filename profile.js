// Our LGCY profile page (TW-1284): the corner door, made real.
//
// The top-right medallion on the tree page has always promised a
// member's own place; this page is that place. Three states:
//
//   Signed out: a sign-in panel. The visitor types the email they
//   signed up with; the backend confirms it belongs to a signup
//   (GET /profile, with the tree pack as the second witness), the
//   session takes the email exactly as the signup flow sets it,
//   and the profile opens. An email with no signup gets a plain
//   answer and the path to sign up, never a borrowed profile.
//
//   Signed in: their signup facts from /profile, their people
//   from /pack, and their uploads with links that open the files
//   back. The upload box is choose first, push second: picking a
//   file never sends anything; the Upload button does, with
//   progress, and the saved file joins the list on the spot.
//
//   Preview (no endpoints wired): the panels still render and
//   every action says plainly that nothing was stored.
//
// Contracts are Dre's, landed on TW-1284 and Rosa-approved:
// GET /profile?email= answers {ok, profile: {state, source,
// received_at, phone_masked, record_count, uploads: [...]}} and
// 404 {error: "no_profile"} for an email with no signup. POST
// /uploads?email= takes the file's raw bytes with the filename
// percent-encoded in X-Filename and answers {ok, upload: {...}};
// GET /uploads/{id}?email= serves the bytes back to the owner.
(function () {
  "use strict";

  var PROFILE_EP =
    (typeof window !== "undefined" && window.LGCY_PROFILE_ENDPOINT) || "";
  var PACK_EP =
    (typeof window !== "undefined" && window.LGCY_PACK_ENDPOINT) || "";
  var UPLOADS_EP =
    (typeof window !== "undefined" && window.LGCY_UPLOADS_ENDPOINT) || "";
  var S = window.LGCYSession;
  if (!S) return;
  var esc = S.esc;

  var signinPanel = document.getElementById("profile-signin");
  var mainPanel = document.getElementById("profile-main");
  var loading = document.getElementById("profile-loading");
  var signinForm = document.getElementById("signin-form");
  var signinBtn = document.getElementById("signin-submit");
  var signinNote = document.getElementById("signin-note");
  var emailEl = document.getElementById("s-email");
  var factsEl = document.getElementById("profile-facts");
  var peopleEl = document.getElementById("profile-people");
  var treeLine = document.getElementById("profile-tree-line");
  var signoutBtn = document.getElementById("signout-btn");
  var fileEl = document.getElementById("up-file");
  var sendBtn = document.getElementById("up-send");
  var fileLine = document.getElementById("up-file-line");
  var progress = document.getElementById("up-progress");
  var progressBar = document.getElementById("up-progress-bar");
  var upNote = document.getElementById("up-note");
  var uploadsList = document.getElementById("uploads-list");
  var uploadsEmpty = document.getElementById("uploads-empty");

  var MAX_BYTES = 10 * 1024 * 1024;
  // The welcome table (TW-1284; founder word Nov 23: any photo
  // format, from any device). Every image format a phone or a
  // computer hands over, the TW-1279 video formats, and the
  // papers. The original file is the record; the backend keeps
  // it untouched and makes a viewable copy of anything a
  // browser cannot open on its own. What is refused here is
  // only what is genuinely not a photo, a video, or a paper:
  // programs, archives, and kinds nobody can name.
  var OK_EXT = [
    "jpg", "jpeg", "png", "gif", "webp", "heic", "heif",
    "avif", "tif", "tiff", "bmp", "svg",
    "mp4", "mov", "webm", "m4v",
    "pdf", "txt", "md", "docx",
  ];
  // Photos a browser cannot show as saved: for these, the
  // list opens the backend's viewable copy (rendition_url)
  // when one rides along, and keeps the original one tap away.
  var NO_DISPLAY_EXT = ["heic", "heif", "tif", "tiff"];
  var picked = null;
  var currentEmail = "";

  function note(el, text, isError) {
    el.textContent = text;
    el.classList.toggle("error", !!isError);
    el.classList.toggle("show", text !== "");
  }

  function fmtSize(n) {
    if (n == null || isNaN(n)) return "";
    if (n < 1024) return n + " B";
    if (n < 1024 * 1024) return Math.round(n / 1024) + " KB";
    return (n / (1024 * 1024)).toFixed(1) + " MB";
  }

  function fmtDate(v) {
    if (!v) return "";
    var d = new Date(v);
    if (isNaN(d.getTime())) return String(v);
    return d.toLocaleDateString("en-US", {
      year: "numeric", month: "long", day: "numeric",
    });
  }

  function getJson(url) {
    return fetch(url, { headers: { Accept: "application/json" } }).then(
      function (res) {
        if (res.status === 404) return { __status: 404 };
        if (!res.ok) throw new Error("GET " + res.status);
        return res.json();
      }
    );
  }

  /* ---------- sign in ---------- */

  function showSignin(msg, isError) {
    loading.classList.remove("show");
    mainPanel.hidden = true;
    signinPanel.hidden = false;
    note(signinNote, msg || "", isError);
    if (emailEl && !emailEl.value) emailEl.value = S.getEmail();
  }

  function confirmIdentity(email) {
    // The profile endpoint is the authority; the pack is the
    // second witness for a member whose facts are not served yet.
    var byProfile = PROFILE_EP
      ? getJson(PROFILE_EP + "?email=" + encodeURIComponent(email))
      : Promise.resolve({ __status: 404 });
    return byProfile.then(function (prof) {
      // Dre's shape: {ok: true, profile: {...facts, uploads}}.
      if (prof && prof.__status !== 404 && prof.profile) {
        return { ok: true, profile: prof.profile };
      }
      if (!PACK_EP) return { ok: false };
      return getJson(PACK_EP + "?email=" + encodeURIComponent(email)).then(
        function (pack) {
          if (pack && pack.__status !== 404 && (pack.people || pack.root_person)) {
            return { ok: true, profile: null, pack: pack };
          }
          return { ok: false };
        }
      );
    });
  }

  signinForm.addEventListener("submit", function (e) {
    e.preventDefault();
    var email = emailEl.value.trim();
    var wrap = signinForm.querySelector('[data-field="email"]');
    var valid = S.emailOk(email);
    if (wrap) wrap.classList.toggle("invalid", !valid);
    emailEl.setAttribute("aria-invalid", valid ? "false" : "true");
    if (!valid) {
      emailEl.focus();
      return;
    }
    if (!PROFILE_EP && !PACK_EP) {
      note(
        signinNote,
        "Preview mode: no sign-in is wired here, so nothing was checked and nothing was stored.",
        false
      );
      return;
    }
    signinBtn.disabled = true;
    signinBtn.textContent = "Signing in...";
    note(signinNote, "", false);
    confirmIdentity(email)
      .then(function (r) {
        if (!r.ok) {
          note(
            signinNote,
            "We do not have a signup under that email yet. Check the spelling, or sign up first and come back with the same email.",
            true
          );
          return;
        }
        S.setEmail(email);
        openProfile(email, r.profile, r.pack);
      })
      .catch(function () {
        note(
          signinNote,
          "That sign-in did not go through. Check your connection and try again.",
          true
        );
      })
      .then(function () {
        signinBtn.disabled = false;
        signinBtn.textContent = "Sign in";
      });
  });

  /* ---------- the profile itself ---------- */

  function fact(label, value) {
    if (value == null || value === "") return "";
    return (
      '<div class="fact"><dt>' + esc(label) + "</dt><dd>" +
      esc(value) + "</dd></div>"
    );
  }

  function renderFacts(email, prof) {
    var html = fact("Email", email);
    if (prof) {
      // The backend serves the phone masked to its last two
      // digits, by design; the label says so, plainly.
      html += fact("Phone (masked)", prof.phone_masked);
      html += fact("State", prof.state);
      html += fact("Signed up", fmtDate(prof.received_at));
      if (prof.record_count != null) {
        html += fact(
          "Records on your tree",
          prof.record_count === 1
            ? "1 record"
            : prof.record_count + " records"
        );
      }
    }
    factsEl.innerHTML = html;
  }

  function personMeta(p, rootId) {
    if (p.id === rootId) return "Root of your tree";
    if (p.living || p.masked) return "Living, held private";
    if (p.born) return "b. " + p.born;
    return "Dates not yet on file";
  }

  function renderPeople(pack) {
    var people = (pack && pack.people) || [];
    if (!people.length) {
      treeLine.textContent =
        "Your tree is waiting for its first record. Add one person and they will stand here.";
      peopleEl.innerHTML = "";
      return;
    }
    var rootId = pack.root_person || pack.focus_person;
    treeLine.textContent =
      people.length === 1
        ? "One person stands on your tree so far."
        : people.length + " people stand on your tree so far.";
    peopleEl.innerHTML = people
      .map(function (p) {
        return (
          "<li><span class=\"pp-name\">" + esc(p.name) + "</span>" +
          '<span class="pp-meta">' + esc(personMeta(p, rootId)) + "</span></li>"
        );
      })
      .join("");
  }

  function resolveUrl(raw) {
    if (!raw) return "";
    try {
      return new URL(raw, UPLOADS_EP || window.location.href).href;
    } catch (e) {
      return raw;
    }
  }

  function renditionUrl(item) {
    // Dre's rendition field (TW-1284, founder word Nov 23): for
    // a photo the browser cannot open as saved (an iPhone HEIC,
    // a TIFF scan), the backend makes a viewable copy at upload
    // and its link rides the profile payload as rendition_url.
    // Optional by design: absent means the original opens as is.
    var raw = item.rendition_url || "";
    if (!raw && item.rendition) {
      raw =
        typeof item.rendition === "string"
          ? item.rendition
          : item.rendition.url || "";
    }
    // The backend serves a rendition only to the owning email:
    // GET /uploads/{id}?email=&view=rendition. The payload's
    // rendition_url carries the view but not the email, so the
    // caller's own email rides along here, the same way
    // uploadUrl builds the original's link. Without it the
    // download answers 422 and the viewable copy never opens
    // (Rosa Finding F1, TW-1284 formats gate).
    if (raw && currentEmail && raw.indexOf("email=") === -1) {
      raw +=
        (raw.indexOf("?") === -1 ? "?" : "&") +
        "email=" + encodeURIComponent(currentEmail);
    }
    return resolveUrl(raw);
  }

  function uploadUrl(item) {
    var raw = item.url || item.download_url || "";
    if (raw) return resolveUrl(raw);
    // Dre's recall route: GET /uploads/{id}?email= serves the
    // bytes back to the owning email alone, so the link is built
    // from the id and this visitor's own email.
    if (item.id != null && UPLOADS_EP && currentEmail) {
      return (
        UPLOADS_EP + "/" + encodeURIComponent(item.id) +
        "?email=" + encodeURIComponent(currentEmail)
      );
    }
    return "";
  }

  function uploadItem(item) {
    var name = item.filename || item.name || "Untitled file";
    var ext = (String(name).split(".").pop() || "").toLowerCase();
    var url = uploadUrl(item);
    var rend = renditionUrl(item);
    // A photo the browser cannot open as saved leads with its
    // viewable copy when the backend sent one; the original
    // stays one tap away, named plainly, because the original
    // is the record. Anything the browser opens on its own, and
    // any item with no rendition yet, links the original.
    var leadRend = !!rend && NO_DISPLAY_EXT.indexOf(ext) !== -1;
    var main = leadRend ? rend : url;
    var head = main
      ? '<a href="' + esc(main) + '" target="_blank" rel="noopener">' +
        esc(name) + "</a>"
      : "<span>" + esc(name) + "</span>";
    var orig = "";
    if (leadRend && url) {
      orig =
        ' <a href="' + esc(url) + '" target="_blank" rel="noopener">' +
        "Original file</a>";
    }
    var parts = [fmtSize(item.size), fmtDate(item.uploaded_at || item.created_at)];
    if (leadRend) parts.push("viewable copy");
    var meta = parts.filter(Boolean).join(" · ");
    return (
      "<li>" + head + orig +
      (meta ? '<span class="up-meta">' + esc(meta) + "</span>" : "") +
      "</li>"
    );
  }

  function renderUploads(items) {
    var list = items || [];
    uploadsList.innerHTML = list.map(uploadItem).join("");
    uploadsEmpty.style.display = list.length ? "none" : "";
  }

  function loadUploads(email, prof) {
    // The uploads list rides the profile response (Dre's shape);
    // there is no separate list route. When the profile facts did
    // not come along (the pack-witness path), ask /profile once
    // more for them; anything else is an honest empty list.
    if (prof && Array.isArray(prof.uploads)) {
      renderUploads(prof.uploads);
      return;
    }
    if (!PROFILE_EP) {
      renderUploads([]);
      return;
    }
    getJson(PROFILE_EP + "?email=" + encodeURIComponent(email))
      .then(function (r) {
        if (r && r.profile && Array.isArray(r.profile.uploads)) {
          renderUploads(r.profile.uploads);
        } else {
          renderUploads([]);
        }
      })
      .catch(function () {
        renderUploads([]);
      });
  }

  function openProfile(email, prof, packPre) {
    currentEmail = email;
    loading.classList.remove("show");
    signinPanel.hidden = true;
    mainPanel.hidden = false;
    renderFacts(email, prof || null);
    if (packPre) {
      renderPeople(packPre);
    } else if (PACK_EP) {
      getJson(PACK_EP + "?email=" + encodeURIComponent(email))
        .then(function (pack) {
          if (pack && pack.__status !== 404) renderPeople(pack);
          else renderPeople(null);
        })
        .catch(function () {
          treeLine.textContent =
            "Your tree could not be loaded just now. It is still yours; try again in a moment.";
        });
    } else {
      renderPeople(null);
    }
    loadUploads(email, prof || null);
  }

  signoutBtn.addEventListener("click", function () {
    S.clearEmail();
    picked = null;
    fileEl.value = "";
    sendBtn.disabled = true;
    showSignin("You are signed out on this device. Your tree and uploads stay right where you left them.", false);
  });

  /* ---------- upload: choose first, push second ---------- */

  function checkFile(file) {
    if (!file) return "No file chosen yet.";
    var ext = (file.name.split(".").pop() || "").toLowerCase();
    if (OK_EXT.indexOf(ext) === -1) {
      return (
        "That kind of file cannot go on the tree. Photos and videos " +
        "from any phone or computer are welcome, plus PDFs and " +
        "documents (TXT, MD, DOCX)."
      );
    }
    if (file.size > MAX_BYTES) {
      return (
        "That file is " + fmtSize(file.size) + ", and the limit here is " +
        "10 MB. A smaller copy will go up fine."
      );
    }
    return "";
  }

  fileEl.addEventListener("change", function () {
    var file = fileEl.files && fileEl.files[0];
    var problem = checkFile(file);
    if (!file) {
      picked = null;
      sendBtn.disabled = true;
      return;
    }
    if (problem) {
      picked = null;
      sendBtn.disabled = true;
      fileLine.textContent = file.name + " cannot be uploaded.";
      note(upNote, problem, true);
      return;
    }
    picked = file;
    note(upNote, "", false);
    fileLine.textContent =
      file.name + " (" + fmtSize(file.size) + "). Ready when you are: " +
      "nothing has been sent yet.";
    sendBtn.disabled = false;
  });

  sendBtn.addEventListener("click", function () {
    var email = S.getEmail();
    if (!picked || !email) return;
    if (!UPLOADS_EP) {
      note(
        upNote,
        "Preview mode: no upload is wired here, so the file stayed on your device and nothing was stored.",
        false
      );
      return;
    }
    var problem = checkFile(picked);
    if (problem) {
      note(upNote, problem, true);
      return;
    }
    sendBtn.disabled = true;
    sendBtn.textContent = "Uploading...";
    progress.hidden = false;
    progressBar.style.width = "0%";
    note(upNote, "", false);

    // Dre's contract (TW-1284): the file's raw bytes are the body,
    // the email rides the query string, and the filename rides the
    // X-Filename header, percent-encoded. XMLHttpRequest because
    // it carries upload progress; fetch cannot.
    var xhr = new XMLHttpRequest();
    xhr.open(
      "POST",
      UPLOADS_EP + "?email=" + encodeURIComponent(email)
    );
    xhr.setRequestHeader("Accept", "application/json");
    xhr.setRequestHeader("X-Filename", encodeURIComponent(picked.name));
    if (xhr.upload) {
      xhr.upload.addEventListener("progress", function (ev) {
        if (ev.lengthComputable) {
          progressBar.style.width =
            Math.round((ev.loaded / ev.total) * 100) + "%";
        }
      });
    }
    xhr.addEventListener("load", function () {
      progress.hidden = true;
      sendBtn.textContent = "Upload";
      if (xhr.status === 200 || xhr.status === 201) {
        var item = null;
        try {
          var body = JSON.parse(xhr.responseText);
          item = body && body.upload ? body.upload : body;
        } catch (e) {}
        if (item && (item.id != null || item.filename)) {
          var holder = document.createElement("div");
          holder.innerHTML = "<ul>" + uploadItem(item) + "</ul>";
          var node = holder.firstChild.firstChild;
          if (node) {
            uploadsList.insertBefore(node, uploadsList.firstChild);
            uploadsEmpty.style.display = "none";
          }
        } else {
          loadUploads(email, null);
        }
        note(
          upNote,
          "Saved: " + picked.name + ". It is on your profile now, and " +
            "you can open it here any time.",
          false
        );
        picked = null;
        fileEl.value = "";
        fileLine.textContent = "No file chosen yet.";
      } else {
        sendBtn.disabled = false;
        var msg =
          "That upload did not go through, and nothing was saved. " +
          "Check your connection and try again.";
        var errs = null;
        try {
          errs = JSON.parse(xhr.responseText).errors || null;
        } catch (e) {}
        if (xhr.status === 413) {
          msg = "That file is over the 10 MB limit. A smaller copy will go up fine.";
        } else if (errs && errs.email === "not signed up") {
          msg =
            "This device is not signed in with a signup email. " +
            "Sign in above, then upload again.";
        } else if (errs && errs.filename) {
          msg =
            "The tree could not take that file. Photos and videos from " +
            "any phone or computer are welcome, plus PDFs and " +
            "documents (TXT, MD, DOCX).";
        }
        note(upNote, msg, true);
      }
    });
    xhr.addEventListener("error", function () {
      progress.hidden = true;
      sendBtn.disabled = false;
      sendBtn.textContent = "Upload";
      note(
        upNote,
        "That upload did not go through, and nothing was saved. Check your connection and try again.",
        true
      );
    });
    xhr.send(picked);
  });

  /* ---------- open ---------- */

  var identity = S.getEmail();
  if (identity) {
    confirmIdentity(identity)
      .then(function (r) {
        if (r.ok) {
          openProfile(identity, r.profile, r.pack);
          return;
        }
        // Both witnesses rejected the stored email: there is no
        // signup behind it, so it opens nothing. Drop the stored
        // identity and land on the sign-in panel with the same
        // plain refusal the sign-in form gives. (TW-1284, Rosa
        // Finding 1.)
        S.clearEmail();
        showSignin(
          "We do not have a signup under that email yet. Check the spelling, or sign up first and come back with the same email.",
          true
        );
      })
      .catch(function () {
        // A network failure is not a rejection: neither witness
        // answered, so the profile opens on the stored identity
        // exactly as before.
        openProfile(identity, null, null);
      });
  } else {
    showSignin("", false);
  }
})();
