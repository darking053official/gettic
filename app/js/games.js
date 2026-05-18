// ============ GETTIC GAMES.JS - MİNİ OYUNLAR ============

const gameState = {
  activeGame: null,
  games: {},
  scores: JSON.parse(localStorage.getItem('gt_game_scores') || '{}')
};

// ============ XOX (Tic Tac Toe) ============
function startXOX(opponent) {
  const gameId = genId();
  const game = {
    id: gameId,
    type: 'xox',
    board: Array(9).fill(null),
    players: [Store.user.username, opponent || 'Bot'],
    currentTurn: Store.user.username,
    winner: null,
    isDraw: false,
    startedAt: new Date().toISOString(),
    moves: []
  };
  
  gameState.games[gameId] = game;
  gameState.activeGame = gameId;
  renderGame(gameId);
  
  toast('🎮 XOX başladı! ' + game.players[0] + ' vs ' + game.players[1]);
}

function makeXOXMove(gameId, index) {
  const game = gameState.games[gameId];
  if (!game || game.winner || game.isDraw) return;
  if (game.board[index]) return;
  if (game.currentTurn !== Store.user.username) return toast('Sıra sende değil', 'e');
  
  const symbol = game.players.indexOf(Store.user.username) === 0 ? 'X' : 'O';
  game.board[index] = symbol;
  game.moves.push({ player: Store.user.username, index, symbol });
  
  // Kazanan kontrolü
  const lines = [
    [0,1,2],[3,4,5],[6,7,8],
    [0,3,6],[1,4,7],[2,5,8],
    [0,4,8],[2,4,6]
  ];
  
  for (const [a,b,c] of lines) {
    if (game.board[a] && game.board[a] === game.board[b] && game.board[a] === game.board[c]) {
      game.winner = Store.user.username;
      updateGameScore(Store.user.username, 'xox', 10);
      break;
    }
  }
  
  // Beraberlik kontrolü
  if (!game.winner && game.board.every(cell => cell !== null)) {
    game.isDraw = true;
  }
  
  // Sıra değişimi
  if (!game.winner && !game.isDraw) {
    game.currentTurn = game.players.find(p => p !== Store.user.username);
    
    // Bot hamlesi
    if (game.currentTurn === 'Bot') {
      setTimeout(() => botXOXMove(gameId), 500);
    }
  }
  
  renderGame(gameId);
}

function botXOXMove(gameId) {
  const game = gameState.games[gameId];
  if (!game || game.winner || game.isDraw) return;
  
  // Boş hücreleri bul
  const emptyCells = game.board.map((cell, i) => cell === null ? i : null).filter(i => i !== null);
  if (emptyCells.length === 0) return;
  
  // Rastgele seç
  const randomIndex = emptyCells[Math.floor(Math.random() * emptyCells.length)];
  const symbol = game.players.indexOf('Bot') === 0 ? 'X' : 'O';
  
  game.board[randomIndex] = symbol;
  game.moves.push({ player: 'Bot', index: randomIndex, symbol });
  
  // Kazanan kontrolü
  const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  for (const [a,b,c] of lines) {
    if (game.board[a] && game.board[a] === game.board[b] && game.board[a] === game.board[c]) {
      game.winner = 'Bot';
      break;
    }
  }
  
  if (!game.winner && game.board.every(cell => cell !== null)) {
    game.isDraw = true;
  }
  
  if (!game.winner && !game.isDraw) {
    game.currentTurn = game.players.find(p => p !== 'Bot');
  }
  
  renderGame(gameId);
}

// ============ KELİME OYUNU ============
const wordList = ['GETTIC', 'SOHBET', 'DISCORD', 'SUNUCU', 'KANAL', 'MESAJ', 'ANKET', 'EMOJI', 'WEBHOOK', 'STREAM',
  'ANKARA', 'İSTANBUL', 'İZMİR', 'ANTALYA', 'BURSA', 'ADANA', 'KONYA', 'SAMSUN', 'TRABZON', 'DİYARBAKIR'];

let wordGameState = {
  word: '',
  guessed: [],
  wrongGuesses: 0,
  maxWrong: 6
};

