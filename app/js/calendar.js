// ╔══════════════════════════════════════════════════════════════════╗
// ║              GETTIC CALENDAR.JS - SVG İKONLU FINAL               ║
// ╚══════════════════════════════════════════════════════════════════╝

const calendarState = {
  events: JSON.parse(localStorage.getItem('gt_events') || '[]'),
  currentMonth: new Date().getMonth(),
  currentYear: new Date().getFullYear()
};

// SVG ikon kısaltması
function calIcon(name) {
  return window.Icons?.[name] ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:4px">${Icons[name]}</svg>` : '';
}

// MongoDB'den etkinlikleri çek
async function loadEvents() {
  if (!Store?.token) return;
  try {
    const res = await fetch(API + '/api/events', {
      headers: { 'Authorization': 'Bearer ' + Store.token }
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        calendarState.events = data;
        saveCalendarState();
      }
    }
  } catch(e) {}
}

// Etkinlik oluştur
async function createEvent(title, description, date, time, channelId) {
  if (!title?.trim()) return toast(calIcon('alert') + 'Başlık gerekli', 'e');
  if (!date) return toast(calIcon('alert') + 'Tarih gerekli', 'e');
  if (title.length > 100) return toast(calIcon('alert') + 'Başlık çok uzun', 'e');
  if (description?.length > 500) return toast(calIcon('alert') + 'Açıklama çok uzun', 'e');
  
  const event = {
    id: genId(),
    title: title.trim().replace(/<[^>]*>/g, ''),
    description: description?.trim().replace(/<[^>]*>/g, '') || '',
    date, time: time || '20:00',
    channelId: channelId || Store.activeChannel,
    createdBy: Store.user._id,
    creatorName: Store.user.username,
    createdAt: new Date().toISOString(),
    participants: [Store.user._id],
    participantNames: [Store.user.username],
    maxParticipants: parseInt(document.getElementById('eventMax')?.value) || 0,
    color: document.getElementById('eventColor')?.value || '#ec4899',
    status: 'upcoming', reminder: 30, notified: false
  };
  
  calendarState.events.push(event);
  saveCalendarState();
  
  try {
    await fetch(API + '/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + Store.token },
      body: JSON.stringify(event)
    });
  } catch(e) {}
  
  toast(calIcon('calendar') + 'Etkinlik oluşturuldu');
  
  if (channelId && socket?.connected) {
    socket.emit('send_message', {
      _id: genId(),
      content: `${calIcon('calendar')} **Yeni Etkinlik:** ${event.title}\n${calIcon('clock')} ${formatDate(event.date)} ${event.time}\n${calIcon('pin')} Katılmak için takvime bakın`,
      senderName: Store.user.username, senderId: Store.user._id, channelId,
      createdAt: new Date().toISOString(), eventId: event.id
    });
  }
  
  scheduleReminder(event);
  return event.id;
}

// Etkinlik sil
async function deleteEvent(eventId) {
  const event = calendarState.events.find(e => e.id === eventId);
  if (!event) return;
  if (event.createdBy !== Store.user._id && !hasPermission(Store.user._id, 'manageMessages')) {
    return toast(calIcon('lock') + 'Yetkiniz yok', 'e');
  }
  calendarState.events = calendarState.events.filter(e => e.id !== eventId);
  saveCalendarState();
  try { await fetch(API + '/api/events/' + eventId, { method: 'DELETE', headers: { 'Authorization': 'Bearer ' + Store.token } }); } catch(e) {}
  toast(calIcon('trash') + 'Etkinlik silindi');
  closeModal();
}

