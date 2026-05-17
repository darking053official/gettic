// Varsayılan roller
const DEFAULT_ROLES = [
  { 
    id: 'r1', 
    name: 'Kurucu', 
    color: '#fbbf24', 
    icon: 'crown',
    permissions: { all: true }, 
    position: 0,
    hoist: true,
    mentionable: true,
    editable: false,
    deletable: false
  },
  { 
    id: 'r2', 
    name: 'Admin', 
    color: '#ef4444', 
    icon: 'shield',
    permissions: { 
      manageServer: true, 
      manageRoles: true, 
      manageChannels: true, 
      kick: true, 
      ban: true, 
      deleteMsg: true, 
      pin: true, 
      manageWebhooks: true,
      manageBots: true,
      mute: true,
      deafen: true,
      moveMembers: true,
      viewAuditLog: true,
      manageNicknames: true
    }, 
    position: 1,
    hoist: true,
    mentionable: true,
    editable: true,
    deletable: false
  },
  { 
    id: 'r3', 
    name: 'Moderatör', 
    color: '#6366f1', 
    icon: 'shield',
    permissions: { 
      kick: true, 
      deleteMsg: true, 
      mute: true,
      manageMessages: true,
      viewAuditLog: true
    }, 
    position: 2,
    hoist: true,
    mentionable: true,
    editable: true,
    deletable: true
  },
  { 
    id: 'r4', 
    name: 'Üye', 
    color: '#9ca3af', 
    icon: 'user',
    permissions: { 
      sendMsg: true, 
      addReactions: true, 
      uploadFile: true,
      connect: true,
      speak: true,
      stream: true,
      useExternalEmojis: true,
      changeNickname: true
    }, 
    position: 3,
    hoist: false,
    mentionable: false,
    editable: false,
    deletable: false
  }
];

// Audit log (denetim kaydı)
const AuditLog = {
  logs: JSON.parse(localStorage.getItem('gt_auditLog') || '[]'),
  
  add(action, userId, targetId, details = {}) {
    this.logs.unshift({
      id: genId(),
      action,
      userId,
      targetId,
      details,
      timestamp: new Date().toISOString(),
      channelId: Store.activeChannel
    });
    if (this.logs.length > 200) this.logs.pop();
    localStorage.setItem('gt_auditLog', JSON.stringify(this.logs));
  },
  
  get(filter = {}) {
    let logs = [...this.logs];
    if (filter.userId) logs = logs.filter(l => l.userId === filter.userId);
    if (filter.action) logs = logs.filter(l => l.action === filter.action);
    if (filter.limit) logs = logs.slice(0, filter.limit);
    return logs;
  },
  
  clear() {
    this.logs = [];
    localStorage.removeItem('gt_auditLog');
  }
};

// Rol fonksiyonları
function getHighestRole(uid) {
  if (!uid) return Store.roles.find(r => r.id === 'r4');
  const rids = Store.userRoles[uid] || ['r4'];
  let highest = Store.roles.find(r => r.id === 'r4');
  rids.forEach(rid => {
    const role = Store.roles.find(x => x.id === rid);
    if (role && role.position < highest.position) highest = role;
  });
  return highest;
}

function hasPermission(uid, perm) {
  if (!uid) return false;
  const role = getHighestRole(uid);
  return role?.permissions?.all || role?.permissions?.[perm] || false;
}

function hasAnyPermission(uid, perms) {
  return perms.some(perm => hasPermission(uid, perm));
}

function hasAllPermissions(uid, perms) {
  return perms.every(perm => hasPermission(uid, perm));
}

// Rol atama
function assignRole(uid, roleId) {
  if (!hasPermission(Store.user?._id, 'manageRoles')) return toast('Yetkiniz yok', 'e');
  if (!Store.userRoles[uid]) Store.userRoles[uid] = ['r4'];
  if (Store.userRoles[uid].includes(roleId)) return toast('Bu rol zaten atanmış', 'e');
  
  const role = Store.roles.find(r => r.id === roleId);
  if (!role) return;
  
  Store.userRoles[uid].push(roleId);
  AuditLog.add('role_assign', Store.user._id, uid, { roleId, roleName: role.name });
  saveStore();
  toast(`✅ ${role.name} rolü atandı`);
}

function removeRole(uid, roleId) {
  if (!hasPermission(Store.user?._id, 'manageRoles')) return toast('Yetkiniz yok', 'e');
  if (roleId === 'r4') return toast('Varsayılan rol kaldırılamaz', 'e');
  
  Store.userRoles[uid] = (Store.userRoles[uid] || ['r4']).filter(id => id !== roleId);
  AuditLog.add('role_remove', Store.user._id, uid, { roleId });
  saveStore();
  toast('✅ Rol kaldırıldı');
}

// Rol yönetimi
function createRole(name, color, permissions = {}) {
  if (!hasPermission(Store.user?._id, 'manageRoles')) return toast('Yetkiniz yok', 'e');
  if (!name || !name.trim()) return toast('Rol adı gerekli', 'e');
  
  const id = 'r' + Date.now().toString(36);
  const newRole = {
    id,
    name: name.trim(),
    color: color || '#9ca3af',
    icon: 'user',
    permissions: { sendMsg: true, addReactions: true, ...permissions },
    position: Store.roles.length,
    hoist: false,
    mentionable: true,
    editable: true,
    deletable: true
  };
  
  Store.roles.push(newRole);
  AuditLog.add('role_create', Store.user._id, null, { roleName: name, roleId: id });
  saveStore();
  toast(`✅ ${name} rolü oluşturuldu`);
  return newRole;
}

