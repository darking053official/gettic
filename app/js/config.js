const API = 'https://piano-tracker-planner-sys.trycloudflare.com';
const MAX_MSGS = 100;
function genId() { return Date.now().toString(36) + Math.random().toString(36).substr(2, 7); }
