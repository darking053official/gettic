// ============ GETTIC SERVER.JS - SUNUCU AYARLARI ============

// Sunucu state
const serverState = {
  name: 'Gettic',
  description: 'Türkçe sohbet platformu',
  icon: 'https://raw.githubusercontent.com/darking053official/gettic/main/1777062266055.png',
  banner: '',
  inviteCode: genId().substring(0, 8),
  region: 'turkey',
  verificationLevel: 1, // 0: yok, 1: düşük, 2: orta, 3: yüksek
  defaultNotifications: 1, // 0: tümü, 1: sadece mention
  afkChannel: '',
  afkTimeout: 300, // saniye
  systemChannel: 'genel-sohbet',
  explicitFilter: 1, // 0: kapalı, 1: üye, 2: herkes
  createdAt: new Date().toISOString(),
  members: 1,
  boostLevel: 0
};

// Sunucu ayarları modal
function showServerSettings() {
  const content = document.getElementById('modalContent');
  if (!content) return;
  
  content.innerHTML = `
    <h2>⚙️ Sunucu Ayarları</h2>
    
    <!-- Genel -->
    <div class="settings-group">
      <div class="settings-group-title">Genel</div>
      
      <div class="settings-item" onclick="showServerNameEdit()">
        <div class="settings-item-left">📝 Sunucu Adı</div>
        <div class="settings-item-right">${serverState.name}</div>
      </div>
      
      <div class="settings-item" onclick="showServerDescEdit()">
        <div class="settings-item-left">📄 Açıklama</div>
        <div class="settings-item-right">${serverState.description || 'Yok'}</div>
      </div>
      
      <div class="settings-item" onclick="showServerIconEdit()">
        <div class="settings-item-left">🖼️ Sunucu İkonu</div>
        <div class="settings-item-right">
          <img src="${serverState.icon}" style="width:32px;height:32px;border-radius:8px">
        </div>
      </div>
      
      <div class="settings-item" onclick="showServerBannerEdit()">
        <div class="settings-item-left">🎨 Banner</div>
        <div class="settings-item-right">${serverState.banner ? 'Var' : 'Yok'}</div>
      </div>
    </div>
    
    <!-- Davet -->
    <div class="settings-group">
      <div class="settings-group-title">Davet</div>
      <div class="settings-item">
        <div class="settings-item-left">🔗 Davet Linki</div>
        <div class="settings-item-right" style="display:flex;align-items:center;gap:4px">
          <code style="font-size:10px">gettic.js.org/invite/${serverState.inviteCode}</code>
          <button class="ib" onclick="copyInviteLink()" style="width:24px;height:24px" title="Kopyala">📋</button>
        </div>
      </div>
      <div class="settings-item" onclick="refreshInviteLink()">
        <div class="settings-item-left">🔄 Linki Yenile</div>
        <div class="settings-item-right">→</div>
      </div>
    </div>
    
    <!-- Moderasyon -->
    <div class="settings-group">
      <div class="settings-group-title">Moderasyon</div>
      
      <div class="settings-item" onclick="cycleVerification()">
        <div class="settings-item-left">🛡️ Doğrulama Seviyesi</div>
        <div class="settings-item-right">${['Yok','Düşük','Orta','Yüksek'][serverState.verificationLevel]}</div>
      </div>
      
      <div class="settings-item" onclick="cycleExplicitFilter()">
        <div class="settings-item-left">🔞 İçerik Filtresi</div>
        <div class="settings-item-right">${['Kapalı','Üyeler İçin','Herkes İçin'][serverState.explicitFilter]}</div>
      </div>
      
      <div class="settings-item">
        <div class="settings-item-left">🔔 Varsayılan Bildirim</div>
        <div class="settings-item-right">${['Tüm Mesajlar','Sadece @mention'][serverState.defaultNotifications]}</div>
      </div>
    </div>
    
    <!-- Kanal Ayarları -->
    <div class="settings-group">
      <div class="settings-group-title">Kanallar</div>
      
      <div class="settings-item" onclick="showAFKChannelSelect()">
        <div class="settings-item-left">💤 AFK Kanalı</div>
        <div class="settings-item-right">${serverState.afkChannel || 'Yok'}</div>
      </div>
      
      <div class="settings-item" onclick="showSystemChannelSelect()">
        <div class="settings-item-left">📢 Sistem Kanalı</div>
        <div class="settings-item-right">${serverState.systemChannel || 'Yok'}</div>
      </div>
    </div>
    
    <!-- Tehlike Bölgesi -->
    <div class="settings-group">
      <div class="settings-group-title" style="color:var(--re)">⚠️ Tehlike Bölgesi</div>
      <div class="settings-item" onclick="deleteServer()">
        <div class="settings-item-left" style="color:var(--re)">🗑️ Sunucuyu Sil</div>
        <div class="settings-item-right">→</div>
      </div>
    </div>
  `;
  
  openModal('serverSettings');
}

// Sunucu adı düzenle
function showServerNameEdit() {
  const name = prompt('Yeni sunucu adı:', serverState.name);
  if (name && name.trim() && name.trim().length >= 2) {
    serverState.name = name.trim();
    document.getElementById('serverName').textContent = name;
    saveServerState();
    toast('✅ Sunucu adı güncellendi');
    showServerSettings();
  }
}

