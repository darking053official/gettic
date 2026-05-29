// ╔══════════════════════════════════════════════════════════════════╗
// ║   GETTIC ROLES.JS v2.0 - Rol Sistemi                             ║
// ╚══════════════════════════════════════════════════════════════════╝

function _rolesLog(msg, level = 'log') {
  console[level](`%c[Roles] ${msg}`, 'color:#f59e0b;font-weight:bold');
}

// ============ VARSAYİLAN ROL İZİNLERİ ============
const PERMISSIONS = {
  administrator:    { label: 'Yönetici',          desc: 'Tüm izinlere sahip olur' },
  manageChannels:   { label: 'Kanal Yönet',       desc: 'Kanal oluştur/sil/düzenle' },
  manageMessages:   { label: 'Mesaj Yönet',       desc: 'Başkalarının mesajlarını sil/sabitle' },
  manageRoles:      { label: 'Rol Yönet',         desc: 'Rol oluştur/sil/düzenle' },
  kickMembers:      { label: 'Üye At',            desc: 'Üyeleri sunucudan at' },
  banMembers:       { label: 'Üye Yasakla',       desc: 'Üyeleri sunucudan yasakla' },
  muteMembers:      { label: 'Üye Sustur',        desc: 'Üyelerin mesaj göndermesini engelle' },
  manageBots:       { label: 'Bot Yönet',         desc: 'Bot oluştur/sil/düzenle' },
  sendMsg:          { label: 'Mesaj Gönder',      desc: 'Metin kanallarına mesaj gönder' },
  readMessages:     { label: 'Mesajları Oku',     desc: 'Kanal mesajlarını görüntüle' },
  sendFiles:        { label: 'Dosya Gönder',      desc: 'Dosya ve görsel paylaş' },
  addReactions:     { label: 'Tepki Ekle',        desc: 'Mesajlara emoji tepki ekle' },
  connectVoice:     { label: 'Ses Kanalı',        desc: 'Ses kanallarına katıl' },
  speakVoice:       { label: 'Konuş',             desc: 'Ses kanallarında konuş' },
  createPolls:      { label: 'Anket Oluştur',     desc: 'Kanal anketi başlat' },
  deleteMsg:        { label: 'Mesaj Sil',         desc: 'Kendi mesajlarını sil' },
  pinMessage:       { label: 'Mesaj Sabitle',     desc: 'Mesajları sabitle' },
};

// ============ LOCALSTORAGE ============
function _saveRoles() {
  try {
    localStorage.setItem('gt_roles',      JSON.stringify(Store.roles      || []));
    localStorage.setItem('gt_user_roles', JSON.stringify(Store.userRoles  || {}));
  } catch (e) {
    _rolesLog('Kayıt hatası: ' + e.message, 'warn');
  }
}

function _loadRoles() {
  try {
    const r  = localStorage.getItem('gt_roles');
    const ur = localStorage.getItem('gt_user_roles');
    if (r)  Store.roles      = JSON.parse(r);
    if (ur) Store.userRoles  = JSON.parse(ur);
  } catch {}
}

