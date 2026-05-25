// ╔══════════════════════════════════════════════════════════════════╗
// ║   GETTIC BOTS.JS v2.0 - Tam Geliştirilmiş                        ║
// ╚══════════════════════════════════════════════════════════════════╝

// ============ BOT STATE ============
const botState = (() => {
  let _bots = [];
  try { _bots = JSON.parse(localStorage.getItem('gt_bots') || '[]'); } catch {}

  return {
    bots: _bots,
    rateLimits: new Map(),   // botId → last command timestamp
    cooldowns: new Map(),    // userId+command → timestamp

    // ─── Built-in komutlar ───
    commands: {
      ping: {
        name: 'ping',
        description: 'Gecikmeyi gösterir',
        usage: '!ping',
        category: 'genel',
        execute: (msg) => {
          const ms = Date.now() - new Date(msg.createdAt).getTime();
          const bar = '█'.repeat(Math.min(Math.floor(ms / 20), 10)) + '░'.repeat(Math.max(10 - Math.floor(ms / 20), 0));
          return `🏓 **Pong!**\n\`${bar}\` \`${ms}ms\``;
        }
      },

      say: {
        name: 'say',
        description: 'Verilen mesajı tekrarlar',
        usage: '!say <mesaj>',
        category: 'genel',
        execute: (msg, args) => {
          if (!args.length) return '❓ Kullanım: `!say <mesaj>`';
          return args.join(' ').substring(0, 500);
        }
      },

      roll: {
        name: 'roll',
        description: 'Zar atar',
        usage: '!roll [max]',
        category: 'eğlence',
        execute: (msg, args) => {
          const max = Math.min(Math.max(parseInt(args[0]) || 6, 2), 1_000_000);
          const result = Math.floor(Math.random() * max) + 1;
          const pct = Math.round((result / max) * 100);
          return `🎲 **${result}** / ${max}  (${pct}%)`;
        }
      },

      choose: {
        name: 'choose',
        description: 'Seçeneklerden birini seçer',
        usage: '!choose seçenek1, seçenek2',
        category: 'eğlence',
        execute: (msg, args) => {
          const opts = args.join(' ').split(',').map(o => o.trim()).filter(Boolean);
          if (opts.length < 2) return '❓ Kullanım: `!choose a, b, c`';
          const pick = opts[Math.floor(Math.random() * opts.length)];
          return `🤔 **${pick}**\n_${opts.length} seçenekten seçildi_`;
        }
      },

      flip: {
        name: 'flip',
        description: 'Yazı tura atar',
        usage: '!flip',
        category: 'eğlence',
        execute: () => Math.random() > 0.5 ? '🪙 **Yazı**' : '🪙 **Tura**'
      },

      avatar: {
        name: 'avatar',
        description: 'Avatar oluşturur',
        usage: '!avatar [kullanıcı]',
        category: 'genel',
        execute: (msg, args) => {
          const user = args.join(' ').trim() || msg.senderName;
          const url = `https://ui-avatars.com/api/?name=${encodeURIComponent(user)}&background=6366f1&color=fff&size=128&bold=true`;
          return `🖼️ **${escapeHtml(user)}** için avatar:\n${url}`;
        }
      },

      serverinfo: {
        name: 'serverinfo',
        description: 'Sunucu istatistiklerini gösterir',
        usage: '!serverinfo',
        category: 'bilgi',
        execute: () => {
          const name    = Store.serverSettings?.name  || 'Gettic';
          const members = Object.keys(Store.userRoles || {}).length || 1;
          const chans   = (Store.channels || []).length;
          const msgs    = Store.messages?.length || 0;
          const cats    = (Store.categories || []).length;
          return `📊 **${name}**\n👥 Üye: ${members}\n# Kanal: ${chans} (${cats} kategori)\n💬 Mesaj: ${msgs}`;
        }
      },

      userinfo: {
        name: 'userinfo',
        description: 'Kullanıcı bilgisi gösterir',
        usage: '!userinfo [kullanıcı]',
        category: 'bilgi',
        execute: (msg, args) => {
          const name    = args.join(' ').trim() || msg.senderName;
          const msgs    = Store.messages?.filter(m => m.senderName === name).length || 0;
          const role    = typeof getHighestRole === 'function'
            ? getHighestRole(msg.senderId)?.name || 'Üye'
            : 'Üye';
          return `👤 **${escapeHtml(name)}**\n🏷️ Rol: ${role}\n💬 Mesaj: ${msgs}`;
        }
      },

      time: {
        name: 'time',
        description: 'Tarih ve saati gösterir',
        usage: '!time',
        category: 'genel',
        execute: () => {
          const now = new Date();
          return `🕐 **${now.toLocaleString('tr-TR', { dateStyle:'full', timeStyle:'medium' })}**`;
        }
      },

      calc: {
        name: 'calc',
        description: 'Basit hesap yapar',
        usage: '!calc <işlem>',
        category: 'araç',
        execute: (msg, args) => {
          const expr = args.join('').replace(/[^0-9+\-*/().%\s]/g, '');
          if (!expr) return '❓ Kullanım: `!calc 2+2`';
          try {
            // eslint-disable-next-line no-new-func
            const result = Function('"use strict";return (' + expr + ')')();
            if (!isFinite(result)) return '❌ Geçersiz işlem';
            return `🧮 \`${expr}\` = **${result}**`;
          } catch {
            return '❌ Hesaplanamadı';
          }
        }
      },

      poll: {
        name: 'poll',
        description: 'Hızlı anket başlatır',
        usage: '!poll soru | a, b, c',
        category: 'araç',
        execute: (msg, args) => {
          const raw  = args.join(' ');
          const [q, optsRaw] = raw.split('|').map(s => s.trim());
          if (!q || !optsRaw) return '❓ Kullanım: `!poll soru | a, b, c`';
          const opts = optsRaw.split(',').map(o => o.trim()).filter(Boolean).slice(0,10);
          if (opts.length < 2) return '❌ En az 2 seçenek gerekli';
          const emojis = ['1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟'];
          const lines  = opts.map((o, i) => `${emojis[i]} ${o}`).join('\n');
          return `📊 **${escapeHtml(q)}**\n${lines}`;
        }
      },

      clear: {
        name: 'clear',
        description: 'Son N mesajı temizler (Admin)',
        usage: '!clear [sayı]',
        category: 'moderasyon',
        cooldown: 5000,
        execute: (msg, args) => {
          if (!hasPermission(msg.senderId, 'manageMessages')) return '❌ Yetkin yok!';
          const count = Math.min(Math.max(parseInt(args[0]) || 10, 1), 100);
          const chanMsgs = Store.messages.filter(m => m.channelId === (msg.channelId || Store.activeChannel));
          const toDelete = new Set(chanMsgs.slice(-count).map(m => m._id));
          Store.messages = Store.messages.filter(m => !toDelete.has(m._id));
          if (typeof renderMessages === 'function') renderMessages();
          if (typeof saveStore === 'function') saveStore();
          return `🗑️ Son **${toDelete.size}** mesaj temizlendi.`;
        }
      },

      ban: {
        name: 'ban',
        description: 'Kullanıcıyı yasaklar (Admin)',
        usage: '!ban <kullanıcı> [sebep]',
        category: 'moderasyon',
        execute: (msg, args) => {
          if (!hasPermission(msg.senderId, 'banMembers')) return '❌ Yetkin yok!';
          const target = args[0];
          if (!target) return '❓ Kullanım: `!ban <kullanıcı>`';
          const reason = args.slice(1).join(' ') || 'Sebep belirtilmedi';
          if (typeof banUser === 'function') banUser(target, reason);
          return `🔨 **${escapeHtml(target)}** yasaklandı.\n📝 Sebep: ${escapeHtml(reason)}`;
        }
      },

      mute: {
        name: 'mute',
        description: 'Kullanıcıyı susturur (Mod)',
        usage: '!mute <kullanıcı> [dakika]',
        category: 'moderasyon',
        execute: (msg, args) => {
          if (!hasPermission(msg.senderId, 'muteMembers')) return '❌ Yetkin yok!';
          const target = args[0];
          if (!target) return '❓ Kullanım: `!mute <kullanıcı> [dakika]`';
          const mins = parseInt(args[1]) || 10;
          if (typeof muteUser === 'function') muteUser(target, mins);
          return `🔇 **${escapeHtml(target)}** ${mins} dakika susturuldu.`;
        }
      },

      help: {
        name: 'help',
        description: 'Komut listesini gösterir',
        usage: '!help [komut]',
        category: 'genel',
        execute: (msg, args) => {
          const cmds = Object.values(botState.commands);

          // Spesifik komut yardımı
          if (args[0]) {
            const cmd = botState.commands[args[0].toLowerCase()];
            if (!cmd) return `❌ \`${args[0]}\` komutu bulunamadı`;
            return `📖 **!${cmd.name}**\n📝 ${cmd.description}\n💡 Kullanım: \`${cmd.usage}\``;
          }

          // Kategoriye göre grupla
          const cats = {};
          cmds.forEach(c => {
            const cat = c.category || 'genel';
            if (!cats[cat]) cats[cat] = [];
            cats[cat].push(`\`!${c.name}\``);
          });

          const CAT_NAMES = { genel:'⚙️ Genel', eğlence:'🎮 Eğlence', bilgi:'ℹ️ Bilgi', araç:'🔧 Araç', moderasyon:'🛡️ Moderasyon' };
          const lines = Object.entries(cats)
            .map(([cat, list]) => `**${CAT_NAMES[cat]||cat}**\n${list.join(' ')}`)
            .join('\n\n');

          return `🤖 **Komut Listesi**\n\n${lines}\n\n💡 \`!help <komut>\` ile detay`;
        }
      }
    }
  };
})();

