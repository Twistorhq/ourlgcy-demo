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
// window.LGCY_PACK_ENDPOINT. Local dev can exercise the preview
// paths by emptying the values below; the consumers never change.
window.LGCY_SIGNUP_ENDPOINT = "https://ourlgcy-intake.fly.dev/intake";
window.LGCY_RECORDS_ENDPOINT = "https://ourlgcy-intake.fly.dev/records";
window.LGCY_PACK_ENDPOINT = "https://ourlgcy-intake.fly.dev/pack";
// TW-1284: the profile page reads window.LGCY_PROFILE_ENDPOINT for
// the visitor's own signup facts and signs them in against it, and
// window.LGCY_UPLOADS_ENDPOINT for the upload push and the recall
// list. Same fallback rule as the others: unset means preview mode.
window.LGCY_PROFILE_ENDPOINT = "https://ourlgcy-intake.fly.dev/profile";
window.LGCY_UPLOADS_ENDPOINT = "https://ourlgcy-intake.fly.dev/uploads";
