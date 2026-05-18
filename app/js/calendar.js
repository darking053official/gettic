// ============ GETTIC CALENDAR.JS - TAKVİM & ETKİNLİK ============

const calendarState = {
  events: JSON.parse(localStorage.getItem('gt_events') || '[]'),
  selectedDate: new Date().toISOString().split('T')[0],
  view: 'month' // month, week, day
};

// Etkinlik oluştur
function createEvent(title, description, date, time, channelId) {
  if (!title?.trim()) return toast('Başlık gerekli', 'e');
  if (!date) return toast('Tarih gerekli', 'e');
  
  const event = {
    id: genId(),
    title: title.trim(),
    description: description?.trim() || '',
    date,
    time: time || '20:00',
    channelId: channelId || Store.activeChannel,
    createdBy: Store.user._id,
    creatorName: Store.user.username,
    createdAt: new Date().toISOString(),
    participants: [Store.user._id],
    participantNames: [Store.user.username],
    maxParticipants: 0, // 0 = sınırsız
    color: '#ec4899',
    status: 'upcoming', // upcoming, ongoing, past, cancelled
    reminder: 30, // dakika
    notified: false
  };
  
  calendarState.events.push(event);
  saveCalendarState();
  toast('📅 Etkinlik oluşturuldu');
  showEventDetail(event.id);
  
  // Etkinlik mesajı
  if (channelId) {
    const msg = {
      _id: genId(),
      content: `📅 **Yeni Etkinlik:** ${event.title}\n📆 ${formatDate(event.date)} ${event.time}\n${event.description ? '📝 ' + event.description : ''}`,
      senderName: Store.user.username,
      senderId: Store.user._id,
      channelId,
      createdAt: new Date().toISOString(),
      eventId: event.id
    };
    Store.messages.push(msg);
    if (typeof renderMessages === 'function') renderMessages();
  }
  
  return event.id;
}

// Etkinlik sil
function deleteEvent(eventId) {
  const event = calendarState.events.find(e => e.id === eventId);
  if (!event) return;
  if (event.createdBy !== Store.user._id && !hasPermission(Store.user._id, 'manageMessages')) {
    return toast('❌ Yetkiniz yok', 'e');
  }
  
  calendarState.events = calendarState.events.filter(e => e.id !== eventId);
  saveCalendarState();
  toast('🗑️ Etkinlik silindi');
}

// Etkinliğe katıl / ayrıl
function toggleEventRSVP(eventId) {
  const event = calendarState.events.find(e => e.id === eventId);
  if (!event || event.status === 'past' || event.status === 'cancelled') return;
  
  if (event.maxParticipants > 0 && !event.participants.includes(Store.user._id) && 
      event.participants.length >= event.maxParticipants) {
    return toast('❌ Etkinlik dolu', 'e');
  }
  
  const idx = event.participants.indexOf(Store.user._id);
  if (idx === -1) {
    event.participants.push(Store.user._id);
    event.participantNames.push(Store.user.username);
    toast('✅ Etkinliğe katıldın');
  } else {
    event.participants.splice(idx, 1);
    event.participantNames.splice(idx, 1);
    toast('👋 Etkinlikten ayrıldın');
  }
  
  saveCalendarState();
  showEventDetail(eventId);
}