function startWordGame() {
  wordGameState.word = wordList[Math.floor(Math.random() * wordList.length)].toUpperCase();
  wordGameState.guessed = [];
  wordGameState.wrongGuesses = 0;
  
  const gameId = genId();
  const game = {
    id: gameId,
    type: 'word',
    word: wordGameState.word,
    guessed: [],
    wrongGuesses: 0,
    maxWrong: 6,
    players: [Store.user.username],
    startedAt: new Date().toISOString(),
    isFinished: false,
    isWon: false
  };
  
  gameState.games[gameId] = game;
  gameState.activeGame = gameId;
  renderGame(gameId);
  
  toast('📝 Kelime oyunu başladı! ' + game.word.length + ' harfli');
}

function guessLetter(gameId, letter) {
  const game = gameState.games[gameId];
  if (!game || game.isFinished) return;
  if (game.guessed.includes(letter)) return toast('Bu harf zaten tahmin edildi', 'e');
  
  game.guessed.push(letter);
  
  if (!game.word.includes(letter)) {
    game.wrongGuesses++;
    
    if (game.wrongGuesses >= game.maxWrong) {
      game.isFinished = true;
      game.isWon = false;
      toast('💀 Kaybettin! Kelime: ' + game.word, 'e');
    }
  } else {
    // Kazandı mı?
    const allGuessed = game.word.split('').every(l => game.guessed.includes(l));
    if (allGuessed) {
      game.isFinished = true;
      game.isWon = true;
      updateGameScore(Store.user.username, 'word', 20);
      toast('🎉 Kazandın! Kelime: ' + game.word);
    }
  }
  
  renderGame(gameId);
}

// ============ SAYI TAHMİN ============
function startNumberGame() {
  const gameId = genId();
  const game = {
    id: gameId,
    type: 'number',
    number: Math.floor(Math.random() * 100) + 1,
    guesses: [],
    maxGuesses: 7,
    players: [Store.user.username],
    startedAt: new Date().toISOString(),
    isFinished: false,
    isWon: false
  };
  
  gameState.games[gameId] = game;
  gameState.activeGame = gameId;
  renderGame(gameId);
  
  toast('🔢 Sayı tahmin oyunu başladı! 1-100 arası');
}

function guessNumber(gameId, number) {
  const game = gameState.games[gameId];
  if (!game || game.isFinished) return;
  if (number < 1 || number > 100) return;
  
  game.guesses.push(number);
  
  if (number === game.number) {
    game.isFinished = true;
    game.isWon = true;
    updateGameScore(Store.user.username, 'number', 15);
    toast('🎉 Doğru! ' + number, 's');
  } else if (game.guesses.length >= game.maxGuesses) {
    game.isFinished = true;
    toast('💀 Bilemedin! Sayı: ' + game.number, 'e');
  } else {
    const hint = number < game.number ? '⬆️ Daha büyük' : '⬇️ Daha küçük';
    toast(hint + ' (' + (game.maxGuesses - game.guesses.length) + ' hakkın kaldı)', 'i');
  }
  
  renderGame(gameId);
}

// ============ OYUN RENDER ============
function renderGame(gameId) {
  const game = gameState.games[gameId];
  if (!game) return;
  
  const messagesEl = document.getElementById('messages');
  const channelName = document.getElementById('channelName');
  if (!messagesEl) return;
  
  if (channelName) channelName.textContent = '🎮 ' + game.type.toUpperCase();
  
  let html = '';
  
  switch (game.type) {
    case 'xox':
      html = renderXOX(game);
      break;
    case 'word':
      html = renderWordGame(game);
      break;
    case 'number':
      html = renderNumberGame(game);
      break;
  }
  
  messagesEl.innerHTML = html;
  messagesEl.scrollTop = 0;
}

