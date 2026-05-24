// ╔══════════════════════════════════════════════════════════════════╗
// ║                    GETTIC CONFIG.JS                             ║
// ╚══════════════════════════════════════════════════════════════════╝

const API = 'https://evidence-terrorist-considers-sides.trycloudflare.com';
const MAX_MSGS = 100;
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'audio/mp3', 'audio/webm', 'application/pdf', 'text/plain'];
const TYPING_TIMEOUT = 2000;

function genId() { 
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 7); 
}
