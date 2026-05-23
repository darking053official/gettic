// ╔══════════════════════════════════════════════════════════════════╗
// ║                    GETTIC BOTS.JS - GÜNCELLENDİ                  ║
// ╚══════════════════════════════════════════════════════════════════╝

const botState = {
  bots: JSON.parse(localStorage.getItem('gt_bots') || '[]'),
  commands: {
    ping: { 
      name: 'ping', 
      description: 'Gecikmeyi gösterir',
      execute: (msg, args) => `🏓 Pong! \`${Date.now() - new Date(msg.createdAt).getTime()}ms\``
    },
    say: { 
      name: 'say', 
      description: 'Mesajı tekrarlar',
      execute: (msg, args) => args.join(' ') || 'Ne söyleyeyim?'
    },
    roll: { 
      name: 'roll', 
      description: 'Zar atar (1-6)',
      execute: (msg, args) => {
        const max = parseInt(args[0]) || 6;
        if (max < 1 || max > 1000000) return 'Geçerli bir sayı gir (1-1.000.000)';
        return `🎲 **${Math.floor(Math.random() * max) + 1}** (1-${max})`;
      }
    },
    choose: { 
      name: 'choose', 
      description: 'Seçeneklerden birini seçer',
      execute: (msg, args) => {
        const options = args.join(' ').split(',').map(o => o.trim()).filter(Boolean);
        return options.length > 0 ? `🤔 **${options[Math.floor(Math.random() * options.length)]}**` : 'Virgülle ayırarak seçenek belirt';
      }
    },
    avatar: { 
      name: 'avatar', 
      description: 'Avatar oluşturur',
      execute: (msg, args) => {
        const user = args[0] || msg.senderName;
        return `🖼️ ${user}: https://ui-avatars.com/api/?name=${encodeURIComponent(user)}&background=ec4899&color=fff&size=128`;
      }
    },
    serverinfo: { 
      name: 'serverinfo', 
      description: 'Sunucu bilgisi',
      execute: (msg, args) => {
        return `📊 **${Store.serverSettings?.name || 'Gettic'}**\n` +
               `👥 Kullanıcı: ${Object.keys(Store.userRoles || {}).length || 1}\n` +
               `# Kanal: ${(Store.channels || []).length}\n` +
               `💬 Mesaj: ${Store.messages?.length || 0}`;
      }
    },
    help: { 
      name: 'help', 
      description: 'Komut listesi',
      execute: (msg, args) => {
        const cmds = Object.values(botState.commands).map(c => `**!${c.name}** - ${c.description}`).join('\n');
        return `🤖 **Komutlar:**\n${cmds}`;
      }
    },
    time: {
      name: 'time',
      description: 'Saati gösterir',
      execute: (msg, args) => `🕐 ${new Date().toLocaleString('tr-TR')}`
    },
    clear: {
      name: 'clear',
      description: 'Sohbeti temizler (Admin)',
      execute: (msg, args) => {
        if (!hasPermission(msg.senderId, 'manageMessages')) return '❌ Yetkin yok!';
        const count = parseInt(args[0]) || 10;
        const channelMsgs = Store.messages.filter(m => m.channelId === (msg.channelId || Store.activeChannel));
        const toDelete = channelMsgs.slice(-count);
        Store.messages = Store.messages.filter(m => !toDelete.includes(m));
        if (typeof renderMessages === 'function') renderMessages();
        if (typeof saveStore === 'function') saveStore();
        return `🗑️ Son ${toDelete.length} mesaj temizlendi.`;
      }
    }
  }
};

