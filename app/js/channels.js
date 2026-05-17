function saveState(key, value) {
  try { localStorage.setItem('gt_' + key, JSON.stringify(value)); } catch(e) {}
}
function getState(key) {
  try { const v = localStorage.getItem('gt_' + key); return v ? JSON.parse(v) : null; } catch(e) { return null; }
}