function renderXOX(game) {
  const isMyTurn = game.currentTurn === Store.user.username;
  
  return `
    <div style="text-align:center;padding:20px">
      <h3 style="margin-bottom:16px">🎮 XOX</h3>
      <p style="color:var(--t3);margin-bottom:12px">
        ${game.players[0]} (X) vs ${game.players[1]} (O)
      </p>
      
      <div style="display:grid;grid-template-columns:repeat(3,80px);gap:4px;justify-content:center;margin-bottom:16px">
        ${game.board.map((cell, i) => `
          <div onclick="makeXOXMove('${game.id}',${i})" 
               style="width:80px;height:80px;background:var(--bg2);display:flex;align-items:center;justify-content:center;font-size:32px;font-weight:700;cursor:pointer;border-radius:8px;transition:background .15s;color:${cell==='X'?'var(--ac)':'var(--gr)'}">
            ${cell || ''}
          </div>
        `).join('')}
      </div>
      
      ${game.winner ? 
        `<p style="font-weight:700;color:var(--gr);font-size:16px">🎉 ${game.winner} kazandı!</p>` :
        game.isDraw ? 
        `<p style="color:var(--ye)">🤝 Beraberlik!</p>` :
        `<p style="color:var(--t3)">Sıra: ${game.currentTurn} ${isMyTurn ? '(Sen)' : ''}</p>`
      }
      
      <button class="mb sec" onclick="startXOX('Bot')" style="margin-top:12px;max-width:200px;margin-left:auto;margin-right:auto">🔄 Yeni Oyun</button>
    </div>
  `;
}

function renderWordGame(game) {
  const display = game.word.split('').map(l => 
    game.guessed.includes(l) ? l : '_'
  ).join(' ');
  
  const hangmanStages = [
    '', '🏗️', '🏗️💪', '🏗️💪🦵', '🏗️💪🦵🦵', '🏗️💪🦵🦵😰', '💀'
  ];
  
  return `
    <div style="text-align:center;padding:20px">
      <h3 style="margin-bottom:16px">📝 Kelime Oyunu</h3>
      
      <div style="font-size:48px;margin-bottom:12px">${hangmanStages[game.wrongGuesses]}</div>
      
      <div style="font-size:28px;font-weight:700;letter-spacing:8px;margin-bottom:16px;font-family:var(--mono)">
        ${display}
      </div>
      
      <p style="color:var(--t3);margin-bottom:12px">Hata: ${game.wrongGuesses}/${game.maxWrong}</p>
      
      ${!game.isFinished ? `
        <div style="display:flex;flex-wrap:wrap;gap:4px;justify-content:center;max-width:300px;margin:0 auto 16px">
          ${'ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ'.split('').map(l => `
            <button onclick="guessLetter('${game.id}','${l}')" 
                    style="width:32px;height:32px;border:1px solid var(--b2);background:${game.guessed.includes(l)?'var(--bg3)':'var(--bg2)'};color:${game.guessed.includes(l)?'var(--t3)':'var(--t1)'};border-radius:6px;cursor:${game.guessed.includes(l)?'default':'pointer'};font-size:12px"
                    ${game.guessed.includes(l)?'disabled':''}>
              ${l}
            </button>
          `).join('')}
        </div>
      ` : ''}
      
      ${game.isFinished ? `
        <p style="font-weight:700;color:${game.isWon?'var(--gr)':'var(--re)'};font-size:16px;margin-bottom:12px">
          ${game.isWon ? '🎉 Kazandın!' : '💀 Kaybettin!'}
        </p>
        <p style="color:var(--t3)">Kelime: ${game.word}</p>
      ` : ''}
      
      <button class="mb sec" onclick="startWordGame()" style="margin-top:12px;max-width:200px;margin-left:auto;margin-right:auto">🔄 Yeni Oyun</button>
    </div>
  `;
}

