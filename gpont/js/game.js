// ═══════════════════════════════════════════════════════════════════
// G-POINT ARENA - GAME v1.0 (3D)
// Three.js + cannon-es + Socket.io
// ═══════════════════════════════════════════════════════════════════

console.log('🔥 G-Point Arena 3D başlatılıyor...');

// ── URL'den oda ve kullanıcı bilgisi al ──────────────────────────
const params = new URLSearchParams(window.location.search);
const roomId = params.get('room') || 'arena-' + Date.now().toString(36);
const username = params.get('user') || 'Guest';

// ── Konfigürasyon ──────────────────────────────────────────────────
const CONFIG = {
  arenaSize: 80,
  maxPlayers: 4,
  gameDuration: 300, // 5 dakika
  respawnTime: 3,
  gravity: -20,
  playerSpeed: 8,
  jumpSpeed: 6,
};

// ── Three.js Sahnesi ──────────────────────────────────────────────
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a1a);
scene.fog = new THREE.Fog(0x0a0a1a, 60, 120);

// ── Kamera ──────────────────────────────────────────────────────────
const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 200);
camera.position.set(0, 10, 15);
camera.lookAt(0, 0, 0);

// ── Renderer ───────────────────────────────────────────────────────
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
document.body.prepend(renderer.domElement);

// ── Işıklar ────────────────────────────────────────────────────────
const ambientLight = new THREE.AmbientLight(0x404060, 0.5);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffeedd, 2);
dirLight.position.set(30, 40, 20);
dirLight.castShadow = true;
dirLight.shadow.mapSize.width = 2048;
dirLight.shadow.mapSize.height = 2048;
dirLight.shadow.camera.near = 0.5;
dirLight.shadow.camera.far = 100;
dirLight.shadow.camera.left = -50;
dirLight.shadow.camera.right = 50;
dirLight.shadow.camera.top = 50;
dirLight.shadow.camera.bottom = -50;
scene.add(dirLight);

const hemiLight = new THREE.HemisphereLight(0x8888ff, 0x444422, 0.6);
scene.add(hemiLight);

// ── Yer (Arena Zemini) ────────────────────────────────────────────
const groundGeo = new THREE.PlaneGeometry(CONFIG.arenaSize, CONFIG.arenaSize);
const groundMat = new THREE.MeshStandardMaterial({
  color: 0x1a1a2e,
  roughness: 0.8,
  metalness: 0.2,
});
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// ── Izgara (Grid) ──────────────────────────────────────────────────
const grid = new THREE.GridHelper(CONFIG.arenaSize, 20, 0x444466, 0x222244);
grid.position.y = 0.1;
scene.add(grid);

// ── cannon-es Dünyası ─────────────────────────────────────────────
const world = new CANNON.World();
world.gravity.set(0, CONFIG.gravity, 0);
world.broadphase = new CANNON.SAPBroadphase(world);
world.allowSleep = true;

// Zemin fizik
const groundShape = new CANNON.Plane();
const groundBody = new CANNON.Body({ mass: 0 });
groundBody.addShape(groundShape);
groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
world.addBody(groundBody);

// ── Oyuncu ──────────────────────────────────────────────────────────
const players = {};

function createPlayerMesh(id, color = 0xec4899) {
  const group = new THREE.Group();

  // Gövde
  const bodyGeo = new THREE.BoxGeometry(0.8, 1.2, 0.5);
  const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.1 });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = 0.6;
  body.castShadow = true;
  group.add(body);

  // Baş
  const headGeo = new THREE.SphereGeometry(0.3, 8, 8);
  const headMat = new THREE.MeshStandardMaterial({ color: 0xffdbb8, roughness: 0.6 });
  const head = new THREE.Mesh(headGeo, headMat);
  head.position.y = 1.4;
  head.castShadow = true;
  group.add(head);

  // Silah (tabanca gibi)
  const gunGeo = new THREE.BoxGeometry(0.6, 0.1, 0.1);
  const gunMat = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.8, roughness: 0.2 });
  const gun = new THREE.Mesh(gunGeo, gunMat);
  gun.position.set(0.5, 0.4, 0);
  group.add(gun);

  return group;
}

function createPlayerPhysics(id, x, z) {
  const shape = new CANNON.Box(new CANNON.Vec3(0.4, 0.6, 0.25));
  const body = new CANNON.Body({ mass: 1 });
  body.addShape(shape);
  body.position.set(x, 1, z);
  body.linearDamping = 0.9;
  body.angularDamping = 1;
  world.addBody(body);
  return body;
}

// ── Yerel oyuncu ───────────────────────────────────────────────────
let localPlayerId = 'local-' + Date.now();
let localPlayer = {
  id: localPlayerId,
  mesh: createPlayerMesh(localPlayerId, 0xec4899),
  physics: createPlayerPhysics(localPlayerId, 0, 0),
  health: 100,
  maxHealth: 100,
  weapon: 'pistol',
  ammo: 12,
  score: 0,
  alive: true,
};

scene.add(localPlayer.mesh);
players[localPlayerId] = localPlayer;

// ── Kanera Takip ───────────────────────────────────────────────────
function updateCamera() {
  const pos = localPlayer.physics.position;
  camera.position.lerp(new THREE.Vector3(pos.x, pos.y + 8, pos.z + 12), 0.05);
  camera.lookAt(pos.x, pos.y + 1, pos.z);
}

// ── Klavye ─────────────────────────────────────────────────────────
const keys = {
  w: false, a: false, s: false, d: false,
  shift: false, space: false,
};