// Etkinlik detay modal
function showEventDetail(eventId) {
  const event = calendarState.events.find(e => e.id === eventId);
  if (!event) return;
  
  const content = document.getElementById('modalContent');
  if (!content) return;
  
  const isCreator = event.createdBy === Store.user._id;
  const isParticipant = event.participants.includes(Store.user._id);
  
  content.innerHTML = `
    <h2>📅 ${event.title}</h2>
    
    <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:16px">
      <div style="display:flex;align-items:center;gap:8px;font-size:13px">
        <span>📆</span>
        <span>${formatDate(event.date)} - ${event.time}</span>
        <span style="font-size:10px;color:var(--t3)">(${getTimeUntil(event.date, event.time)})</span>
      </div>
      
      ${event.description ? `
        <div style="display:flex;align-items:flex-start;gap:8px;font-size:13px">
          <span>📝</span>
          <span>${event.description}</span>
        </div>
      ` : ''}
      
      <div style="display:flex;align-items:center;gap:8px;font-size:13px">
        <span>👤</span>
        <span>${event.creatorName} tarafından oluşturuldu</span>
      </div>
      
      <div style="display:flex;align-items:center;gap:8px;font-size:13px">
        <span>👥</span>
        <span>${event.participants.length} katılımcı ${event.maxParticipants > 0 ? '/ ' + event.maxParticipants : ''}</span>
      </div>
      
      <div style="display:flex;align-items:center;gap:8px;font-size:13px">
        <span>📊</span>
        <span style="color:${event.status === 'upcoming' ? 'var(--gr)' : event.status === 'ongoing' ? 'var(--ye)' : 'var(--t3)'}">
          ${event.status === 'upcoming' ? '🔜 Yakında' : event.status === 'ongoing' ? '🟢 Devam Ediyor' : event.status === 'past' ? '✅ Tamamlandı' : '❌ İptal Edildi'}
        </span>
      </div>
    </div>
    
    ${event.participants.length > 0 ? `
      <div class="settings-group">
        <div class="settings-group-title">Katılımcılar (${event.participants.length})</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px">
          ${event.participantNames.map(name => `
            <span style="font-size:11px;background:var(--bg2);padding:4px 10px;border-radius:12px">${name}</span>
          `).join('')}
        </div>
      </div>
    ` : ''}
    
    <div style="display:flex;gap:8px;margin-top:16px">
      ${event.status !== 'past' && event.status !== 'cancelled' ? `
        <button class="mb ${isParticipant ? 'sec' : ''}" onclick="toggleEventRSVP('${event.id}');showEventDetail('${event.id}')">
          ${isParticipant ? '👋 Ayrıl' : '✅ Katıl'}
        </button>
      ` : ''}
      ${isCreator ? `
        <button class="mb sec" onclick="cancelEvent('${event.id}')">❌ İptal Et</button>
        <button class="mb danger" onclick="deleteEvent('${event.id}');closeModal()">🗑️ Sil</button>
      ` : ''}
    </div>
  `;
  
  openModal('event');
}

// Etkinlik iptal
function cancelEvent(eventId) {
  const event = calendarState.events.find(e => e.id === eventId);
  if (!event || event.createdBy !== Store.user._id) return;
  event.status = 'cancelled';
  saveCalendarState();
  toast('❌ Etkinlik iptal edildi');
  showEventDetail(eventId);
}

// Takvim görünümü
function showCalendar() {
  const content = document.getElementById('modalContent');
  if (!content) return;
  
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  
  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  
  const monthNames = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 
                      'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
  
  // Bu ayki etkinlikler
  const monthEvents = calendarState.events.filter(e => {
    const d = new Date(e.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });
  
  let calendarHTML = '';
  
  // Boş günler
  for (let i = 0; i < (firstDay === 0 ? 6 : firstDay - 1); i++) {
    calendarHTML += '<div class="calendar-day empty"></div>';
  }
  
  // Günler
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayEvents = monthEvents.filter(e => e.date === dateStr);
    const isToday = dateStr === today.toISOString().split('T')[0];
    
    calendarHTML += `
      <div class="calendar-day ${isToday ? 'today' : ''}" onclick="showDayEvents('${dateStr}')">
        <span class="calendar-day-num">${day}</span>
        ${dayEvents.length > 0 ? `
          <div class="calendar-dots">
            ${dayEvents.slice(0, 3).map(e => `<span class="calendar-dot" style="background:${e.color}" title="${e.title}"></span>`).join('')}
            ${dayEvents.length > 3 ? `<span class="calendar-dot-more">+${dayEvents.length - 3}</span>` : ''}
          </div>
        ` : ''}
      </div>
    `;
  }
  
  content.innerHTML = `
    <h2>📅 Takvim</h2>
    
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
      <button class="ib" onclick="changeMonth(-1)" style="width:28px;height:28px">←</button>
      <span style="font-weight:700" id="calMonthLabel">${monthNames[currentMonth]} ${currentYear}</span>
      <button class="ib" onclick="changeMonth(1)" style="width:28px;height:28px">→</button>
    </div>
    
    <div class="calendar-grid">
      <div class="calendar-day header">Pzt</div>
      <div class="calendar-day header">Sal</div>
      <div class="calendar-day header">Çar</div>
      <div class="calendar-day header">Per</div>
      <div class="calendar-day header">Cum</div>
      <div class="calendar-day header">Cmt</div>
      <div class="calendar-day header">Paz</div>
      ${calendarHTML}
    </div>
    
    <div class="msep"></div>
    
    <div style="font-weight:600;font-size:13px;margin-bottom:8px">📋 Yaklaşan Etkinlikler</div>
    ${calendarState.events.filter(e => e.status === 'upcoming').sort((a,b) => new Date(a.date) - new Date(b.date)).slice(0, 5).map(e => `
      <div class="mitem" onclick="showEventDetail('${e.id}')">
        <div class="mav" style="background:${e.color};color:#fff">📅</div>
        <div class="minfo">
          <div class="mname">${e.title}</div>
          <div class="msub">${formatDate(e.date)} ${e.time} · ${e.participants.length} katılımcı</div>
        </div>
      </div>
    `).join('') || '<p style="color:var(--t3);font-size:12px;padding:10px">Yaklaşan etkinlik yok</p>'}
    
    <button class="mb sec" onclick="showCreateEventForm()" style="margin-top:12px">+ Etkinlik Oluştur</button>
  `;
  
  openModal('calendar');
}

