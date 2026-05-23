// ╔══════════════════════════════════════════════════════════════════╗
// ║      GETTIC ROLES.JS - SVG İKONLU + TÜRKÇE DÜZELTMELER          ║
// ╚══════════════════════════════════════════════════════════════════╝

// SVG ikon yardımcı
function rolIcon(name, size = 18) {
  return window.Icons?.[name] ? `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle">${Icons[name]}</svg>` : '';
}

const DEFAULT_ROLES = [
  { 
    id: 'r1', name: 'Kurucu', color: '#fbbf24', 
    permissions: { all: true }, 
    position: 0, hoist: true, mentionable: true, 
    editable: false, deletable: false,
    icon: 'crown', members: 1
  },
  { 
    id: 'r2', name: 'Admin', color: '#ef4444', 
    permissions: { 
      manageServer: true, manageRoles: true, manageChannels: true, 
      kick: true, ban: true, deleteMsg: true, pin: true, 
      mute: true, deafen: true, manageWebhooks: true, manageBots: true,
      moveMembers: true, viewAuditLog: true, manageNicknames: true,
      manageEmojis: true, prioritySpeaker: true
    }, 
    position: 1, hoist: true, mentionable: true, 
    editable: true, deletable: false,
    icon: 'shield', members: 0
  },
  { 
    id: 'r3', name: 'Moderatör', color: '#6366f1', 
    permissions: { 
      kick: true, deleteMsg: true, mute: true, manageMessages: true,
      viewAuditLog: true, moveMembers: true
    }, 
    position: 2, hoist: true, mentionable: true, 
    editable: true, deletable: true,
    icon: 'hammer', members: 0
  },
  { 
    id: 'r4', name: 'Üye', color: '#ec4899', 
    permissions: { 
      sendMsg: true, addReactions: true, uploadFile: true,
      connect: true, speak: true, stream: true,
      useExternalEmojis: true, changeNickname: true,
      readHistory: true, embedLinks: true, attachFiles: true
    }, 
    position: 3, hoist: false, mentionable: false, 
    editable: false, deletable: false,
    icon: 'user', members: 0
  }
];

// Rol SVG ikon eşleştirme
function getRoleSvgIcon(iconName) {
  const iconMap = {
    'crown': 'crown', 'shield': 'shield', 'hammer': 'hammer', 'user': 'user',
    'star': 'star', 'zap': 'zap', 'heart': 'heart', 'sun': 'sun'
  };
  return rolIcon(iconMap[iconName] || 'user', 18);
}

// Denetim Kaydı
const AuditLog = {
  logs: JSON.parse(localStorage.getItem('gt_auditLog') || '[]'),
  
  add(action, userId, targetId, details = {}) {
    this.logs.unshift({
      id: genId(), action, userId, targetId, details,
      timestamp: new Date().toISOString()
    });
    if (this.logs.length > 500) this.logs.pop();
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
    toast(rolIcon('file-text') + ' Denetim kaydı temizlendi');
  }
};

// Rol Fonksiyonları
function getHighestRole(uid) {
  if (!uid) return DEFAULT_ROLES[3];
  const rids = Store.userRoles?.[uid] || ['r4'];
  let highest = DEFAULT_ROLES[3];
  rids.forEach(rid => {
    const role = (Store.roles || DEFAULT_ROLES).find(r => r.id === rid);
    if (role && role.position < highest.position) highest = role;
  });
  return highest;
}

function hasPermission(uid, perm) {
  if (!uid) return true;
  if (['sendMsg', 'addReactions', 'connect', 'speak', 'readHistory', 'changeNickname'].includes(perm)) return true;
  const role = getHighestRole(uid);
  if (role?.permissions?.all) return true;
  return role?.permissions?.[perm] || false;
}

// Rol Oluştur
function createRole(name, color = '#9ca3af', permissions = {}) {
  if (!hasPermission(Store.user?._id, 'manageRoles')) return toast('Yetkiniz yok', 'e');
  if (!name?.trim()) return toast('Rol adı gerekli', 'e');
  if (name.trim().length > 50) return toast('Rol adı çok uzun', 'e');
  
  const id = 'r_' + Date.now().toString(36);
  const newRole = {
    id, name: name.trim(), color,
    permissions: { sendMsg: true, addReactions: true, connect: true, ...permissions },
    position: (Store.roles || DEFAULT_ROLES).length,
    hoist: false, mentionable: true, editable: true, deletable: true,
    icon: 'star', members: 0, createdAt: new Date().toISOString()
  };
  
  if (!Store.roles) Store.roles = [...DEFAULT_ROLES];
  Store.roles.push(newRole);
  AuditLog.add('role_create', Store.user._id, null, { roleName: name, roleId: id });
  saveStore();
  toast(rolIcon('check') + ' ' + name + ' rolü oluşturuldu');
  renderRolesPanel();
  return newRole;
}

