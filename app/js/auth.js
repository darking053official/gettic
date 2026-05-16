function AuthForm({ onLogin, onRegister, t }) {
  const [tab, setTab] = useState('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = () => {
    if (tab === 'login') onLogin(username, password);
    else onRegister(username, password);
  };

  return (
    <div>
      <div className="auth-tabs">
        <button className={`auth-tab ${tab === 'login' ? 'act' : ''}`} onClick={() => setTab('login')}>
          {t('login')}
        </button>
        <button className={`auth-tab ${tab === 'register' ? 'act' : ''}`} onClick={() => setTab('register')}>
          {t('register')}
        </button>
      </div>
      <input className="mi" value={username} onChange={e => setUsername(e.target.value)} placeholder="Kullanıcı adı" />
      <input className="mi" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Şifre"
        onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }} />
      <button className="mb" onClick={handleSubmit}>
        {tab === 'login' ? t('login') : t('register')}
      </button>
    </div>
  );
}

function CaptchaBox({ code, onRefresh }) {
  return (
    <div className="cap-box">
      <div className="cap-title">Güvenlik Doğrulaması</div>
      <canvas className="cap-cvs" width="240" height="72" ref={el => {
        if (el) drawCaptcha(el, code);
      }} />
      <input className="cap-inp" maxLength="4" autoFocus id="captchaInput"
        onKeyDown={e => {
          if (e.key === 'Enter') {
            if (e.target.value.toUpperCase() === code) {
              window._captchaDone = true;
            } else {
              onRefresh();
              e.target.value = '';
            }
          }
        }} />
      <button className="cap-btn" onClick={() => {
        const inp = document.getElementById('captchaInput');
        if (inp.value.toUpperCase() === code) {
          window._captchaDone = true;
        } else {
          onRefresh();
          inp.value = '';
        }
      }}>Doğrula</button>
      <span className="cap-ref" onClick={onRefresh}>Yenile</span>
    </div>
  );
}

function drawCaptcha(canvas, code) {
  const ctx = canvas.getContext('2d'), w = canvas.width, h = canvas.height;
  ctx.fillStyle = '#faf6f0';
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.moveTo(Math.random() * w, Math.random() * h);
    ctx.lineTo(Math.random() * w, Math.random() * h);
    ctx.strokeStyle = 'rgba(201,77,140,' + (Math.random() * .3 + .08) + ')';
    ctx.lineWidth = Math.random() * 2 + .5;
    ctx.stroke();
  }
  ctx.textBaseline = 'middle';
  code.split('').forEach((c, i) => {
    ctx.save();
    ctx.translate(w / 5 * (i + .7), h / 2);
    ctx.rotate(Math.random() * .4 - .2);
    ctx.font = 'bold 28px "Courier New"';
    ctx.fillStyle = '#c94d8c';
    ctx.fillText(c, 0, 0);
    ctx.restore();
  });
  }