function deleteRole(roleId) {
  if (!hasPermission(Store.user?._id, 'manageRoles')) return toast('Yetkiniz yok', 'e');
  const role = Store.roles.find(r => r.id === roleId);
  if (!role) return;
  if (!role.deletable) return toast('Bu rol silinemez', 'e');
  
  Store.roles = Store.roles.filter(r => r.id !== roleId);
  // Kullanıcılardan bu rolü kaldır
  Object.keys(Store.userRoles).forEach(uid => {
    Store.userRoles[uid] = Store.userRoles[uid].filter(id => id !== roleId);
  });
  AuditLog.add('role_delete', Store.user._id, null, { roleName: role.name, roleId });
  saveStore();
  toast(`🗑️ ${role.name} rolü silindi`);
}

function editRole(roleId, updates) {
  if (!hasPermission(Store.user?._id, 'manageRoles')) return toast('Yetkiniz yok', 'e');
  const role = Store.roles.find(r => r.id === roleId);
  if (!role || !role.editable) return;
  
  if (updates.name) role.name = updates.name;
  if (updates.color) role.color = updates.color;
  if (updates.permissions) Object.assign(role.permissions, updates.permissions);
  if (updates.position !== undefined) role.position = updates.position;
  if (updates.hoist !== undefined) role.hoist = updates.hoist;
  if (updates.mentionable !== undefined) role.mentionable = updates.mentionable;
  
  AuditLog.add('role_edit', Store.user._id, null, { roleName: role.name, updates });
  saveStore();
  toast('✅ Rol güncellendi');
}

// Kullanıcı yönetimi
function kickUser(uid) {
  if (!hasPermission(Store.user?._id, 'kick')) return toast('Yetkiniz yok', 'e');
  const targetRole = getHighestRole(uid);
  const userRole = getHighestRole(Store.user._id);
  if (targetRole.position <= userRole.position) return toast('Bu kullanıcıyı atamazsın', 'e');
  
  AuditLog.add('kick', Store.user._id, uid);
  toast('👢 Kullanıcı atıldı');
  if (window._socket) window._socket.emit('kick_user', { userId: uid });
}

function banUser(uid) {
  if (!hasPermission(Store.user?._id, 'ban')) return toast('Yetkiniz yok', 'e');
  if (!Store.blockedUsers.includes(uid)) {
    Store.blockedUsers.push(uid);
    AuditLog.add('ban', Store.user._id, uid);
    saveStore();
    toast('🚫 Kullanıcı yasaklandı');
  }
}

function muteUser(uid, duration = 300000) { // varsayılan 5 dakika
  if (!hasPermission(Store.user?._id, 'mute')) return toast('Yetkiniz yok', 'e');
  Store.mutedUsers.push(uid);
  AuditLog.add('mute', Store.user._id, uid, { duration });
  saveStore();
  toast('🔇 Kullanıcı susturuldu');
  setTimeout(() => {
    Store.mutedUsers = Store.mutedUsers.filter(u => u !== uid);
    saveStore();
  }, duration);
}

function changeNickname(uid, nickname) {
  if (uid === Store.user?._id) {
    if (!hasPermission(uid, 'changeNickname')) return toast('Yetkiniz yok', 'e');
  } else {
    if (!hasPermission(Store.user?._id, 'manageNicknames')) return toast('Yetkiniz yok', 'e');
  }
  AuditLog.add('nickname_change', Store.user._id, uid, { nickname });
  toast('✅ Takma ad değiştirildi');
}

// İzin listesi (tüm izinler)
const PERMISSION_LIST = {
  'all': 'Tüm Yetkiler',
  'manageServer': 'Sunucu Yönetimi',
  'manageRoles': 'Rol Yönetimi',
  'manageChannels': 'Kanal Yönetimi',
  'manageMessages': 'Mesaj Yönetimi',
  'manageWebhooks': 'Webhook Yönetimi',
  'manageBots': 'Bot Yönetimi',
  'manageNicknames': 'Takma Ad Yönetimi',
  'viewAuditLog': 'Denetim Kaydı Görme',
  'kick': 'Kullanıcı Atma',
  'ban': 'Kullanıcı Yasaklama',
  'mute': 'Kullanıcı Susturma',
  'deafen': 'Sağırlaştırma',
  'moveMembers': 'Üye Taşıma',
  'deleteMsg': 'Mesaj Silme',
  'pin': 'Mesaj Sabitleme',
  'sendMsg': 'Mesaj Gönderme',
  'addReactions': 'Tepki Ekleme',
  'uploadFile': 'Dosya Yükleme',
  'connect': 'Bağlanma',
  'speak': 'Konuşma',
  'stream': 'Yayın',
  'useExternalEmojis': 'Harici Emoji',
  'changeNickname': 'Takma Ad Değiştirme'
};