// Rol Sil
function deleteRole(roleId) {
  if (!hasPermission(Store.user?._id, 'manageRoles')) return toast('Yetkiniz yok', 'e');
  const role = (Store.roles || DEFAULT_ROLES).find(r => r.id === roleId);
  if (!role) return;
  if (!role.deletable) return toast('Bu rol silinemez', 'e');
  
  Store.roles = Store.roles.filter(r => r.id !== roleId);
  Object.keys(Store.userRoles || {}).forEach(uid => {
    Store.userRoles[uid] = Store.userRoles[uid].filter(id => id !== roleId);
  });
  
  AuditLog.add('role_delete', Store.user._id, null, { roleName: role.name, roleId });
  saveStore();
  toast(rolIcon('trash') + ' ' + role.name + ' silindi');
  renderRolesPanel();
}

// Rol Düzenle
function editRole(roleId, updates) {
  if (!hasPermission(Store.user?._id, 'manageRoles')) return toast('Yetkiniz yok', 'e');
  const role = (Store.roles || DEFAULT_ROLES).find(r => r.id === roleId);
  if (!role || !role.editable) return;
  
  if (updates.name) role.name = updates.name;
  if (updates.color) role.color = updates.color;
  if (updates.permissions) Object.assign(role.permissions, updates.permissions);
  if (updates.position !== undefined) role.position = updates.position;
  if (updates.hoist !== undefined) role.hoist = updates.hoist;
  if (updates.mentionable !== undefined) role.mentionable = updates.mentionable;
  if (updates.icon) role.icon = updates.icon;
  
  AuditLog.add('role_edit', Store.user._id, null, { roleName: role.name, updates });
  saveStore();
  toast(rolIcon('check') + ' Rol güncellendi');
  renderRolesPanel();
}

// Rol Ata / Kaldır
function assignRole(uid, roleId) {
  if (!hasPermission(Store.user?._id, 'manageRoles')) return toast('Yetkiniz yok', 'e');
  if (!Store.userRoles) Store.userRoles = {};
  if (!Store.userRoles[uid]) Store.userRoles[uid] = ['r4'];
  if (Store.userRoles[uid].includes(roleId)) return toast('Bu rol zaten atanmış', 'e');
  
  Store.userRoles[uid].push(roleId);
  AuditLog.add('role_assign', Store.user._id, uid, { roleId });
  saveStore();
  toast(rolIcon('user-plus') + ' Rol atandı');
}

function removeRole(uid, roleId) {
  if (!hasPermission(Store.user?._id, 'manageRoles')) return toast('Yetkiniz yok', 'e');
  if (roleId === 'r4') return toast('Varsayılan rol kaldırılamaz', 'e');
  if (!Store.userRoles?.[uid]) return;
  
  Store.userRoles[uid] = Store.userRoles[uid].filter(id => id !== roleId);
  AuditLog.add('role_remove', Store.user._id, uid, { roleId });
  saveStore();
  toast(rolIcon('user-minus') + ' Rol kaldırıldı');
}

// Kullanıcı Yönetimi
function kickUser(uid) {
  if (!hasPermission(Store.user?._id, 'kick')) return toast('Yetkiniz yok', 'e');
  const targetRole = getHighestRole(uid);
  const userRole = getHighestRole(Store.user?._id);
  if (targetRole.position <= userRole.position) return toast('Bu kullanıcıyı atamazsın', 'e');
  
  AuditLog.add('kick', Store.user._id, uid);
  toast(rolIcon('user-x') + ' Kullanıcı atıldı');
  if (socket) socket.emit('kick_user', { userId: uid });
}

function banUser(uid) {
  if (!hasPermission(Store.user?._id, 'ban')) return toast('Yetkiniz yok', 'e');
  if (!Store.blockedUsers) Store.blockedUsers = [];
  if (Store.blockedUsers.includes(uid)) {
    Store.blockedUsers = Store.blockedUsers.filter(u => u !== uid);
    toast(rolIcon('check') + ' Yasak kaldırıldı');
  } else {
    Store.blockedUsers.push(uid);
    toast(rolIcon('ban') + ' Kullanıcı yasaklandı');
  }
  AuditLog.add('ban', Store.user._id, uid);
  saveStore();
}

function muteUser(uid, duration = 300000) {
  if (!hasPermission(Store.user?._id, 'mute')) return toast('Yetkiniz yok', 'e');
  if (!Store.mutedUsers) Store.mutedUsers = [];
  Store.mutedUsers.push(uid);
  AuditLog.add('mute', Store.user._id, uid, { duration });
  saveStore();
  toast(rolIcon('volume-x') + ' Susturuldu (' + (duration/60000) + ' dk)');
  setTimeout(() => {
    Store.mutedUsers = Store.mutedUsers.filter(u => u !== uid);
    saveStore();
  }, duration);
}

