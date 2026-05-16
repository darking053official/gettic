function openModal(name) {
  store.activeModal = name;
}

function closeModal() {
  store.activeModal = null;
}

function setTheme(color) {
  store.theme = color;
  localStorage.setItem('gt_ac', color);
}

function toggleSidebar() {
  store.sidebarOpen = !store.sidebarOpen;
}
