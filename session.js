// Our LGCY session (TW-1284): the ONE place that decides who the
// visitor is and whether the site runs in demo mode or own mode.
//
// The identity is the signup email, held in sessionStorage under
// "lgcy-signup-email" (the key family.js has written since TW-1276
// and the TW-1282 gate reads). Signing up sets it; signing in from
// the profile page sets it after the backend confirms the email
// belongs to a real signup; signing out clears it.
//
// Mode rule (founder, Nov 22): identity present means the demo flag
// is OFF everywhere: the tree, the stories, and the community show
// the visitor's own content or an honest empty state, never the
// demo preview. No identity means the demo exactly as it has always
// been. Every page loads this file and asks here, so the pages
// cannot drift apart.
//
// The mode lands as a class on <body> the moment this file runs:
// "lgcy-own" or "lgcy-demo". CSS keys off it: [data-demo-only]
// elements stand down in own mode, [data-own-only] elements appear
// only in own mode. your-tree.js, profile.js, and world surfaces
// read the same helpers instead of re-deciding.
(function () {
  "use strict";

  var KEY = "lgcy-signup-email";

  function getEmail() {
    try {
      return window.sessionStorage.getItem(KEY) || "";
    } catch (e) {
      return "";
    }
  }

  function setEmail(email) {
    try {
      window.sessionStorage.setItem(KEY, email);
    } catch (e) {}
    applyMode();
  }

  function clearEmail() {
    try {
      window.sessionStorage.removeItem(KEY);
    } catch (e) {}
    applyMode();
  }

  function isSignedIn() {
    return getEmail() !== "";
  }

  function applyMode() {
    var own = isSignedIn();
    var body = document.body;
    if (body) {
      body.classList.toggle("lgcy-own", own);
      body.classList.toggle("lgcy-demo", !own);
    }
    return own;
  }

  // This file loads at the end of <body> on most pages, so the body
  // exists; on pages that load it from <head>, wait for the body.
  if (document.body) {
    applyMode();
  } else {
    document.addEventListener("DOMContentLoaded", applyMode);
  }

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function emailOk(v) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || "").trim());
  }

  window.LGCYSession = {
    getEmail: getEmail,
    setEmail: setEmail,
    clearEmail: clearEmail,
    isSignedIn: isSignedIn,
    applyMode: applyMode,
    esc: esc,
    emailOk: emailOk,
  };
})();