// ============ ROL OLUŞTUR ============
function createRoleUI() {
  if (typeof MODAL_TEMPLATES === 'undefined') return;

  MODAL_TEMPLATES.createRole = () => `
    <div class="gm-header">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
      <h2>Yeni Rol</h2>
    </div>
    <div class="gm-body">
      <div class="gm-field">
        <label class="gm-label">Rol Adı</label>
        <input class="gm-input" id="newRoleName" placeholder="Örn: Moderatör" maxlength="32"
          onkeydown="if(event.key==='Enter')submitCreateRole()">
      </div>
      <div class="gm-field">
        <label class="gm-label">Renk</label>
        <div class="role-color-grid">
          ${['#ef4444','#f97316','#f59e0b','#10b981','#3b82f6','#6366f1','#8b5cf6','#ec4899','#14b8a6','#6b7280']
            .map(c => `<button class="role-color-btn" style="background:${c}" onclick="document.getElementById('newRoleColor').value='${c}';document.querySelectorAll('.role-color-btn').forEach(b=>b.classList.remove('act'));this.classList.add('act')"></button>`)
            .join('')}
        </div>
        <input type="color" id="newRoleColor" value="#6366f1" style="margin-top:8px;width:100%;height:36px;border:none;border-radius:8px;cursor:pointer;background:none">
      </div>
      <div class="gm-field">
        <label class="gm-label">İzinler</label>
        <div class="role-perm-list">
          ${Object.entries(PERMISSIONS).map(([key, { label, desc }]) => `
            <div class="role-perm-item">
              <div class="role-perm-info">
                <span class="role-perm-label">${label}</span>
                <span class="role-perm-desc">${desc}</span>
              </div>
              <div class="gm-toggle" id="perm_${key}" onclick="this.classList.toggle('on')">
                <div class="gm-toggle-knob"></div>
              </div>
            </div>`).join('')}
        </div>
      </div>
      <div class="gm-actions">
        <button class="gm-btn ghost" onclick="openModal('roles')">İptal</button>
        <button class="gm-btn primary" onclick="submitCreateRole()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Oluştur
        </button>
      </div>
    </div>`;

  openModal('createRole');
}

function submitCreateRole() {
  const name  = document.getElementById('newRoleName')?.value?.trim();
  const color = document.getElementById('newRoleColor')?.value || '#6366f1';

  if (!name || name.length < 1)  return toast('Rol adı gerekli', 'e');
  if (name.length > 32)           return toast('Rol adı çok uzun', 'e');
  if ((Store.roles || []).find(r => r.name.toLowerCase() === name.toLowerCase())) {
    return toast('Bu isimde rol zaten var', 'e');
  }

  // İzinleri topla
  const permissions = {};
  Object.keys(PERMISSIONS).forEach(key => {
    const el = document.getElementById(`perm_${key}`);
    if (el?.classList.contains('on')) permissions[key] = true;
  });

  const role = {
    id:          'r_' + Date.now().toString(36),
    name,
    color,
    position:    (Store.roles || []).length,
    permissions,
    editable:    true,
    createdBy:   Store.user?._id,
    createdAt:   new Date().toISOString(),
  };

  if (!Store.roles) Store.roles = [];
  Store.roles.push(role);
  _saveRoles();

  // Sunucuya bildir
  if (socket?.connected) socket.emit('role_created', role);
  if (typeof SyncEngine !== 'undefined') SyncEngine.add('/api/roles', 'POST', role);

  toast(`"${name}" rolü oluşturuldu`, 's');
  openModal('roles');
  _rolesLog('Rol oluşturuldu: ' + name);
}

