// Our LGCY kin questions (TW-1278): the clickable cousin
// questions in the Community world. The matching layer on the
// intake service compares records across trees and, where it
// finds a candidate, hands this layer a question. A Community
// townsperson asks it, in the world's own speech law: the world
// (world.js) owns the timing and the pause, proximity-triggered,
// never ambient; this layer owns the words and the answers.
//
// The contract (posted on TW-1278 before this proof, so the two
// lanes cannot drift): GET /kin-questions?email= returns the
// visitor's pending questions, each
//   { id, phrase, subject_name, candidate_relation }
// plus, when a documented ancestor frames the question, an
//   ancestor: { id, name, relation }
// whose relation is a sentence fragment completing
// "I was ___ <subject_name>." (married to / cousins with /
// related to). With a frame, the bubble speaks first person:
// "I believe you are related to <subject>. I was <relation>
// <subject>." Without one, the neutral phrase stands. Every name
// in a question comes from real submitted records or documented
// archives; this layer invents no one, it only renders.
//
// Answers are family testimony, labeled unconfirmed, never fact:
// the line under the answers says so on the page. A tap on a
// relation is a yes, and a yes earns the payoff step: the
// townsperson offers a meeting in Social, "Set it up" or
// "Not now". The meeting interest rides in the SAME post as the
// answer, POST /kin-answers:
//   { question_id, answer, relation, meeting? }
// answer is related / not_related / not_sure; relation is the
// tapped relation or null; meeting (true / false) rides only on
// a related answer. Nothing is sent until the step resolves, so
// walking away mid-offer saves nothing, and a failed post says
// so plainly and keeps the question open.
//
// Email context is the records flow's own: the ?email= parameter
// or the signup email in session storage. No context, no
// endpoints, no townspeople, or no questions: the layer stays
// inert and the world is exactly the world without it.
(function () {
  "use strict";

  var stage = document.getElementById("world-stage");
  var kinEl = document.getElementById("world-kin");
  var qEl = document.getElementById("world-kin-q");
  var answersEl = document.getElementById("world-kin-answers");
  var errorEl = document.getElementById("world-kin-error");
  if (!stage || !kinEl || !qEl || !answersEl || !errorEl) return;

  var QUESTIONS_ENDPOINT =
    (typeof window !== "undefined" && window.LGCY_KIN_QUESTIONS_ENDPOINT) || "";
  var ANSWERS_ENDPOINT =
    (typeof window !== "undefined" && window.LGCY_KIN_ANSWERS_ENDPOINT) || "";
  if (!QUESTIONS_ENDPOINT || !ANSWERS_ENDPOINT) return;

  var email = "";
  var params = new URLSearchParams(window.location.search);
  if (params.get("email")) email = params.get("email").trim();
  if (!email) {
    try {
      email = window.sessionStorage.getItem("lgcy-signup-email") || "";
    } catch (e) {}
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;

  var RELATIONS = [
    ["cousin", "Cousin"],
    ["aunt", "Aunt"],
    ["uncle", "Uncle"],
    ["nephew", "Nephew"],
    ["niece", "Niece"],
    ["brother", "Brother"],
    ["sister", "Sister"],
    ["other", "Other family"],
  ];

  var questions = [];
  var rosterIds = (window.LGCY_WORLD_PEOPLE || []).map(function (p) {
    return p.id;
  });
  var rosterByName = {};
  (window.LGCY_WORLD_PEOPLE || []).forEach(function (p) {
    rosterByName[p.name] = p.id;
  });
  var qi = 0; // the question at the head of the queue
  var si = 0; // speaker rotation through the roster
  var openQuestion = null; // the question on screen right now
  var pendingRelation = null; // a yes waiting on the meeting step
  var sending = false;

  // The asking figure for a question: a framed question is asked
  // by its own ancestor where she walks this world; anything else
  // rotates through the townspeople in roster order.
  function speakerFor(q) {
    if (q.ancestor) {
      if (rosterIds.indexOf(q.ancestor.id) !== -1) return q.ancestor.id;
      if (q.ancestor.name && rosterByName[q.ancestor.name]) {
        return rosterByName[q.ancestor.name];
      }
    }
    return rosterIds[si % rosterIds.length];
  }

  // The ancestor speaks first person from her documented relation
  // to the subject; no frame, and the neutral phrase stands.
  function questionText(q) {
    if (q.ancestor && q.ancestor.relation && q.subject_name) {
      var rel = String(q.ancestor.relation).trim().replace(/\.$/, "");
      return (
        "I believe you are related to " + q.subject_name +
        ". I was " + rel + " " + q.subject_name + "."
      );
    }
    if (q.phrase) return q.phrase;
    if (q.subject_name) return "Are you related to " + q.subject_name + "?";
    return "Are you related to this person?";
  }

  function makeButton(label, quiet, onClick) {
    var b = document.createElement("button");
    b.type = "button";
    b.textContent = label;
    if (quiet) b.className = "kin-quiet";
    b.addEventListener("click", onClick);
    return b;
  }

  function setButtonsEnabled(on) {
    var btns = answersEl.querySelectorAll("button");
    for (var i = 0; i < btns.length; i++) btns[i].disabled = !on;
  }

  function showError(msg) {
    errorEl.textContent = msg;
    errorEl.hidden = !msg;
  }

  function renderAsk() {
    var q = openQuestion;
    if (!q) return;
    pendingRelation = null;
    showError("");
    qEl.textContent = questionText(q);
    answersEl.innerHTML = "";
    RELATIONS.forEach(function (pair) {
      answersEl.appendChild(
        makeButton(pair[1], false, function () {
          renderOffer(pair[0]);
        })
      );
    });
    answersEl.appendChild(
      makeButton("Not related", false, function () {
        submit({ answer: "not_related", relation: null });
      })
    );
    answersEl.appendChild(
      makeButton("Not sure", false, function () {
        submit({ answer: "not_sure", relation: null });
      })
    );
  }

  // The payoff step on a yes: an offered introduction, stated
  // plainly. The meeting happens only when both sides say yes;
  // this tap records the visitor's interest, nothing more. The
  // answer itself is not sent until this step resolves.
  function renderOffer(relation) {
    pendingRelation = relation;
    showError("");
    qEl.textContent =
      "Want me to set up a meeting in Social so you all can meet? " +
      "A meeting is only set up when both sides say yes.";
    answersEl.innerHTML = "";
    answersEl.appendChild(
      makeButton("Set it up", false, function () {
        submit({ answer: "related", relation: pendingRelation, meeting: true });
      })
    );
    answersEl.appendChild(
      makeButton("Not now", false, function () {
        submit({ answer: "related", relation: pendingRelation, meeting: false });
      })
    );
    answersEl.appendChild(
      makeButton("Choose a different answer", true, function () {
        renderAsk();
      })
    );
  }

  function submit(payload) {
    if (sending || !openQuestion) return;
    sending = true;
    setButtonsEnabled(false);
    showError("");
    var body = { question_id: openQuestion.id };
    Object.keys(payload).forEach(function (k) {
      body[k] = payload[k];
    });
    fetch(ANSWERS_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
      .then(function (res) {
        if (!res.ok) throw new Error("kin-answers " + res.status);
        // Saved. Advance the queue and let the world close the
        // bubble and walk the townsperson on.
        qi += 1;
        si += 1;
        openQuestion = null;
        pendingRelation = null;
        stage.dispatchEvent(new CustomEvent("lgcy-kin-done"));
      })
      .catch(function () {
        // Nothing was saved, and the bubble says so. The buttons
        // come back so the visitor can tap again; walking away
        // leaves the question for another meeting.
        showError(
          "That answer did not go through, and nothing was saved. " +
            "Tap again, or walk away and the question will wait."
        );
        setButtonsEnabled(true);
      })
      .then(function () {
        sending = false;
      });
  }

  stage.addEventListener("lgcy-kin-open", function (e) {
    openQuestion = e.detail && e.detail.question ? e.detail.question : null;
    if (openQuestion) renderAsk();
  });
  stage.addEventListener("lgcy-kin-dismiss", function () {
    // Set aside unanswered: the head of the queue does not move,
    // so the question can be asked again at the next meeting.
    openQuestion = null;
    pendingRelation = null;
    showError("");
  });

  fetch(QUESTIONS_ENDPOINT + "?email=" + encodeURIComponent(email), {
    headers: { Accept: "application/json" },
  })
    .then(function (res) {
      if (!res.ok) throw new Error("kin-questions " + res.status);
      return res.json();
    })
    .then(function (data) {
      var list = Array.isArray(data) ? data : data && data.questions;
      if (!Array.isArray(list)) return;
      questions = list.filter(function (q) {
        return q && q.id != null && (q.phrase || q.subject_name);
      });
      // Nobody to ask through, nobody asked: without townspeople
      // in the world the questions wait for a populated world.
      if (!questions.length || !rosterIds.length) return;
      window.__lgcyKinBridge = {
        current: function () {
          if (qi >= questions.length) return null;
          var q = questions[qi];
          return { question: q, speakerId: speakerFor(q) };
        },
      };
    })
    .catch(function () {
      // No questions came back; the world is the world. Nothing
      // was promised and nothing is pretended here.
    });
})();
