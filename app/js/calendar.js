// ╔══════════════════════════════════════════════════════════════════╗
// ║   GETTIC CALENDAR.JS v2.0 - Takvim & Etkinlik Sistemi            ║
// ╚══════════════════════════════════════════════════════════════════╝

function _calLog(msg, level = 'log') {
  console[level](`%c[Calendar] ${msg}`, 'color:#34d399;font-weight:bold');
}

// ============ STATE ============
const calendarState = {
  events:       [],
  currentYear:  new Date().getFullYear(),
  currentMonth: new Date().getMonth(),
  selectedDate: null,
  view:         'month', // 'month' | 'week' | 'list'
};

function _saveCalendar() {
  try { localStorage.setItem('gt_calendar', JSON.stringify(calendarState.events)); } catch {}
}
function _loadCalendar() {
  try {
    const raw = localStorage.getItem('gt_calendar');
    if (raw) calendarState.events = JSON.parse(raw);
  } catch {}
}

// ============ ETKİNLİK OLUŞTUR ============
function createEvent(data) {
  const { title, date, time = '00:00', endDate, endTime = '23:59', description = '', color = '#6366f1', channelId, reminder = 0 } = data;

  if (!title?.trim())  return toast('Başlık gerekli', 'e');
  if (!date)           return toast('Tarih gerekli', 'e');

  const event = {
    id:          'ev_' + genId(),
    title:       title.trim().slice(0, 100),
    date,
    time,
    endDate:     endDate || date,
    endTime,
    description: description.slice(0, 500),
    color,
    channelId:   channelId || Store.activeChannel,
    createdBy:   Store.user?._id,
    creatorName: Store.user?.username,
    attendees:   [Store.user?._id],
    reminder,    // dakika
    createdAt:   new Date().toISOString(),
  };

  calendarState.events.push(event);
  _saveCalendar();

  // Hatırlatıcı kur
  if (reminder > 0) _scheduleReminder(event);

  // Sunucuya bildir
  if (socket?.connected) socket.emit('event_created', event);
  if (typeof SyncEngine !== 'undefined') SyncEngine.add('/api/events', 'POST', event);

  // Kanala duyuru
  if (channelId) {
    const msg = {
      _id:        genId(),
      content:    `📅 **Yeni Etkinlik:** ${title} — ${_formatEventDate(date, time)}`,
      senderName: Store.user?.username,
      senderId:   Store.user?._id,
      channelId,
      createdAt:  new Date().toISOString(),
      reactions:  {},
      readBy:     [Store.user?._id],
      isSystem:   true,
    };
    if (!Store.messages) Store.messages = [];
    Store.messages.push(msg);
    if (typeof renderMessages === 'function') renderMessages();
    if (socket?.connected) socket.emit('send_message', msg);
  }

  toast('Etkinlik oluşturuldu', 's');
  _calLog('Etkinlik oluşturuldu: ' + title);
  return event;
}

// ============ ETKİNLİK SİL ============
function deleteEvent(eventId) {
  const ev = calendarState.events.find(e => e.id === eventId);
  if (!ev) return;
  if (ev.createdBy !== Store.user?._id) return toast('Yetki yok', 'e');
  if (!confirm(`"${ev.title}" etkinliği silinsin mi?`)) return;

  calendarState.events = calendarState.events.filter(e => e.id !== eventId);
  _saveCalendar();

  if (socket?.connected) socket.emit('event_deleted', { id: eventId });
  if (typeof SyncEngine !== 'undefined') SyncEngine.add(`/api/events/${eventId}`, 'DELETE', { id: eventId });

  toast('Etkinlik silindi');
  renderCalendar();
}

// ============ ETKİNLİĞE KATIL ============
function joinEvent(eventId) {
  const ev = calendarState.events.find(e => e.id === eventId);
  if (!ev) return;
  const uid = Store.user?._id;
  if (!ev.attendees) ev.attendees = [];
  if (ev.attendees.includes(uid)) {
    ev.attendees = ev.attendees.filter(a => a !== uid);
    toast('Etkinlikten ayrıldın');
  } else {
    ev.attendees.push(uid);
    toast('Etkinliğe katıldın', 's');
  }
  _saveCalendar();
  if (socket?.connected) socket.emit('event_join', { eventId, userId: uid, action: ev.attendees.includes(uid) ? 'join' : 'leave' });
}

