function getHighestRole(uid) {
  const rids = Store.userRoles[uid] || ['r4'];
  let h = Store.roles[Store.roles.length - 1];
  rids.forEach(rid => {
    const r = Store.roles.find(x => x.id === rid);
    if (r && r.position < h.position) h = r;
  });
  return h;
}

function hasPermission(uid, perm) {
  if (!uid) return false;
  const rids = Store.userRoles[uid] || ['r4'];
  for (const rid of rids) {
    const r = Store.roles.find(x => x.id === rid);
    if (r && (r.permissions.all || r.permissions[perm])) return true;
  }
  return false;
}
