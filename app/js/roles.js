const DEFAULT_ROLES = [
  { id: 'r1', name: 'Kurucu', color: '#fbbf24', permissions: { all: true }, position: 0 },
  { id: 'r2', name: 'Admin', color: '#ef4444', permissions: { manageServer: true, kick: true, ban: true, deleteMsg: true }, position: 1 },
  { id: 'r3', name: 'Moderatör', color: '#6366f1', permissions: { kick: true, deleteMsg: true }, position: 2 },
  { id: 'r4', name: 'Üye', color: '#9ca3af', permissions: { sendMsg: true }, position: 3 }
];

function hasPermission(uid, perm, userRoles) {
  const rids = userRoles?.[uid] || ['r4'];
  for (const rid of rids) {
    const r = DEFAULT_ROLES.find(x => x.id === rid);
    if (r && (r.permissions.all || r.permissions[perm])) return true;
  }
  return false;
}
