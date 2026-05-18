// ============ GETTIC FILES.JS - DOSYA PAYLAŞIMI ============

// Dosya state
const fileState = {
  maxSize: 10 * 1024 * 1024, // 10MB
  allowedTypes: ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'video/mp4', 'video/webm', 'audio/mp3', 'audio/wav', 'application/pdf', 'text/plain'],
  uploadedFiles: JSON.parse(localStorage.getItem('gt_files') || '[]'),
  currentPreview: null
};

// Dosya yükleme input'u
function initFileUpload() {
  const input = document.getElementById('fileUpload');
  if (!input) return;
  
  input.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) handleFile(file);
    input.value = '';
  });
}

// Dosya işleme
function handleFile(file) {
  // Boyut kontrolü
  if (file.size > fileState.maxSize) {
    return toast('❌ Dosya çok büyük (max 10MB)', 'e');
  }
  
  // Tür kontrolü
  if (!fileState.allowedTypes.includes(file.type)) {
    return toast('❌ Desteklenmeyen dosya türü', 'e');
  }
  
  // Dosyayı oku
  const reader = new FileReader();
  reader.onload = (e) => {
    const data = e.target.result;
    uploadFile(file.name, file.type, file.size, data);
  };
  reader.readAsDataURL(file);
}

// Dosya yükleme
function uploadFile(name, type, size, data) {
  const file = {
    id: genId(),
    name,
    type,
    size,
    data,
    uploadedBy: Store.user?.username,
    uploadedAt: new Date().toISOString(),
    channelId: Store.activeChannel
  };
  
  // Listeye ekle
  fileState.uploadedFiles.unshift(file);
  if (fileState.uploadedFiles.length > 100) fileState.uploadedFiles.pop();
  saveFileState();
  
  // Mesaj olarak gönder
  if (type.startsWith('image/')) {
    sendFileMessage(file, 'image');
  } else if (type.startsWith('video/')) {
    sendFileMessage(file, 'video');
  } else if (type.startsWith('audio/')) {
    sendFileMessage(file, 'audio');
  } else {
    sendFileMessage(file, 'file');
  }
  
  toast('📎 Dosya gönderildi');
}

// Dosya mesajı gönder
function sendFileMessage(file, category) {
  let content = '';
  
  switch (category) {
    case 'image':
      content = `🖼️ **${file.name}**`;
      break;
    case 'video':
      content = `🎬 **${file.name}**`;
      break;
    case 'audio':
      content = `🎵 **${file.name}**`;
      break;
    default:
      content = `📎 **${file.name}** (${formatFileSize(file.size)})`;
  }
  
  const msg = {
    _id: genId(),
    content,
    senderName: Store.user.username,
    senderId: Store.user._id,
    channelId: Store.activeChannel,
    createdAt: new Date().toISOString(),
    file: {
      name: file.name,
      type: file.type,
      size: file.size,
      data: file.data,
      category
    }
  };
  
  Store.messages.push(msg);
  if (typeof renderMessages === 'function') renderMessages();
  if (typeof saveStore === 'function') saveStore();
}

// Dosya render (chat.js'de renderMessages içinde)
function renderFileMessage(msg) {
  const file = msg.file;
  if (!file) return '';
  
  switch (file.category) {
    case 'image':
      return `<img src="${file.data}" alt="${file.name}" class="msg-image" loading="lazy" onclick="viewFile('${msg._id}')" style="max-width:300px;max-height:300px;border-radius:12px;cursor:pointer">`;
    
    case 'video':
      return `<video src="${file.data}" controls style="max-width:300px;max-height:300px;border-radius:12px" preload="metadata"></video>`;
    
    case 'audio':
      return `<audio src="${file.data}" controls style="width:250px"></audio>`;
    
    default:
      return `<div class="file-attachment" onclick="downloadFile('${msg._id}')" style="background:var(--bg2);padding:10px 14px;border-radius:10px;cursor:pointer;display:flex;align-items:center;gap:8px">
        <span style="font-size:24px">📎</span>
        <div>
          <div style="font-weight:600;font-size:12px">${file.name}</div>
          <div style="font-size:10px;color:var(--t3)">${formatFileSize(file.size)}</div>
        </div>
      </div>`;
  }
}

// Dosya görüntüleme
function viewFile(msgId) {
  const msg = Store.messages.find(m => m._id === msgId);
  if (!msg?.file) return;
  
  fileState.currentPreview = msg.file;
  
  const modal = document.getElementById('modal');
  const content = document.getElementById('modalContent');
  if (!modal || !content) return;
  
  content.innerHTML = `
    <div style="text-align:center">
      ${msg.file.category === 'image' ? 
        `<img src="${msg.file.data}" style="max-width:100%;max-height:70vh;border-radius:12px">` :
        msg.file.category === 'video' ?
        `<video src="${msg.file.data}" controls style="max-width:100%;max-height:70vh;border-radius:12px" autoplay></video>` :
        ''
      }
      <div style="margin-top:8px;display:flex;justify-content:center;gap:8px">
        <button class="mb sec" onclick="downloadFile('${msgId}')">⬇️ İndir</button>
        <button class="mb sec" onclick="copyFileLink('${msgId}')">📋 Link Kopyala</button>
      </div>
    </div>
  `;
  
  modal.classList.remove('hidden');
  modal.classList.add('show');
}

// Dosya indir
function downloadFile(msgId) {
  const msg = Store.messages.find(m => m._id === msgId);
  if (!msg?.file) return;
  
  const a = document.createElement('a');
  a.href = msg.file.data;
  a.download = msg.file.name;
  a.click();
}

// Dosya linki kopyala
function copyFileLink(msgId) {
  const msg = Store.messages.find(m => m._id === msgId);
  if (!msg?.file) return;
  
  navigator.clipboard.writeText(msg.file.data).then(() => toast('📋 Link kopyalandı'));
}

// Dosya boyutu formatla
function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// Dosya yükleme modal'ı
function showFileUploadModal() {
  const input = document.getElementById('fileUpload');
  if (input) input.click();
}

// Kaydet
function saveFileState() {
  localStorage.setItem('gt_files', JSON.stringify(fileState.uploadedFiles.slice(0, 50)));
}

// Buton
document.addEventListener('DOMContentLoaded', () => {
  // Dosya input'u oluştur
  if (!document.getElementById('fileUpload')) {
    const input = document.createElement('input');
    input.type = 'file';
    input.id = 'fileUpload';
    input.style.display = 'none';
    input.accept = fileState.allowedTypes.join(',');
    document.body.appendChild(input);
    initFileUpload();
  }
  
  // Dosya butonu
  const fileBtn = document.getElementById('fileBtn');
  if (fileBtn) fileBtn.onclick = showFileUploadModal;
});

// Dosya sürükle bırak
document.addEventListener('DOMContentLoaded', () => {
  const chatArea = document.getElementById('chatArea');
  if (!chatArea) return;
  
  chatArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    chatArea.style.opacity = '0.8';
  });
  
  chatArea.addEventListener('dragleave', () => {
    chatArea.style.opacity = '1';
  });
  
  chatArea.addEventListener('drop', (e) => {
    e.preventDefault();
    chatArea.style.opacity = '1';
    
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  });
});