function renderNumberGame(game) {
  const lastGuess = game.guesses[game.guesses.length - 1];
  
  return `
    <div style="text-align:center;padding:20px">
      <h3 style="margin-bottom:16px">🔢 Sayı Tahmin</h3>
      
      <p style="color:var(--t3);margin-bottom:8px">1-100 arası bir sayı tahmin et</p>
      <p style="color:var(--t3);margin-bottom:12px">Kalan hak: ${game.maxGuesses - game.guesses.length}</p>
      
      ${game.guesses.length > 0 ? `
        <div style="display:flex;flex-wrap:wrap;gap:6px;justify-content:center;margin-bottom:16px">
          ${game.guesses.map((g, i) => `
            <span style="padding:4px 10px;background:${g===game.number?'var(--gr)':g<game.number?'var(--bg3)':'var(--acd)'};border-radius:8px;font-size:14px;font-weight:600">
              ${g} ${g===game.number?'✅':g<game.number?'⬆️':'⬇️'}
            </span>
          `).join('')}
        </div>
      ` : ''}
      
      ${!game.isFinished ? `
        <div style="display:flex;gap:8px;justify-content:center">
          <input class="mi" type="number" id="numGuess" min="1" max="100" placeholder="1-100" style="width:120px;text-align:center;margin-bottom:0">
          <button class="mb" onclick="guessNumber('${game.id}',parseInt(document.getElementById('numGuess').value))" style="width:auto;padding:10px 20px">Tahmin Et</button>
        </div>
      ` : ''}
      
      ${game.isFinished ? `
        <p style="font-weight:700;color:${game.isWon?'var(--gr)':'var(--re)'};font-size:16px;margin:12px 0">
          ${game.isWon ? '🎉 Doğru tahmin!' : '💀 Bilemedin!'}
        </p>
        <p style="color:var(--t3)">Sayı: ${game.number}</p>
      ` : ''}
      
      <button class="mb sec" onclick="startNumberGame()" style="margin-top:12px;max-width:200px;margin-left:auto;margin-right:auto">🔄 Yeni Oyun</button>
    </div>
  `;
}

// ============ SKOR SİSTEMİ ============
function updateGameScore(username, gameType, points) {
  if (!gameState.scores[username]) {
    gameState.scores[username] = { total: 0, games: {} };
  }
  if (!gameState.scores[username].games[gameType]) {
    gameState.scores[username].games[gameType] = { wins: 0, points: 0 };
  }
  
  gameState.scores[username].games[gameType].wins++;
  gameState.scores[username].games[gameType].points += points;
  gameState.scores[username].total += points;
  
  localStorage.setItem('gt_game_scores', JSON.stringify(gameState.scores));
}

// ============ OYUN LİSTESİ ============
function showGameList() {
  const content = document.getElementById('modalContent');
  if (!content) return;
  
  const scores = gameState.scores[Store.user?.username];
  
  content.innerHTML = `
    <h2>🎮 Oyunlar</h2>
    
    ${scores ? `
      <div style="background:var(--bg2);padding:12px;border-radius:10px;margin-bottom:16px;text-align:center">
        <div style="font-weight:700;font-size:14px">${Store.user?.username}</div>
        <div style="font-size:24px;font-weight:700;color:var(--ac);margin:4px 0">🏆 ${scores.total} puan</div>
        <div style="display:flex;gap:16px;justify-content:center;font-size:11px;color:var(--t3)">
          <span>🎮 XOX: ${scores.games?.xox?.wins || 0} galibiyet</span>
          <span>📝 Kelime: ${scores.games?.word?.wins || 0} galibiyet</span>
          <span>🔢 Sayı: ${scores.games?.number?.wins || 0} galibiyet</span>
        </div>
      </div>
    ` : ''}
    
    <div style="display:flex;flex-direction:column;gap:8px">
      <div class="mitem" onclick="startXOX('Bot');closeModal()" style="cursor:pointer;background:var(--bg2);padding:16px;border-radius:12px">
        <span style="font-size:28px">🎮</span>
        <div>
          <div class="mname">XOX (Tic Tac Toe)</div>
          <div class="msub">Klasik 3x3 oyunu. Bot'a karşı oyna!</div>
        </div>
      </div>
      
      <div class="mitem" onclick="startWordGame();closeModal()" style="cursor:pointer;background:var(--bg2);padding:16px;border-radius:12px">
        <span style="font-size:28px">📝</span>
        <div>
          <div class="mname">Kelime Oyunu (Hangman)</div>
          <div class="msub">Harfleri tahmin et, kelimeyi bul!</div>
        </div>
      </div>
      
      <div class="mitem" onclick="startNumberGame();closeModal()" style="cursor:pointer;background:var(--bg2);padding:16px;border-radius:12px">
        <span style="font-size:28px">🔢</span>
        <div>
          <div class="mname">Sayı Tahmin</div>
          <div class="msub">1-100 arası sayıyı 7 hakkında tahmin et!</div>
        </div>
      </div>
    </div>
  `;
  
  openModal('games');
}

// Başlat
document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('gamesBtn');
  if (btn) btn.onclick = showGameList;
});
