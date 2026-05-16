const DEFAULT_ROLES = [
  { id: 'r1', name: 'Kurucu', color: '#fbbf24', permissions: { all: true }, position: 0 },
  { id: 'r2', name: 'Admin', color: '#ef4444', permissions: { manageServer: true, manageRoles: true, manageChannels: true, kick: true, ban: true, deleteMsg: true }, position: 1 },
  { id: 'r3', name: 'Moderatör', color: '#6366f1', permissions: { kick: true, deleteMsg: true }, position: 2 },
  { id: 'r4', name: 'Üye', color: '#9ca3af', permissions: { sendMsg: true, addReactions: true }, position: 3 },
];

function getHighestRole(uid, userRoles, roles) {
  const rids = userRoles[uid] || ['r4'];
  let h = roles[roles.length - 1];
  rids.forEach(rid => {
    const r = roles.find(x => x.id === rid);
    if (r && r.position < h.position) h = r;
  });
  return h;
}

function hasPermission(uid, perm, userRoles, roles) {
  if (!uid) return false;
  const rids = userRoles[uid] || ['r4'];
  for (const rid of rids) {
    const r = roles.find(x => x.id === rid);
    if (r && (r.permissions.all || r.permissions[perm])) return true;
  }
  return false;
}

function RoleManager({ roles, setRoles, onClose }) {
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleColor, setNewRoleColor] = useState('#6366f1');

  const addRole = () => {
    if (!newRoleName.trim()) return;
    const newRole = {
      id: 'r' + Date.now().toString(36),
      name: newRoleName.trim(),
      color: newRoleColor,
      permissions: { sendMsg: true, addReactions: true },
      position: roles.length
    };
    setRoles(prev => [...prev, newRole]);
    setNewRoleName('');
  };

  const deleteRole = (id) => {
    if (id === 'r1' || id === 'r4') return;
    setRoles(prev => prev.filter(r => r.id !== id));
  };

  return (
    <div>
      <h2>Roller</h2>
      <div style={{ marginBottom: '12px' }}>
        <input className="mi" value={newRoleName} onChange={e => setNewRoleName(e.target.value)} placeholder="Rol adı" />
        <input className="mi" type="color" value={newRoleColor} onChange={e => setNewRoleColor(e.target.value)} style={{ width: '100%', height: '40px', padding: '4px' }} />
        <button className="mb" onClick={addRole}>Rol Ekle</button>
      </div>
      {roles.map(role => (
        <div key={role.id} className="mitem" style={{ justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: role.color }} />
            <span>{role.name}</span>
          </div>
          {role.id !== 'r1' && role.id !== 'r4' && (
            <button className="mclose" style={{ position: 'static' }} onClick={() => deleteRole(role.id)}>×</button>
          )}
        </div>
      ))}
    </div>
  );
    }
