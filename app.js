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

  // Home page: start the tree scrolled to the trunk on narrow screens
  var scroller = document.querySelector(".tree-scroll");
  if (scroller) {
    scroller.scrollLeft = Math.max(
      0,
      (scroller.scrollWidth - scroller.clientWidth) / 2
    );
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
      status.textContent = files.length + " file(s) held here. Nothing sent (demo).";
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

  // Home page: branch collection panel (sample data, shown on chip tap)
  var BRANCHES = {
    ruth: {
      title: "Ruth Shote branch",
      count: 14,
      records: [
        ["Dawes enrollment card", "1902", "Public record (sample)"],
        ["Census household page", "1900", "Public record (sample)"],
        ["Baptism record", "1888", "Church record (sample)"],
        ["Family photograph", "c. 1911", "Family supplied (sample)"],
        ["Funeral program", "1944", "Family supplied (sample)"],
        ["Marriage license", "1893", "Public record (sample)"]
      ]
    },
    henry: {
      title: "Henry Shote branch",
      count: 11,
      records: [
        ["Land allotment jacket", "1903", "Public record (sample)"],
        ["Census household page", "1910", "Public record (sample)"],
        ["Draft registration card", "1917", "Public record (sample)"],
        ["Obituary clipping", "1957", "Newspaper (sample)"],
        ["Family photograph", "c. 1926", "Family supplied (sample)"]
      ]
    },
    della: {
      title: "Della Shote branch",
      count: 9,
      records: [
        ["Indian census roll entry", "1896", "Public record (sample)"],
        ["Marriage record", "1889", "Church record (sample)"],
        ["Family Bible page", "n.d.", "Family supplied (sample)"],
        ["Census household page", "1920", "Public record (sample)"],
        ["Oral history audio", "2024", "Family supplied (sample)"]
      ]
    },
    moses: {
      title: "Moses Shote branch",
      count: 12,
      records: [
        ["Freedman's Bank register", "1871", "Public record (sample)"],
        ["Census household page", "1880", "Public record (sample)"],
        ["Lodge membership notice", "1908", "Newspaper (sample)"],
        ["Death certificate", "1939", "Public record (sample)"],
        ["Family photograph", "c. 1902", "Family supplied (sample)"],
        ["Church anniversary program", "1963", "Family supplied (sample)"]
      ]
    }
  };

  var panel = document.getElementById("collection-panel");
  var cpTitle = document.getElementById("cp-title");
  var cpCount = document.getElementById("cp-count");
  var cpList = document.getElementById("cp-list");
  var cpClose = document.getElementById("cp-close");
  var lastChip = null;

  function openBranch(id, chip) {
    var data = BRANCHES[id];
    if (!data || !panel) return;
    lastChip = chip || null;
    cpTitle.textContent = data.title;
    cpCount.textContent =
      data.count + " records in this branch collection (sample).";
    cpList.innerHTML = "";
    data.records.forEach(function (rec) {
      var li = document.createElement("li");
      var name = document.createElement("span");
      name.textContent = rec[0];
      var meta = document.createElement("span");
      meta.className = "meta";
      meta.textContent = rec[1] + " \u00B7 " + rec[2];
      li.appendChild(name);
      li.appendChild(meta);
      cpList.appendChild(li);
    });
    panel.hidden = false;
    if (cpClose) cpClose.focus();
  }

  function closeBranch() {
    if (!panel) return;
    panel.hidden = true;
    if (lastChip) lastChip.focus();
  }

  if (panel) {
    Array.prototype.forEach.call(
      document.querySelectorAll("[data-branch]"),
      function (chip) {
        chip.addEventListener("click", function () {
          openBranch(chip.getAttribute("data-branch"), chip);
        });
        chip.addEventListener("keydown", function (e) {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openBranch(chip.getAttribute("data-branch"), chip);
          }
        });
      }
    );
    if (cpClose) cpClose.addEventListener("click", closeBranch);
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !panel.hidden) closeBranch();
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