document.addEventListener('keydown', (e) => {
  const key = e.key.toLowerCase();
  if (key in keys) keys[key] = true;
  if (key === ' ' || key === 'space') {
    e.preventDefault();
    keys.space = true;
    if (localPlayer.physics && Math.abs(localPlayer.physics.velocity.y) < 0.1) {
      localPlayer.physics.velocity.y = CONFIG.jumpSpeed;
    }
  }
});

document.addEventListener('keyup', (e) => {
  const key = e.key.toLowerCase();
  if (key in keys) keys[key] = false;
  if (key === ' ' || key === 'space') keys.space = false;
});

// ── Fare ───────────────────────────────────────────────────────────
let mouseX = 0, mouseY = 0;
document.addEventListener('mousemove', (e) => {
  mouseX = (e.clientX / window.innerWidth) * 2 - 1;
  mouseY = (e.clientY / window.innerHeight) * 2 - 1;
});

// ── Hareket Güncelleme ────────────────────────────────────────────
function updateMovement(delta) {
  const body = localPlayer.physics;
  if (!body || !localPlayer.alive) return;

  const forward = new THREE.Vector3(-Math.sin(camera.rotation.y), 0, -Math.cos(camera.rotation.y));
  const right = new THREE.Vector3(Math.cos(camera.rotation.y), 0, -Math.sin(camera.rotation.y));

  const moveX = (keys.d ? 1 : 0) - (keys.a ? 1 : 0);
  const moveZ = (keys.s ? 1 : 0) - (keys.w ? 1 : 0);

  const speed = keys.shift ? CONFIG.playerSpeed * 1.6 : CONFIG.playerSpeed;
  const dir = new THREE.Vector3()
    .addScaledVector(forward, -moveZ)
    .addScaledVector(right, moveX)
    .normalize();

  body.velocity.x = dir.x * speed;
  body.velocity.z = dir.z * speed;

  // Oyuncu mesh'ini takip et
  localPlayer.mesh.position.copy(body.position);
  localPlayer.mesh.position.y -= 0.6;

  // Dönüş (fareye göre)
  const lookTarget = new THREE.Vector3(
    body.position.x + mouseX * 10,
    body.position.y + 0.5,
    body.position.z + mouseY * 10
  );
  localPlayer.mesh.lookAt(lookTarget);

  // Kamera
  updateCamera();
}

// ── Ateş Etme ──────────────────────────────────────────────────────
document.addEventListener('mousedown', (e) => {
  if (e.button !== 0) return;
  if (!localPlayer.alive) return;

  // Mermi gönder (socket ile)
  const pos = localPlayer.physics.position;
  socket.emit('player_shoot_arena', {
    room: roomId,
    from: localPlayerId,
    username: username,
    position: { x: pos.x, y: pos.y + 0.5, z: pos.z },
    direction: new THREE.Vector3(mouseX, 0, mouseY).normalize(),
    weapon: localPlayer.weapon,
  });

  // Ses
  playSound(Sounds.pistol);
});

// ── Socket.IO ──────────────────────────────────────────────────────
const socket = io({
  path: '/socket.io',
  transports: ['websocket', 'polling'],
});

socket.on('connect', () => {
  console.log('✅ Socket bağlandı');

  socket.emit('join_room', { room: roomId, username });

  // Yerel oyuncuyu diğerlerine bildir
  socket.emit('player_join_arena', {
    room: roomId,
    id: localPlayerId,
    username: username,
    position: localPlayer.physics.position,
  });
});

// Diğer oyuncuların hareketleri
socket.on('player_moved_arena', (data) => {
  if (data.id === localPlayerId) return;
  if (!players[data.id]) return;
  const p = players[data.id];
  p.physics.position.set(data.position.x, data.position.y, data.position.z);
  p.mesh.position.copy(p.physics.position);
  p.mesh.position.y -= 0.6;
});

// Diğer oyuncuların ateşi
socket.on('player_shot_arena', (data) => {
  if (data.id === localPlayerId) return;
  // Mermi efekti göster (opsiyonel)
  playSound(Sounds.pistol);
});

// Oyuncu katılımı
socket.on('player_joined_arena', (data) => {
  if (data.id === localPlayerId) return;
  const color = Math.floor(Math.random() * 0xffffff);
  const mesh = createPlayerMesh(data.id, color);
  const physics = createPlayerPhysics(data.id, data.position.x, data.position.z);
  scene.add(mesh);
  players[data.id] = { id: data.id, mesh, physics, username: data.username, health: 100 };
});

// Oyuncu ayrılışı
socket.on('player_left_arena', (data) => {
  if (players[data.id]) {
    scene.remove(players[data.id].mesh);
    world.removeBody(players[data.id].physics);
    delete players[data.id];
  }
});

// ── Oyun Döngüsü ──────────────────────────────────────────────────
const clock = new THREE.Clock();
let lastTime = 0;

function animate() {
  requestAnimationFrame(animate);

  const delta = Math.min(clock.getDelta(), 0.05);
  const time = clock.elapsedTime;

  // Fizik güncelle
  world.step(1 / 60, delta, 3);

  // Hareket güncelle
  updateMovement(delta);

  // Mesh'leri fizikle senkronize et (diğer oyuncular)
  for (const id in players) {
    if (id === localPlayerId) continue;
    const p = players[id];
    p.mesh.position.copy(p.physics.position);
    p.mesh.position.y -= 0.6;
  }

  renderer.render(scene, camera);
}

animate();

// ── Pencere Boyutlandırma ────────────────────────────────────────
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ── Konsola Bilgi ──────────────────────────────────────────────────
console.log(`🔥 G-Point Arena 3D başlatıldı!`);
console.log(`📡 Oda: ${roomId}`);
console.log(`👤 Kullanıcı: ${username}`);
console.log(`🆔 Oyuncu ID: ${localPlayerId}`);
