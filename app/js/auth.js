async function doLogin(username, password) {
  const res = await fetch(API + '/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  const data = await res.json();
  if (data.token) {
    localStorage.setItem('gt_token', data.token);
    localStorage.setItem('gt_user', JSON.stringify(data.user));
    return data.user;
  }
  throw new Error(data.error || 'Giriş başarısız');
}

async function doRegister(username, password) {
  const res = await fetch(API + '/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  const data = await res.json();
  if (data.token) {
    localStorage.setItem('gt_token', data.token);
    localStorage.setItem('gt_user', JSON.stringify(data.user));
    return data.user;
  }
  throw new Error(data.error || 'Kayıt başarısız');
}

function logout() {
  localStorage.removeItem('gt_token');
  localStorage.removeItem('gt_user');
  location.reload();
}
