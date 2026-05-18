// ============ GETTIC FORUM.JS - FORUM KANALI ============

const forumState = {
  posts: JSON.parse(localStorage.getItem('gt_forum_posts') || '{}'),
  channels: JSON.parse(localStorage.getItem('gt_forum_channels') || '{}'),
  activePost: null,
  sortBy: 'latest', // latest, popular, oldest
  tags: ['duyuru', 'tartışma', 'yardım', 'öneri', 'etkinlik', 'tanıtım', 'oyun', 'müzik', 'teknoloji', 'diğer']
};

// Forum postu oluştur
function createForumPost(channelId, title, content, tags = []) {
  if (!title?.trim()) return toast('Başlık gerekli', 'e');
  if (!content?.trim()) return toast('İçerik gerekli', 'e');
  
  const postId = genId();
  const post = {
    id: postId,
    channelId,
    title: title.trim(),
    content: content.trim(),
    tags: tags.filter(t => t?.trim()),
    authorId: Store.user._id,
    authorName: Store.user.username,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    replies: [],
    views: 0,
    likes: [],
    isPinned: false,
    isLocked: false,
    isArchived: false
  };
  
  if (!forumState.posts[channelId]) {
    forumState.posts[channelId] = [];
  }
  forumState.posts[channelId].unshift(post);
  
  saveForumState();
  toast('📋 Gönderi oluşturuldu');
  showForumChannel(channelId);
  return postId;
}

// Foruma cevap yaz
function replyToPost(channelId, postId, content) {
  if (!content?.trim()) return;
  
  const post = forumState.posts[channelId]?.find(p => p.id === postId);
  if (!post || post.isLocked) return;
  
  const reply = {
    id: genId(),
    content: content.trim(),
    authorId: Store.user._id,
    authorName: Store.user.username,
    createdAt: new Date().toISOString(),
    likes: []
  };
  
  post.replies.push(reply);
  post.updatedAt = new Date().toISOString();
  
  saveForumState();
  showForumPost(channelId, postId);
}