// Etkinliğe katıl / ayrıl
async function toggleEventRSVP(eventId) {
  const event = calendarState.events.find(e => e.id === eventId);
  if (!event || event.status === 'past' || event.status === 'cancelled') return;
  if (event.maxParticipants > 0 && !event.participants.includes(Store.user._id) && event.participants.length >= event.maxParticipants) {
    return toast(calIcon('alert') + 'Etkinlik dolu', 'e');
  }
  const idx = event.participants.indexOf(Store.user._id);
  if (idx === -1) { event.participants.push(Store.user._id); event.participantNames.push(Store.user.username); toast(calIcon('check') + 'Katıldın'); }
  else { event.participants.splice(idx, 1); event.participantNames.splice(idx, 1); toast(calIcon('x') + 'Ayrıldın'); }
  saveCalendarState();
  try { await fetch(API + '/api/events/' + eventId, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + Store.token }, body: JSON.stringify({ participants: event.participants, participantNames: event.participantNames }) }); } catch(e) {}
  showEventDetail(eventId);
}

// Hatırlatma
function scheduleReminder(event) {
  const target = new Date(event.date + 'T' + event.time);
  const reminderTime = target.getTime() - (event.reminder || 30) * 60000;
  if (reminderTime > Date.now()) {
    setTimeout(() => {
      if (event.status === 'upcoming' && !event.notified) {
        toast(calIcon('bell') + event.title + ' başlıyor!');
        event.notified = true; saveCalendarState();
      }
    }, reminderTime - Date.now());
  }
}

// Etkinlik detay
function showEventDetail(eventId) {
  const event = calendarState.events.find(e => e.id === eventId);
  if (!event) return;
  const content = document.getElementById('modalContent');
  if (!content) return;
  const isCreator = event.createdBy === Store.user._id;
  const isParticipant = event.participants.includes(Store.user._id);
  const statusMap = { upcoming: 'var(--gr)', past: 'var(--t3)', cancelled: 'var(--re)' };
  
  content.innerHTML = `
    <h2>${calIcon('calendar')} ${escapeHtml(event.title)}</h2>
    <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:16px">
      <div style="font-size:11px;color:${statusMap[event.status] || 'var(--t3)'}">● ${event.status === 'upcoming' ? 'Yaklaşan' : event.status === 'cancelled' ? 'İptal' : 'Geçti'}</div>
      <div style="display:flex;align-items:center;gap:8px;font-size:13px">${calIcon('clock')}<span>${formatDate(event.date)} - ${event.time}</span><span style="font-size:10px;color:var(--t3)">(${getTimeUntil(event.date, event.time)})</span></div>
      ${event.description ? `<div style="display:flex;align-items:flex-start;gap:8px;font-size:13px">${calIcon('file')}<span>${escapeHtml(event.description)}</span></div>` : ''}
      <div style="display:flex;align-items:center;gap:8px;font-size:13px">${calIcon('user')}<span>${escapeHtml(event.creatorName)}</span></div>
      <div style="display:flex;align-items:center;gap:8px;font-size:13px">${calIcon('users')}<span>${event.participants.length} kişi${event.maxParticipants > 0 ? ' / ' + event.maxParticipants : ''}</span></div>
    </div>
    ${event.participants.length > 0 ? `<div class="settings-group"><div class="settings-group-title">Katılımcılar (${event.participants.length})</div><div style="display:flex;flex-wrap:wrap;gap:6px;padding:4px 0">${event.participantNames.map(name => `<span style="font-size:11px;background:var(--bg2);padding:4px 10px;border-radius:12px">${escapeHtml(name)}</span>`).join('')}</div></div>` : ''}
    <div style="display:flex;gap:8px;margin-top:16px">
      ${event.status === 'upcoming' ? `<button class="mb ${isParticipant ? 'sec' : ''}" onclick="toggleEventRSVP('${event.id}')">${isParticipant ? calIcon('x') + 'Ayrıl' : calIcon('check') + 'Katıl'}</button>` : ''}
      ${isCreator && event.status === 'upcoming' ? `<button class="mb sec" onclick="cancelEvent('${event.id}')">${calIcon('x')}İptal</button>` : ''}
      ${isCreator ? `<button class="mb danger" onclick="deleteEvent('${event.id}')">${calIcon('trash')}Sil</button>` : ''}
    </div>`;
  openModal('event');
}

function escapeHtml(str) { const d = document.createElement('div'); d.textContent = str; return d.innerHTML; }

