function openModal(name) { console.log('Modal aç:', name); }
function closeModal() { console.log('Modal kapandı'); }
function toggleSidebar() { document.querySelector('.sidebar')?.classList.toggle('open'); }
function toast(msg, type) { console.log('Toast:', msg, type); }