// Forum kanalı görünümü
function showForumChannel(channelId) {
  const posts = forumState.posts[channelId] || [];
  const messagesEl = document.getElementById('messages');
  const channelName = document.getElementById('channelName');
  const inputArea = document.querySelector('.input-area');
  
  if (channelName) {
    const channel = Store.channels?.find(c => c.id === channelId);
    channelName.textContent = '📋 ' + (channel?.name || 'Forum');
  }
  
  // Sıralama
  let sortedPosts = [...posts].filter(p => !p.isArchived);
  if (forumState.sortBy === 'popular') {
    sortedPosts.sort((a, b) => (b.likes.length + b.replies.length) - (a.likes.length + a.replies.length));
  } else if (forumState.sortBy === 'oldest') {
    sortedPosts.reverse();
  } else {
    // latest - zaten sıralı
  }
  
  // Sabitlenenleri en üste al
  const pinned = sortedPosts.filter(p => p.isPinned);
  const normal = sortedPosts.filter(p => !p.isPinned);
  sortedPosts = [...pinned, ...normal];
  
  if (messagesEl) {
    if (sortedPosts.length === 0) {
      messagesEl.innerHTML = `
        <div class="empty-ch">
          <h4>📋 Forum</h4>
          <p>Henüz gönderi yok. İlk gönderiyi sen oluştur!</p>
          <button class="mb" onclick="showCreatePostForm('${channelId}')" style="max-width:200px;margin:10px auto">+ Gönderi Oluştur</button>
        </div>`;
    } else {
      messagesEl.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
          <div style="display:flex;gap:6px">
            <button class="search-filter ${forumState.sortBy==='latest'?'active':''}" onclick="setForumSort('latest','${channelId}')" style="padding:4px 10px;border-radius:14px;border:1px solid var(--b2);background:var(--bg2);color:var(--t2);font-size:11px;cursor:pointer">🕐 En Yeni</button>
            <button class="search-filter ${forumState.sortBy==='popular'?'active':''}" onclick="setForumSort('popular','${channelId}')" style="padding:4px 10px;border-radius:14px;border:1px solid var(--b2);background:var(--bg2);color:var(--t2);font-size:11px;cursor:pointer">🔥 Popüler</button>
            <button class="search-filter ${forumState.sortBy==='oldest'?'active':''}" onclick="setForumSort('oldest','${channelId}')" style="padding:4px 10px;border-radius:14px;border:1px solid var(--b2);background:var(--bg2);color:var(--t2);font-size:11px;cursor:pointer">📅 En Eski</button>
          </div>
          <button class="mb sec" onclick="showCreatePostForm('${channelId}')" style="width:auto;padding:6px 14px;font-size:11px">+ Yeni Gönderi</button>
        </div>
        ${sortedPosts.map(p => `
          <div class="forum-post" onclick="showForumPost('${channelId}','${p.id}')" style="background:var(--bg2);padding:14px;border-radius:10px;margin-bottom:8px;cursor:pointer;transition:background .15s">
            <div style="display:flex;align-items:flex-start;gap:10px">
              <div class="forum-post-av" style="width:40px;height:40px;border-radius:50%;background:var(--acd);display:flex;align-items:center;justify-content:center;font-weight:700;color:var(--ac);flex-shrink:0">${p.authorName.charAt(0).toUpperCase()}</div>
              <div style="flex:1;min-width:0">
                <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
                  <span style="font-weight:700;font-size:14px">${p.title}</span>
                  ${p.isPinned ? '<span style="font-size:10px;color:var(--ye)">📌 Sabit</span>' : ''}
                  ${p.isLocked ? '<span style="font-size:10px;color:var(--re)">🔒 Kilitli</span>' : ''}
                </div>
                <div style="font-size:11px;color:var(--t3);margin-top:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${p.content.substring(0, 100)}</div>
                <div style="display:flex;gap:8px;margin-top:6px;flex-wrap:wrap">
                  ${p.tags.map(t => `<span class="forum-tag" style="font-size:9px;background:var(--bg3);padding:2px 7px;border-radius:8px;color:var(--ac)">${t}</span>`).join('')}
                </div>
                <div style="display:flex;gap:12px;margin-top:8px;font-size:10px;color:var(--t3)">
                  <span>💬 ${p.replies.length} yanıt</span>
                  <span>❤️ ${p.likes.length} beğeni</span>
                  <span>👁️ ${p.views} görüntülenme</span>
                  <span>${formatTime(p.createdAt)}</span>
                </div>
              </div>
            </div>
          </div>
        `).join('')}
      `;
    }
    
    messagesEl.scrollTop = 0;
  }
  
  // Input alanını gizle
  if (inputArea) inputArea.style.display = 'none';
}

// Forum post detay
function showForumPost(channelId, postId) {
  const post = forumState.posts[channelId]?.find(p => p.id === postId);
  if (!post) return;
  
  post.views++;
  saveForumState();
  
  const messagesEl = document.getElementById('messages');
  const channelName = document.getElementById('channelName');
  const inputArea = document.querySelector('.input-area');
  
  if (channelName) channelName.textContent = '📋 ' + (post.title || 'Gönderi');
  
  if (messagesEl) {
    messagesEl.innerHTML = `
      <button onclick="showForumChannel('${channelId}')" style="background:none;border:none;color:var(--ac);cursor:pointer;font-size:12px;margin-bottom:12px">← Forum'a Dön</button>
      
      <div class="forum-post-detail" style="background:var(--bg2);padding:16px;border-radius:12px;margin-bottom:12px">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
          <div class="forum-post-av" style="width:36px;height:36px;border-radius:50%;background:var(--acd);display:flex;align-items:center;justify-content:center;font-weight:700;color:var(--ac)">${post.authorName.charAt(0).toUpperCase()}</div>
          <div>
            <div style="font-weight:700;font-size:13px">${post.authorName}</div>
            <div style="font-size:10px;color:var(--t3)">${formatTime(post.createdAt)}</div>
          </div>
          <div style="margin-left:auto;display:flex;gap:4px">
            ${post.authorId === Store.user._id || hasPermission(Store.user._id, 'manageMessages') ? `
              <button class="ib" onclick="lockForumPost('${channelId}','${postId}')" style="width:24px;height:24px" title="${post.isLocked?'Kilidi Aç':'Kilitle'}">${post.isLocked?'🔓':'🔒'}</button>
              <button class="ib" onclick="pinForumPost('${channelId}','${postId}')" style="width:24px;height:24px" title="Sabitle">📌</button>
            ` : ''}
          </div>
        </div>
        <h3 style="margin-bottom:8px;font-size:16px">${post.title}</h3>
        <div class="msg-text" style="margin-bottom:8px">${formatMsg(post.content)}</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px">
          ${post.tags.map(t => `<span class="forum-tag" style="font-size:9px;background:var(--bg3);padding:2px 7px;border-radius:8px;color:var(--ac)">${t}</span>`).join('')}
        </div>
        <div style="display:flex;gap:10px">
          <button class="ib" onclick="likeForumPost('${channelId}','${postId}')" style="width:auto;padding:4px 10px;font-size:11px">
            ${post.likes.includes(Store.user._id) ? '❤️' : '🤍'} ${post.likes.length}
          </button>
        </div>
      </div>
      
      <div style="font-weight:600;font-size:13px;margin-bottom:8px">💬 Yanıtlar (${post.replies.length})</div>
      
      ${post.replies.length === 0 ? 
        '<p style="color:var(--t3);font-size:12px;padding:10px">Henüz yanıt yok</p>' :
        post.replies.map(r => `
          <div class="msg" style="border-bottom:1px solid var(--b);padding-bottom:8px;margin-bottom:8px">
            <div class="msg-av">${r.authorName.charAt(0).toUpperCase()}</div>
            <div class="msg-body">
              <div class="msg-head">
                <span>${r.authorName}</span>
                <span class="msg-time">${formatTime(r.createdAt)}</span>
              </div>
              <div class="msg-text">${formatMsg(r.content)}</div>
            </div>
          </div>
        `).join('')
      }
      
      ${post.isLocked ? '<p style="color:var(--re);font-size:11px;text-align:center">🔒 Bu gönderi kilitli</p>' : ''}
    `;
    
    messagesEl.scrollTop = 0;
  }
  
  // Input alanını göster (cevap için)
  if (inputArea && !post.isLocked) {
    inputArea.style.display = 'flex';
    inputArea.innerHTML = `
      <textarea class="msg-inp" id="forumReplyInput" placeholder="Yanıt yaz..." rows="1"></textarea>
      <button class="ib" style="background:var(--gr)" id="forumReplyBtn">➤</button>
      <button class="ib" onclick="showForumChannel('${channelId}')">×</button>
    `;
    
    document.getElementById('forumReplyBtn').onclick = () => {
      const input = document.getElementById('forumReplyInput');
      if (input?.value.trim()) {
        replyToPost(channelId, postId, input.value);
        input.value = '';
      }
    };
    
    document.getElementById('forumReplyInput').addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        document.getElementById('forumReplyBtn').click();
      }
    });
  }
}

// Forum post oluşturma formu
function showCreatePostForm(channelId) {
  const content = document.getElementById('modalContent');
  if (!content) return;
  
  content.innerHTML = `
    <h2>📋 Gönderi Oluştur</h2>
    <input class="mi" id="postTitle" placeholder="Başlık" maxlength="100">
    <textarea class="mi mta" id="postContent" placeholder="İçerik yaz..." rows="5"></textarea>
    <label class="ml">Etiketler</label>
    <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px">
      ${forumState.tags.map(t => `
        <label class="poll-setting" style="margin:0">
          <input type="checkbox" class="post-tag-check" value="${t}"> ${t}
        </label>
      `).join('')}
    </div>
    <button class="mb" onclick="submitCreatePost('${channelId}')">Oluştur</button>
  `;
  
  openModal('forum');
}

function submitCreatePost(channelId) {
  const title = document.getElementById('postTitle')?.value;
  const content = document.getElementById('postContent')?.value;
  const tags = [...document.querySelectorAll('.post-tag-check:checked')].map(cb => cb.value);
  
  if (createForumPost(channelId, title, content, tags)) {
    closeModal();
  }
}

// Forum yardımcı fonksiyonları
function setForumSort(sort, channelId) {
  forumState.sortBy = sort;
  showForumChannel(channelId);
}

function likeForumPost(channelId, postId) {
  const post = forumState.posts[channelId]?.find(p => p.id === postId);
  if (!post) return;
  
  const idx = post.likes.indexOf(Store.user._id);
  if (idx === -1) post.likes.push(Store.user._id);
  else post.likes.splice(idx, 1);
  
  saveForumState();
  showForumPost(channelId, postId);
}

function lockForumPost(channelId, postId) {
  const post = forumState.posts[channelId]?.find(p => p.id === postId);
  if (!post) return;
  post.isLocked = !post.isLocked;
  saveForumState();
  showForumPost(channelId, postId);
}

function pinForumPost(channelId, postId) {
  const post = forumState.posts[channelId]?.find(p => p.id === postId);
  if (!post) return;
  post.isPinned = !post.isPinned;
  saveForumState();
  toast(post.isPinned ? '📌 Sabitlendi' : '📌 Sabitleme kaldırıldı');
}

function saveForumState() {
  localStorage.setItem('gt_forum_posts', JSON.stringify(forumState.posts));
}

// Başlat
document.addEventListener('DOMContentLoaded', () => {
  // Forum kanalına tıklanınca
  document.addEventListener('click', (e) => {
    const chItem = e.target.closest('.ch-item');
    if (chItem?.dataset?.type === 'forum') {
      showForumChannel(chItem.dataset.id);
    }
  });
});
