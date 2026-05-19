// ============ GETTIC CHAT.JS - FULL & EKSİKSİZ ============

function formatTime(d) { try { return new Date(d).toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit'}); } catch(e) { return ''; } }
function formatDate(d) { try { const dt=new Date(d),today=new Date(); if(dt.toDateString()===today.toDateString()) return 'Bugün '+formatTime(d); const y=new Date(today); y.setDate(y.getDate()-1); if(dt.toDateString()===y.toDateString()) return 'Dün '+formatTime(d); return dt.toLocaleDateString('tr-TR')+' '+formatTime(d); } catch(e) { return ''; } }
function formatRelativeTime(d){const date=new Date(d),now=new Date(),diff=now-date,s=Math.floor(diff/1000),m=Math.floor(s/60),h=Math.floor(m/60);if(s<60)return'Az önce';if(m<60)return m+' dk önce';if(h<24)return h+' sa önce';if(h<48)return'Dün '+date.toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit'});return date.toLocaleDateString('tr-TR',{day:'numeric',month:'long'})+' '+date.toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit'})}
function formatMsg(t){if(!t)return'';return t.replace(/\*\*\*(.+?)\*\*\*/g,'<b><i>$1</i></b>').replace(/\*\*(.+?)\*\*/g,'<b>$1</b>').replace(/\*(.+?)\*/g,'<i>$1</i>').replace(/~~(.+?)~~/g,'<del>$1</del>').replace(/__(.+?)__/g,'<u>$1</u>').replace(/`(.+?)`/g,'<code>$1</code>').replace(/```([\s\S]+?)```/g,'<pre><code>$1</code></pre>').replace(/(https?:\/\/[^\s<>\[\]]+)/g,'<a href="$1" target="_blank" rel="noopener">$1</a>').replace(/\n/g,'<br>')}