// ============ HATIRLATICI ============
function _scheduleReminder(event) {
  const eventTime = new Date(`${event.date}T${event.time}`).getTime();
  const remindAt  = eventTime - event.reminder * 60 * 1000;
  const delay     = remindAt - Date.now();
  if (delay <= 0) return;

  setTimeout(() => {
    if (typeof sendNotification === 'function') {
      sendNotification(
        event.title,
        `${event.reminder} dakika sonra başlıyor`,
        'event',
        { showToast: true }
      );
    }
    if (socket?.connected) socket.emit('event_reminder', event);
  }, delay);
}

// ============ TAKVİM RENDER ============
function renderCalendar() {
  const container = document.getElementById('calendarView') || document.getElementById('messages');
  if (!container) return;

  const { currentYear, currentMonth } = calendarState;
  const today      = new Date();
  const firstDay   = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const MONTHS     = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
  const DAYS       = ['Pz','Pt','Sa','Ça','Pe','Cu','Ct'];

  container.innerHTML = `
    <div class="calendar-wrap">
      <div class="cal-header">
        <button class="cal-nav" onclick="calPrev()">‹</button>
        <div class="cal-title">
          <h3>${MONTHS[currentMonth]} ${currentYear}</h3>
          <button class="cal-today-btn" onclick="calGoToday()">Bugün</button>
        </div>
        <button class="cal-nav" onclick="calNext()">›</button>
        <div class="cal-view-btns">
          <button class="cal-view-btn ${calendarState.view==='month'?'act':''}" onclick="setCalView('month')">Ay</button>
          <button class="cal-view-btn ${calendarState.view==='list'?'act':''}"  onclick="setCalView('list')">Liste</button>
        </div>
        <button class="cal-add-btn" onclick="openCreateEventModal()">+ Etkinlik</button>
      </div>

      ${calendarState.view === 'list' ? _renderCalendarList() : _renderCalendarGrid(firstDay, daysInMonth, today)}

      ${calendarState.selectedDate ? _renderSelectedDayEvents() : ''}
    </div>`;
}