async function cancelEvent(eventId) {
  const event = calendarState.events.find(e => e.id === eventId);
  if (!event || event.createdBy !== Store.user._id) return;
  event.status = 'cancelled'; saveCalendarState();
  try { await fetch(API + '/api/events/' + eventId, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + Store.token }, body: JSON.stringify({ status: 'cancelled' }) }); } catch(e) {}
  toast(calIcon('x') + 'Etkinlik iptal edildi');
  showEventDetail(eventId);
}

// Takvim görünümü
function showCalendar() {
  const content = document.getElementById('modalContent');
  if (!content) return;
  const monthNames = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
  const firstDay = new Date(calendarState.currentYear, calendarState.currentMonth, 1).getDay();
  const daysInMonth = new Date(calendarState.currentYear, calendarState.currentMonth + 1, 0).getDate();
  const today = new Date().toISOString().split('T')[0];
  const monthEvents = calendarState.events.filter(e => { const d = new Date(e.date); return d.getMonth() === calendarState.currentMonth && d.getFullYear() === calendarState.currentYear; });
  
  let html = '';
  const startDay = firstDay === 0 ? 6 : firstDay - 1;
  for (let i = 0; i < startDay; i++) html += '<div class="calendar-day empty"></div>';
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${calendarState.currentYear}-${String(calendarState.currentMonth+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    const dayEvents = monthEvents.filter(e => e.date === dateStr);
    html += `<div class="calendar-day ${dateStr===today?'today':''} ${dayEvents.length?'has-events':''}" onclick="showDayEvents('${dateStr}')"><span class="calendar-day-num">${day}</span>${dayEvents.length ? `<div class="calendar-dots">${dayEvents.slice(0,3).map(e => `<span class="calendar-dot" style="background:${e.color||'#ec4899'}" title="${escapeHtml(e.title)}"></span>`).join('')}${dayEvents.length>3?`<span class="calendar-dot-more">+${dayEvents.length-3}</span>`:''}</div>` : ''}</div>`;
  }
  
  content.innerHTML = `
    <h2>${calIcon('calendar')} Takvim</h2>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
      <button class="ib" onclick="changeMonth(-1)">${calIcon('chevron-left')}</button>
      <span style="font-weight:700">${monthNames[calendarState.currentMonth]} ${calendarState.currentYear}</span>
      <button class="ib" onclick="changeMonth(1)">${calIcon('chevron-right')}</button>
    </div>
    <div class="calendar-grid">
      ${['Pzt','Sal','Çar','Per','Cum','Cmt','Paz'].map(d => `<div class="calendar-day header">${d}</div>`).join('')}
      ${html}
    </div>
    <div class="msep"></div>
    <div style="font-weight:600;font-size:13px;margin-bottom:8px">Yaklaşan Etkinlikler</div>
    ${calendarState.events.filter(e => e.status === 'upcoming').sort((a,b) => new Date(a.date) - new Date(b.date)).slice(0,5).map(e => `
      <div class="mitem" onclick="showEventDetail('${e.id}')">
        <div class="mav" style="background:${e.color||'#ec4899'};color:#fff;display:flex;align-items:center;justify-content:center">${calIcon('calendar')}</div>
        <div class="minfo"><div class="mname">${escapeHtml(e.title)}</div><div class="msub">${formatDate(e.date)} ${e.time} · ${e.participants.length} kişi</div></div>
      </div>`).join('') || '<p style="color:var(--t3);font-size:12px;padding:10px">Yaklaşan etkinlik yok</p>'}
    <button class="mb sec" onclick="showCreateEventForm()" style="margin-top:12px">+ Etkinlik Oluştur</button>`;
  openModal('calendar');
}

function showDayEvents(dateStr) {
  const events = calendarState.events.filter(e => e.date === dateStr);
  const content = document.getElementById('modalContent');
  if (!content) return;
  content.innerHTML = `<h2>${calIcon('calendar')} ${formatDate(dateStr)}</h2>${events.length === 0 ? '<p style="color:var(--t3);text-align:center;padding:20px">Etkinlik yok</p>' : events.map(e => `<div class="mitem" onclick="showEventDetail('${e.id}')"><div class="mav" style="background:${e.color||'#ec4899'};color:#fff;display:flex;align-items:center;justify-content:center">${calIcon('calendar')}</div><div class="minfo"><div class="mname">${escapeHtml(e.title)}</div><div class="msub">${e.time} · ${e.participants.length} kişi</div></div></div>`).join('')}<button class="mb sec" onclick="showCreateEventForm('${dateStr}')" style="margin-top:12px">+ Ekle</button>`;
}

function showCreateEventForm(prefillDate) {
  const content = document.getElementById('modalContent');
  if (!content) return;
  content.innerHTML = `<h2>${calIcon('calendar')} Etkinlik Oluştur</h2><input class="mi" id="eventTitle" placeholder="Etkinlik adı" maxlength="100"><textarea class="mi mta" id="eventDesc" placeholder="Açıklama (opsiyonel)" rows="3" maxlength="500"></textarea><input class="mi" type="date" id="eventDate" value="${prefillDate || new Date().toISOString().split('T')[0]}"><input class="mi" type="time" id="eventTime" value="20:00"><input class="mi" type="number" id="eventMax" placeholder="Maks. katılımcı (0=sınırsız)" value="0" min="0" max="10000"><input class="mi" type="color" id="eventColor" value="#ec4899" style="height:40px;padding:4px"><button class="mb" onclick="submitCreateEvent()">Oluştur</button>`;
}

function submitCreateEvent() {
  const title = document.getElementById('eventTitle')?.value;
  const desc = document.getElementById('eventDesc')?.value;
  const date = document.getElementById('eventDate')?.value;
  const time = document.getElementById('eventTime')?.value;
  if (createEvent(title, desc, date, time, Store.activeChannel)) closeModal();
}

function formatDate(dateStr) { try { return new Date(dateStr+'T00:00:00').toLocaleDateString('tr-TR',{day:'numeric',month:'long',year:'numeric'}); } catch(e) { return dateStr; } }

function getTimeUntil(dateStr, timeStr) {
  try {
    const target = new Date(dateStr+'T'+(timeStr||'20:00'));
    const diff = target - new Date();
    if (diff < 0) return 'Geçti';
    const d = Math.floor(diff/86400000), h = Math.floor((diff%86400000)/3600000), m = Math.floor((diff%3600000)/60000);
    return d>0?`${d}g ${h}s`:h>0?`${h}s ${m}dk`:`${m}dk`;
  } catch(e) { return ''; }
}

function changeMonth(dir) {
  calendarState.currentMonth += dir;
  if (calendarState.currentMonth > 11) { calendarState.currentMonth = 0; calendarState.currentYear++; }
  if (calendarState.currentMonth < 0) { calendarState.currentMonth = 11; calendarState.currentYear--; }
  showCalendar();
}

function saveCalendarState() { localStorage.setItem('gt_events', JSON.stringify(calendarState.events)); }

const calStyle = document.createElement('style');
calStyle.textContent = `.calendar-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:2px;margin-bottom:12px}.calendar-day{padding:8px 4px;text-align:center;border-radius:6px;cursor:pointer;font-size:12px;min-height:50px;transition:background .15s}.calendar-day:hover{background:var(--bg2)}.calendar-day.header{font-weight:700;font-size:10px;color:var(--t3);cursor:default;min-height:auto;padding:6px 4px}.calendar-day.today{background:var(--acd);font-weight:700}.calendar-day.empty{cursor:default}.calendar-day.has-events{border:1px solid var(--ac)}.calendar-day-num{display:block;margin-bottom:4px}.calendar-dots{display:flex;gap:2px;justify-content:center;flex-wrap:wrap}.calendar-dot{width:6px;height:6px;border-radius:50%;display:inline-block}.calendar-dot-more{font-size:8px;color:var(--t3)}`;
document.head.appendChild(calStyle);

setTimeout(() => { if (Store?.token) loadEvents(); }, 2000);

console.log('✅ Calendar.js yüklendi (SVG ikonlu)');
