// ╔══════════════════════════════════════════════════════════════════╗
// ║           GETTIC FILES.JS - SVG İKONLU FINAL                     ║
// ╚══════════════════════════════════════════════════════════════════╝

// SVG ikon yardımcı
function fileIcon(name, size = 20) {
  return window.Icons?.[name] ? `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle">${Icons[name]}</svg>` : '';
}

const fileState = {
  maxSize: 10 * 1024 * 1024,
  allowedTypes: ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'video/mp4', 'video/webm', 'audio/mp3', 'audio/wav', 'application/pdf', 'text/plain'],
  uploadedFiles: JSON.parse(localStorage.getItem('gt_files') || '[]'),
  currentPreview: null
};

function initFileUpload() {
  const input = document.getElementById('fileUpload');
  if (!input) return;
  input.addEventListener('change', (e) => { const file = e.target.files[0]; if (file) handleFile(file); input.value = ''; });
}

function handleFile(file) {
  if (file.size > fileState.maxSize) return toast('Dosya cok buyuk (max 10MB)', 'e');
  if (!fileState.allowedTypes.includes(file.type)) return toast('Desteklenmeyen dosya turu', 'e');
  const reader = new FileReader();
  reader.onload = (e) => uploadFile(file.name, file.type, file.size, e.target.result);
  reader.readAsDataURL(file);
}

function uploadFile(name, type, size, data) {
  const file = { id: genId(), name, type, size, data, uploadedBy: Store.user?.username, uploadedAt: new Date().toISOString(), channelId: Store.activeChannel };
  fileState.uploadedFiles.unshift(file);
  if (fileState.uploadedFiles.length > 100) fileState.uploadedFiles.pop();
  saveFileState();
  
  // Dosya türüne göre ikon
  let icon = 'paperclip';
  if (type.startsWith('image/')) icon = 'image';
  else if (type.startsWith('video/')) icon = 'video';
  else if (type.startsWith('audio/')) icon = 'music';
  
  const content = `${fileIcon(icon)} **${file.name}**`;
  const category = type.startsWith('image/') ? 'image' : type.startsWith('video/') ? 'video' : type.startsWith('audio/') ? 'audio' : 'file';
  
  const msg = { _id: genId(), content, senderName: Store.user.username, senderId: Store.user._id, channelId: Store.activeChannel, createdAt: new Date().toISOString(), file: { name, type, size, data, category } };
  
  Store.messages.push(msg);
  if (typeof renderMessages === 'function') renderMessages();
  if (typeof saveStore === 'function') saveStore();
  if (socket) socket.emit('send_message', msg);
  toast(fileIcon('check') + ' Dosya gonderildi');
}

function renderFileMessage(msg) {
  const file = msg.file;
  if (!file) return '';
  switch (file.category) {
    case 'image': return `<img src="${file.data}" alt="${escapeHtml(file.name)}" class="msg-image" loading="lazy" onclick="viewFile('${msg._id}')" style="max-width:300px;max-height:300px;border-radius:12px;cursor:pointer">`;
    case 'video': return `<video src="${file.data}" controls style="max-width:300px;max-height:300px;border-radius:12px" preload="metadata"></video>`;
    case 'audio': return `<audio src="${file.data}" controls style="width:250px"></audio>`;
    default: return `<div class="file-attachment" onclick="downloadFile('${msg._id}')" style="background:var(--bg2);padding:10px 14px;border-radius:10px;cursor:pointer;display:flex;align-items:center;gap:8px"><span>${fileIcon('paperclip', 24)}</span><div><div style="font-weight:600;font-size:12px">${escapeHtml(file.name)}</div><div style="font-size:10px;color:var(--t3)">${formatFileSize(file.size)}</div></div></div>`;
  }
}

function viewFile(msgId) {
  const msg = Store.messages.find(m => m._id === msgId);
  if (!msg?.file) return;
  fileState.currentPreview = msg.file;
  const content = document.getElementById('modalContent');
  if (!content) return;
  content.innerHTML = `
    <div style="text-align:center">
      ${msg.file.category === 'image' ? `<img src="${msg.file.data}" style="max-width:100%;max-height:70vh;border-radius:12px">` : 
        msg.file.category === 'video' ? `<video src="${msg.file.data}" controls style="max-width:100%;max-height:70vh;border-radius:12px" autoplay></video>` : ''}
      <div style="margin-top:8px;display:flex;justify-content:center;gap:8px">
        <button class="mb sec" onclick="downloadFile('${msgId}')">${fileIcon('download')} Indir</button>
        <button class="mb sec" onclick="copyFileLink('${msgId}')">${fileIcon('copy')} Link Kopyala</button>
      </div>
    </div>`;
  if (typeof openModal === 'function') openModal('fileView');
}

function downloadFile(msgId) {
  const msg = Store.messages.find(m => m._id === msgId);
  if (!msg?.file) return;
  const a = document.createElement('a'); a.href = msg.file.data; a.download = msg.file.name; a.click();
}

function copyFileLink(msgId) {
  const msg = Store.messages.find(m => m._id === msgId);
  if (!msg?.file) return;
  navigator.clipboard.writeText(msg.file.data).then(() => toast(fileIcon('copy') + ' Link kopyalandi'));
}

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function saveFileState() { 
  localStorage.setItem('gt_files', JSON.stringify(fileState.uploadedFiles.slice(0, 50))); 
}

// HTML escape
function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str || '';
  return d.innerHTML;
}

document.addEventListener('DOMContentLoaded', () => {
  if (!document.getElementById('fileUpload')) {
    const input = document.createElement('input'); 
    input.type = 'file'; 
    input.id = 'fileUpload'; 
    input.style.display = 'none'; 
    input.accept = fileState.allowedTypes.join(','); 
    document.body.appendChild(input); 
    initFileUpload();
  }
  
  // Dosya butonunu SVG yap
  const fileBtn = document.getElementById('fileBtn'); 
  if (fileBtn) {
    fileBtn.innerHTML = fileIcon('paperclip', 20);
    fileBtn.onclick = () => document.getElementById('fileUpload')?.click();
  }
  
  // Drag & drop
  const chatArea = document.getElementById('chatArea');
  if (chatArea) {
    chatArea.addEventListener('dragover', (e) => { e.preventDefault(); chatArea.style.opacity = '0.8'; });
    chatArea.addEventListener('dragleave', () => { chatArea.style.opacity = '1'; });
    chatArea.addEventListener('drop', (e) => { 
      e.preventDefault(); 
      chatArea.style.opacity = '1'; 
      const file = e.dataTransfer.files[0]; 
      if (file) handleFile(file); 
    });
  }
});

console.log('Files.js yuklendi (SVG ikonlu)');