function renderMessages(){
  const el=document.getElementById('messages');
  if(!el)return;

  if(!Store.messages||Store.messages.length===0){
    el.innerHTML=`
      <div class="empty-ch">
        <div class="welcome-avatar">#</div>
        <h3>${Store.activeChannel||'genel-sohbet'} kanalına hoş geldin!</h3>
        <p>Burası kanalın başlangıcı. Sohbeti sen başlat!</p>
        <div class="welcome-tips">
          <div class="welcome-tip"><span style="font-size:20px;margin-right:10px">💬</span>Alttaki kutuya yazarak mesaj gönderebilirsin</div>
          <div class="welcome-tip"><span style="font-size:20px;margin-right:10px">📎</span>Dosya paylaşmak için 📎 butonuna tıkla</div>
          <div class="welcome-tip"><span style="font-size:20px;margin-right:10px">😊</span>Emoji eklemek için 😊 butonuna tıkla</div>
          <div class="welcome-tip"><span style="font-size:20px;margin-right:10px">🎤</span>Ses kanalına katılmak için 🔊 kanalına tıkla</div>
          <div class="welcome-tip"><span style="font-size:20px;margin-right:10px">⌨️</span>Ctrl+K ile arama yapabilirsin</div>
        </div>
      </div>`;
    return;
  }

  let lastDate='';
  el.innerHTML=Store.messages.map((msg,idx)=>{
    if(Store.blockedUsers?.includes(msg.senderId)){
      return`<div class="msg blocked" onclick="unblockMessage('${msg._id}')" style="cursor:pointer;text-align:center;color:var(--t3);font-size:11px;padding:8px">Engellenmiş mesaj - görmek için tıkla</div>`;
    }
    const role=typeof getHighestRole==='function'?getHighestRole(msg.senderId):null;
    const badge=role&&role.id!=='r4'?`<span class="rbadge" style="background:${role.color}20;color:${role.color}">${role.name}</span>`:'';
    const poll=Store.polls?.[msg._id];
    const isOwn=msg.senderId===Store.user?._id;
    const dateStr=formatDate(msg.createdAt);
    const showDate=dateStr!==lastDate;
    lastDate=dateStr;

    return`
      ${showDate?`<div class="msg-date-separator"><span>${dateStr}</span></div>`:''}
      <div class="msg ${msg.pinned?'pinned':''}" id="msg-${msg._id}" oncontextmenu="showMsgContext(event,'${msg._id}')">
        <div class="msg-av" onclick="showUserInfo('${msg.senderId}')" title="${msg.senderName} profili">${(msg.senderName||'?').charAt(0).toUpperCase()}</div>
        <div class="msg-body">
          <div class="msg-head">
            <span class="msg-un" onclick="showUserInfo('${msg.senderId}')">${msg.senderName||'?'}</span>${badge}
            <span class="msg-time">${formatRelativeTime(msg.createdAt)}${msg.edited?' <span class="msg-edited">(düzenlendi)</span>':''}</span>
            ${msg.pinned?'<span class="msg-pin-badge">📌</span>':''}
            ${isOwn?`<span style="font-size:9px;color:${msg.readBy?.length>0?'var(--gr)':'var(--t3)'};margin-left:2px">${msg.readBy?.length>0?'✓✓':'✓'}</span>`:''}
          </div>
          ${msg.replyTo?`<div class="msg-reply" onclick="scrollToMessage('${msg.replyTo._id}')" style="cursor:pointer;padding:4px 8px;border-left:2px solid var(--ac);margin-bottom:4px;font-size:11px;color:var(--t3)"><span style="font-weight:600">${msg.replyTo.senderName}</span> ${msg.replyTo.content.substring(0,60)}</div>`:''}
          ${msg.image?`<img src="${msg.image}" alt="${msg.content}" class="msg-image" loading="lazy" onclick="viewImage('${msg.image}')" style="max-width:300px;max-height:300px;border-radius:12px;margin:8px 0;cursor:pointer">`:''}
          ${msg.voiceUrl?`<audio src="${msg.voiceUrl}" controls style="width:200px;height:36px;margin:4px 0"></audio>`:''}
          ${msg.file?renderFileMessage(msg):''}
          <div class="msg-text">${formatMsg(msg.content)}</div>
          ${msg.linkPreview?`<a href="${msg.linkPreview.url}" target="_blank" style="display:block;margin-top:4px;padding:8px;background:var(--bg2);border-radius:8px;border-left:3px solid var(--ac);text-decoration:none;color:var(--t1)"><div style="font-weight:600;font-size:12px">${msg.linkPreview.title||msg.linkPreview.url}</div><div style="font-size:10px;color:var(--t3)">${msg.linkPreview.description||''}</div></a>`:''}
          ${poll?renderPoll(msg._id,poll):''}
          ${msg.reactions?renderReactions(msg):''}
          ${typeof renderThreadButton==='function'?renderThreadButton(msg._id):''}
        </div>
        <div class="ma">
          <button onclick="reactToMessage('${msg._id}','👍')" title="Beğen">👍</button>
          <button onclick="reactToMessage('${msg._id}','❤️')" title="Kalp">❤️</button>
          <button onclick="reactToMessage('${msg._id}','😂')" title="Gül">😂</button>
          <button onclick="reactToMessage('${msg._id}','🔥')" title="Ateş">🔥</button>
          <button onclick="replyToMessage('${msg._id}')" title="Yanıtla">↩️</button>
          ${isOwn?`<button onclick="editMessage('${msg._id}')" title="Düzenle">✏️</button>`:''}
          <button onclick="copyMessage('${msg._id}')" title="Kopyala">📋</button>
          <button onclick="pinMessage('${msg._id}')" title="${msg.pinned?'Sabitlemeyi Kaldır':'Sabitle'}">📌</button>
          ${(isOwn||(typeof hasPermission==='function'&&hasPermission(Store.user?._id,'deleteMsg')))?`<button onclick="deleteMessage('${msg._id}')" style="color:var(--re)" title="Sil">🗑️</button>`:''}
        </div>
      </div>
    `;
  }).join('');
  el.scrollTop=el.scrollHeight;
  if(typeof saveStore==='function')saveStore();
}

