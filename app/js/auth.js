async function doLogin(username, password) {
  if (!username || !password) return toast('Kullanıcı adı ve şifre gerekli', 'e');
  try {
    const res = await fetch(`${API}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    store.user = data.user;
    store.token = data.token;
    localStorage.setItem('gt_token', data.token);
    localStorage.setItem('gt_user', JSON.stringify(data.user));
    toast('Hoş geldin ' + data.user.username);
  } catch (e) { toast(e.message, 'e'); }
}

async function doRegister(username, password) {
  if (!username || username.length < 3) return toast('Kullanıcı adı en az 3 karakter', 'e');
  if (!password || password.length < 6) return toast('Şifre en az 6 karakter', 'e');
  try {
    const res = await fetch(`${API}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    store.user = data.user;
    store.token = data.token;
    localStorage.setItem('gt_token', data.token);
    localStorage.setItem('gt_user', JSON.stringify(data.user));
    toast('Kayıt başarılı!');
  } catch (e) { toast(e.message, 'e'); }
}

function logout() {
  localStorage.removeItem('gt_token');
  localStorage.removeItem('gt_user');
  store.user = null;
  store.token = null;
  store.messages = [];
}