// Gün etkinlikleri
function showDayEvents(dateStr) {
  const events = calendarState.events.filter(e => e.date === dateStr);
  
  const content = document.getElementById('modalContent');
  if (!content) return;
  
  content.innerHTML = `
    <h2>📅 ${formatDate(dateStr)}</h2>
    ${events.length === 0 ? 
      '<p style="color:var(--t3);text-align:center;padding:20px">Bu tarihte etkinlik yok</p>' :
      events.map(e => `
        <div class="mitem" onclick="showEventDetail('${e.id}')">
          <div class="mav" style="background:${e.color};color:#fff">📅</div>
          <div class="minfo">
            <div class="mname">${e.title}</div>
            <div class="msub">${e.time} · ${e.participants.length} kişi</div>
          </div>
        </div>
      `).join('')
    }
    <button class="mb sec" onclick="showCreateEventForm('${dateStr}')" style="margin-top:12px">+ Etkinlik Ekle</button>
  `;
}

// Etkinlik oluşturma formu
function showCreateEventForm(prefillDate) {
  const content = document.getElementById('modalContent');
  if (!content) return;
  
  content.innerHTML = `
    <h2>📅 Etkinlik Oluştur</h2>
    <input class="mi" id="eventTitle" placeholder="Etkinlik adı">
    <textarea class="mi mta" id="eventDesc" placeholder="Açıklama (opsiyonel)" rows="3"></textarea>
    <input class="mi" type="date" id="eventDate" value="${prefillDate || new Date().toISOString().split('T')[0]}">
    <input class="mi" type="time" id="eventTime" value="20:00">
    <input class="mi" type="number" id="eventMax" placeholder="Maks. katılımcı (0=sınırsız)" value="0" min="0">
    <input class="mi" type="color" id="eventColor" value="#ec4899" style="height:40px;padding:4px">
    <button class="mb" onclick="submitCreateEvent()">Oluştur</button>
  `;
}

function submitCreateEvent() {
  const title = document.getElementById('eventTitle')?.value;
  const desc = document.getElementById('eventDesc')?.value;
  const date = document.getElementById('eventDate')?.value;
  const time = document.getElementById('eventTime')?.value;
  const max = parseInt(document.getElementById('eventMax')?.value || '0');
  const color = document.getElementById('eventColor')?.value;
  
  if (createEvent(title, desc, date, time, Store.activeChannel)) {
    closeModal();
  }
}

// Yardımcı fonksiyonlar
function formatDate(dateStr) {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch(e) { return dateStr; }
}

function getTimeUntil(dateStr, timeStr) {
  try {
    const target = new Date(dateStr + 'T' + timeStr);
    const now = new Date();
    const diff = target - now;
    
    if (diff < 0) return 'Geçti';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) return `${days} gün ${hours} saat`;
    if (hours > 0) return `${hours} saat`;
    return '1 saatten az';
  } catch(e) { return ''; }
}

function changeMonth(dir) {
  // Ay değiştirme - basit implementasyon
  const d = new Date(calendarState.selectedDate);
  d.setMonth(d.getMonth() + dir);
  calendarState.selectedDate = d.toISOString().split('T')[0];
  showCalendar();
}

function saveCalendarState() {
  localStorage.setItem('gt_events', JSON.stringify(calendarState.events));
}

// CSS
const calStyle = document.createElement('style');
calStyle.textContent = `
  .calendar-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 2px;
    margin-bottom: 12px;
  }
  .calendar-day {
    padding: 8px 4px;
    text-align: center;
    border-radius: 6px;
    cursor: pointer;
    font-size: 12px;
    min-height: 50px;
    transition: background .15s;
  }
  .calendar-day:hover {
    background: var(--bg2);
  }
  .calendar-day.header {
    font-weight: 700;
    font-size: 10px;
    color: var(--t3);
    cursor: default;
    min-height: auto;
  }
  .calendar-day.today {
    background: var(--acd);
    font-weight: 700;
  }
  .calendar-day.empty {
    cursor: default;
  }
  .calendar-day-num {
    display: block;
    margin-bottom: 4px;
  }
  .calendar-dots {
    display: flex;
    gap: 2px;
    justify-content: center;
    flex-wrap: wrap;
  }
  .calendar-dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    display: inline-block;
  }
  .calendar-dot-more {
    font-size: 8px;
    color: var(--t3);
  }
`;
document.head.appendChild(calStyle);

// Başlat
document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('calendarBtn');
  if (btn) btn.onclick = showCalendar;
});