// Context menu
function showMsgContext(e,msgId){
  e.preventDefault();
  const msg=Store.messages.find(m=>m._id===msgId);
  if(!msg)return;
  const menu=document.createElement('div');
  menu.className='ctxmenu show';
  menu.style.left=e.clientX+'px';
  menu.style.top=e.clientY+'px';
  menu.innerHTML=`
    <button onclick="reactToMessage('${msgId}','👍');this.parentElement.remove()">👍 Beğen</button>
    <button onclick="reactToMessage('${msgId}','❤️');this.parentElement.remove()">❤️ Kalp</button>
    <button onclick="reactToMessage('${msgId}','😂');this.parentElement.remove()">😂 Gül</button>
    <div class="ctx-sep"></div>
    <button onclick="replyToMessage('${msgId}');this.parentElement.remove()">↩️ Yanıtla</button>
    <button onclick="copyMessage('${msgId}');this.parentElement.remove()">📋 Kopyala</button>
    <button onclick="pinMessage('${msgId}');this.parentElement.remove()">📌 Sabitle</button>
    ${msg.senderId===Store.user?._id?`<button onclick="editMessage('${msgId}');this.parentElement.remove()">✏️ Düzenle</button>`:''}
    ${(msg.senderId===Store.user?._id||(typeof hasPermission==='function'&&hasPermission(Store.user?._id,'deleteMsg')))?`<button onclick="deleteMessage('${msgId}');this.parentElement.remove()" class="danger">🗑️ Sil</button>`:''}
  `;
  document.body.appendChild(menu);
  setTimeout(()=>{document.addEventListener('click',()=>menu.remove(),{once:true});document.addEventListener('touchstart',()=>menu.remove(),{once:true});},100);
}

// Send message
function sendMessage(){
  const input=document.getElementById('messageInput');
  if(!input)return;
  const content=input.value.trim();
  if(!content||!Store.user)return;
  if(typeof hasPermission==='function'&&!hasPermission(Store.user._id,'sendMsg'))return toast('❌ Mesaj gönderme yetkiniz yok','e');

  if(content.startsWith('!')&&typeof checkBotCommand==='function'){if(checkBotCommand(content)){input.value='';input.focus();return;}}

  const linkMatch=content.match(/(https?:\/\/[^\s<>\[\]]+)/);
  const msg={
    _id:genId(),content,senderName:Store.user.username,senderId:Store.user._id,
    channelId:Store.activeChannel,createdAt:new Date().toISOString(),reactions:{},
    replyTo:window._replyingTo||null,readBy:[Store.user._id],
    linkPreview:linkMatch?{url:linkMatch[0],title:linkMatch[0].replace('https://','').split('/')[0],description:linkMatch[0]}:null
  };

  Store.messages.push(msg);
  if(Store.messages.length>MAX_MSGS)Store.messages.shift();
  window._replyingTo=null;
  updateReplyUI();
  renderMessages();
  input.value='';input.style.height='auto';input.focus();
  if(typeof MongoSync!=='undefined'&&MongoSync.saveMessage)MongoSync.saveMessage(msg);
  if(window._socket)window._socket.emit('send_message',msg);
  if(typeof OfflineMode!=='undefined'&&!navigator.onLine)OfflineMode.addPending(msg);
  if(typeof incrementStats==='function')incrementStats();
  if(typeof saveStore==='function')saveStore();
}