// Bot oluştur
function createBot(name, prefix = '!') {
  if (!hasPermission(Store.user?._id, 'manageBots')) return toast('❌ Yetkiniz yok', 'e');
  if (!name?.trim()) return toast('Bot adı gerekli', 'e');
  if (name.length > 32) return toast('Bot adı çok uzun (max 32)', 'e');
  
  // Aynı isimde bot var mı?
  if (botState.bots.find(b => b.name.toLowerCase() === name.trim().toLowerCase())) {
    return toast('Bu isimde bir bot zaten var', 'e');
  }
  
  const bot = {
    id: genId(),
    name: name.trim(),
    prefix: prefix.slice(0, 5),
    token: 'bot_' + genId(),
    createdBy: Store.user._id,
    creatorName: Store.user.username,
    createdAt: new Date().toISOString(),
    active: true,
    description: '',
    avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=6366f1&color=fff`,
    commands: ['ping', 'say', 'roll', 'choose', 'help', 'time'],
    messageCount: 0,
    lastActive: null
  };
  
  botState.bots.push(bot);
  saveBotState();
  
  // MongoDB'ye kaydet
  if (typeof MongoSync !== 'undefined') {
    fetch(API + '/api/bots', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + Store.token
      },
      body: JSON.stringify(bot)
    }).catch(() => {});
  }
  
  toast('✅ Bot oluşturuldu: ' + name);
  showBotDetail(bot.id);
}

// Bot sil
function deleteBot(botId) {
  if (!hasPermission(Store.user?._id, 'manageBots')) return toast('❌ Yetkiniz yok', 'e');
  
  const bot = botState.bots.find(b => b.id === botId);
  if (bot && bot.createdBy !== Store.user?._id && !hasPermission(Store.user?._id, 'administrator')) {
    return toast('❌ Sadece bot sahibi silebilir', 'e');
  }
  
  botState.bots = botState.bots.filter(b => b.id !== botId);
  saveBotState();
  
  // MongoDB'den sil
  if (typeof MongoSync !== 'undefined') {
    fetch(API + '/api/bots/' + botId, {
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer ' + Store.token }
    }).catch(() => {});
  }
  
  toast('🗑️ Bot silindi');
  closeModal();
}

// Bot mesajını işle
function handleBotMessage(msg) {
  if (!msg.content?.startsWith('!')) return null;
  
  const parts = msg.content.substring(1).trim().split(/\s+/);
  const command = parts[0].toLowerCase();
  const args = parts.slice(1);
  
  const cmd = botState.commands[command];
  if (!cmd) return null;
  
  // Aktif bot bul
  const activeBot = botState.bots.find(b => b.active && b.commands.includes(command));
  if (!activeBot) return null;
  
  // Rate limit - 3 saniyede 1 komut
  if (activeBot.lastActive && Date.now() - new Date(activeBot.lastActive).getTime() < 3000) {
    return null;
  }
  
  try {
    const response = cmd.execute(msg, args);
    if (!response) return null;
    
    const botMsg = {
      _id: 'bot_' + genId(),
      content: response,
      senderName: activeBot.name,
      senderId: 'bot_' + activeBot.id,
      channelId: msg.channelId || Store.activeChannel,
      createdAt: new Date().toISOString(),
      isBot: true,
      botId: activeBot.id
    };
    
    activeBot.messageCount++;
    activeBot.lastActive = new Date().toISOString();
    saveBotState();
    
    // Socket.IO ile gönder
    if (socket && socket.connected) {
      socket.emit('send_message', botMsg);
    }
    
    return botMsg;
  } catch(e) {
    console.error('Bot komut hatası:', e);
    return null;
  }
}

// Bot detay modal
function showBotDetail(botId) {
  const bot = botState.bots.find(b => b.id === botId);
  if (!bot) return;
  
  const content = document.getElementById('modalContent');
  if (!content) return;
  
  content.innerHTML = `
    <h2>🤖 ${bot.name}</h2>
    <div style="text-align:center;margin-bottom:12px">
      <img src="${bot.avatar}" style="width:60px;height:60px;border-radius:50%" alt="${bot.name}">
    </div>
    <div class="settings-group">
      <div class="settings-group-title">Bilgi</div>
      <div class="settings-item"><div class="settings-item-left">📝 İsim</div><div class="settings-item-right">${bot.name}</div></div>
      <div class="settings-item"><div class="settings-item-left"># Prefix</div><div class="settings-item-right">${bot.prefix}</div></div>
      <div class="settings-item"><div class="settings-item-left">👤 Oluşturan</div><div class="settings-item-right">${bot.creatorName}</div></div>
      <div class="settings-item"><div class="settings-item-left">💬 Mesaj</div><div class="settings-item-right">${bot.messageCount}</div></div>
      <div class="settings-item"><div class="settings-item-left">🕐 Son Aktif</div><div class="settings-item-right">${bot.lastActive ? new Date(bot.lastActive).toLocaleString('tr-TR') : 'Hiç'}</div></div>
      <div class="settings-item" onclick="toggleBot('${botId}')">
        <div class="settings-item-left">✅ Aktif</div>
        <div class="settings-item-right"><div class="toggle ${bot.active?'on':''}"></div></div>
      </div>
    </div>
    <div class="settings-group">
      <div class="settings-group-title">Komutlar (${bot.commands.length})</div>
      ${bot.commands.map(c => `
        <div class="settings-item"><div class="settings-item-left">!${c}</div><div class="settings-item-right">${botState.commands[c]?.description || ''}</div></div>
      `).join('')}
    </div>
    <div class="settings-group">
      <div class="settings-group-title">Token</div>
      <code style="font-size:10px;word-break:break-all;user-select:all">${bot.token}</code>
    </div>
    <div class="msep"></div>
    ${bot.createdBy === Store.user?._id || hasPermission(Store.user?._id, 'administrator') ? 
      `<button class="mb danger" onclick="deleteBot('${botId}');closeModal()">🗑️ Botu Sil</button>` : ''}
  `;
  
  openModal('bot');
}

// Bot toggle
function toggleBot(botId) {
  const bot = botState.bots.find(b => b.id === botId);
  if (bot) { bot.active = !bot.active; saveBotState(); showBotDetail(botId); }
}

// Bot listesi
function showBotList() {
  const content = document.getElementById('modalContent');
  if (!content) return;
  
  content.innerHTML = `
    <h2>🤖 Botlar</h2>
    <button class="mb sec" onclick="showCreateBotForm()">+ Bot Oluştur</button>
    ${botState.bots.length === 0 ? 
      '<p style="color:var(--t3);text-align:center;padding:20px">Henüz bot yok</p>' :
      botState.bots.map(b => `
        <div class="mitem" onclick="showBotDetail('${b.id}')" style="justify-content:space-between">
          <div style="display:flex;align-items:center;gap:8px">
            <img src="${b.avatar}" style="width:32px;height:32px;border-radius:50%" alt="${b.name}">
            <div><div class="mname">${b.name}</div><div class="msub">${b.messageCount} mesaj · ${b.commands.length} komut</div></div>
          </div>
          <span style="font-size:10px;color:${b.active?'var(--gr)':'var(--re)'}">${b.active?'Aktif':'Pasif'}</span>
        </div>
      `).join('')
    }
  `;
  
  openModal('bots');
}

function showCreateBotForm() {
  const content = document.getElementById('modalContent');
  if (!content) return;
  content.innerHTML = `
    <h2>🤖 Bot Oluştur</h2>
    <input class="mi" id="newBotName" placeholder="Bot adı" maxlength="32">
    <input class="mi" id="newBotPrefix" placeholder="Prefix (varsayılan: !)" value="!" maxlength="5">
    <button class="mb" onclick="submitCreateBot()">Oluştur</button>
  `;
}

function submitCreateBot() {
  const name = document.getElementById('newBotName')?.value?.trim();
  const prefix = document.getElementById('newBotPrefix')?.value?.trim() || '!';
  if (name) { createBot(name, prefix); closeModal(); }
}

// Mesaj gönderme öncesi bot kontrolü
function checkBotCommand(content) {
  if (!content?.startsWith('!')) return false;
  const botMsg = handleBotMessage({ 
    content, 
    channelId: Store.activeChannel,
    senderName: Store.user?.username,
    senderId: Store.user?._id,
    createdAt: new Date().toISOString()
  });
  if (botMsg) {
    Store.messages.push(botMsg);
    if (typeof renderMessages === 'function') renderMessages();
    if (typeof saveStore === 'function') saveStore();
    if (typeof scrollToBottom === 'function') scrollToBottom();
    return true;
  }
  return false;
}

// Kaydet
function saveBotState() {
  localStorage.setItem('gt_bots', JSON.stringify(botState.bots));
}

// CSS
const botStyle = document.createElement('style');
botStyle.textContent = `
  .msg.bot-msg { border-left: 3px solid #6366f1; padding-left: 10px; }
  .msg.bot-msg .msg-av { background: linear-gradient(135deg, #6366f1, #8b5cf6); }
  .bot-badge { font-size: 8px; background: #6366f1; color: #fff; padding: 1px 5px; border-radius: 3px; margin-left: 4px; }
`;
document.head.appendChild(botStyle);

console.log('✅ Bots.js yüklendi');
