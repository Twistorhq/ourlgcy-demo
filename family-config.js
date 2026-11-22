// Our LGCY family landing page: live configuration (TW-1154).
//
// This file is the single place the production signup endpoint is
// set, following the demo's data-file pattern (world-data.js,
// villagers-data.js): a dedicated file defines the window.LGCY_*
// global, loaded before the script that reads it.
//
// family.js reads window.LGCY_SIGNUP_ENDPOINT and falls back to ""
// (honest preview mode: validates, shows the preview receipt, stores
// nothing) when the global is unset or empty. Local dev can exercise
// that preview path by emptying the value below; family.js itself
// never changes.
window.LGCY_SIGNUP_ENDPOINT = "https://ourlgcy-intake.fly.dev/intake";
