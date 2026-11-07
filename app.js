// Our LGCY demo preview. Small progressive enhancements only.
// No data leaves the device. There is no backend in this preview.

(function () {
  "use strict";

  // Mobile navigation toggle
  var toggle = document.querySelector("[data-nav-toggle]");
  var nav = document.getElementById("main-nav");
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }

  // Upload mock: list chosen or dropped file names, upload nothing
  var dz = document.getElementById("dropzone");
  var input = document.getElementById("file-input");
  var list = document.getElementById("file-list");
  var status = document.getElementById("dz-status");

  function showFiles(files) {
    if (!list || !files || files.length === 0) return;
    list.innerHTML = "";
    Array.prototype.forEach.call(files, function (f) {
      var li = document.createElement("li");
      li.textContent = f.name + "  (held on this device only, demo)";
      list.appendChild(li);
    });
    if (status) {
      status.textContent =
        files.length +
        " file(s) ready in the preview. In the full app, the engine would now read, sort, and match them.";
    }
  }

  if (dz && input) {
    dz.addEventListener("click", function (e) {
      if (e.target !== input) input.click();
    });
    dz.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        input.click();
      }
    });
    input.addEventListener("change", function () {
      showFiles(input.files);
    });
    ["dragenter", "dragover"].forEach(function (evt) {
      dz.addEventListener(evt, function (e) {
        e.preventDefault();
        dz.classList.add("drag");
      });
    });
    ["dragleave", "drop"].forEach(function (evt) {
      dz.addEventListener(evt, function (e) {
        e.preventDefault();
        dz.classList.remove("drag");
      });
    });
    dz.addEventListener("drop", function (e) {
      if (e.dataTransfer) showFiles(e.dataTransfer.files);
    });
  }

  // Reference Center mock: show the sample receipt, send nothing
  var form = document.getElementById("claim-form");
  var note = document.getElementById("claim-note");
  if (form && note) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      note.classList.add("show");
      note.setAttribute("tabindex", "-1");
      note.focus();
    });
  }
})();