function _renderCalendarGrid(firstDay, daysInMonth, today) {
  const { currentYear, currentMonth } = calendarState;
  const DAYS = ['Pz','Pt','Sa','Ça','Pe','Cu','Ct'];
  const offset = firstDay;

  let cells = '';
  // Boş hücreler
  for (let i = 0; i < offset; i++) cells += '<div class="cal-day empty"></div>';
  // Günler
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr  = `${currentYear}-${String(currentMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const isToday  = today.getDate()===d && today.getMonth()===currentMonth && today.getFullYear()===currentYear;
    const isSelected = calendarState.selectedDate === dateStr;
    const dayEvents = _getEventsForDate(dateStr);
    cells += `
      <div class="cal-day ${isToday?'today':''} ${isSelected?'selected':''} ${dayEvents.length?'has-events':''}"
        onclick="selectCalDay('${dateStr}')">
        <span class="cal-day-num">${d}</span>
        <div class="cal-day-dots">
          ${dayEvents.slice(0,3).map(ev => `<span class="cal-dot" style="background:${ev.color||'var(--ac)'}"></span>`).join('')}
        </div>
      </div>`;
  }

  return `
    <div class="cal-grid-wrap">
      <div class="cal-weekdays">${DAYS.map(d=>`<div class="cal-wd">${d}</div>`).join('')}</div>
      <div class="cal-grid">${cells}</div>
    </div>`;
}

function _renderCalendarList() {
  const { currentYear, currentMonth } = calendarState;
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const events = calendarState.events.filter(ev => {
    const d = new Date(ev.date);
    return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
  }).sort((a, b) => new Date(a.date+'T'+a.time) - new Date(b.date+'T'+b.time));

  if (events.length === 0) return '<div class="cal-empty">Bu ay etkinlik yok</div>';

  return `<div class="cal-list">
    ${events.map(ev => `
      <div class="cal-list-item" onclick="openEventDetail('${ev.id}')">
        <div class="cal-list-color" style="background:${ev.color||'var(--ac)'}"></div>
        <div class="cal-list-info">
          <span class="cal-list-title">${escapeHtml(ev.title)}</span>
          <span class="cal-list-date">${_formatEventDate(ev.date, ev.time)}</span>
        </div>
        <span class="cal-list-att">${ev.attendees?.length || 0} katılımcı</span>
      </div>`).join('')}
  </div>`;
}

function _renderSelectedDayEvents() {
  const date    = calendarState.selectedDate;
  const events  = _getEventsForDate(date);
  if (events.length === 0) return `<div class="cal-day-detail"><p style="color:var(--t3)">Bu gün etkinlik yok</p></div>`;

  return `
    <div class="cal-day-detail">
      <h4>${_formatEventDate(date, '')}</h4>
      ${events.map(ev => `
        <div class="cal-event-card" onclick="openEventDetail('${ev.id}')">
          <div class="cal-event-stripe" style="background:${ev.color||'var(--ac)'}"></div>
          <div class="cal-event-info">
            <span class="cal-event-title">${escapeHtml(ev.title)}</span>
            <span class="cal-event-time">${ev.time} — ${ev.endTime}</span>
          </div>
          <span class="cal-event-att">${ev.attendees?.length||0} 👤</span>
        </div>`).join('')}
    </div>`;
}

// ============ MODAL ============
function openCreateEventModal() {
  if (typeof MODAL_TEMPLATES === 'undefined') return;

  const today = new Date().toISOString().split('T')[0];
  MODAL_TEMPLATES.createEvent = () => `
    <div class="gm-header">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
      <h2>Etkinlik Oluştur</h2>
    </div>
    <div class="gm-body">
      <div class="gm-field">
        <label class="gm-label">Başlık</label>
        <input class="gm-input" id="evTitle" placeholder="Etkinlik adı" maxlength="100">
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div class="gm-field">
          <label class="gm-label">Başlangıç</label>
          <input class="gm-input" type="date" id="evDate" value="${today}">
        </div>
        <div class="gm-field">
          <label class="gm-label">Saat</label>
          <input class="gm-input" type="time" id="evTime" value="12:00">
        </div>
        <div class="gm-field">
          <label class="gm-label">Bitiş</label>
          <input class="gm-input" type="date" id="evEndDate" value="${today}">
        </div>
        <div class="gm-field">
          <label class="gm-label">Bitiş Saati</label>
          <input class="gm-input" type="time" id="evEndTime" value="13:00">
        </div>
      </div>
      <div class="gm-field">
        <label class="gm-label">Açıklama</label>
        <textarea class="gm-textarea" id="evDesc" rows="2" placeholder="Etkinlik hakkında..." maxlength="500"></textarea>
      </div>
      <div class="gm-field">
        <label class="gm-label">Renk</label>
        <div class="role-color-grid">
          ${['#6366f1','#ec4899','#10b981','#f59e0b','#3b82f6','#ef4444','#8b5cf6','#f97316']
            .map((c,i) => `<button class="role-color-btn ${i===0?'act':''}" style="background:${c}"
              onclick="document.getElementById('evColor').value='${c}';document.querySelectorAll('.role-color-btn').forEach(b=>b.classList.remove('act'));this.classList.add('act')"></button>`).join('')}
        </div>
        <input type="color" id="evColor" value="#6366f1" style="display:none">
      </div>
      <div class="gm-field">
        <label class="gm-label">Hatırlatıcı</label>
        <select class="gm-select" id="evReminder">
          <option value="0">Yok</option>
          <option value="10">10 dakika önce</option>
          <option value="30" selected>30 dakika önce</option>
          <option value="60">1 saat önce</option>
          <option value="1440">1 gün önce</option>
        </select>
      </div>
      <div class="gm-actions">
        <button class="gm-btn ghost" onclick="closeModal()">İptal</button>
        <button class="gm-btn primary" onclick="_submitCreateEvent()">Oluştur</button>
      </div>
    </div>`;

  openModal('createEvent');
}

function _submitCreateEvent() {
  const ev = {
    title:       document.getElementById('evTitle')?.value,
    date:        document.getElementById('evDate')?.value,
    time:        document.getElementById('evTime')?.value,
    endDate:     document.getElementById('evEndDate')?.value,
    endTime:     document.getElementById('evEndTime')?.value,
    description: document.getElementById('evDesc')?.value,
    color:       document.getElementById('evColor')?.value || '#6366f1',
    reminder:    parseInt(document.getElementById('evReminder')?.value || '0'),
    channelId:   Store.activeChannel,
  };
  const created = createEvent(ev);
  if (created) { closeModal(); renderCalendar(); }
}

function openEventDetail(eventId) {
  const ev = calendarState.events.find(e => e.id === eventId);
  if (!ev) return;
  const isAttending = ev.attendees?.includes(Store.user?._id);
  const isOwner     = ev.createdBy === Store.user?._id;

  if (typeof MODAL_TEMPLATES === 'undefined') return;
  MODAL_TEMPLATES.eventDetail = () => `
    <div class="gm-header">
      <div style="width:14px;height:14px;border-radius:50%;background:${ev.color};flex-shrink:0"></div>
      <h2>${escapeHtml(ev.title)}</h2>
    </div>
    <div class="gm-body">
      <div class="gm-info-rows">
        <div class="gm-info-row"><span>Başlangıç</span><code>${_formatEventDate(ev.date, ev.time)}</code></div>
        <div class="gm-info-row"><span>Bitiş</span><code>${_formatEventDate(ev.endDate, ev.endTime)}</code></div>
        <div class="gm-info-row"><span>Oluşturan</span><span>${escapeHtml(ev.creatorName||'')}</span></div>
        <div class="gm-info-row"><span>Katılımcı</span><code>${ev.attendees?.length||0} kişi</code></div>
      </div>
      ${ev.description ? `<p style="margin-top:12px;font-size:13px;color:var(--t2)">${escapeHtml(ev.description)}</p>` : ''}
      <div class="gm-actions">
        ${isOwner ? `<button class="gm-btn danger" onclick="deleteEvent('${ev.id}');closeModal()">Sil</button>` : ''}
        <button class="gm-btn ${isAttending?'ghost':'primary'}" onclick="joinEvent('${ev.id}');closeModal()">
          ${isAttending ? '✗ Ayrıl' : '✓ Katıl'}
        </button>
      </div>
    </div>`;
  openModal('eventDetail');
}

// ============ NAVİGASYON ============
function calPrev() {
  calendarState.currentMonth--;
  if (calendarState.currentMonth < 0) { calendarState.currentMonth = 11; calendarState.currentYear--; }
  renderCalendar();
}
function calNext() {
  calendarState.currentMonth++;
  if (calendarState.currentMonth > 11) { calendarState.currentMonth = 0; calendarState.currentYear++; }
  renderCalendar();
}
function calGoToday() {
  calendarState.currentYear  = new Date().getFullYear();
  calendarState.currentMonth = new Date().getMonth();
  calendarState.selectedDate = new Date().toISOString().split('T')[0];
  renderCalendar();
}
function selectCalDay(dateStr) {
  calendarState.selectedDate = calendarState.selectedDate === dateStr ? null : dateStr;
  renderCalendar();
}
function setCalView(view) {
  calendarState.view = view;
  renderCalendar();
}

// ============ YARDIMCI ============
function _getEventsForDate(dateStr) {
  return calendarState.events.filter(ev => ev.date === dateStr);
}
function _formatEventDate(date, time) {
  if (!date) return '';
  const d = new Date(date);
  const str = d.toLocaleDateString('tr-TR', { day:'numeric', month:'long', year:'numeric' });
  return time ? `${str} ${time}` : str;
}

// ============ SOCKET ============
function initCalendarSocket() {
  if (!socket) return;
  socket.on('event_created', ev => {
    if (!calendarState.events.find(e => e.id === ev.id)) {
      calendarState.events.push(ev);
      _saveCalendar();
      if (_scheduleReminder && ev.reminder > 0) _scheduleReminder(ev);
    }
  });
  socket.on('event_deleted', ({ id }) => {
    calendarState.events = calendarState.events.filter(e => e.id !== id);
    _saveCalendar();
  });
  socket.on('event_join', ({ eventId, userId, action }) => {
    const ev = calendarState.events.find(e => e.id === eventId);
    if (!ev) return;
    if (!ev.attendees) ev.attendees = [];
    if (action === 'join' && !ev.attendees.includes(userId)) ev.attendees.push(userId);
    if (action === 'leave') ev.attendees = ev.attendees.filter(a => a !== userId);
    _saveCalendar();
  });
}

// ============ CSS ============
(function injectCalStyles() {
  const id = 'gt-cal-styles';
  if (document.getElementById(id)) return;
  const style = document.createElement('style');
  style.id = id;
  style.textContent = `
.calendar-wrap{padding:12px;max-width:600px;margin:0 auto}
.cal-header{display:flex;align-items:center;gap:8px;margin-bottom:14px;flex-wrap:wrap}
.cal-nav{background:var(--bg2);border:1.5px solid rgba(255,255,255,.08);border-radius:8px;width:32px;height:32px;cursor:pointer;color:var(--t1);font-size:18px;line-height:1;flex-shrink:0}
.cal-nav:hover{background:rgba(255,255,255,.08)}
.cal-title{flex:1;display:flex;align-items:center;gap:8px}
.cal-title h3{margin:0;font-size:16px;font-weight:700;color:var(--t1)}
.cal-today-btn{background:none;border:1.5px solid rgba(255,255,255,.1);border-radius:8px;padding:3px 8px;font-size:11px;color:var(--t3);cursor:pointer;font-family:inherit}
.cal-today-btn:hover{border-color:var(--ac);color:var(--ac)}
.cal-view-btns{display:flex;gap:4px}
.cal-view-btn{padding:4px 10px;border-radius:8px;border:1.5px solid rgba(255,255,255,.08);background:none;cursor:pointer;font-size:11px;font-weight:600;color:var(--t3);font-family:inherit}
.cal-view-btn.act{background:var(--ac);border-color:var(--ac);color:#fff}
.cal-add-btn{padding:6px 12px;background:var(--ac);border:none;border-radius:8px;color:#fff;cursor:pointer;font-size:12px;font-weight:700;font-family:inherit;flex-shrink:0}

.cal-weekdays{display:grid;grid-template-columns:repeat(7,1fr);gap:2px;margin-bottom:4px}
.cal-wd{text-align:center;font-size:11px;font-weight:700;color:var(--t3);padding:4px 0}
.cal-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:2px}
.cal-day{
  min-height:56px;padding:5px;border-radius:8px;cursor:pointer;
  border:1.5px solid transparent;transition:all .12s;position:relative;
}
.cal-day:hover:not(.empty){background:rgba(255,255,255,.05);border-color:rgba(255,255,255,.1)}
.cal-day.today{background:var(--ac)18;border-color:var(--ac)60}
.cal-day.today .cal-day-num{color:var(--ac);font-weight:800}
.cal-day.selected{background:var(--ac)22;border-color:var(--ac)}
.cal-day.empty{cursor:default;opacity:0}
.cal-day-num{font-size:13px;font-weight:600;color:var(--t1)}
.cal-day-dots{display:flex;gap:2px;flex-wrap:wrap;margin-top:3px}
.cal-dot{width:5px;height:5px;border-radius:50%}

.cal-day-detail{margin-top:14px;padding-top:14px;border-top:1px solid rgba(255,255,255,.07)}
.cal-day-detail h4{font-size:13px;color:var(--t3);margin:0 0 8px;font-weight:600}
.cal-event-card{
  display:flex;align-items:center;gap:0;
  border-radius:8px;overflow:hidden;margin-bottom:5px;
  background:var(--bg2);cursor:pointer;transition:filter .15s;
}
.cal-event-card:hover{filter:brightness(1.1)}
.cal-event-stripe{width:4px;flex-shrink:0;align-self:stretch}
.cal-event-info{flex:1;padding:8px 10px}
.cal-event-title{display:block;font-size:13px;font-weight:700;color:var(--t1)}
.cal-event-time{display:block;font-size:10px;color:var(--t3)}
.cal-event-att{font-size:11px;color:var(--t3);padding:0 8px;flex-shrink:0}

.cal-list{display:flex;flex-direction:column;gap:4px}
.cal-list-item{display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:8px;background:var(--bg2);cursor:pointer}
.cal-list-item:hover{background:rgba(255,255,255,.08)}
.cal-list-color{width:4px;height:36px;border-radius:2px;flex-shrink:0}
.cal-list-info{flex:1}
.cal-list-title{display:block;font-size:13px;font-weight:700;color:var(--t1)}
.cal-list-date{display:block;font-size:11px;color:var(--t3)}
.cal-list-att{font-size:11px;color:var(--t3)}
.cal-empty{text-align:center;padding:32px;color:var(--t3);font-size:13px}
  `;
  document.head.appendChild(style);
})();

// ============ INIT ============
(function initCalendar() {
  _loadCalendar();
  if (typeof socket !== 'undefined' && socket) {
    initCalendarSocket();
  } else {
    document.addEventListener('socket_ready', initCalendarSocket, { once: true });
  }
  _calLog('v2.0 yüklendi ✓');
})();