// ============ YARDIMCI ============
function _botLog(msg, level = 'log') {
  console[level](`%c[Bot] ${msg}`, 'color:#6366f1;font-weight:bold');
}

function _botAvatar(name, color = '6366f1') {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${color}&color=fff&size=128&bold=true`;
}

// ============ BOT OLUŞTUR ============
function createBot(name, prefix = '!', description = '') {
  if (typeof hasPermission === 'function' && !hasPermission(Store.user?._id, 'manageBots')) {
    return toast('Yetkiniz yok', 'e');
  }

  name = name?.trim();
  if (!name)           return toast('Bot adı gerekli', 'e');
  if (name.length < 2) return toast('Bot adı en az 2 karakter olmalı', 'e');
  if (name.length > 32) return toast('Bot adı çok uzun (max 32)', 'e');
  if (!/^[a-zA-ZğüşıöçĞÜŞİÖÇ0-9 _\-]+$/.test(name)) return toast('Bot adında geçersiz karakter var', 'e');

  if (botState.bots.find(b => b.name.toLowerCase() === name.toLowerCase())) {
    return toast('Bu isimde bir bot zaten var', 'e');
  }

  if (botState.bots.length >= 10) {
    return toast('Maksimum 10 bot oluşturulabilir', 'w');
  }

  const bot = {
    id: 'bot_' + genId(),
    name,
    prefix: (prefix || '!').slice(0, 5),
    token: 'gt_' + genId() + '_' + Date.now().toString(36),
    description: description.substring(0, 128),
    avatar: _botAvatar(name),
    createdBy: Store.user._id,
    creatorName: Store.user.username,
    createdAt: new Date().toISOString(),
    active: true,
    commands: ['ping', 'say', 'roll', 'choose', 'flip', 'help', 'time', 'calc'],
    messageCount: 0,
    commandCount: 0,
    lastActive: null,
    webhooks: []
  };

  botState.bots.push(bot);
  _saveBotState();

  // Sunucuya kaydet
  _syncBot('POST', bot);

  toast('Bot oluşturuldu: ' + name);
  _botLog('Yeni bot oluşturuldu: ' + name);
  openModal('botDetail', { botId: bot.id });
}

// ============ BOT SİL ============
function deleteBot(botId) {
  const bot = botState.bots.find(b => b.id === botId);
  if (!bot) return toast('Bot bulunamadı', 'e');

  const isOwner = bot.createdBy === Store.user?._id;
  const isAdmin = typeof hasPermission === 'function' && hasPermission(Store.user?._id, 'administrator');

  if (!isOwner && !isAdmin) {
    return toast('Sadece bot sahibi silebilir', 'e');
  }

  if (!confirm(`"${bot.name}" botunu silmek istediğinizden emin misiniz?`)) return;

  botState.bots = botState.bots.filter(b => b.id !== botId);
  _saveBotState();
  _syncBot('DELETE', bot);

  toast('Bot silindi');
  closeModal();
}

// ============ BOT TOGGLE ============
function toggleBot(botId) {
  const bot = botState.bots.find(b => b.id === botId);
  if (!bot) return;
  bot.active = !bot.active;
  _saveBotState();
  toast(bot.active ? `${bot.name} aktif edildi` : `${bot.name} durduruldu`);
  openModal('botDetail', { botId });
}

// ============ BOT KOMUT TOGGLE ============
function toggleBotCommand(botId, cmdName) {
  const bot = botState.bots.find(b => b.id === botId);
  if (!bot) return;
  const idx = bot.commands.indexOf(cmdName);
  if (idx > -1) bot.commands.splice(idx, 1);
  else           bot.commands.push(cmdName);
  _saveBotState();
  openModal('botDetail', { botId });
}

// ============ MESAJ İŞLE ============
function handleBotMessage(msg) {
  const content = msg.content?.trim();
  if (!content) return null;

  // Aktif botu bul (prefix ile eşleşen)
  const bot = botState.bots.find(b => {
    if (!b.active) return false;
    return content.startsWith(b.prefix || '!');
  });
  if (!bot) return null;

  const prefix  = bot.prefix || '!';
  const body    = content.slice(prefix.length).trim();
  const parts   = body.split(/\s+/);
  const cmdName = parts[0].toLowerCase();
  const args    = parts.slice(1);

  if (!cmdName) return null;

  // Komut tanımlı ve botta aktif mi?
  const cmd = botState.commands[cmdName];
  if (!cmd || !bot.commands.includes(cmdName)) return null;

  // ─── Rate limit (bot başına 2sn) ───
  const rl = botState.rateLimits.get(bot.id) || 0;
  if (Date.now() - rl < 2000) return null;
  botState.rateLimits.set(bot.id, Date.now());

  // ─── Cooldown (kullanıcı+komut başına) ───
  const cdKey = `${msg.senderId}:${cmdName}`;
  const cdVal = botState.cooldowns.get(cdKey) || 0;
  const cdMs  = cmd.cooldown || 1000;
  if (Date.now() - cdVal < cdMs) {
    const remaining = Math.ceil((cdMs - (Date.now() - cdVal)) / 1000);
    return _makeBotMsg(bot, msg, `⏳ ${remaining}s bekle`, 'cooldown');
  }
  botState.cooldowns.set(cdKey, Date.now());

  // ─── Çalıştır ───
  let response;
  try {
    response = cmd.execute(msg, args);
  } catch (err) {
    _botLog('Komut hatası (' + cmdName + '): ' + err.message, 'error');
    response = '❌ Komut çalıştırılırken hata oluştu.';
  }

  if (!response) return null;

  bot.messageCount++;
  bot.commandCount = (bot.commandCount || 0) + 1;
  bot.lastActive   = new Date().toISOString();
  _saveBotState();

  const botMsg = _makeBotMsg(bot, msg, response);

  // Socket'e gönder
  if (typeof socket !== 'undefined' && socket?.connected) {
    socket.emit('send_message', botMsg);
  }

  return botMsg;
}

function _makeBotMsg(bot, triggerMsg, content, type = 'reply') {
  return {
    _id:        'bm_' + genId(),
    content,
    senderName: bot.name,
    senderId:   bot.id,
    channelId:  triggerMsg.channelId || Store.activeChannel,
    createdAt:  new Date().toISOString(),
    isBot:      true,
    botId:      bot.id,
    replyTo:    triggerMsg._id,
    _type:      type
  };
}

// ============ MESAJ GÖNDERME ÖNCESİ KONTROL ============
function checkBotCommand(content) {
  if (!content?.trim()) return false;

  const fakeMsg = {
    content,
    channelId:  Store.activeChannel,
    senderName: Store.user?.username,
    senderId:   Store.user?._id,
    createdAt:  new Date().toISOString(),
    _id:        'usr_' + genId()
  };

  const botMsg = handleBotMessage(fakeMsg);
  if (!botMsg) return false;

  Store.messages.push(botMsg);
  if (typeof renderMessages === 'function') renderMessages();
  if (typeof saveStore === 'function') saveStore();
  if (typeof scrollToBottom === 'function') scrollToBottom();

  return true;
}

// ============ ÖZEL KOMUT EKLE ============
function addCustomCommand(botId, name, response) {
  const bot = botState.bots.find(b => b.id === botId);
  if (!bot) return toast('Bot bulunamadı', 'e');

  name = name?.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
  if (!name || name.length < 1) return toast('Komut adı geçersiz', 'e');
  if (name.length > 20)          return toast('Komut adı çok uzun', 'e');
  if (botState.commands[name])   return toast('Bu komut zaten var', 'e');
  if (!response?.trim())         return toast('Yanıt gerekli', 'e');

  const _resp = response.trim().substring(0, 500);

  botState.commands[name] = {
    name,
    description: 'Özel komut',
    usage: `!${name}`,
    category: 'özel',
    custom: true,
    execute: () => _resp
  };

  if (!bot.commands.includes(name)) bot.commands.push(name);
  _saveBotState();

  toast(`!${name} komutu eklendi`);
  openModal('botDetail', { botId });
}

// ============ WEBHOOK ============
function createWebhook(botId, channelId, url) {
  const bot = botState.bots.find(b => b.id === botId);
  if (!bot) return;
  if (!bot.webhooks) bot.webhooks = [];
  if (bot.webhooks.length >= 5) return toast('Maksimum 5 webhook', 'w');

  bot.webhooks.push({ id: genId(), channelId, url, createdAt: new Date().toISOString() });
  _saveBotState();
  toast('Webhook eklendi');
}

async function triggerWebhook(botId, webhookId, payload) {
  const bot = botState.bots.find(b => b.id === botId);
  const wh  = bot?.webhooks?.find(w => w.id === webhookId);
  if (!wh) return;

  try {
    await fetch(wh.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, botId, timestamp: Date.now() })
    });
  } catch (e) {
    _botLog('Webhook hatası: ' + e.message, 'warn');
  }
}

// ============ TOKEN YENİLE ============
function regenerateToken(botId) {
  const bot = botState.bots.find(b => b.id === botId);
  if (!bot) return;
  if (!confirm('Token yenilenecek. Mevcut entegrasyonlar çalışmayı durduracak. Devam?')) return;
  bot.token = 'gt_' + genId() + '_' + Date.now().toString(36);
  _saveBotState();
  toast('Token yenilendi');
  openModal('botDetail', { botId });
}

// ============ TOKEN KOPYALA ============
function copyBotToken(token) {
  navigator.clipboard.writeText(token)
    .then(() => toast('Token kopyalandı'))
    .catch(() => {
      const ta = document.createElement('textarea');
      ta.value = token;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
      toast('Token kopyalandı');
    });
}

// ============ MODAL TEMPLATES ============

// Bots.js kendi modal içeriklerini ui.js'teki MODAL_TEMPLATES'e ekler
if (typeof MODAL_TEMPLATES !== 'undefined') {

  MODAL_TEMPLATES.botList = () => {
    const bots = botState.bots;
    return `
      <div class="gm-header">
        ${uiIcon('cpu', 20)}
        <h2>Botlar</h2>
        <span class="gm-badge">${bots.length}/10</span>
        <button class="gm-header-btn" onclick="openModal('botCreate')" title="Bot Oluştur">${uiIcon('plus', 16)}</button>
      </div>
      <div class="gm-body">
        ${bots.length === 0
          ? `<div class="gm-empty">${uiIcon('cpu', 32)}<span>Henüz bot yok</span><small>İlk botunu oluştur!</small></div>`
          : `<div class="gm-list">
              ${bots.map(b => `
                <div class="gm-list-item gm-bot-item" onclick="openModal('botDetail',{botId:'${b.id}'})">
                  <div class="gm-bot-av" style="background-image:url('${b.avatar}')">
                    <span class="gm-bot-status ${b.active ? 'on' : 'off'}"></span>
                  </div>
                  <div class="gm-item-info">
                    <span class="gm-item-name">${escapeHtml(b.name)}</span>
                    <span class="gm-item-sub">${b.prefix} prefix · ${b.commandCount || 0} komut çalıştı</span>
                  </div>
                  <span class="gm-badge ${b.active ? '' : 'red'}">${b.active ? 'Aktif' : 'Pasif'}</span>
                </div>`).join('')}
            </div>`}
      </div>`;
  };

  MODAL_TEMPLATES.botCreate = () => `
    <div class="gm-header">
      ${uiIcon('cpu', 20)}
      <h2>Bot Oluştur</h2>
    </div>
    <div class="gm-body">
      <div class="gm-bot-create-av" id="botCreateAvPreview">
        <span id="botCreateAvLetter">?</span>
      </div>
      <div class="gm-field">
        <label class="gm-label">Bot Adı</label>
        <div class="gm-input-wrap">
          ${uiIcon('cpu', 14)}
          <input class="gm-input" id="newBotName" placeholder="Harika Bot" maxlength="32"
            oninput="document.getElementById('botCreateAvLetter').textContent=this.value.charAt(0).toUpperCase()||'?'"
            onkeydown="if(event.key==='Enter')document.getElementById('newBotPrefix').focus()">
        </div>
      </div>
      <div class="gm-field">
        <label class="gm-label">Prefix</label>
        <div class="gm-input-wrap">
          ${uiIcon('hash', 14)}
          <input class="gm-input" id="newBotPrefix" value="!" maxlength="5" style="font-family:monospace"
            onkeydown="if(event.key==='Enter')document.getElementById('newBotDesc').focus()">
        </div>
      </div>
      <div class="gm-field">
        <label class="gm-label">Açıklama <span class="gm-label-hint">(isteğe bağlı)</span></label>
        <input class="gm-input" id="newBotDesc" placeholder="Bu bot ne yapıyor?" maxlength="128">
      </div>
      <div class="gm-actions">
        <button class="gm-btn ghost" onclick="openModal('botList')">Geri</button>
        <button class="gm-btn primary" onclick="_submitCreateBot()">${uiIcon('plus', 14)} Oluştur</button>
      </div>
    </div>`;

  MODAL_TEMPLATES.botDetail = (data) => {
    const bot = botState.bots.find(b => b.id === data?.botId);
    if (!bot) return `<div class="gm-body"><div class="gm-empty">${uiIcon('alert-triangle',28)}<span>Bot bulunamadı</span></div></div>`;

    const isOwner = bot.createdBy === Store.user?._id;
    const isAdmin = typeof hasPermission === 'function' && hasPermission(Store.user?._id, 'administrator');
    const canEdit = isOwner || isAdmin;
    const cmdCats = {};
    Object.values(botState.commands).forEach(c => {
      const cat = c.category || 'genel';
      if (!cmdCats[cat]) cmdCats[cat] = [];
      cmdCats[cat].push(c);
    });
    const CAT_ICONS = { genel:'settings', eğlence:'smile', bilgi:'info', araç:'tool', moderasyon:'shield', özel:'star' };

    return `
      <div class="gm-header">
        <button class="gm-header-btn" onclick="openModal('botList')">${uiIcon('arrow-left', 16)}</button>
        <h2>${escapeHtml(bot.name)}</h2>
        <div class="gm-toggle sm ${bot.active ? 'on' : ''}" onclick="toggleBot('${bot.id}')" style="cursor:pointer"><div class="gm-toggle-knob"></div></div>
      </div>
      <div class="gm-body">
        <div class="gm-bot-hero">
          <div class="gm-bot-hero-av" style="background-image:url('${bot.avatar}')">
            <span class="gm-bot-status lg ${bot.active ? 'on' : 'off'}"></span>
          </div>
          <div>
            <h3>${escapeHtml(bot.name)}</h3>
            <span class="gm-item-sub">${escapeHtml(bot.description || 'Açıklama yok')}</span>
          </div>
        </div>

        <div class="gm-bot-stats">
          <div class="gm-stat"><span class="gm-stat-val">${bot.messageCount}</span><span class="gm-stat-lbl">Yanıt</span></div>
          <div class="gm-stat"><span class="gm-stat-val">${bot.commandCount || 0}</span><span class="gm-stat-lbl">Komut</span></div>
          <div class="gm-stat"><span class="gm-stat-val">${bot.commands.length}</span><span class="gm-stat-lbl">Aktif</span></div>
        </div>

        <div class="gm-divider"></div>
        <div class="gm-section-label">Komutlar</div>
        ${Object.entries(cmdCats).map(([cat, cmds]) => `
          <div class="gm-bot-cmd-cat">
            <div class="gm-bot-cmd-cat-label">${uiIcon(CAT_ICONS[cat]||'circle', 12)} ${cat}</div>
            <div class="gm-bot-cmd-grid">
              ${cmds.map(c => `
                <button class="gm-bot-cmd-btn ${bot.commands.includes(c.name) ? 'on' : ''}"
                  onclick="toggleBotCommand('${bot.id}','${c.name}')"
                  title="${escapeHtml(c.description)}">
                  <code>!${c.name}</code>
                  ${bot.commands.includes(c.name) ? `<span class="gm-bot-cmd-check">${uiIcon('check', 10)}</span>` : ''}
                </button>`).join('')}
            </div>
          </div>`).join('')}

        <div class="gm-divider"></div>
        <div class="gm-section-label">Bilgi</div>
        <div class="gm-info-rows">
          <div class="gm-info-row"><span>Prefix</span><code>${escapeHtml(bot.prefix)}</code></div>
          <div class="gm-info-row"><span>Oluşturan</span><span>${escapeHtml(bot.creatorName)}</span></div>
          <div class="gm-info-row"><span>Son Aktif</span><span>${bot.lastActive ? new Date(bot.lastActive).toLocaleString('tr-TR') : 'Hiç'}</span></div>
          <div class="gm-info-row"><span>Oluşturulma</span><span>${new Date(bot.createdAt).toLocaleDateString('tr-TR')}</span></div>
        </div>

        ${canEdit ? `
          <div class="gm-divider"></div>
          <div class="gm-section-label">Token</div>
          <div class="gm-token-box">
            <code id="botToken_${bot.id}" class="gm-token-val">••••••••••••••••••••••</code>
            <div class="gm-token-btns">
              <button class="gm-btn ghost sm" onclick="_toggleTokenVisibility('${bot.id}','${escapeHtml(bot.token)}')">${uiIcon('eye', 13)} Göster</button>
              <button class="gm-btn ghost sm" onclick="copyBotToken('${escapeHtml(bot.token)}')">${uiIcon('copy', 13)} Kopyala</button>
              <button class="gm-btn ghost sm" onclick="regenerateToken('${bot.id}')">${uiIcon('refresh-cw', 13)} Yenile</button>
            </div>
          </div>

          <div class="gm-divider"></div>
          <div class="gm-section-label">Özel Komut Ekle</div>
          <div class="gm-custom-cmd-form">
            <input class="gm-input" id="customCmdName_${bot.id}" placeholder="komutadi" maxlength="20" style="font-family:monospace;flex:0 0 120px">
            <input class="gm-input" id="customCmdResp_${bot.id}" placeholder="Yanıt metni..." maxlength="500" style="flex:1">
            <button class="gm-btn primary sm" onclick="addCustomCommand('${bot.id}',document.getElementById('customCmdName_${bot.id}').value,document.getElementById('customCmdResp_${bot.id}').value)">${uiIcon('plus', 13)}</button>
          </div>

          <div class="gm-actions" style="margin-top:16px">
            <button class="gm-btn danger" onclick="deleteBot('${bot.id}')">${uiIcon('trash', 14)} Sil</button>
          </div>` : ''}
      </div>`;
  };
}

// ============ FORM SUBMİT ============
function _submitCreateBot() {
  const name   = document.getElementById('newBotName')?.value?.trim();
  const prefix = document.getElementById('newBotPrefix')?.value?.trim() || '!';
  const desc   = document.getElementById('newBotDesc')?.value?.trim() || '';
  if (!name) return toast('Bot adı gerekli', 'e');
  createBot(name, prefix, desc);
}

function _toggleTokenVisibility(botId, token) {
  const el  = document.getElementById(`botToken_${botId}`);
  const btn = el?.nextElementSibling?.querySelector('button');
  if (!el) return;
  const hidden = el.textContent.includes('•');
  el.textContent = hidden ? token : '••••••••••••••••••••••';
  if (btn) btn.innerHTML = (hidden ? uiIcon('eye-off', 13) : uiIcon('eye', 13)) + (hidden ? ' Gizle' : ' Göster');
}

// ============ SUNUCU SYNC ============
function _syncBot(method, bot) {
  if (typeof API === 'undefined' || !Store.token) return;
  const url = method === 'DELETE'
    ? `${API}/api/bots/${bot.id}`
    : `${API}/api/bots`;
  fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + Store.token
    },
    body: method !== 'DELETE' ? JSON.stringify(bot) : undefined
  }).catch(e => _botLog('Sync hatası: ' + e.message, 'warn'));
}

// ============ KAYDET ============
function _saveBotState() {
  try {
    localStorage.setItem('gt_bots', JSON.stringify(botState.bots));
  } catch (e) {
    _botLog('localStorage kayıt hatası: ' + e.message, 'error');
  }
}

// Eski uyumlu alias
function saveBotState() { _saveBotState(); }
function showBotList()   { openModal('botList'); }
function showBotDetail(id) { openModal('botDetail', { botId: id }); }

// ============ CSS ============
(function injectBotStyles() {
  const id = 'gt-bot-styles';
  if (document.getElementById(id)) return;
  const style = document.createElement('style');
  style.id = id;
  style.textContent = `
/* ─── Bot mesajları ─── */
.msg.bot-msg{border-left:3px solid var(--ac,#6366f1);background:var(--ac,#6366f1)08}
.msg.bot-msg .msg-av{background:linear-gradient(135deg,#6366f1,#8b5cf6)}
.bot-badge{
  display:inline-block;font-size:8px;font-weight:700;
  background:var(--ac,#6366f1);color:#fff;
  padding:1px 5px;border-radius:4px;margin-left:5px;vertical-align:middle;
  letter-spacing:.03em;
}

/* ─── Bot avatarları ─── */
.gm-bot-av{
  width:36px;height:36px;border-radius:12px;flex-shrink:0;
  background-size:cover;background-position:center;
  background-color:var(--ac,#6366f1);position:relative;
}
.gm-bot-hero-av{
  width:56px;height:56px;border-radius:16px;flex-shrink:0;
  background-size:cover;background-position:center;
  background-color:var(--ac,#6366f1);position:relative;
}
.gm-bot-status{
  position:absolute;bottom:-2px;right:-2px;
  width:11px;height:11px;border-radius:50%;
  border:2px solid var(--bg1,#1a0f24);
}
.gm-bot-status.lg{width:14px;height:14px}
.gm-bot-status.on{background:#10b981}
.gm-bot-status.off{background:#6b7280}

/* ─── Bot hero ─── */
.gm-bot-hero{display:flex;align-items:center;gap:14px;margin-bottom:14px}
.gm-bot-hero h3{margin:0 0 3px;font-size:16px;font-weight:700;color:var(--t1,#fff)}
.gm-bot-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:2px}

/* ─── Create avatar preview ─── */
.gm-bot-create-av{
  width:64px;height:64px;border-radius:20px;background:var(--ac,#6366f1);
  display:flex;align-items:center;justify-content:center;
  font-size:26px;font-weight:800;color:#fff;margin:0 auto 14px;
}

/* ─── Komutlar ─── */
.gm-bot-cmd-cat{margin-bottom:12px}
.gm-bot-cmd-cat-label{
  font-size:10px;font-weight:700;color:var(--t3,#888);
  text-transform:uppercase;letter-spacing:.05em;
  display:flex;align-items:center;gap:5px;margin-bottom:6px;
}
.gm-bot-cmd-grid{display:flex;flex-wrap:wrap;gap:6px}
.gm-bot-cmd-btn{
  position:relative;
  padding:5px 10px;border-radius:8px;font-size:12px;font-family:inherit;
  background:var(--bg2,#241535);border:1.5px solid rgba(255,255,255,.08);
  cursor:pointer;color:var(--t2,#ccc);transition:all .15s;
}
.gm-bot-cmd-btn code{font-size:11px}
.gm-bot-cmd-btn.on{
  background:var(--ac,#6366f1)20;border-color:var(--ac,#6366f1)60;
  color:var(--ac,#6366f1);
}
.gm-bot-cmd-btn:hover{border-color:rgba(255,255,255,.2)}
.gm-bot-cmd-check{
  position:absolute;top:-4px;right:-4px;
  width:14px;height:14px;border-radius:50%;
  background:var(--ac,#6366f1);
  display:flex;align-items:center;justify-content:center;
}

/* ─── Info rows ─── */
.gm-info-rows{display:flex;flex-direction:column;gap:6px}
.gm-info-row{
  display:flex;justify-content:space-between;align-items:center;
  padding:7px 10px;border-radius:8px;background:var(--bg2,#241535);
  font-size:12px;color:var(--t2,#ccc);
}
.gm-info-row span:first-child{color:var(--t3,#888)}
.gm-info-row code{font-size:12px;color:var(--ac,#6366f1)}

/* ─── Token ─── */
.gm-token-box{
  background:var(--bg2,#241535);border:1.5px solid rgba(255,255,255,.08);
  border-radius:10px;padding:10px 12px;
}
.gm-token-val{
  display:block;font-size:11px;word-break:break-all;
  color:var(--ac,#6366f1);margin-bottom:8px;
  font-family:monospace;line-height:1.6;
}
.gm-token-btns{display:flex;gap:6px;flex-wrap:wrap}

/* ─── Özel komut formu ─── */
.gm-custom-cmd-form{display:flex;gap:6px;align-items:center}

/* ─── Bot item ─── */
.gm-bot-item{cursor:pointer}
  `;
  document.head.appendChild(style);
})();

_botLog('v2.0 yüklendi ✓');
