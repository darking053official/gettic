async function doAuth(type, username, password) {
  const res = await fetch(API + '/api/auth/' + type, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  const data = await res.json();
  if (data.token) {
    Store.token = data.token;
    Store.user = data.user;
    localStorage.setItem('gt_token', data.token);
    localStorage.setItem('gt_user', JSON.stringify(data.user));
    return data.user;
  }
  throw new Error(data.error || 'İşlem başarısız');
}

function logout() {
  localStorage.removeItem('gt_token');
  localStorage.removeItem('gt_user');
  Store.user = null;
  Store.token = null;
  Store.messages = [];
  location.reload();
}

async function loadUser() {
  if (!Store.token) return null;
  try {
    const res = await fetch(API + '/api/me', {
      headers: { 'Authorization': 'Bearer ' + Store.token }
    });
    const user = await res.json();
    if (user && user._id) {
      Store.user = user;
      localStorage.setItem('gt_user', JSON.stringify(user));
      return user;
    }
  } catch(e) {}
  return null;
}
