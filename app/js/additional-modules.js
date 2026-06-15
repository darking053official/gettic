// ╔══════════════════════════════════════════════════════════════════╗
// ║   GETTIC FORUM.JS v2.0 - Forum Kanalı                            ║
// ╚══════════════════════════════════════════════════════════════════╝

function _forumLog(msg, level = 'log') {
  console[level](`%c[Forum] ${msg}`, 'color:#818cf8;font-weight:bold');
}

const forumState = {
  posts:       [],
  activePost:  null,
  sort:        'new', // 'new' | 'hot' | 'top'
};

function _saveForum() {
  try { localStorage.setItem('gt_forum', JSON.stringify(forumState.posts)); } catch {}
}
function _loadForum() {
  try {
    const raw = localStorage.getItem('gt_forum');
    if (raw) forumState.posts = JSON.parse(raw);
  } catch {}
}

// ─── Gönderi oluştur ───────────────────────────────────────────────
function createForumPost(title, content, tags = []) {
  title   = title?.trim();
  content = content?.trim();
  if (!title   || title.length < 3)   return toast('Başlık en az 3 karakter', 'e');
  if (!content || content.length < 10) return toast('İçerik en az 10 karakter', 'e');
  if (title.length > 100)             return toast('Başlık çok uzun', 'e');

  const post = {
    id:          'fp_' + genId(),
    title,
    content,
    tags:        tags.slice(0, 5).map(t => t.slice(0, 20)),
    channelId:   Store.activeChannel,
    authorId:    Store.user?._id,
    authorName:  Store.user?.username,
    upvotes:     [],
    comments:    [],
    views:       0,
    pinned:      false,
    closed:      false,
    createdAt:   new Date().toISOString(),
  };

  forumState.posts.unshift(post);
  _saveForum();
  if (socket?.connected) socket.emit('forum_post_created', post);
  if (typeof SyncEngine !== 'undefined') SyncEngine.add('/api/forum', 'POST', post);
  toast('Gönderi yayınlandı', 's');
  renderForum();
  _forumLog('Gönderi oluşturuldu: ' + title);
  return post;
}

// ─── Yorum ekle ────────────────────────────────────────────────────
function addForumComment(postId, content) {
  content = content?.trim();
  if (!content || content.length < 2) return toast('Yorum en az 2 karakter', 'e');
  const post = forumState.posts.find(p => p.id === postId);
  if (!post) return;
  if (post.closed) return toast('Bu gönderi kapatıldı', 'w');

  const comment = {
    id:         'fc_' + genId(),
    content,
    authorId:   Store.user?._id,
    authorName: Store.user?.username,
    upvotes:    [],
    createdAt:  new Date().toISOString(),
  };
  if (!post.comments) post.comments = [];
  post.comments.push(comment);
  _saveForum();
  if (socket?.connected) socket.emit('forum_comment', { postId, comment });
  renderForumPost(postId);
}

// ─── Upvote ────────────────────────────────────────────────────────
function upvotePost(postId) {
  const post = forumState.posts.find(p => p.id === postId);
  if (!post) return;
  const uid = Store.user?._id;
  if (!post.upvotes) post.upvotes = [];
  const idx = post.upvotes.indexOf(uid);
  if (idx > -1) post.upvotes.splice(idx, 1);
  else post.upvotes.push(uid);
  _saveForum();
  if (socket?.connected) socket.emit('forum_upvote', { postId, userId: uid });
  renderForum();
}