// Delete / Edit / Copy / Pin / Reply
function deleteMessage(mid){const msg=Store.messages.find(m=>m._id===mid);if(!msg)return;if(msg.senderId!==Store.user?._id&&typeof hasPermission==='function'&&!hasPermission(Store.user?._id,'deleteMsg'))return toast('❌ Yetkiniz yok','e');Store.messages=Store.messages.filter(m=>m._id!==mid);delete Store.polls?.[mid];renderMessages();if(typeof MongoSync!=='undefined'&&MongoSync.deleteMessage)MongoSync.deleteMessage(mid,Store.activeChannel);toast('🗑️ Mesaj silindi');if(window._socket)window._socket.emit('delete_message',{id:mid,channelId:Store.activeChannel});if(typeof saveStore==='function')saveStore();}
function editMessage(mid){const msg=Store.messages.find(m=>m._id===mid);if(!msg||msg.senderId!==Store.user?._id)return;const newContent=prompt('Mesajı düzenle:',msg.content);if(newContent&&newContent.trim()&&newContent.trim()!==msg.content){msg.content=newContent.trim();msg.edited=true;renderMessages();if(typeof MongoSync!=='undefined'&&MongoSync.editMessage)MongoSync.editMessage(mid,Store.activeChannel,msg.content);if(window._socket)window._socket.emit('edit_message',{id:mid,content:msg.content,channelId:Store.activeChannel});if(typeof saveStore==='function')saveStore();}}
function copyMessage(mid){const msg=Store.messages.find(m=>m._id===mid);if(msg){navigator.clipboard.writeText(msg.content).then(()=>toast('📋 Kopyalandı')).catch(()=>toast('Kopyalanamadı','e'));}}
function pinMessage(mid){const msg=Store.messages.find(m=>m._id===mid);if(!msg)return;msg.pinned=!msg.pinned;if(msg.pinned)Store.messages=[msg,...Store.messages.filter(m=>m._id!==mid)];renderMessages();toast(msg.pinned?'📌 Sabitlendi':'📌 Sabitleme kaldırıldı');if(typeof saveStore==='function')saveStore();}
function replyToMessage(mid){const msg=Store.messages.find(m=>m._id===mid);if(!msg)return;window._replyingTo=msg;updateReplyUI();document.getElementById('messageInput')?.focus();}
function updateReplyUI(){const bar=document.getElementById('replyBar');if(!bar)return;if(window._replyingTo){bar.innerHTML=`<span style="color:var(--t3)">↩️ ${window._replyingTo.senderName}: ${window._replyingTo.content.substring(0,50)}</span><button onclick="window._replyingTo=null;updateReplyUI();document.getElementById('messageInput').focus()" style="background:none;border:none;color:var(--re);cursor:pointer;font-weight:700">×</button>`;bar.style.display='flex';}else{bar.style.display='none';}}
function scrollToMessage(mid){const el=document.getElementById('msg-'+mid);if(el){el.scrollIntoView({behavior:'smooth',block:'center'});el.style.background='var(--acd)';setTimeout(()=>el.style.background='',2000);}}

// Reactions
function reactToMessage(mid,emoji){const msg=Store.messages.find(m=>m._id===mid);if(!msg)return;if(!msg.reactions)msg.reactions={};if(!msg.reactions[emoji])msg.reactions[emoji]=[];const idx=msg.reactions[emoji].indexOf(Store.user._id);if(idx===-1)msg.reactions[emoji].push(Store.user._id);else msg.reactions[emoji].splice(idx,1);if(msg.reactions[emoji].length===0)delete msg.reactions[emoji];renderMessages();if(typeof saveStore==='function')saveStore();}
function renderReactions(msg){if(!msg.reactions||Object.keys(msg.reactions).length===0)return'';return`<div class="reacts">${Object.entries(msg.reactions).map(([emoji,users])=>`<span class="react ${users.includes(Store.user?._id)?'me':''}" onclick="reactToMessage('${msg._id}','${emoji}')">${emoji} <span>${users.length}</span></span>`).join('')}</div>`;}

// Clear / View Image / User Info
function clearMessages(){if(typeof hasPermission==='function'&&!hasPermission(Store.user?._id,'deleteMsg'))return toast('❌ Yetkiniz yok','e');if(confirm('Bu kanaldaki tüm mesajlar silinsin mi?')){Store.messages=[];Store.polls={};renderMessages();if(typeof saveStore==='function')saveStore();toast('🗑️ Tüm mesajlar silindi');}}
function viewImage(src){if(typeof openModal==='function'){openModal('imageView');const c=document.getElementById('modalContent');if(c)c.innerHTML=`<img src="${src}" style="max-width:100%;max-height:80vh;border-radius:12px;cursor:pointer" onclick="closeModal()">`;}}
function showUserInfo(uid){if(typeof openModal==='function'){openModal('profile');const c=document.getElementById('modalContent');if(c)c.innerHTML=`<div style="text-align:center"><div class="avatar-big">${uid.charAt(0)?.toUpperCase()||'?'}</div><h3>${uid}</h3><button class="mb" onclick="startDM('${uid}')">💬 DM Gönder</button>${typeof hasPermission==='function'&&hasPermission(Store.user?._id,'kick')?`<button class="mb sec" onclick="kickUser('${uid}')">👢 At</button>`:''}</div>`;}}

