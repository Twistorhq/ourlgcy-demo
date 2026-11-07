// Our LGCY demo preview interactions.
// Home: the scroll journey (parallax oak, reveal choreography, era
// rail spine, Follow my line), the interactive animals, the rare
// dragonfly, branch collection panel, and the on-device upload mock.
// Sub pages: navigation, collection panel, upload mock, claim form.
// Everything here is a front end mock: nothing is uploaded, stored,
// or verified.

(function () {
  "use strict";
  document.body.classList.add("js");

  var REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var HOVERABLE = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

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

  // Branch collection panel (sample data, shown on card or chip tap)
  var BRANCHES = {
    family: {
      title: "The Shote family, the whole tree",
      count: 46,
      records: [
        ["Oldest related record", "c. 1810", "Public record (sample)"],
        ["Freedman's Bank register", "1871", "Public record (sample)"],
        ["Choctaw Freedmen enrollment card", "1902", "Public record (sample)"],
        ["Census household page", "1900", "Public record (sample)"],
        ["Family Bible page", "n.d.", "Family supplied (sample)"],
        ["Oral history audio", "2024", "Family supplied (sample)"]
      ]
    },
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
        chip.addEventListener("click", function (e) {
          if (e.target.closest && e.target.closest("a")) return;
          openBranch(chip.getAttribute("data-branch"), chip);
        });
        chip.addEventListener("keydown", function (e) {
          if (e.key === "Enter" || e.key === " ") {
            if (chip.tagName === "BUTTON" || chip.tagName === "A") return;
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

  /* ================= HOME: THE SCROLL JOURNEY ================= */
  var journey = document.querySelector(".journey");
  if (!journey) return;
  var bg = document.querySelector(".oak-bg");
  var sections = Array.prototype.slice.call(journey.querySelectorAll(".gen"));
  var railFill = document.getElementById("rail-fill");
  var railMarks = Array.prototype.slice.call(
    document.querySelectorAll(".rail-mark")
  );

  // Reveal choreography: each generation settles in as it arrives
  if ("IntersectionObserver" in window && !REDUCED) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) {
            en.target.classList.add("in");
            io.unobserve(en.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    sections.forEach(function (s) {
      io.observe(s);
    });
  } else {
    sections.forEach(function (s) {
      s.classList.add("in");
    });
  }

  /* The dragonfly: rare by design law.
     One appearance per SCROLLS_PER_DRAGONFLY scroll units. A scroll
     unit is one viewport height of accumulated travel in either
     direction, so descent and return trips both count. No special
     cases: the first appearance obeys the same math as every later
     one. Skipped entirely under prefers-reduced-motion. */
  var SCROLLS_PER_DRAGONFLY = 15;
  var scrollTravelPx = 0;
  var lastScrollY = window.scrollY;
  var dragonflyUnitsFired = 0;
  var dragonflyBusy = false;

  var dragonflyEl = document.createElement("div");
  dragonflyEl.className = "dragonfly";
  dragonflyEl.setAttribute("aria-hidden", "true");
  dragonflyEl.innerHTML =
    '<svg viewBox="0 0 100 64">' +
    '<ellipse cx="34" cy="22" rx="26" ry="8" fill="rgba(238,246,240,0.55)"/>' +
    '<ellipse cx="66" cy="22" rx="26" ry="8" fill="rgba(238,246,240,0.55)"/>' +
    '<ellipse cx="36" cy="38" rx="22" ry="7" fill="rgba(196,220,205,0.45)"/>' +
    '<ellipse cx="64" cy="38" rx="22" ry="7" fill="rgba(196,220,205,0.45)"/>' +
    '<path d="M50 12 C 48 26, 48 44, 50 60 C 52 44, 52 26, 50 12 Z" fill="#3d5a45"/>' +
    '<circle cx="50" cy="11" r="5.5" fill="#2f4636"/>' +
    "</svg>";
  document.body.appendChild(dragonflyEl);

  function showDragonfly() {
    if (REDUCED || dragonflyBusy) return;
    dragonflyBusy = true;
    var vh = window.innerHeight;
    var startY = vh * (0.16 + Math.random() * 0.2);
    var drift = (Math.random() * 2 - 1) * vh * 0.06;
    dragonflyEl.style.top = startY + "px";
    var anim = dragonflyEl.animate(
      [
        { transform: "translate(-110px, 0px)", opacity: 0 },
        {
          transform:
            "translate(" + window.innerWidth * 0.3 + "px, " + drift + "px)",
          opacity: 1,
          offset: 0.18
        },
        {
          transform:
            "translate(" +
            window.innerWidth * 0.68 +
            "px, " +
            drift * -0.6 +
            "px)",
          opacity: 1,
          offset: 0.8
        },
        {
          transform:
            "translate(" + (window.innerWidth + 110) + "px, " + drift + "px)",
          opacity: 0
        }
      ],
      { duration: 9500, easing: "ease-in-out" }
    );
    anim.onfinish = function () {
      dragonflyBusy = false;
    };
  }

  function maybeDragonfly() {
    var unit = window.innerHeight || 800;
    var units = Math.floor(scrollTravelPx / unit);
    if (units - dragonflyUnitsFired >= SCROLLS_PER_DRAGONFLY) {
      dragonflyUnitsFired = units;
      showDragonfly();
    }
  }

  // Scroll engine: parallax, rail spine, active era, dragonfly count
  var ticking = false;
  function onScroll() {
    var y = window.scrollY;
    scrollTravelPx += Math.abs(y - lastScrollY);
    lastScrollY = y;
    maybeDragonfly();

    // Reveal safety net: a section near the viewport is always shown,
    // even if IntersectionObserver timing was missed.
    var vhNet = window.innerHeight;
    sections.forEach(function (s) {
      if (s.classList.contains("in")) return;
      var r = s.getBoundingClientRect();
      if (r.top < vhNet * 0.92 && r.bottom > 0) s.classList.add("in");
    });

    var max = document.documentElement.scrollHeight - window.innerHeight;
    var progress = max > 0 ? Math.min(1, Math.max(0, y / max)) : 0;
    if (bg && !REDUCED) {
      bg.style.transform =
        "translate3d(0," + (-14 * progress).toFixed(2) + "vh,0)";
    }
    if (railFill) {
      railFill.style.transform = "scaleY(" + progress.toFixed(3) + ")";
    }

    var probe = window.innerHeight * 0.42;
    var current = sections[0];
    sections.forEach(function (s) {
      if (s.getBoundingClientRect().top <= probe) current = s;
    });
    railMarks.forEach(function (m) {
      m.classList.toggle("active", m.getAttribute("data-target") === current.id);
    });
    ticking = false;
  }
  window.addEventListener(
    "scroll",
    function () {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(onScroll);
      }
    },
    { passive: true }
  );
  onScroll();

  // Follow my line: light the focus person's direct line, dim the rest
  var LINE_IDS = ["amos", "celia", "moses", "booker", "cleveland", "jordan", "xavier"];
  var followBtn = document.getElementById("follow-line");
  if (followBtn) {
    var lineEls = LINE_IDS.map(function (id) {
      return document.getElementById("p-" + id);
    }).filter(Boolean);
    var plaque = document.querySelector(".root-plaque");
    followBtn.addEventListener("click", function () {
      var on = journey.classList.toggle("line-on");
      followBtn.setAttribute("aria-pressed", on ? "true" : "false");
      lineEls.forEach(function (el) {
        el.classList.toggle("in-line", on);
      });
      if (plaque) plaque.classList.toggle("in-line", on);
      if (on) {
        var focus = document.getElementById("p-jordan");
        if (focus) {
          focus.scrollIntoView({
            behavior: REDUCED ? "auto" : "smooth",
            block: "center"
          });
        }
      }
    });
  }

  // Sound: the owl's hoot, source and license logged in the README
  var soundOn = true;
  var hootAudio = new Audio("assets/sounds/owl-hoot.mp3");
  hootAudio.preload = "auto";
  function playHoot() {
    if (!soundOn) return;
    try {
      hootAudio.currentTime = 0;
      var p = hootAudio.play();
      if (p && p.catch) p.catch(function () {});
    } catch (err) {
      /* Audio is a garnish; a blocked play() never breaks the page. */
    }
  }
  var soundToggle = document.getElementById("sound-toggle");
  if (soundToggle) {
    soundToggle.addEventListener("click", function () {
      soundOn = !soundOn;
      soundToggle.setAttribute("aria-pressed", soundOn ? "true" : "false");
      soundToggle.querySelector(".snd-on").style.display = soundOn ? "" : "none";
      soundToggle.querySelector(".snd-off").style.display = soundOn ? "none" : "";
      if (!soundOn) hootAudio.pause();
    });
  }

  // Falling acorns
  var ACORN_SVG = '<svg aria-hidden="true"><use href="#acorn"/></svg>';
  function dropAcorns(fromEl, count) {
    if (!fromEl) return;
    var rect = fromEl.getBoundingClientRect();
    for (var i = 0; i < count; i++) {
      (function (i) {
        var s = document.createElement("span");
        s.className = "acorn-fall";
        s.setAttribute("aria-hidden", "true");
        s.innerHTML = ACORN_SVG;
        s.style.left =
          rect.left + rect.width / 2 + (Math.random() * 32 - 16) + "px";
        s.style.top = rect.bottom - 8 + "px";
        document.body.appendChild(s);
        if (REDUCED) {
          var fade = s.animate(
            [{ opacity: 0 }, { opacity: 1 }, { opacity: 0 }],
            { duration: 900, delay: i * 90 }
          );
          fade.onfinish = function () {
            s.remove();
          };
          return;
        }
        var fallDist = 150 + Math.random() * 170;
        var drift = Math.random() * 36 - 18;
        var rot = Math.random() * 80 - 40;
        var anim = s.animate(
          [
            { transform: "translate(0,0) rotate(0deg)", opacity: 1 },
            {
              transform:
                "translate(" +
                drift * 0.4 +
                "px," +
                fallDist * 0.78 +
                "px) rotate(" +
                rot * 0.6 +
                "deg)",
              opacity: 1,
              offset: 0.78
            },
            {
              transform:
                "translate(" +
                drift * 0.6 +
                "px," +
                (fallDist - 13) +
                "px) rotate(" +
                rot * 0.8 +
                "deg)",
              opacity: 1,
              offset: 0.88
            },
            {
              transform:
                "translate(" +
                drift +
                "px," +
                fallDist +
                "px) rotate(" +
                rot +
                "deg)",
              opacity: 0
            }
          ],
          {
            duration: 620 + fallDist * 1.15,
            delay: i * 70,
            easing: "cubic-bezier(0.5,0.05,0.7,0.4)"
          }
        );
        anim.onfinish = function () {
          s.remove();
        };
      })(i);
    }
  }
  function nearestAcorns(el) {
    var sec = el.closest(".gen");
    if (sec) {
      var own = sec.querySelector("[data-acorns]");
      if (own) return own;
    }
    var clusters = Array.prototype.slice.call(
      document.querySelectorAll("[data-acorns]")
    );
    if (!clusters.length) return null;
    var r = el.getBoundingClientRect();
    var best = clusters[0];
    var bestD = Infinity;
    clusters.forEach(function (c) {
      var cr = c.getBoundingClientRect();
      var d = Math.abs(cr.top - r.top);
      if (d < bestD) {
        bestD = d;
        best = c;
      }
    });
    return best;
  }

  // The resident animals: frequent and interactive.
  // Named performers, one per animal, so the wiring is inspectable.
  function markBusy(el, ms) {
    el.dataset.busy = "1";
    window.setTimeout(function () {
      delete el.dataset.busy;
    }, ms);
  }
  function gentleFade(el) {
    el.animate([{ opacity: 1 }, { opacity: 0.35 }, { opacity: 1 }], {
      duration: 650
    });
  }

  function performOwl(el) {
    if (el.dataset.busy) return;
    markBusy(el, 1900);
    playHoot();
    if (REDUCED) return;
    el.classList.add("hooting");
    window.setTimeout(function () {
      el.classList.remove("hooting");
    }, 1700);
    window.setTimeout(function () {
      dropAcorns(nearestAcorns(el), 1);
    }, 550);
  }

  function performSquirrel(el) {
    if (el.dataset.busy) return;
    if (REDUCED) {
      gentleFade(el);
      return;
    }
    markBusy(el, 1200);
    el.classList.toggle("at-b");
    el.classList.add("running");
    window.setTimeout(function () {
      el.classList.remove("running");
      dropAcorns(nearestAcorns(el), 1);
    }, 1020);
  }

  function performWoodpecker(el) {
    if (el.dataset.busy || REDUCED) return;
    markBusy(el, 1400);
    el.classList.add("pecking");
    window.setTimeout(function () {
      el.classList.remove("pecking");
    }, 1250);
  }

  function performJay(el) {
    if (el.dataset.busy) return;
    if (REDUCED) {
      gentleFade(el);
      return;
    }
    markBusy(el, 1600);
    var cs = window.getComputedStyle(el);
    var dx = parseFloat(cs.getPropertyValue("--fly-x")) || -240;
    var dy = parseFloat(cs.getPropertyValue("--fly-y")) || 24;
    var out = el.dataset.perch !== "b";
    var from = out
      ? "translate(0px,0px)"
      : "translate(" + dx + "px," + dy + "px)";
    var mid =
      "translate(" +
      dx * 0.55 +
      "px," +
      (dy - 52) +
      "px) rotate(" +
      (out ? -3 : 3) +
      "deg)";
    var to = out
      ? "translate(" + dx + "px," + dy + "px)"
      : "translate(0px,0px)";
    el.classList.add("flying");
    var anim = el.animate(
      [{ transform: from }, { transform: mid, offset: 0.55 }, { transform: to }],
      { duration: 1400, easing: "cubic-bezier(0.4,0.05,0.3,1)", fill: "forwards" }
    );
    anim.onfinish = function () {
      el.dataset.perch = out ? "b" : "a";
      el.classList.remove("flying");
    };
  }

  function performDeer(el) {
    if (el.dataset.busy || REDUCED) return;
    markBusy(el, 2500);
    el.classList.add("alert");
    window.setTimeout(function () {
      el.classList.remove("alert");
    }, 2350);
  }

  var PERFORMERS = {
    owl: performOwl,
    squirrel: performSquirrel,
    woodpecker: performWoodpecker,
    jay: performJay,
    deer: performDeer
  };
  document.querySelectorAll("[data-critter]").forEach(function (el) {
    var fn = PERFORMERS[el.getAttribute("data-critter")];
    if (!fn) return;
    el.addEventListener("click", function () {
      fn(el);
    });
    el.addEventListener("focus", function () {
      fn(el);
    });
    if (HOVERABLE) {
      el.addEventListener("mouseenter", function () {
        fn(el);
      });
    }
  });
  document.querySelectorAll("[data-acorns]").forEach(function (el) {
    function drop() {
      dropAcorns(el, 3 + Math.floor(Math.random() * 3));
    }
    el.addEventListener("click", drop);
    el.addEventListener("focus", drop);
    if (HOVERABLE) el.addEventListener("mouseenter", drop);
  });
})();
