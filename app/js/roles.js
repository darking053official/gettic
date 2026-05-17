// ============ GETTIC ROLES.JS - FULL & TEMİZ ============

const DEFAULT_ROLES = [
  { id: 'r1', name: 'Kurucu', color: '#fbbf24', permissions: { all: true }, position: 0, editable: false, deletable: false },
  { id: 'r2', name: 'Admin', color: '#ef4444', permissions: { manageServer: true, manageRoles: true, manageChannels: true, kick: true, ban: true, deleteMsg: true, pin: true, mute: true }, position: 1, editable: true, deletable: false },
  { id: 'r3', name: 'Moderatör', color: '#6366f1', permissions: { kick: true, deleteMsg: true, mute: true, manageMessages: true }, position: 2, editable: true, deletable: true },
  { id: 'r4', name: 'Üye', color: '#ec4899', permissions: { sendMsg: true, addReactions: true, uploadFile: true, connect: true, speak: true }, position: 3, editable: false, deletable: false }
];

function getHighestRole(uid) {
  if (!uid) return DEFAULT_ROLES[3];
  const rids = Store?.userRoles?.[uid] || ['r4'];
  let highest = DEFAULT_ROLES[3];
  rids.forEach(rid => {
    const role = DEFAULT_ROLES.find(r => r.id === rid);
    if (role && role.position < highest.position) highest = role;
  });
  return highest;
}

function hasPermission(uid, perm) {
  if (!uid) return true;
  // Temel izinler herkese açık
  if (['sendMsg', 'addReactions', 'connect', 'speak', 'readHistory'].includes(perm)) return true;
  const role = getHighestRole(uid);
  if (role.permissions?.all) return true;
  return role.permissions?.[perm] || false;
}
