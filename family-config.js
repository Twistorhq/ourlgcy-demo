// Our LGCY live configuration (TW-1154, extended TW-1276).
//
// This file is the single place the production endpoints are set,
// following the demo's data-file pattern (world-data.js,
// villagers-data.js): a dedicated file defines the window.LGCY_*
// globals, loaded before the scripts that read them.
//
// family.js reads window.LGCY_SIGNUP_ENDPOINT and falls back to ""
// (honest preview mode: validates, shows the preview receipt, stores
// nothing) when the global is unset or empty. records.js reads
// window.LGCY_RECORDS_ENDPOINT the same way, and your-tree.js reads
// window.LGCY_PACK_ENDPOINT. kin-questions.js reads the two kin
// globals the same way: unset or empty, the kin layer stays inert
// and the Community world is exactly the world without it. Local
// dev can exercise the preview paths by emptying the values below;
// the consumers never change.
window.LGCY_SIGNUP_ENDPOINT = "https://ourlgcy-intake.fly.dev/intake";
window.LGCY_RECORDS_ENDPOINT = "https://ourlgcy-intake.fly.dev/records";
window.LGCY_PACK_ENDPOINT = "https://ourlgcy-intake.fly.dev/pack";
window.LGCY_KIN_QUESTIONS_ENDPOINT = "https://ourlgcy-intake.fly.dev/kin-questions";
window.LGCY_KIN_ANSWERS_ENDPOINT = "https://ourlgcy-intake.fly.dev/kin-answers";