// ============ ROL DÜZENLE ============
function editRoleUI(roleId) {
  const role = (Store.roles || []).find(r => r.id === roleId);
  if (!role) return toast('Rol bulunamadı', 'e');
  if (role.editable === false) return toast('Bu rol düzenlenemez', 'w');

  if (typeof MODAL_TEMPLATES === 'undefined') return;

  MODAL_TEMPLATES.editRole = () => `
    <div class="gm-header">
      <div style="width:14px;height:14px;border-radius:50%;background:${role.color};flex-shrink:0"></div>
      <h2>${escapeHtml(role.name)} — Düzenle</h2>
    </div>
    <div class="gm-body">
      <div class="gm-field">
        <label class="gm-label">Rol Adı</label>
        <input class="gm-input" id="editRoleName" value="${escapeHtml(role.name)}" maxlength="32">
      </div>
      <div class="gm-field">
        <label class="gm-label">Renk</label>
        <div class="role-color-grid">
          ${['#ef4444','#f97316','#f59e0b','#10b981','#3b82f6','#6366f1','#8b5cf6','#ec4899','#14b8a6','#6b7280']
            .map(c => `<button class="role-color-btn ${role.color===c?'act':''}" style="background:${c}" onclick="document.getElementById('editRoleColor').value='${c}';document.querySelectorAll('.role-color-btn').forEach(b=>b.classList.remove('act'));this.classList.add('act')"></button>`)
            .join('')}
        </div>
        <input type="color" id="editRoleColor" value="${role.color}" style="margin-top:8px;width:100%;height:36px;border:none;border-radius:8px;cursor:pointer;background:none">
      </div>
      <div class="gm-field">
        <label class="gm-label">İzinler</label>
        <div class="role-perm-list">
          ${Object.entries(PERMISSIONS).map(([key, { label, desc }]) => `
            <div class="role-perm-item">
              <div class="role-perm-info">
                <span class="role-perm-label">${label}</span>
                <span class="role-perm-desc">${desc}</span>
              </div>
              <div class="gm-toggle ${role.permissions?.[key] ? 'on' : ''}" id="eperm_${key}"
                onclick="this.classList.toggle('on')">
                <div class="gm-toggle-knob"></div>
              </div>
            </div>`).join('')}
        </div>
      </div>
      <div class="gm-field">
        <label class="gm-label">Üyeler (${_countRoleMembers(roleId)})</label>
        <div class="role-members-list">
          ${_getRoleMembers(roleId).slice(0, 10).map(m => `
            <div class="gm-list-item">
              <div class="gm-av">${(m.username||'?').charAt(0).toUpperCase()}</div>
              <span class="gm-item-name">${escapeHtml(m.username || m._id)}</span>
              <button class="gm-btn ghost sm" onclick="removeRole('${m._id}','${roleId}');editRoleUI('${roleId}')">Kaldır</button>
            </div>`).join('') || '<p style="color:var(--t3);font-size:12px">Bu rolde üye yok</p>'}
        </div>
      </div>
      <div class="gm-divider"></div>
      <div class="gm-actions">
        <button class="gm-btn danger" onclick="deleteRoleUI('${roleId}')">Sil</button>
        <button class="gm-btn ghost" onclick="openModal('roles')">İptal</button>
        <button class="gm-btn primary" onclick="submitEditRole('${roleId}')">Kaydet</button>
      </div>
    </div>`;

  openModal('editRole');
}

function submitEditRole(roleId) {
  const role = (Store.roles || []).find(r => r.id === roleId);
  if (!role) return;

  const name  = document.getElementById('editRoleName')?.value?.trim();
  const color = document.getElementById('editRoleColor')?.value || role.color;

  if (!name || name.length < 1) return toast('Rol adı gerekli', 'e');

  role.name  = name.slice(0, 32);
  role.color = color;
  role.permissions = {};

  Object.keys(PERMISSIONS).forEach(key => {
    const el = document.getElementById(`eperm_${key}`);
    if (el?.classList.contains('on')) role.permissions[key] = true;
  });

  _saveRoles();
  if (socket?.connected) socket.emit('role_updated', role);
  if (typeof SyncEngine !== 'undefined') SyncEngine.add(`/api/roles/${roleId}`, 'PUT', role);

  toast(`"${name}" rolü güncellendi`, 's');
  openModal('roles');
  _rolesLog('Rol güncellendi: ' + name);
}

// ============ ROL SİL ============
function deleteRoleUI(roleId) {
  const role = (Store.roles || []).find(r => r.id === roleId);
  if (!role) return;
  if (role.editable === false) return toast('Bu rol silinemez', 'w');

  if (!confirm(`"${role.name}" rolünü silmek istediğinizden emin misiniz?\nBu roldeki üyelerden rol kaldırılacak.`)) return;

  Store.roles = (Store.roles || []).filter(r => r.id !== roleId);

  // Üyelerden rolü kaldır
  Object.keys(Store.userRoles || {}).forEach(userId => {
    Store.userRoles[userId] = Store.userRoles[userId].filter(r => r !== roleId);
  });

  _saveRoles();
  if (socket?.connected) socket.emit('role_deleted', { id: roleId });
  if (typeof SyncEngine !== 'undefined') SyncEngine.add(`/api/roles/${roleId}`, 'DELETE', { id: roleId });

  toast('Rol silindi', 's');
  openModal('roles');
  _rolesLog('Rol silindi: ' + roleId);
}