// ─── Render liste ──────────────────────────────────────────────────
function renderForum() {
  const el = document.getElementById('messages') || document.getElementById('forumView');
  if (!el) return;

  const channelPosts = forumState.posts
    .filter(p => p.channelId === Store.activeChannel)
    .sort((a, b) => {
      if (forumState.sort === 'hot') return (b.upvotes?.length||0) + (b.comments?.length||0)*2 - ((a.upvotes?.length||0) + (a.comments?.length||0)*2);
      if (forumState.sort === 'top') return (b.upvotes?.length||0) - (a.upvotes?.length||0);
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

  el.innerHTML = `
    <div class="forum-wrap">
      <div class="forum-header">
        <h3>Forum</h3>
        <div class="forum-sort">
          ${['new','hot','top'].map(s=>`
            <button class="gm-chip ${forumState.sort===s?'on':''}" onclick="forumState.sort='${s}';renderForum()">${{new:'Yeni',hot:'Popüler',top:'En İyi'}[s]}</button>`).join('')}
        </div>
        <button class="gm-btn primary sm" onclick="openCreatePostModal()">+ Gönderi</button>
      </div>
      ${channelPosts.length === 0
        ? `<div class="gm-empty"><span>Henüz gönderi yok</span><small>İlk gönderiyi sen oluştur!</small></div>`
        : channelPosts.map(p => `
          <div class="forum-post-card ${p.pinned?'pinned':''}" onclick="renderForumPost('${p.id}')">
            <div class="forum-vote">
              <button class="forum-vote-btn ${p.upvotes?.includes(Store.user?._id)?'voted':''}"
                onclick="event.stopPropagation();upvotePost('${p.id}')">▲</button>
              <span class="forum-vote-count">${p.upvotes?.length||0}</span>
            </div>
            <div class="forum-post-info">
              <div class="forum-post-tags">
                ${(p.tags||[]).map(t=>`<span class="forum-tag">${escapeHtml(t)}</span>`).join('')}
                ${p.pinned?'<span class="forum-tag" style="background:var(--ac)22;color:var(--ac)">📌 Sabit</span>':''}
                ${p.closed?'<span class="forum-tag" style="background:#ef444422;color:#ef4444">🔒 Kapalı</span>':''}
              </div>
              <h4 class="forum-post-title">${escapeHtml(p.title)}</h4>
              <div class="forum-post-meta">
                <span>${escapeHtml(p.authorName)}</span>
                <span>💬 ${p.comments?.length||0}</span>
                <span>👁 ${p.views||0}</span>
                <span>${typeof formatRelativeTime==='function'?formatRelativeTime(p.createdAt):''}</span>
              </div>
            </div>
          </div>`).join('')}
    </div>`;
}

// ─── Gönderi detay ─────────────────────────────────────────────────
function renderForumPost(postId) {
  const post = forumState.posts.find(p => p.id === postId);
  if (!post) return;
  post.views = (post.views||0) + 1;
  forumState.activePost = postId;
  _saveForum();

  const el = document.getElementById('messages') || document.getElementById('forumView');
  if (!el) return;
  const isOwner = post.authorId === Store.user?._id;

  el.innerHTML = `
    <div class="forum-wrap">
      <button class="gm-btn ghost sm" onclick="forumState.activePost=null;renderForum()" style="margin-bottom:10px">← Geri</button>
      <div class="forum-detail">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
          ${(post.tags||[]).map(t=>`<span class="forum-tag">${escapeHtml(t)}</span>`).join('')}
        </div>
        <h2 class="forum-detail-title">${escapeHtml(post.title)}</h2>
        <div class="forum-detail-meta">
          <span>${escapeHtml(post.authorName)}</span>
          <span>${typeof formatRelativeTime==='function'?formatRelativeTime(post.createdAt):''}</span>
          <span>👁 ${post.views}</span>
          <button class="forum-vote-btn ${post.upvotes?.includes(Store.user?._id)?'voted':''}" onclick="upvotePost('${post.id}')">▲ ${post.upvotes?.length||0}</button>
          ${isOwner?`<button class="gm-btn danger sm" onclick="deleteForumPost('${post.id}')">Sil</button>`:''}
        </div>
        <div class="forum-detail-content">${escapeHtml(post.content).replace(/\n/g,'<br>')}</div>
      </div>
      <div class="forum-comments">
        <h4>Yorumlar (${post.comments?.length||0})</h4>
        ${!post.closed?`
          <div class="forum-comment-form">
            <textarea class="gm-textarea" id="forumCommentInput" rows="2" placeholder="Yorum yaz..."></textarea>
            <button class="gm-btn primary sm" onclick="addForumComment('${post.id}',document.getElementById('forumCommentInput').value);document.getElementById('forumCommentInput').value=''">Yorum Ekle</button>
          </div>`:'<p style="color:var(--t3);font-size:12px">Bu gönderi kapatıldı.</p>'}
        ${(post.comments||[]).map(c=>`
          <div class="forum-comment">
            <div class="gm-av" style="width:26px;height:26px;font-size:10px">${(c.authorName||'?').charAt(0).toUpperCase()}</div>
            <div>
              <div style="font-size:12px;font-weight:700;color:var(--t1)">${escapeHtml(c.authorName)}</div>
              <div style="font-size:13px;color:var(--t2)">${escapeHtml(c.content)}</div>
            </div>
          </div>`).join('')}
      </div>
    </div>`;
}

function deleteForumPost(postId) {
  const post = forumState.posts.find(p => p.id === postId);
  if (!post || post.authorId !== Store.user?._id) return toast('Yetki yok', 'e');
  if (!confirm('Gönderi silinsin mi?')) return;
  forumState.posts = forumState.posts.filter(p => p.id !== postId);
  _saveForum();
  if (socket?.connected) socket.emit('forum_post_deleted', { id: postId });
  forumState.activePost = null;
  renderForum();
}

function openCreatePostModal() {
  if (typeof MODAL_TEMPLATES === 'undefined') return;
  MODAL_TEMPLATES.createPost = () => `
    <div class="gm-header"><h2>Yeni Gönderi</h2></div>
    <div class="gm-body">
      <div class="gm-field"><label class="gm-label">Başlık</label><input class="gm-input" id="fpTitle" maxlength="100" placeholder="Gönderinin başlığı"></div>
      <div class="gm-field"><label class="gm-label">İçerik</label><textarea class="gm-textarea" id="fpContent" rows="5" placeholder="Gönderini yaz..."></textarea></div>
      <div class="gm-field"><label class="gm-label">Etiketler <span class="gm-label-hint">(virgülle ayır)</span></label><input class="gm-input" id="fpTags" placeholder="örn: yardım, soru, duyuru"></div>
      <div class="gm-actions">
        <button class="gm-btn ghost" onclick="closeModal()">İptal</button>
        <button class="gm-btn primary" onclick="_submitForumPost()">Yayınla</button>
      </div>
    </div>`;
  openModal('createPost');
}

function _submitForumPost() {
  const title   = document.getElementById('fpTitle')?.value;
  const content = document.getElementById('fpContent')?.value;
  const tags    = document.getElementById('fpTags')?.value.split(',').map(t=>t.trim()).filter(Boolean);
  const post    = createForumPost(title, content, tags);
  if (post) closeModal();
}

// Socket
function initForumSocket() {
  if (!socket) return;
  socket.on('forum_post_created', post => {
    if (post.channelId === Store.activeChannel && !forumState.posts.find(p=>p.id===post.id)) {
      forumState.posts.unshift(post);
      _saveForum();
      if (!forumState.activePost) renderForum();
    }
  });
  socket.on('forum_comment', ({ postId, comment }) => {
    const post = forumState.posts.find(p=>p.id===postId);
    if (post) {
      if (!post.comments) post.comments = [];
      post.comments.push(comment);
      _saveForum();
      if (forumState.activePost === postId) renderForumPost(postId);
    }
  });
  socket.on('forum_post_deleted', ({ id }) => {
    forumState.posts = forumState.posts.filter(p=>p.id!==id);
    _saveForum();
    if (forumState.activePost === id) { forumState.activePost=null; renderForum(); }
  });
}

// CSS
(function(){
  const id='gt-forum-styles';
  if(document.getElementById(id))return;
  const s=document.createElement('style');
  s.id=id;
  s.textContent=`
.forum-wrap{padding:12px;max-width:700px;margin:0 auto}
.forum-header{display:flex;align-items:center;gap:8px;margin-bottom:14px;flex-wrap:wrap}
.forum-header h3{margin:0;font-size:16px;font-weight:700;color:var(--t1);flex:1}
.forum-sort{display:flex;gap:4px}
.forum-post-card{display:flex;gap:10px;padding:12px;border-radius:10px;background:var(--bg2);margin-bottom:6px;cursor:pointer;border:1.5px solid rgba(255,255,255,.06);transition:border-color .15s}
.forum-post-card:hover{border-color:var(--ac)}
.forum-post-card.pinned{border-color:var(--ac)60;background:var(--ac)06}
.forum-vote{display:flex;flex-direction:column;align-items:center;gap:3px;flex-shrink:0}
.forum-vote-btn{background:none;border:1.5px solid rgba(255,255,255,.1);border-radius:6px;width:28px;height:28px;cursor:pointer;font-size:13px;color:var(--t3);transition:all .15s;font-family:inherit}
.forum-vote-btn.voted,.forum-vote-btn:hover{background:var(--ac)22;border-color:var(--ac);color:var(--ac)}
.forum-vote-count{font-size:12px;font-weight:700;color:var(--t2)}
.forum-post-info{flex:1;min-width:0}
.forum-post-tags{display:flex;gap:4px;flex-wrap:wrap;margin-bottom:4px}
.forum-tag{font-size:10px;padding:2px 7px;border-radius:10px;background:rgba(255,255,255,.08);color:var(--t3)}
.forum-post-title{margin:0 0 5px;font-size:14px;font-weight:700;color:var(--t1)}
.forum-post-meta{display:flex;gap:8px;font-size:11px;color:var(--t3)}
.forum-detail{background:var(--bg2);border-radius:12px;padding:16px;margin-bottom:14px}
.forum-detail-title{margin:0 0 8px;font-size:18px;font-weight:800;color:var(--t1)}
.forum-detail-meta{display:flex;align-items:center;gap:10px;font-size:11px;color:var(--t3);margin-bottom:12px;flex-wrap:wrap}
.forum-detail-content{font-size:14px;color:var(--t2);line-height:1.7}
.forum-comments h4{margin:0 0 10px;font-size:13px;font-weight:700;color:var(--t1)}
.forum-comment-form{margin-bottom:10px}
.forum-comment{display:flex;gap:8px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.05)}
`;
  document.head.appendChild(s);
})();

(function initForum(){
  _loadForum();
  if(typeof socket!=='undefined'&&socket)initForumSocket();
  else document.addEventListener('socket_ready',initForumSocket,{once:true});
  _forumLog('v2.0 yüklendi ✓');
})();


// ╔══════════════════════════════════════════════════════════════════╗
// ║   GETTIC STAGE.JS v2.0 - Stage Kanalı                            ║
// ╚══════════════════════════════════════════════════════════════════╝

function _stageLog(msg,level='log'){console[level](`%c[Stage] ${msg}`,'color:#f472b6;font-weight:bold')}

const stageState={active:false,channelId:null,topic:'',speakers:[],listeners:[],isSpeaker:false,handRaised:false};

async function joinStage(channelId){
  const ch=(Store.channels||[]).find(c=>c.id===channelId);
  if(!ch||ch.type!=='stage')return toast('Bu bir stage kanalı değil','e');
  stageState.active=true;stageState.channelId=channelId;stageState.isSpeaker=false;stageState.handRaised=false;
  if(socket?.connected)socket.emit('stage_join',{channelId,userId:Store.user?._id,username:Store.user?.username});
  _renderStagePanel();
  toast(`🎙 ${ch.name} stage kanalına katıldın`,'i');
  _stageLog('Stage katıldı: '+channelId);
}

function leaveStage(){
  if(!stageState.active)return;
  if(socket?.connected)socket.emit('stage_leave',{channelId:stageState.channelId,userId:Store.user?._id});
  stageState.active=false;stageState.channelId=null;stageState.speakers=[];stageState.listeners=[];
  document.getElementById('stagePanel')?.remove();
  toast('Stage kanalından ayrıldın','i');
}

function raiseHand(){
  stageState.handRaised=!stageState.handRaised;
  if(socket?.connected)socket.emit('stage_hand',{channelId:stageState.channelId,userId:Store.user?._id,raised:stageState.handRaised});
  toast(stageState.handRaised?'✋ El kaldırdın':'El indirdin','i');
  _updateStagePanel();
}

function _renderStagePanel(){
  document.getElementById('stagePanel')?.remove();
  const panel=document.createElement('div');
  panel.id='stagePanel';panel.className='stage-panel';
  panel.innerHTML=_stagePanelHTML();
  document.body.appendChild(panel);
  requestAnimationFrame(()=>panel.classList.add('show'));
}

function _updateStagePanel(){const p=document.getElementById('stagePanel');if(p)p.innerHTML=_stagePanelHTML();}

function _stagePanelHTML(){
  return `
    <div class="sp-header">
      <div class="sp-title">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="2"/><path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49"/></svg>
        <span>${escapeHtml(stageState.topic||'Stage')}</span>
      </div>
      <span class="sp-count">${stageState.speakers.length} konuşmacı · ${stageState.listeners.length} dinleyici</span>
    </div>
    <div class="sp-speakers">
      ${stageState.speakers.map(s=>`
        <div class="sp-speaker">
          <div class="sp-av ${s.speaking?'speaking':''}">${(s.username||'?').charAt(0).toUpperCase()}</div>
          <span>${escapeHtml(s.username)}</span>
          ${s.muted?'🔇':''}
        </div>`).join('')||'<p style="color:var(--t3);font-size:12px;text-align:center">Henüz konuşmacı yok</p>'}
    </div>
    <div class="sp-controls">
      ${stageState.isSpeaker
        ?`<button class="sp-btn" onclick="toggleMute()">🎤</button>`
        :`<button class="sp-btn ${stageState.handRaised?'act':''}" onclick="raiseHand()" title="El Kaldır">✋</button>`}
      <button class="sp-btn leave" onclick="leaveStage()">Ayrıl</button>
    </div>`;
}

function initStageSocket(){
  if(!socket)return;
  socket.on('stage_updated',data=>{
    if(data.channelId!==stageState.channelId)return;
    stageState.speakers=data.speakers||[];stageState.listeners=data.listeners||[];
    _updateStagePanel();
  });
  socket.on('stage_speaker_added',({userId})=>{if(userId===Store.user?._id){stageState.isSpeaker=true;_updateStagePanel();}});
}

(function(){
  const id='gt-stage-styles';if(document.getElementById(id))return;
  const s=document.createElement('style');s.id=id;
  s.textContent=`
.stage-panel{position:fixed;bottom:24px;right:24px;z-index:100;background:var(--bg1);border:1px solid rgba(255,255,255,.1);border-radius:16px;padding:12px;min-width:240px;box-shadow:0 8px 32px rgba(0,0,0,.5);opacity:0;transform:translateY(20px);transition:opacity .3s,transform .3s cubic-bezier(.34,1.56,.64,1)}
.stage-panel.show{opacity:1;transform:translateY(0)}
.sp-header{margin-bottom:10px}.sp-title{display:flex;align-items:center;gap:6px;font-size:12px;font-weight:700;color:var(--t1)}
.sp-count{font-size:10px;color:var(--t3)}
.sp-speakers{display:flex;flex-wrap:wrap;gap:8px;min-height:40px;margin-bottom:10px}
.sp-speaker{display:flex;flex-direction:column;align-items:center;gap:3px;font-size:10px;color:var(--t3)}
.sp-av{width:36px;height:36px;border-radius:50%;background:var(--ac);color:#fff;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700}
.sp-av.speaking{box-shadow:0 0 0 2px var(--ac),0 0 0 4px var(--ac)44}
.sp-controls{display:flex;gap:6px;justify-content:flex-end}
.sp-btn{padding:6px 12px;border-radius:8px;border:none;cursor:pointer;font-size:12px;background:rgba(255,255,255,.08);color:var(--t1);font-family:inherit}
.sp-btn.act{background:var(--ac)22;color:var(--ac)}.sp-btn.leave{background:#ef444422;color:#ef4444}
`;
  document.head.appendChild(s);
})();

(function initStage(){
  if(typeof socket!=='undefined'&&socket)initStageSocket();
  else document.addEventListener('socket_ready',initStageSocket,{once:true});
  _stageLog('v2.0 yüklendi ✓');
})();


// ╔══════════════════════════════════════════════════════════════════╗
// ║   GETTIC THREADS.JS v2.0 - Thread Sistemi                        ║
// ╚══════════════════════════════════════════════════════════════════╝

function _threadLog(msg,level='log'){console[level](`%c[Threads] ${msg}`,'color:#a78bfa;font-weight:bold')}

const threadState={threads:[],activeThread:null};

function _saveThreads(){try{localStorage.setItem('gt_threads',JSON.stringify(threadState.threads));}catch{}}
function _loadThreads(){try{const r=localStorage.getItem('gt_threads');if(r)threadState.threads=JSON.parse(r);}catch{}}

function createThread(msgId,title){
  const msg=Store.messages?.find(m=>m._id===msgId);
  if(!msg)return toast('Mesaj bulunamadı','e');
  title=(title||msg.content?.slice(0,50)||'Thread').trim();

  const thread={
    id:'th_'+genId(),
    title:title.slice(0,80),
    parentMsgId:msgId,
    channelId:msg.channelId||Store.activeChannel,
    messages:[{...msg,_threadId:genId()}],
    createdBy:Store.user?._id,
    creatorName:Store.user?.username,
    participantCount:1,
    createdAt:new Date().toISOString(),
    lastActivity:new Date().toISOString(),
  };
  threadState.threads.unshift(thread);
  _saveThreads();
  if(socket?.connected)socket.emit('thread_created',thread);
  toast('Thread oluşturuldu','s');
  openThread(thread.id);
  _threadLog('Thread oluşturuldu: '+title);
  return thread;
}

function openThread(threadId){
  threadState.activeThread=threadId;
  const thread=threadState.threads.find(t=>t.id===threadId);
  if(!thread)return;
  thread.views=(thread.views||0)+1;
  _saveThreads();

  const el=document.getElementById('messages');
  if(!el)return;

  const renderFn=()=>{
    el.innerHTML=`
      <div style="padding:10px">
        <button class="gm-btn ghost sm" onclick="threadState.activeThread=null;if(typeof renderMessages==='function')renderMessages()">← Kanala Dön</button>
        <h3 style="margin:10px 0;color:var(--t1)">${escapeHtml(thread.title)}</h3>
        <div style="display:flex;flex-direction:column;gap:4px" id="threadMsgs">
          ${(thread.messages||[]).map(m=>`
            <div class="msg">
              <div class="msg-av">${(m.senderName||'?').charAt(0).toUpperCase()}</div>
              <div class="msg-body">
                <div class="msg-head"><span class="msg-un">${escapeHtml(m.senderName)}</span><span class="msg-time">${typeof formatRelativeTime==='function'?formatRelativeTime(m.createdAt):''}</span></div>
                <div class="msg-text">${typeof formatMsg==='function'?formatMsg(m.content):escapeHtml(m.content)}</div>
              </div>
            </div>`).join('')}
        </div>
        <div style="margin-top:12px;display:flex;gap:8px">
          <textarea class="gm-textarea" id="threadInput" rows="2" placeholder="Thread'e yanıt yaz..."></textarea>
          <button class="gm-btn primary" onclick="sendThreadMessage('${thread.id}')">Gönder</button>
        </div>
      </div>`;
  };
  renderFn();
}

function sendThreadMessage(threadId){
  const thread=threadState.threads.find(t=>t.id===threadId);
  if(!thread)return;
  const input=document.getElementById('threadInput');
  const content=input?.value?.trim();
  if(!content)return;

  const msg={_id:genId(),content,senderName:Store.user?.username,senderId:Store.user?._id,channelId:thread.channelId,createdAt:new Date().toISOString(),reactions:{}};
  if(!thread.messages)thread.messages=[];
  thread.messages.push(msg);
  thread.lastActivity=new Date().toISOString();
  _saveThreads();
  if(socket?.connected)socket.emit('thread_message',{threadId,message:msg});
  if(input)input.value='';
  openThread(threadId);
}

function renderThreadList(){
  const el=document.getElementById('messages');if(!el)return;
  const threads=threadState.threads.filter(t=>t.channelId===Store.activeChannel);
  el.innerHTML=`
    <div style="padding:12px">
      <h3 style="color:var(--t1);margin:0 0 12px">Threadler (${threads.length})</h3>
      ${threads.length===0?'<div class="gm-empty"><span>Henüz thread yok</span></div>':
        threads.map(t=>`
          <div class="gm-list-item" onclick="openThread('${t.id}')">
            <div class="gm-item-info">
              <span class="gm-item-name">${escapeHtml(t.title)}</span>
              <span class="gm-item-sub">${t.messages?.length||0} mesaj · ${typeof formatRelativeTime==='function'?formatRelativeTime(t.lastActivity):''}</span>
            </div>
          </div>`).join('')}
    </div>`;
}

function initThreadsSocket(){
  if(!socket)return;
  socket.on('thread_created',t=>{if(!threadState.threads.find(x=>x.id===t.id)){threadState.threads.unshift(t);_saveThreads();}});
  socket.on('thread_message',({threadId,message})=>{const t=threadState.threads.find(x=>x.id===threadId);if(t){if(!t.messages)t.messages=[];t.messages.push(message);t.lastActivity=new Date().toISOString();_saveThreads();if(threadState.activeThread===threadId)openThread(threadId);}});
}

(function initThreads(){
  _loadThreads();
  if(typeof socket!=='undefined'&&socket)initThreadsSocket();
  else document.addEventListener('socket_ready',initThreadsSocket,{once:true});
  _threadLog('v2.0 yüklendi ✓');
})();


// ╔══════════════════════════════════════════════════════════════════╗
// ║   GETTIC STREAM.JS v2.0 - Ekran Paylaşımı                        ║
// ╚══════════════════════════════════════════════════════════════════╝

function _streamLog(msg,level='log'){console[level](`%c[Stream] ${msg}`,'color:#22d3ee;font-weight:bold')}

const streamState={active:false,stream:null,channelId:null,viewers:0};

async function startScreenShare(){
  if(streamState.active)return stopScreenShare();
  try{
    const stream=await navigator.mediaDevices.getDisplayMedia({video:{cursor:'always'},audio:true});
    streamState.stream=stream;streamState.active=true;
    if(socket?.connected)socket.emit('stream_start',{channelId:Store.activeChannel,userId:Store.user?._id,username:Store.user?.username});

    const panel=document.createElement('div');panel.id='streamPanel';panel.className='stream-panel';
    panel.innerHTML=`
      <div class="stream-preview-wrap">
        <video id="streamPreview" autoplay muted playsinline style="width:100%;border-radius:8px"></video>
      </div>
      <div class="stream-controls">
        <span class="stream-live">● CANLI</span>
        <span id="streamViewers">0 izleyici</span>
        <button class="gm-btn danger sm" onclick="stopScreenShare()">Paylaşımı Durdur</button>
      </div>`;
    document.body.appendChild(panel);

    const video=document.getElementById('streamPreview');
    if(video)video.srcObject=stream;

    stream.getVideoTracks()[0].onended=()=>stopScreenShare();
    toast('🖥️ Ekran paylaşımı başladı','i');
    _streamLog('Ekran paylaşımı başlatıldı');
  }catch(e){
    if(e.name!=='NotAllowedError')toast('Ekran paylaşımı başlatılamadı: '+e.message,'e');
    _streamLog('Ekran paylaşımı hatası: '+e.message,'error');
  }
}

function stopScreenShare(){
  streamState.stream?.getTracks().forEach(t=>t.stop());
  streamState.active=false;streamState.stream=null;
  document.getElementById('streamPanel')?.remove();
  if(socket?.connected)socket.emit('stream_stop',{channelId:Store.activeChannel,userId:Store.user?._id});
  toast('Ekran paylaşımı durduruldu','i');
  _streamLog('Ekran paylaşımı durduruldu');
}

function initStreamSocket(){
  if(!socket)return;
  socket.on('stream_started',({userId,username})=>{if(userId!==Store.user?._id)toast(`${username} ekran paylaşıyor 🖥️`,'i');});
  socket.on('stream_stopped',({userId,username})=>{if(userId!==Store.user?._id)toast(`${username} paylaşımı durdurdu`,'i');});
  socket.on('stream_viewers',({count})=>{
    streamState.viewers=count;
    const el=document.getElementById('streamViewers');
    if(el)el.textContent=count+' izleyici';
  });
}

(function(){
  const id='gt-stream-styles';if(document.getElementById(id))return;
  const s=document.createElement('style');s.id=id;
  s.textContent=`
.stream-panel{position:fixed;bottom:24px;right:24px;z-index:100;background:var(--bg1);border:1px solid rgba(255,255,255,.1);border-radius:14px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,.5);min-width:300px}
.stream-preview-wrap{background:#000;max-height:200px;overflow:hidden}
.stream-controls{display:flex;align-items:center;gap:8px;padding:8px 12px}
.stream-live{font-size:11px;font-weight:700;color:#ef4444;background:#ef444418;padding:3px 8px;border-radius:10px}
`;
  document.head.appendChild(s);
})();

(function initStream(){
  if(typeof socket!=='undefined'&&socket)initStreamSocket();
  else document.addEventListener('socket_ready',initStreamSocket,{once:true});
  _streamLog('v2.0 yüklendi ✓');
})();


// ╔══════════════════════════════════════════════════════════════════╗
// ║   GETTIC GAMES.JS v2.0 - Oyun Sistemi                            ║
// ╚══════════════════════════════════════════════════════════════════╝

function _gamesLog(msg,level='log'){console[level](`%c[Games] ${msg}`,'color:#f59e0b;font-weight:bold')}

const gamesState={activeGame:null,gameData:{}};

// ─── Oyun listesi ────────────────────────────────────────────────
const GAMES={
  tictactoe:{name:'XOX',icon:'⭕',minPlayers:2,maxPlayers:2},
  wordle:{name:'Kelime Bul',icon:'🔤',minPlayers:1,maxPlayers:1},
  trivia:{name:'Bilgi Yarışması',icon:'🧠',minPlayers:2,maxPlayers:10},
};

function openGamesPanel(){
  if(typeof MODAL_TEMPLATES==='undefined')return;
  MODAL_TEMPLATES.games=()=>`
    <div class="gm-header"><h2>🎮 Oyunlar</h2></div>
    <div class="gm-body">
      <div class="gm-list">
        ${Object.entries(GAMES).map(([id,g])=>`
          <div class="gm-list-item" onclick="startGame('${id}')">
            <span style="font-size:24px">${g.icon}</span>
            <div class="gm-item-info">
              <span class="gm-item-name">${g.name}</span>
              <span class="gm-item-sub">${g.minPlayers}${g.maxPlayers!==g.minPlayers?'-'+g.maxPlayers:''} oyuncu</span>
            </div>
            <button class="gm-btn primary sm">Başlat</button>
          </div>`).join('')}
      </div>
    </div>`;
  openModal('games');
}

function startGame(gameId){
  const game=GAMES[gameId];if(!game)return;
  gamesState.activeGame=gameId;
  closeModal();

  // XOX
  if(gameId==='tictactoe'){
    gamesState.gameData={board:Array(9).fill(''),turn:'X',winner:null};
    _renderTicTacToe();
    if(socket?.connected)socket.emit('game_start',{gameId,channelId:Store.activeChannel,userId:Store.user?._id,username:Store.user?.username});
    toast('⭕ XOX başlatıldı','i');
  }
  // Wordle
  if(gameId==='wordle'){
    _startWordle();
    toast('🔤 Kelime Bul başlatıldı','i');
  }
  _gamesLog('Oyun başlatıldı: '+gameId);
}

// ─── XOX ────────────────────────────────────────────────────────
function _renderTicTacToe(){
  const el=document.getElementById('messages');if(!el)return;
  const {board,turn,winner}=gamesState.gameData;
  const WIN_LINES=[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  const checkWinner=()=>{for(const[a,b,c]of WIN_LINES)if(board[a]&&board[a]===board[b]&&board[a]===board[c])return board[a];return board.every(Boolean)?'draw':null;};
  const w=winner||checkWinner();

  el.innerHTML=`
    <div style="padding:20px;text-align:center">
      <h3 style="color:var(--t1);margin-bottom:16px">⭕ XOX ${w?'':'— Sıra: '+turn}</h3>
      ${w?`<p style="font-size:16px;font-weight:700;color:var(--ac);margin-bottom:12px">${w==='draw'?'Berabere!':w+' Kazandı! 🎉'}</p>`:''}
      <div style="display:grid;grid-template-columns:repeat(3,80px);gap:6px;justify-content:center;margin:0 auto 16px">
        ${board.map((cell,i)=>`
          <button onclick="tttMove(${i})" style="width:80px;height:80px;font-size:28px;font-weight:900;border-radius:10px;border:2px solid rgba(255,255,255,.15);background:var(--bg2);cursor:${cell||w?'default':'pointer'};color:${cell==='X'?'var(--ac)':'#ec4899'};transition:background .15s" ${cell||w?'disabled':''}>
            ${cell||''}
          </button>`).join('')}
      </div>
      <button class="gm-btn ghost" onclick="gamesState.gameData={board:Array(9).fill(''),turn:'X',winner:null};_renderTicTacToe()">Yeniden</button>
      <button class="gm-btn ghost" style="margin-left:8px" onclick="gamesState.activeGame=null;if(typeof renderMessages==='function')renderMessages()">Çıkış</button>
    </div>`;
}

function tttMove(idx){
  const {board,turn,winner}=gamesState.gameData;
  if(board[idx]||winner)return;
  board[idx]=turn;
  const WIN_LINES=[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  let w=null;for(const[a,b,c]of WIN_LINES)if(board[a]&&board[a]===board[b]&&board[a]===board[c]){w=board[a];break;}
  if(!w&&board.every(Boolean))w='draw';
  gamesState.gameData.turn=turn==='X'?'O':'X';
  gamesState.gameData.winner=w;
  if(socket?.connected)socket.emit('game_move',{gameId:'tictactoe',channelId:Store.activeChannel,move:{idx,player:turn},board:gamesState.gameData.board});
  _renderTicTacToe();
}

// ─── Wordle ───────────────────────────────────────────────────────
const WORDLE_WORDS=['kalem','kitap','masa','sandalye','pencere','kapı','araba','elma','armut','çilek'].map(w=>w.toUpperCase());

function _startWordle(){
  const word=WORDLE_WORDS[Math.floor(Math.random()*WORDLE_WORDS.length)];
  gamesState.gameData={word,guesses:[],currentGuess:'',maxGuesses:6};
  _renderWordle();
}

function _renderWordle(){
  const el=document.getElementById('messages');if(!el)return;
  const {word,guesses,currentGuess,maxGuesses}=gamesState.gameData;
  const wordLen=word.length;
  const won=guesses.includes(word);
  const lost=!won&&guesses.length>=maxGuesses;

  const rows=[];
  for(let r=0;r<maxGuesses;r++){
    const guess=guesses[r]||'';
    const cells=[];
    for(let c=0;c<wordLen;c++){
      const letter=guess[c]||'';
      let status='';
      if(guess){status=word[c]===letter?'correct':word.includes(letter)?'present':'absent';}
      cells.push(`<div class="wordle-cell ${status}">${letter}</div>`);
    }
    rows.push(`<div class="wordle-row">${cells.join('')}</div>`);
  }

  el.innerHTML=`
    <div style="padding:20px;text-align:center">
      <h3 style="color:var(--t1);margin-bottom:4px">🔤 Kelime Bul</h3>
      <p style="color:var(--t3);font-size:12px;margin-bottom:16px">${wordLen} harfli kelimeyi bul (${maxGuesses} hak)</p>
      <div style="display:flex;flex-direction:column;gap:4px;align-items:center;margin-bottom:16px">${rows.join('')}</div>
      ${won?`<p style="color:#10b981;font-weight:700">🎉 Tebrikler! "${word}" doğru!</p>`:''}
      ${lost?`<p style="color:#ef4444;font-weight:700">Kelime: "${word}"</p>`:''}
      ${!won&&!lost?`
        <input class="gm-input" id="wordleInput" maxlength="${wordLen}" placeholder="${wordLen} harf gir..." oninput="this.value=this.value.toUpperCase()" style="width:${wordLen*44}px;text-align:center;font-size:18px;letter-spacing:4px;max-width:100%" onkeydown="if(event.key==='Enter')wordleGuess(this.value)">
        <button class="gm-btn primary" style="margin-top:8px" onclick="wordleGuess(document.getElementById('wordleInput').value)">Dene</button>`:''}
      <div style="margin-top:12px;display:flex;gap:8px;justify-content:center">
        <button class="gm-btn ghost" onclick="_startWordle()">Yeniden</button>
        <button class="gm-btn ghost" onclick="gamesState.activeGame=null;if(typeof renderMessages==='function')renderMessages()">Çıkış</button>
      </div>
    </div>`;
}

function wordleGuess(guess){
  guess=(guess||'').trim().toUpperCase();
  const {word,guesses,maxGuesses}=gamesState.gameData;
  if(guess.length!==word.length)return toast(`${word.length} harfli bir kelime gir`,'w');
  gamesState.gameData.guesses=[...guesses,guess];
  _renderWordle();
}

function initGamesSocket(){
  if(!socket)return;
  socket.on('game_move',({gameId,move,board})=>{
    if(gameId==='tictactoe'&&gamesState.activeGame==='tictactoe'){
      if(board)gamesState.gameData.board=board;
      gamesState.gameData.turn=move.player==='X'?'O':'X';
      _renderTicTacToe();
    }
  });
}

(function(){
  const id='gt-games-styles';if(document.getElementById(id))return;
  const s=document.createElement('style');s.id=id;
  s.textContent=`
.wordle-row{display:flex;gap:4px}
.wordle-cell{width:42px;height:42px;border:2px solid rgba(255,255,255,.15);border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:800;color:var(--t1)}
.wordle-cell.correct{background:#10b98133;border-color:#10b981;color:#10b981}
.wordle-cell.present{background:#f59e0b33;border-color:#f59e0b;color:#f59e0b}
.wordle-cell.absent{background:rgba(255,255,255,.05);border-color:rgba(255,255,255,.1);color:var(--t3)}
`;
  document.head.appendChild(s);
})();

(function initGames(){
  if(typeof socket!=='undefined'&&socket)initGamesSocket();
  else document.addEventListener('socket_ready',initGamesSocket,{once:true});
  _gamesLog('v2.0 yüklendi ✓');
})();


// ╔══════════════════════════════════════════════════════════════════╗
// ║   GETTIC VISUALS.JS v2.0 - Görsel Efektler                       ║
// ╚══════════════════════════════════════════════════════════════════╝

function _visLog(msg,level='log'){console[level](`%c[Visuals] ${msg}`,'color:#f472b6;font-weight:bold')}

// ─── Konfeti ────────────────────────────────────────────────────
function launchConfetti(opts={}){
  const colors=opts.colors||['#6366f1','#ec4899','#10b981','#f59e0b','#3b82f6','#8b5cf6'];
  const count=opts.count||80;
  const canvas=document.createElement('canvas');
  canvas.style.cssText='position:fixed;inset:0;z-index:9999;pointer-events:none';
  canvas.width=window.innerWidth;canvas.height=window.innerHeight;
  document.body.appendChild(canvas);
  const ctx=canvas.getContext('2d');

  const particles=Array.from({length:count},()=>({
    x:Math.random()*canvas.width,y:-10,
    w:Math.random()*10+4,h:Math.random()*6+3,
    color:colors[Math.floor(Math.random()*colors.length)],
    vx:(Math.random()-0.5)*4,vy:Math.random()*3+2,
    angle:Math.random()*360,av:(Math.random()-0.5)*8,
    life:1,decay:Math.random()*0.01+0.005,
  }));

  const frame=()=>{
    ctx.clearRect(0,0,canvas.width,canvas.height);
    let alive=false;
    particles.forEach(p=>{
      p.x+=p.vx;p.y+=p.vy;p.angle+=p.av;p.life-=p.decay;p.vy+=0.05;
      if(p.life>0&&p.y<canvas.height){alive=true;}
      ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.angle*Math.PI/180);
      ctx.globalAlpha=Math.max(0,p.life);ctx.fillStyle=p.color;
      ctx.fillRect(-p.w/2,-p.h/2,p.w,p.h);ctx.restore();
    });
    if(alive)requestAnimationFrame(frame);else canvas.remove();
  };
  requestAnimationFrame(frame);
}

// ─── Mesaj animasyonu ────────────────────────────────────────────
function animateNewMessage(msgEl){
  if(!msgEl||Store.animations===false)return;
  msgEl.style.animation='none';
  msgEl.style.opacity='0';
  msgEl.style.transform='translateY(8px)';
  requestAnimationFrame(()=>{
    msgEl.style.transition='opacity .25s ease,transform .25s cubic-bezier(.34,1.56,.64,1)';
    msgEl.style.opacity='1';
    msgEl.style.transform='translateY(0)';
  });
}

// ─── Parlaklık efekti ────────────────────────────────────────────
function pulseElement(el,color='var(--ac)'){
  if(!el)return;
  el.style.transition='box-shadow .3s';
  el.style.boxShadow=`0 0 0 3px ${color}44`;
  setTimeout(()=>{el.style.boxShadow='';},600);
}

// ─── Sayı animasyonu ────────────────────────────────────────────
function animateNumber(el,from,to,duration=800){
  if(!el)return;
  const start=performance.now();
  const update=(now)=>{
    const t=Math.min((now-start)/duration,1);
    const val=Math.round(from+(to-from)*t);
    el.textContent=val;
    if(t<1)requestAnimationFrame(update);
  };
  requestAnimationFrame(update);
}

// ─── Tost tepkime efekti ─────────────────────────────────────────
function floatEmoji(emoji,x,y){
  const el=document.createElement('div');
  el.textContent=emoji;
  el.style.cssText=`position:fixed;left:${x}px;top:${y}px;font-size:24px;z-index:9999;pointer-events:none;animation:floatUp .8s ease forwards`;
  document.body.appendChild(el);
  setTimeout(()=>el.remove(),800);
}

// ─── Tema geçiş animasyonu ───────────────────────────────────────
function animateThemeChange(){
  const overlay=document.createElement('div');
  overlay.style.cssText='position:fixed;inset:0;z-index:9990;background:var(--ac);opacity:0;pointer-events:none;transition:opacity .2s';
  document.body.appendChild(overlay);
  requestAnimationFrame(()=>{
    overlay.style.opacity='0.15';
    setTimeout(()=>{overlay.style.opacity='0';setTimeout(()=>overlay.remove(),200);},200);
  });
}

// ─── Yazı efekti (typewriter) ────────────────────────────────────
function typewriter(el,text,speed=30){
  if(!el)return;el.textContent='';let i=0;
  const tick=()=>{if(i<text.length){el.textContent+=text[i++];setTimeout(tick,speed);}};
  tick();
}

// CSS
(function(){
  const id='gt-vis-styles';if(document.getElementById(id))return;
  const s=document.createElement('style');s.id=id;
  s.textContent=`
@keyframes floatUp{0%{opacity:1;transform:translateY(0)}100%{opacity:0;transform:translateY(-60px)}}
@keyframes msgIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
  `;
  document.head.appendChild(s);
})();

_visLog('v2.0 yüklendi ✓');


// ╔══════════════════════════════════════════════════════════════════╗
// ║   GETTIC SERVERSETTINGS.JS v2.0 - Sunucu Ayarları                ║
// ╚══════════════════════════════════════════════════════════════════╝

function _ssLog(msg,level='log'){console[level](`%c[ServerSettings] ${msg}`,'color:#60a5fa;font-weight:bold')}

function openServerSettings(){
  if(typeof MODAL_TEMPLATES==='undefined')return;

  MODAL_TEMPLATES.serverSettings=()=>{
    const ss=Store.serverSettings||{};
    return `
      <div class="gm-header">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
        <h2>Sunucu Ayarları</h2>
      </div>
      <div class="gm-body">
        <div class="gm-field"><label class="gm-label">Sunucu Adı</label><input class="gm-input" id="ssName" value="${escapeHtml(ss.name||'Gettic')}" maxlength="50"></div>
        <div class="gm-field"><label class="gm-label">Açıklama</label><textarea class="gm-textarea" id="ssDesc" rows="2" maxlength="200">${escapeHtml(ss.description||'')}</textarea></div>
        <div class="gm-field">
          <label class="gm-label">Bölge</label>
          <select class="gm-select" id="ssRegion">
            ${['Otomatik','Avrupa','Amerika','Asya'].map(r=>`<option value="${r.toLowerCase()}" ${(ss.region||'otomatik')===r.toLowerCase()?'selected':''}>${r}</option>`).join('')}
          </select>
        </div>
        <div class="gm-divider"></div>
        <div class="gm-toggle-row" onclick="document.getElementById('ssNSFW').checked=!document.getElementById('ssNSFW').checked;this.querySelector('.gm-toggle').classList.toggle('on')">
          <div class="gm-toggle-info"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg><span>Yetişkin İçerik</span></div>
          <input type="checkbox" id="ssNSFW" ${ss.nsfw?'checked':''} style="display:none">
          <div class="gm-toggle ${ss.nsfw?'on':''}"><div class="gm-toggle-knob"></div></div>
        </div>
        <div class="gm-toggle-row" onclick="document.getElementById('ssVerify').checked=!document.getElementById('ssVerify').checked;this.querySelector('.gm-toggle').classList.toggle('on')">
          <div class="gm-toggle-info"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg><span>Email Doğrulama</span></div>
          <input type="checkbox" id="ssVerify" ${ss.verification?'checked':''} style="display:none">
          <div class="gm-toggle ${ss.verification?'on':''}"><div class="gm-toggle-knob"></div></div>
        </div>
        <div class="gm-divider"></div>
        <div class="gm-section-label">Tehlikeli Bölge</div>
        <button class="gm-btn danger full" onclick="confirmDeleteServer()">Sunucuyu Sil</button>
        <div class="gm-actions" style="margin-top:12px">
          <button class="gm-btn ghost" onclick="closeModal()">İptal</button>
          <button class="gm-btn primary" onclick="saveServerSettings()">Kaydet</button>
        </div>
      </div>`;
  };

  openModal('serverSettings');
}

function saveServerSettings(){
  const name    =document.getElementById('ssName')?.value?.trim();
  const desc    =document.getElementById('ssDesc')?.value?.trim();
  const region  =document.getElementById('ssRegion')?.value;
  const nsfw    =document.getElementById('ssNSFW')?.checked||false;
  const verify  =document.getElementById('ssVerify')?.checked||false;

  if(!name||name.length<2)return toast('Sunucu adı en az 2 karakter','e');

  Store.serverSettings={...Store.serverSettings,name,description:desc||'',region,nsfw,verification:verify};
  const el=document.getElementById('serverName');if(el)el.textContent=name;

  if(typeof saveStore==='function')saveStore();
  if(socket?.connected)socket.emit('server_settings_updated',Store.serverSettings);
  if(typeof SyncEngine!=='undefined')SyncEngine.add('/api/server/settings','PUT',Store.serverSettings,10);

  toast('Sunucu ayarları kaydedildi','s');
  closeModal();
  _ssLog('Sunucu ayarları güncellendi');
}

function updateServerSettings(){saveServerSettings();}

function confirmDeleteServer(){
  const name=Store.serverSettings?.name||'Sunucu';
  const typed=prompt(`Bu işlem geri alınamaz! Silmek için sunucu adını yazın: "${name}"`);
  if(typed!==name)return toast('Sunucu adı eşleşmedi','e');
  const pass=prompt('Şifrenizi girin:');
  if(!pass)return;
  toast('Sunucu silindi (Demo — gerçek silme sunucu tarafında yapılır)','i');
  closeModal();
}

// Sunucu davet
function generateInviteLink(){
  const code='gtc_'+genId().slice(0,8);
  const link=`https://gettic.js.org/invite/${code}`;
  if(typeof MODAL_TEMPLATES!=='undefined'){
    MODAL_TEMPLATES.inviteLink=()=>`
      <div class="gm-header"><h2>Davet Linki</h2></div>
      <div class="gm-body">
        <p class="gm-hint">Bu linki paylaşarak arkadaşlarını sunucuya davet et.</p>
        <div class="gm-copy-box">
          <input class="gm-input" value="${link}" readonly onclick="this.select()">
          <button class="gm-btn primary" onclick="navigator.clipboard.writeText('${link}').then(()=>toast('Link kopyalandı','s'))">Kopyala</button>
        </div>
        <div class="gm-actions"><button class="gm-btn ghost" onclick="closeModal()">Kapat</button></div>
      </div>`;
    openModal('inviteLink');
  }
  if(socket?.connected)socket.emit('invite_created',{code,serverId:Store.serverSettings?.id||'gettic',createdBy:Store.user?._id});
  return link;
}

_ssLog('v2.0 yüklendi ✓');
