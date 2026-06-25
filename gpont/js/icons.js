// ═══════════════════════════════════════════════════════════════════
// G-POINT ICONS v1.0
// Tüm ikonlar SVG olarak, emoji yok.
// ═══════════════════════════════════════════════════════════════════

const Icons = {
  // ── Ana Menü ──────────────────────────────────────────────────────
  logo: `<svg viewBox="0 0 100 100" width="48" height="48">
    <circle cx="50" cy="50" r="45" fill="#ec4899" />
    <text x="50" y="65" font-size="40" text-anchor="middle" fill="white" font-weight="bold" font-family="sans-serif">G</text>
  </svg>`,

  // ── Navigasyon ────────────────────────────────────────────────────
  home: `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1"/>
  </svg>`,

  arena: `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 3v18M3 12h18" />
    <circle cx="12" cy="12" r="2" fill="currentColor" />
  </svg>`,

  // ── Oda / Lobi ────────────────────────────────────────────────────
  create: `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 8v8M8 12h8" />
  </svg>`,

  join: `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M15 10l4 4-4 4M19 14H10M4 20v-6a4 4 0 014-4h6" />
  </svg>`,

  // ── Silahlar ──────────────────────────────────────────────────────
  pistol: `<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2">
    <rect x="4" y="10" width="16" height="6" rx="1" />
    <path d="M20 12l2-2v4l-2-2z" />
    <circle cx="8" cy="13" r="1.5" fill="currentColor" />
  </svg>`,

  shotgun: `<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2">
    <rect x="3" y="10" width="18" height="6" rx="1" />
    <path d="M21 12l2-2v4l-2-2z" />
    <circle cx="7" cy="13" r="2" fill="currentColor" />
    <circle cx="10" cy="13" r="1.5" fill="currentColor" />
  </svg>`,

  sniper: `<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2">
    <line x1="2" y1="12" x2="18" y2="12" />
    <circle cx="18" cy="12" r="3" />
    <circle cx="18" cy="12" r="1.5" fill="currentColor" />
    <path d="M14 10l-2-6-2 6" />
  </svg>`,

  rocket: `<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M12 2L5 10l3 3 4-4 4 4 3-3-7-8z" />
    <path d="M8 13l-3 3 4 4 3-3" />
    <circle cx="12" cy="12" r="2" fill="currentColor" />
  </svg>`,

  // ── Güçlendiriciler ──────────────────────────────────────────────
  health: `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M12 4C8 1 3 4 3 9c0 5 9 11 9 11s9-6 9-11c0-5-5-8-9-5z" />
  </svg>`,

  shield: `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <circle cx="12" cy="12" r="3" fill="currentColor" />
  </svg>`,

  speed: `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M12 2v4M6 6l2 2M18 6l-2 2M4 12h4M16 12h4M12 18v4" />
    <circle cx="12" cy="12" r="3" />
    <path d="M12 9l-3 3 3 3 3-3-3-3z" />
  </svg>`,

  ammo: `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2">
    <rect x="4" y="8" width="16" height="8" rx="1" />
    <path d="M20 12h2M2 12h2" />
  </svg>`,

  // ── Durum ─────────────────────────────────────────────────────────
  ready: `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#10b981" stroke-width="2">
    <circle cx="12" cy="12" r="10" />
    <path d="M8 12l3 3 6-6" />
  </svg>`,

  waiting: `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#f59e0b" stroke-width="2">
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="2" fill="#f59e0b" />
    <path d="M12 6v6l4 2" />
  </svg>`,

  dead: `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#ef4444" stroke-width="2">
    <circle cx="12" cy="12" r="10" />
    <path d="M8 8l8 8M16 8l-8 8" />
  </svg>`,

  // ── Skor ──────────────────────────────────────────────────────────
  score: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
    <polygon points="12 2 15 9 22 9 16 14 18 21 12 17 6 21 8 14 2 9 9 9 12 2" />
  </svg>`,

  crown: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#fbbf24" stroke-width="2">
    <path d="M2 20l2-4 2 4 2-4 2 4 2-4 2 4 2-4 2 4 2-6 2 6 2-6V6l-4 2L18 2l-4 2L12 2 8 4 4 2 2 6v8l2 6z" />
  </svg>`,

  // ── Kontroller ────────────────────────────────────────────────────
  settings: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
  </svg>`,

  close: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>`,
};

// ============ EXPORT ============
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Icons;
}
