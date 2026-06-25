// ═══════════════════════════════════════════════════════════════════
// G-POINT ARENA - WEAPONS v1.0
// Tüm silah verileri, emoji yok, SVG ikon referansları var.
// ═══════════════════════════════════════════════════════════════════

const Weapons = {
  pistol: {
    id: 'pistol',
    name: 'TABANCA',
    damage: 12,
    range: 40,
    fireRate: 350,
    bulletSpeed: 55,
    spread: 0.04,
    ammo: 15,
    maxAmmo: 15,
    color: 0xcccccc,
    size: 0.15,
    auto: false,
    sound: 'pistol',
    icon: 'pistol', // icons.js'deki SVG adı
  },
  smg: {
    id: 'smg',
    name: 'MAKINELI',
    damage: 9,
    range: 35,
    fireRate: 90,
    bulletSpeed: 50,
    spread: 0.08,
    ammo: 30,
    maxAmmo: 30,
    color: 0x4488ff,
    size: 0.12,
    auto: true,
    sound: 'smg',
    icon: 'smg',
  },
  shotgun: {
    id: 'shotgun',
    name: 'AV TUFEGI',
    damage: 8,
    range: 18,
    fireRate: 750,
    bulletSpeed: 40,
    spread: 0.18,
    pellets: 8,
    ammo: 6,
    maxAmmo: 6,
    color: 0xff8844,
    size: 0.2,
    auto: false,
    sound: 'shotgun',
    icon: 'shotgun',
  },
  sniper: {
    id: 'sniper',
    name: 'KESKIN NISANCI',
    damage: 55,
    range: 120,
    fireRate: 1100,
    bulletSpeed: 100,
    spread: 0.005,
    ammo: 5,
    maxAmmo: 5,
    color: 0x44ff88,
    size: 0.25,
    auto: false,
    sound: 'sniper',
    icon: 'sniper',
  },
  rocket: {
    id: 'rocket',
    name: 'ROKET ATAR',
    damage: 60,
    range: 25,
    fireRate: 1400,
    bulletSpeed: 20,
    spread: 0.01,
    ammo: 3,
    maxAmmo: 3,
    color: 0xff4444,
    size: 0.3,
    auto: false,
    sound: 'rocket',
    icon: 'rocket',
    explosive: true,
    explosionRadius: 5,
  },
};

// ── Silah listesi ──────────────────────────────────────────────────
const WeaponList = Object.values(Weapons);

// ── ID'ye göre silah bul ──────────────────────────────────────────
function getWeapon(id) {
  return Weapons[id] || Weapons.pistol;
}

// ── SVG ikon getir (icons.js'den) ────────────────────────────────
function getWeaponIcon(iconName) {
  if (typeof Icons !== 'undefined' && Icons[iconName]) {
    return Icons[iconName];
  }
  // Fallback: basit bir daire
  return `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2">
    <circle cx="12" cy="12" r="10" />
  </svg>`;
    }