// Açıklama düzenle
function showServerDescEdit() {
  const desc = prompt('Sunucu açıklaması:', serverState.description);
  if (desc !== null) {
    serverState.description = desc.trim();
    saveServerState();
    toast('✅ Açıklama güncellendi');
    showServerSettings();
  }
}

// İkon düzenle
function showServerIconEdit() {
  const url = prompt('İkon URL:', serverState.icon);
  if (url && url.trim()) {
    serverState.icon = url.trim();
    saveServerState();
    toast('✅ İkon güncellendi');
    showServerSettings();
  }
}

// Banner düzenle
function showServerBannerEdit() {
  const url = prompt('Banner URL (boş bırakırsan kaldırılır):', serverState.banner);
  if (url !== null) {
    serverState.banner = url.trim();
    saveServerState();
    toast(url.trim() ? '✅ Banner eklendi' : '✅ Banner kaldırıldı');
    showServerSettings();
  }
}

// Davet linki
function copyInviteLink() {
  const link = `https://gettic.js.org/invite/${serverState.inviteCode}`;
  navigator.clipboard.writeText(link).then(() => toast('📋 Davet linki kopyalandı'));
}

function refreshInviteLink() {
  serverState.inviteCode = genId().substring(0, 8);
  saveServerState();
  toast('🔄 Link yenilendi');
  showServerSettings();
}

// Doğrulama seviyesi
function cycleVerification() {
  serverState.verificationLevel = (serverState.verificationLevel + 1) % 4;
  saveServerState();
  toast('🛡️ Doğrulama: ' + ['Yok','Düşük','Orta','Yüksek'][serverState.verificationLevel]);
  showServerSettings();
}

// İçerik filtresi
function cycleExplicitFilter() {
  serverState.explicitFilter = (serverState.explicitFilter + 1) % 3;
  saveServerState();
  toast('🔞 Filtre: ' + ['Kapalı','Üyeler','Herkes'][serverState.explicitFilter]);
  showServerSettings();
}

// AFK kanalı
function showAFKChannelSelect() {
  const channels = Store.channels?.filter(c => c.type === 'voice').map(c => c.name) || [];
  if (channels.length === 0) return toast('Ses kanalı yok', 'e');
  
  const choice = prompt('AFK kanalı seç:\n' + channels.map((c, i) => (i+1) + '. ' + c).join('\n') + '\n\n0 = Yok');
  const idx = parseInt(choice) - 1;
  
  if (idx === -1) {
    serverState.afkChannel = '';
  } else if (idx >= 0 && idx < channels.length) {
    serverState.afkChannel = channels[idx];
  }
  saveServerState();
  toast('✅ AFK kanalı güncellendi');
  showServerSettings();
}

// Sistem kanalı
function showSystemChannelSelect() {
  const channels = Store.channels?.filter(c => c.type === 'text').map(c => c.name) || [];
  if (channels.length === 0) return toast('Metin kanalı yok', 'e');
  
  const choice = prompt('Sistem kanalı seç:\n' + channels.map((c, i) => (i+1) + '. ' + c).join('\n') + '\n\n0 = Yok');
  const idx = parseInt(choice) - 1;
  
  if (idx === -1) {
    serverState.systemChannel = '';
  } else if (idx >= 0 && idx < channels.length) {
    serverState.systemChannel = channels[idx];
  }
  saveServerState();
  toast('✅ Sistem kanalı güncellendi');
  showServerSettings();
}

// Sunucu silme
function deleteServer() {
  if (!hasPermission(Store.user?._id, 'manageServer')) return toast('❌ Yetkiniz yok', 'e');
  if (confirm('SUNUCUYU SİLMEK İSTEDİĞİNİZE EMİN MİSİNİZ?\n\nBu işlem geri alınamaz!')) {
    if (confirm('Gerçekten emin misiniz? Tüm kanallar, mesajlar ve roller silinecek.')) {
      toast('🗑️ Sunucu silindi');
      // Gerçek silme işlemi backend'de yapılır
      closeModal();
    }
  }
}

// Kaydet
function saveServerState() {
  localStorage.setItem('gt_server', JSON.stringify(serverState));
}

// Yükle
function loadServerState() {
  const saved = localStorage.getItem('gt_server');
  if (saved) {
    try {
      Object.assign(serverState, JSON.parse(saved));
    } catch(e) {}
  }
}

// Banner göster
function renderServerBanner() {
  const banner = document.getElementById('serverBanner');
  if (!banner) return;
  
  if (serverState.banner) {
    banner.style.background = `url(${serverState.banner}) center/cover`;
    banner.style.height = '120px';
  } else {
    banner.style.background = 'linear-gradient(135deg, var(--ac), var(--ac2))';
    banner.style.height = '80px';
  }
}

// Sayfa yüklendiğinde
document.addEventListener('DOMContentLoaded', () => {
  loadServerState();
  
  // Server settings butonu
  const btn = document.getElementById('panelServerBtn');
  if (btn) btn.onclick = () => showServerSettings();
  
  renderServerBanner();
});