// ============ ROL ATA ============
function openAssignRoleModal(userId) {
  const user = (Store.members || []).find(m => String(m._id) === String(userId));
  const userRoleIds = Store.userRoles?.[userId] || [];

  if (typeof MODAL_TEMPLATES === 'undefined') return;

  MODAL_TEMPLATES.assignRole = () => `
    <div class="gm-header">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
      <h2>${escapeHtml(user?.username || userId)} — Roller</h2>
    </div>
    <div class="gm-body">
      <div class="role-assign-list">
        ${(Store.roles || []).map(r => {
          const has = userRoleIds.includes(r.id);
          return `
            <div class="gm-list-item">
              <div style="width:12px;height:12px;border-radius:50%;background:${r.color};flex-shrink:0"></div>
              <span class="gm-item-name" style="color:${r.color}">${escapeHtml(r.name)}</span>
              <button class="gm-btn ${has ? 'danger' : 'primary'} sm"
                onclick="${has ? `removeRole('${userId}','${r.id}')` : `assignRole('${userId}','${r.id}')`};openAssignRoleModal('${userId}')">
                ${has ? 'Kaldır' : 'Ekle'}
              </button>
            </div>`;
        }).join('') || '<p style="color:var(--t3)">Henüz rol yok</p>'}
      </div>
      <div class="gm-actions">
        <button class="gm-btn ghost" onclick="closeModal()">Kapat</button>
      </div>
    </div>`;

  openModal('assignRole');
}

// ============ ROL ÜYELER ============
function _getRoleMembers(roleId) {
  return (Store.members || []).filter(m => {
    const roles = Store.userRoles?.[m._id] || [];
    return roles.includes(roleId);
  });
}

function _countRoleMembers(roleId) {
  return Object.values(Store.userRoles || {}).filter(roles => roles.includes(roleId)).length;
}

// ============ ROL SIRALAMASI ============
function moveRole(roleId, dir) {
  const roles = Store.roles || [];
  const idx   = roles.findIndex(r => r.id === roleId);
  const newIdx = idx + dir;
  if (newIdx < 0 || newIdx >= roles.length) return;

  [roles[idx], roles[newIdx]] = [roles[newIdx], roles[idx]];
  roles.forEach((r, i) => r.position = i);

  _saveRoles();
  if (socket?.connected) socket.emit('roles_reordered', roles.map(r => ({ id: r.id, position: r.position })));
  openModal('roles');
}

// ============ MODAL TEMPLATE ============
if (typeof MODAL_TEMPLATES !== 'undefined') {
  MODAL_TEMPLATES.roles = () => {
    const roles = (Store.roles || []).sort((a, b) => (b.position || 0) - (a.position || 0));
    return `
      <div class="gm-header">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
        <h2>Roller</h2>
        <span class="gm-badge">${roles.length}</span>
        <button class="gm-header-btn" onclick="createRoleUI()" title="Rol Ekle">+</button>
      </div>
      <div class="gm-body">
        ${roles.length === 0
          ? `<div class="gm-empty">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              <span>Henüz rol yok</span>
              <small>İlk rolü oluştur!</small>
             </div>`
          : `<div class="gm-list role-list">
              ${roles.map((r, i) => `
                <div class="gm-list-item role-list-item">
                  <div class="role-dot" style="background:${r.color}"></div>
                  <span class="gm-item-name" style="color:${r.color}">${escapeHtml(r.name)}</span>
                  <span class="gm-item-sub">${_countRoleMembers(r.id)} üye</span>
                  <div class="gm-item-actions">
                    <button class="gm-icon-btn" onclick="moveRole('${r.id}',-1)" title="Yukarı" ${i===0?'disabled':''}>↑</button>
                    <button class="gm-icon-btn" onclick="moveRole('${r.id}',1)"  title="Aşağı"  ${i===roles.length-1?'disabled':''}>↓</button>
                    ${r.editable !== false
                      ? `<button class="gm-icon-btn" onclick="editRoleUI('${r.id}')">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                         </button>
                         <button class="gm-icon-btn danger" onclick="deleteRoleUI('${r.id}')">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>
                         </button>`
                      : '<span class="gm-badge">Sabit</span>'}
                  </div>
                </div>`).join('')}
             </div>`}
        <button class="gm-btn primary full" style="margin-top:10px" onclick="createRoleUI()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Yeni Rol
        </button>
      </div>`;
  };
}