// File render
function renderFileMessage(msg){const f=msg.file;if(!f)return'';switch(f.category){case'image':return`<img src="${f.data}" alt="${f.name}" class="msg-image" loading="lazy" onclick="viewImage('${f.data}')" style="max-width:300px;max-height:300px;border-radius:12px;margin:8px 0;cursor:pointer">`;case'video':return`<video src="${f.data}" controls style="max-width:300px;max-height:300px;border-radius:12px" preload="metadata"></video>`;case'audio':return`<audio src="${f.data}" controls style="width:250px"></audio>`;default:return`<div class="file-attachment" onclick="downloadFile('${msg._id}')" style="background:var(--bg2);padding:10px 14px;border-radius:10px;cursor:pointer;display:flex;align-items:center;gap:8px"><span style="font-size:24px">📎</span><div><div style="font-weight:600;font-size:12px">${f.name}</div><div style="font-size:10px;color:var(--t3)">${formatFileSize(f.size)}</div></div></div>`;}}
function formatFileSize(b){if(!b)return'0 B';if(b<1024)return b+' B';if(b<1048576)return(b/1024).toFixed(1)+' KB';return(b/1048576).toFixed(1)+' MB';}
function downloadFile(msgId){const msg=Store.messages.find(m=>m._id===msgId);if(!msg?.file?.data)return;const a=document.createElement('a');a.href=msg.file.data;a.download=msg.file.name;a.click();}
function unblockMessage(mid){const msg=Store.messages.find(m=>m._id===mid);if(msg&&Store.blockedUsers){Store.blockedUsers=Store.blockedUsers.filter(u=>u!==msg.senderId);if(typeof saveStore==='function')saveStore();renderMessages();}}

// Poll render
function renderPoll(mid,poll){if(!poll||typeof poll!=='object')return'';const total=(poll.votes||[]).reduce((a,b)=>a+b,0)||1;return`<div class="poll-box" id="poll-${mid}"><div class="poll-q">📊 ${poll.question||'Anket'}</div><div class="poll-opts">${(poll.options||[]).map((o,i)=>{const pct=Math.round(((poll.votes?.[i]||0)/total)*100);return`<div class="poll-opt ${poll.voters?.[Store.user?._id]===i?'voted':''}" onclick="votePoll('${mid}',${i})"><div class="poll-bar" style="width:${pct}%"></div><span>${o.text||o}</span><span class="poll-pct">${pct}%</span></div>`;}).join('')}</div></div>`;}
function votePoll(mid,opt){const poll=Store.polls?.[mid];if(!poll)return;if(poll.voters?.[Store.user?._id]!==undefined)return toast('Zaten oy verdiniz','e');if(!poll.voters)poll.voters={};poll.voters[Store.user._id]=opt;if(!poll.votes)poll.votes=new Array(poll.options.length).fill(0);poll.votes[opt]++;renderMessages();if(typeof saveStore==='function')saveStore();}

// Voice message
let mediaRecorder=null,audioChunks=[];
async function startRecording(){try{const stream=await navigator.mediaDevices.getUserMedia({audio:true});mediaRecorder=new MediaRecorder(stream);audioChunks=[];mediaRecorder.ondataavailable=(e)=>{audioChunks.push(e.data);};mediaRecorder.onstop=()=>{const blob=new Blob(audioChunks,{type:'audio/webm'});const url=URL.createObjectURL(blob);sendVoiceMessage(url);stream.getTracks().forEach(t=>t.stop());};mediaRecorder.start();toast('🎤 Kayıt başladı...');setTimeout(()=>{if(mediaRecorder?.state==='recording')mediaRecorder.stop();},30000);}catch(e){toast('Mikrofon izni gerekli','e');}}
function stopRecording(){if(mediaRecorder?.state==='recording'){mediaRecorder.stop();toast('✅ Ses kaydedildi');}}
function sendVoiceMessage(url){const msg={_id:genId(),content:'🎤 Sesli Mesaj',senderName:Store.user.username,senderId:Store.user._id,channelId:Store.activeChannel,createdAt:new Date().toISOString(),voiceUrl:url};Store.messages.push(msg);renderMessages();if(typeof saveStore==='function')saveStore();}

// Mention suggestions
function showMentionSuggestions(query,pos){}
function applyMention(username){const inp=document.getElementById('messageInput');if(!inp)return;const val=inp.value;const lastAt=val.lastIndexOf('@');inp.value=val.substring(0,lastAt)+'@'+username+' ';inp.focus();}

console.log('✅ Chat.js yüklendi');