// Yetki Listesi
const PERMISSION_LIST = {
  all: 'Tüm Yetkiler',
  manageServer: 'Sunucu Yönetimi',
  manageRoles: 'Rol Yönetimi',
  manageChannels: 'Kanal Yönetimi',
  manageMessages: 'Mesaj Yönetimi',
  manageWebhooks: 'Webhook Yönetimi',
  manageBots: 'Bot Yönetimi',
  manageNicknames: 'Takma Ad Yönetimi',
  manageEmojis: 'Emoji Yönetimi',
  viewAuditLog: 'Denetim Kaydı',
  kick: 'Kullanıcı Atma',
  ban: 'Yasaklama',
  mute: 'Susturma',
  deafen: 'Sağırlaştırma',
  moveMembers: 'Üye Taşıma',
  deleteMsg: 'Mesaj Silme',
  pin: 'Mesaj Sabitleme',
  sendMsg: 'Mesaj Gönderme',
  addReactions: 'Tepki Ekleme',
  uploadFile: 'Dosya Yükleme',
  embedLinks: 'Bağlantı Gömme',
  attachFiles: 'Dosya Ekleme',
  readHistory: 'Geçmiş Okuma',
  useExternalEmojis: 'Harici Emoji',
  changeNickname: 'Takma Ad Değiştirme',
  connect: 'Bağlanma',
  speak: 'Konuşma',
  stream: 'Yayın',
  video: 'Görüntü',
  screenShare: 'Ekran Paylaşımı',
  prioritySpeaker: 'Öncelikli Konuşmacı'
};

// Rol Paneli Render
function renderRolesPanel() {
  const container = document.getElementById('roleList');
  if (!container) return;
  
  const roles = Store.roles || DEFAULT_ROLES;
  
  container.innerHTML = `
    <div style="margin-bottom:12px">
      <button class="mb" onclick="showCreateRoleForm()">+ Rol Oluştur</button>
    </div>
    ${roles.map(role => `
      <div class="settings-item" style="justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--b)">
        <div style="display:flex;align-items:center;gap:10px">
          <span style="font-size:18px">${getRoleSvgIcon(role.icon)}</span>
          <div>
            <div style="font-weight:600;font-size:13px;color:${role.color}">${escapeHtml(role.name)}</div>
            <div style="font-size:10px;color:var(--t3)">${role.members || 0} üye · ${Object.values(role.permissions).filter(Boolean).length} yetki</div>
          </div>
        </div>
        <div style="display:flex;gap:4px">
          ${role.editable ? `<button class="ib" onclick="showEditRoleForm('${role.id}')" style="width:26px;height:26px">${rolIcon('edit',14)}</button>` : ''}
          ${role.deletable ? `<button class="ib" onclick="deleteRole('${role.id}')" style="width:26px;height:26px;color:var(--re)">${rolIcon('trash',14)}</button>` : ''}
        </div>
      </div>
    `).join('')}
  `;
}

function showCreateRoleForm() {
  const content = document.getElementById('modalContent');
  if (!content) return;
  
  content.innerHTML = `
    <h2>${rolIcon('shield',24)} Rol Oluştur</h2>
    <input class="mi" id="newRoleName" placeholder="Rol adı">
    <label class="ml">Renk</label>
    <input type="color" class="mi" id="newRoleColor" value="#ec4899" style="height:40px;padding:4px;cursor:pointer">
    <label class="ml">İzinler</label>
    <div style="max-height:200px;overflow-y:auto;margin-bottom:10px">
      ${Object.entries(PERMISSION_LIST).filter(([k]) => k !== 'all').map(([key, name]) => `
        <label class="poll-setting">
          <input type="checkbox" class="perm-check" data-perm="${key}" ${key === 'sendMsg' || key === 'connect' ? 'checked' : ''}>
          ${escapeHtml(name)}
        </label>
      `).join('')}
    </div>
    <button class="mb" onclick="submitCreateRole()">Oluştur</button>
  `;
  openModal('roles');
}

function submitCreateRole() {
  const name = document.getElementById('newRoleName')?.value;
  const color = document.getElementById('newRoleColor')?.value;
  const perms = {};
  document.querySelectorAll('.perm-check:checked').forEach(cb => {
    perms[cb.dataset.perm] = true;
  });
  
  if (!name?.trim()) return toast('Rol adı gerekli', 'e');
  createRole(name, color, perms);
}

function showEditRoleForm(roleId) {
  const role = (Store.roles || DEFAULT_ROLES).find(r => r.id === roleId);
  if (!role) return;
  
  const content = document.getElementById('modalContent');
  if (!content) return;
  
  content.innerHTML = `
    <h2>${rolIcon('edit',24)} ${escapeHtml(role.name)} Düzenle</h2>
    <input class="mi" id="editRoleName" value="${escapeHtml(role.name)}" placeholder="Rol adı">
    <label class="ml">Renk</label>
    <input type="color" class="mi" id="editRoleColor" value="${role.color}" style="height:40px;padding:4px;cursor:pointer">
    <button class="mb" onclick="submitEditRole('${roleId}')">Kaydet</button>
  `;
  openModal('roles');
}

function submitEditRole(roleId) {
  const name = document.getElementById('editRoleName')?.value;
  const color = document.getElementById('editRoleColor')?.value;
  editRole(roleId, { name, color });
}

// HTML kaçış
function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str || '';
  return d.innerHTML;
}

console.log('Roles.js yüklendi (SVG ikonlu + Türkçe düzeltmeler)');