// ============ SOCKET EVENTS ============
function initRolesSocket() {
  if (!socket) return;

  socket.on('role_created', role => {
    if (!(Store.roles || []).find(r => r.id === role.id)) {
      if (!Store.roles) Store.roles = [];
      Store.roles.push(role);
      _saveRoles();
    }
  });

  socket.on('role_updated', updated => {
    const idx = (Store.roles || []).findIndex(r => r.id === updated.id);
    if (idx > -1) {
      Store.roles[idx] = { ...Store.roles[idx], ...updated };
      _saveRoles();
    }
  });

  socket.on('role_deleted', ({ id }) => {
    Store.roles = (Store.roles || []).filter(r => r.id !== id);
    Object.keys(Store.userRoles || {}).forEach(uid => {
      Store.userRoles[uid] = Store.userRoles[uid].filter(r => r !== id);
    });
    _saveRoles();
  });

  socket.on('role_assigned', ({ userId, roleId }) => {
    if (!Store.userRoles) Store.userRoles = {};
    if (!Store.userRoles[userId]) Store.userRoles[userId] = [];
    if (!Store.userRoles[userId].includes(roleId)) {
      Store.userRoles[userId].push(roleId);
      _saveRoles();
    }
  });

  socket.on('role_removed', ({ userId, roleId }) => {
    if (Store.userRoles?.[userId]) {
      Store.userRoles[userId] = Store.userRoles[userId].filter(r => r !== roleId);
      _saveRoles();
    }
  });

  socket.on('roles_reordered', order => {
    const map = {};
    order.forEach(({ id, position }) => map[id] = position);
    (Store.roles || []).forEach(r => { if (map[r.id] !== undefined) r.position = map[r.id]; });
    _saveRoles();
  });

  _rolesLog('Socket events bağlandı');
}

// ============ CSS ============
(function injectRolesStyles() {
  const id = 'gt-roles-styles';
  if (document.getElementById(id)) return;
  const style = document.createElement('style');
  style.id = id;
  style.textContent = `
.role-dot{width:12px;height:12px;border-radius:50%;flex-shrink:0}
.role-list-item{cursor:default}
.role-list-item:hover .gm-item-actions{opacity:1}

.role-color-grid{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:4px}
.role-color-btn{
  width:28px;height:28px;border-radius:50%;border:2px solid transparent;
  cursor:pointer;transition:transform .15s,border-color .15s;
}
.role-color-btn.act{border-color:#fff;transform:scale(1.2)}
.role-color-btn:hover{transform:scale(1.1)}

.role-perm-list{display:flex;flex-direction:column;gap:4px;max-height:260px;overflow-y:auto}
.role-perm-item{
  display:flex;align-items:center;justify-content:space-between;
  padding:8px 10px;border-radius:8px;background:var(--bg2,#241535);
}
.role-perm-info{flex:1;min-width:0}
.role-perm-label{display:block;font-size:12px;font-weight:600;color:var(--t1,#fff)}
.role-perm-desc{display:block;font-size:10px;color:var(--t3,#888)}

.role-members-list{display:flex;flex-direction:column;gap:4px;max-height:150px;overflow-y:auto}
.role-assign-list{display:flex;flex-direction:column;gap:4px;max-height:340px;overflow-y:auto}
  `;
  document.head.appendChild(style);
})();

// ============ INIT ============
(function initRoles() {
  _loadRoles();

  if (typeof socket !== 'undefined' && socket) {
    initRolesSocket();
  } else {
    document.addEventListener('socket_ready', initRolesSocket, { once: true });
  }

  _rolesLog('v2.0 yüklendi ✓');
})();
