/**
 * Spanish Classes with Camila - Calendar & Availability Logic
 */

let weekDays = [];

function updateWeekDays(tz) {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      weekday: 'short',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hour12: false
    });
    const parts = formatter.formatToParts(now);
    const map = {};
    parts.forEach(p => { map[p.type] = p.value; });

    const dayMap = { 'Mon': 0, 'Tue': 1, 'Wed': 2, 'Thu': 3, 'Fri': 4, 'Sat': 5, 'Sun': 6 };
    const currentDayIdx = dayMap[map.weekday] !== undefined ? dayMap[map.weekday] : 0;
    const year = parseInt(map.year, 10);
    const month = parseInt(map.month, 10);
    const day = parseInt(map.day, 10);

    const dayShortNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const dayFullNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    weekDays = [];
    for (let i = 0; i < 7; i++) {
      const diff = i - currentDayIdx;
      const d = new Date(year, month - 1, day + diff);
      const dateNum = d.getDate();
      weekDays.push({
        name: dayShortNames[i],
        date: dateNum,
        full: dayFullNames[i] + ' ' + dateNum,
        isToday: (i === currentDayIdx)
      });
    }
  } catch (e) {
    weekDays = [
      { name: 'Mon', date: 14, full: 'Monday 14', isToday: true },
      { name: 'Tue', date: 15, full: 'Tuesday 15', isToday: false },
      { name: 'Wed', date: 16, full: 'Wednesday 16', isToday: false },
      { name: 'Thu', date: 17, full: 'Thursday 17', isToday: false },
      { name: 'Fri', date: 18, full: 'Friday 18', isToday: false },
      { name: 'Sat', date: 19, full: 'Saturday 19', isToday: false },
      { name: 'Sun', date: 20, full: 'Sunday 20', isToday: false }
    ];
  }
}

function getCurrentTimeInfo(tz) {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      weekday: 'short',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hour12: false
    });
    const parts = formatter.formatToParts(now);
    const map = {};
    parts.forEach(p => { map[p.type] = p.value; });

    let h = parseInt(map.hour, 10) || 0;
    if (h === 24) h = 0;
    const m = parseInt(map.minute, 10) || 0;
    const s = parseInt(map.second, 10) || 0;
    const floatHour = h + m / 60 + s / 3600;

    return {
      floatHour: floatHour,
      topPx: floatHour * 60,
      h: h,
      m: m
    };
  } catch (e) {
    const d = new Date();
    const floatHour = d.getHours() + d.getMinutes() / 60;
    return {
      floatHour: floatHour,
      topPx: floatHour * 60,
      h: d.getHours(),
      m: d.getMinutes()
    };
  }
}

const displayHours24 = Array.from({ length: 24 }, (_, i) => i);

// Base timezone is Peru Time (America/Lima, UTC-5)
const timezoneOffsetsFromPeru = {
  'America/Lima': 0,        // Peru (PET)
  'America/Los_Angeles': -2,// Washington State (USA - PT)
  'Europe/London': 6,       // England (BST/GMT)
  'Europe/Rome': 7          // Italy (CEST/CET)
};

const autoTzMap = {
  'America/Lima': 'America/Lima',
  'America/Los_Angeles': 'America/Los_Angeles',
  'America/Vancouver': 'America/Los_Angeles',
  'America/Tijuana': 'America/Los_Angeles',
  'PST8PDT': 'America/Los_Angeles',
  'Europe/London': 'Europe/London',
  'Europe/Dublin': 'Europe/London',
  'GB': 'Europe/London',
  'Europe/Rome': 'Europe/Rome',
  'Europe/Paris': 'Europe/Rome',
  'Europe/Madrid': 'Europe/Rome',
  'Europe/Berlin': 'Europe/Rome'
};

const timezoneAliases = {
  'peru': 'America/Lima',
  'lima': 'America/Lima',
  'pet': 'America/Lima',
  'wa': 'America/Los_Angeles',
  'washington': 'America/Los_Angeles',
  'pt': 'America/Los_Angeles',
  'london': 'Europe/London',
  'uk': 'Europe/London',
  'rome': 'Europe/Rome',
  'cet': 'Europe/Rome'
};

let currentTz = 'America/Lima';

// Initialize week days
updateWeekDays(currentTz);

/**
 * 30-MINUTE SLOTS (PERU TIME)
 * Awake window: 8:00 a.m. to 11:00 p.m. (sleep hours: 11pm - 8am)
 * Slots range: 8.0 to 22.5
 */
const baseAvailableSlots = [
  // Lunes (idx 0) - Busy: Aiden (18:00 - 19:00)
  {
    dayIdx: 0,
    hours: [
      8.0, 8.5, 9.0, 9.5, 10.0, 10.5, 11.0, 11.5, 12.0, 12.5,
      13.0, 13.5, 14.0, 14.5, 15.0, 15.5, 16.0, 16.5, 17.0, 17.5,
      19.0, 19.5, 20.0, 20.5, 21.0, 21.5, 22.0, 22.5
    ]
  },

  // Martes (idx 1) - Free all awake hours
  {
    dayIdx: 1,
    hours: [
      8.0, 8.5, 9.0, 9.5, 10.0, 10.5, 11.0, 11.5, 12.0, 12.5,
      13.0, 13.5, 14.0, 14.5, 15.0, 15.5, 16.0, 16.5, 17.0, 17.5,
      18.0, 18.5, 19.0, 19.5, 20.0, 20.5, 21.0, 21.5, 22.0, 22.5
    ]
  },

  // Miércoles (idx 2) - Busy: Aiden (18:00 - 19:00)
  {
    dayIdx: 2,
    hours: [
      8.0, 8.5, 9.0, 9.5, 10.0, 10.5, 11.0, 11.5, 12.0, 12.5,
      13.0, 13.5, 14.0, 14.5, 15.0, 15.5, 16.0, 16.5, 17.0, 17.5,
      19.0, 19.5, 20.0, 20.5, 21.0, 21.5, 22.0, 22.5
    ]
  },

  // Jueves (idx 3) - Busy: Miles (20:00 - 21:00)
  {
    dayIdx: 3,
    hours: [
      8.0, 8.5, 9.0, 9.5, 10.0, 10.5, 11.0, 11.5, 12.0, 12.5,
      13.0, 13.5, 14.0, 14.5, 15.0, 15.5, 16.0, 16.5, 17.0, 17.5,
      18.0, 18.5, 19.0, 19.5, 21.0, 21.5, 22.0, 22.5
    ]
  },

  // Viernes (idx 4) - Busy: Jules (20:00 - 21:00)
  {
    dayIdx: 4,
    hours: [
      8.0, 8.5, 9.0, 9.5, 10.0, 10.5, 11.0, 11.5, 12.0, 12.5,
      13.0, 13.5, 14.0, 14.5, 15.0, 15.5, 16.0, 16.5, 17.0, 17.5,
      18.0, 18.5, 19.0, 19.5, 21.0, 21.5, 22.0, 22.5
    ]
  },

  // Sábado (idx 5) - Busy: Jules (10:00 - 11:00)
  {
    dayIdx: 5,
    hours: [
      8.0, 8.5, 9.0, 9.5,
      11.0, 11.5, 12.0, 12.5, 13.0, 13.5, 14.0, 14.5, 15.0, 15.5,
      16.0, 16.5, 17.0, 17.5, 18.0, 18.5, 19.0, 19.5, 20.0, 20.5,
      21.0, 21.5, 22.0, 22.5
    ]
  },

  // Domingo (idx 6) - Busy: Discurso (11:30 - 13:00)
  {
    dayIdx: 6,
    hours: [
      8.0, 8.5, 9.0, 9.5, 10.0, 10.5, 11.0,
      13.0, 13.5, 14.0, 14.5, 15.0, 15.5, 16.0, 16.5, 17.0, 17.5,
      18.0, 18.5, 19.0, 19.5, 20.0, 20.5, 21.0, 21.5, 22.0, 22.5
    ]
  }
];

function groupSlotsIntoBlocks() {
  const groupedEvents = [];
  let eventId = 1;

  baseAvailableSlots.forEach(dayData => {
    const sortedHours = [...dayData.hours].sort((a, b) => a - b);
    let i = 0;

    while (i < sortedHours.length) {
      const current = sortedHours[i];
      const next = sortedHours[i + 1];

      if (current % 1 === 0 && next === current + 0.5) {
        groupedEvents.push({
          id: 'camila-block-' + (eventId++),
          dayIdx: dayData.dayIdx,
          startHour: current,
          durationHours: 1.0,
          title: 'Available'
        });
        i += 2;
      } else {
        groupedEvents.push({
          id: 'camila-block-' + (eventId++),
          dayIdx: dayData.dayIdx,
          startHour: current,
          durationHours: 0.5,
          title: 'Available'
        });
        i += 1;
      }
    }
  });

  return groupedEvents;
}

const baseEvents = groupSlotsIntoBlocks();
let selectedSlots = [];

function formatHourGoogle(hour24) {
  if (hour24 === 0) return '';
  const period = hour24 >= 12 ? 'p.m.' : 'a.m.';
  const h = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return h + ' ' + period;
}

function formatTimeLabel(floatHour24) {
  const h = Math.floor(floatHour24) % 24;
  const mins = Math.round((floatHour24 % 1) * 60);
  const period = h >= 12 ? 'p.m.' : 'a.m.';
  const displayHour = h % 12 === 0 ? 12 : h % 12;
  const displayMins = mins === 0 ? ':00' : ':' + (mins < 10 ? '0' : '') + mins;
  return displayHour + displayMins + ' ' + period;
}

function renderCalendar() {
  // 0. Update week days and current time dynamically for the selected timezone
  updateWeekDays(currentTz);
  const currentTimeInfo = getCurrentTimeInfo(currentTz);

  // 1. Render Header
  const headerContainer = document.getElementById('week-header');
  if (headerContainer) {
    headerContainer.innerHTML = '';
    weekDays.forEach(day => {
      const dayEl = document.createElement('div');
      dayEl.className = 'day-col-header' + (day.isToday ? ' is-today' : '');
      dayEl.innerHTML = '<span class="day-name">' + day.name + '</span><span class="day-number">' + day.date + '</span>';
      headerContainer.appendChild(dayEl);
    });
  }

  // 2. Render Time Column
  const timeColumn = document.getElementById('time-column');
  if (timeColumn) {
    timeColumn.innerHTML = '';
    displayHours24.forEach(hour24 => {
      const timeLabel = document.createElement('div');
      timeLabel.className = 'time-slot-label';
      timeLabel.innerText = formatHourGoogle(hour24);
      timeColumn.appendChild(timeLabel);
    });
  }

  // 3. Render Grid
  const daysGrid = document.getElementById('days-grid');
  if (!daysGrid) return;
  daysGrid.innerHTML = '';

  weekDays.forEach((day) => {
    const dayCol = document.createElement('div');
    dayCol.className = 'day-column';

    displayHours24.forEach(() => {
      const cell = document.createElement('div');
      cell.className = 'hour-cell';
      dayCol.appendChild(cell);
    });

    if (day.isToday) {
      const timeLine = document.createElement('div');
      timeLine.className = 'current-time-line';
      timeLine.id = 'live-current-time-line';
      timeLine.style.top = currentTimeInfo.topPx + 'px';
      timeLine.title = 'Current Time: ' + formatTimeLabel(currentTimeInfo.floatHour);
      dayCol.appendChild(timeLine);
    }

    daysGrid.appendChild(dayCol);
  });

  // 4. Render Event Chips (converted from Peru time base)
  const offset = timezoneOffsetsFromPeru[currentTz] !== undefined ? timezoneOffsetsFromPeru[currentTz] : 0;

  baseEvents.forEach(evt => {
    let adjustedHour = evt.startHour + offset;
    let dayShift = Math.floor(adjustedHour / 24);
    let finalHour = (adjustedHour % 24 + 24) % 24;
    let targetDayIdx = evt.dayIdx + dayShift;

    if (targetDayIdx >= 0 && targetDayIdx < weekDays.length) {
      const dayCol = daysGrid.children[targetDayIdx];
      if (dayCol) {
        const chip = document.createElement('div');
        const slotKey = evt.id + '-' + targetDayIdx;
        const isSelected = selectedSlots.some(s => s.slotKey === slotKey);
        
        const topPx = finalHour * 60 + 1;
        const heightPx = evt.durationHours * 60 - 2;
        const timeRangeText = formatTimeLabel(finalHour) + ' - ' + formatTimeLabel(finalHour + evt.durationHours);

        chip.className = 'event-chip' + (isSelected ? ' selected' : '');
        chip.innerText = isSelected ? '✓ Selected' : (evt.durationHours === 0.5 ? formatTimeLabel(finalHour) : 'Available');
        chip.title = timeRangeText;
        chip.style.top = topPx + 'px';
        chip.style.height = heightPx + 'px';

        chip.onclick = (e) => {
          e.stopPropagation();
          toggleSlotSelection(slotKey, weekDays[targetDayIdx].full, timeRangeText);
        };

        dayCol.appendChild(chip);
      }
    }
  });
}

function updateLiveTimeIndicator() {
  const timeLine = document.getElementById('live-current-time-line');
  if (timeLine) {
    const info = getCurrentTimeInfo(currentTz);
    timeLine.style.top = info.topPx + 'px';
    timeLine.title = 'Current Time: ' + formatTimeLabel(info.floatHour);
  }
}

if (typeof setInterval !== 'undefined') {
  setInterval(updateLiveTimeIndicator, 30000);
}

function toggleSlotSelection(slotKey, dayText, timeText) {
  const existingIdx = selectedSlots.findIndex(s => s.slotKey === slotKey);
  
  if (existingIdx > -1) {
    selectedSlots.splice(existingIdx, 1);
  } else {
    selectedSlots.push({
      slotKey: slotKey,
      dayText: dayText,
      timeText: timeText
    });
  }

  updateTopBadge();
  renderCalendar();
}

function updateTopBadge() {
  const badge = document.getElementById('top-selection-badge');
  const countText = document.getElementById('selected-count');

  if (!badge || !countText) return;

  if (selectedSlots.length > 0) {
    badge.style.display = 'flex';
    countText.innerText = selectedSlots.length + ' slot' + (selectedSlots.length > 1 ? 's' : '') + ' selected';
  } else {
    badge.style.display = 'none';
  }
}

function changeTimezone(newTz) {
  if (timezoneOffsetsFromPeru[newTz] !== undefined) {
    currentTz = newTz;
  }
  const tzSelect = document.getElementById('tz-select');
  if (tzSelect && tzSelect.value !== currentTz) {
    tzSelect.value = currentTz;
  }
  renderCalendar();
}

function detectInitialTimezone() {
  try {
    const params = new URLSearchParams(window.location.search);
    const tzParam = params.get('tz');
    if (tzParam) {
      const lower = tzParam.toLowerCase();
      if (timezoneOffsetsFromPeru[tzParam] !== undefined) return tzParam;
      if (timezoneAliases[lower]) return timezoneAliases[lower];
    }
  } catch (e) {}

  try {
    if (typeof Intl !== 'undefined' && Intl.DateTimeFormat) {
      const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (detected) {
        if (timezoneOffsetsFromPeru[detected] !== undefined) return detected;
        if (autoTzMap[detected]) return autoTzMap[detected];
        if (detected.includes('Lima') || detected.includes('Bogota') || detected.includes('Quito')) return 'America/Lima';
        if (detected.includes('Los_Angeles') || detected.includes('Vancouver')) return 'America/Los_Angeles';
        if (detected.includes('London') || detected.includes('Dublin')) return 'Europe/London';
        if (detected.startsWith('Europe/')) return 'Europe/Rome';
      }
    }
  } catch (e) {}

  return 'America/Lima';
}

function openBookingModal() {
  const listContainer = document.getElementById('selected-slots-list');
  const tzSelect = document.getElementById('tz-select');
  const tzName = (tzSelect && tzSelect.options[tzSelect.selectedIndex]) ? tzSelect.options[tzSelect.selectedIndex].text : '';

  if (listContainer) {
    listContainer.innerHTML = '';
    selectedSlots.forEach(s => {
      const li = document.createElement('li');
      li.innerText = s.dayText + ' at ' + s.timeText + ' (' + tzName + ')';
      listContainer.appendChild(li);
    });
  }

  const overlay = document.getElementById('modal-overlay');
  if (overlay) overlay.style.display = 'flex';
}

function closeModal() {
  const overlay = document.getElementById('modal-overlay');
  if (overlay) overlay.style.display = 'none';
}

function buildMessageData() {
  const NL = String.fromCharCode(10);
  const studentNameInput = document.getElementById('student-name');
  const studentName = (studentNameInput && studentNameInput.value.trim()) || 'Student';
  const notesInput = document.getElementById('notes');
  const notes = (notesInput && notesInput.value.trim()) || '';
  
  const selectedOptions = Array.from(document.querySelectorAll('input[name="class-option"]:checked'))
    .map(cb => cb.value);

  const tzSelect = document.getElementById('tz-select');
  const tzName = (tzSelect && tzSelect.options[tzSelect.selectedIndex]) ? tzSelect.options[tzSelect.selectedIndex].text : '';

  const timeList = selectedSlots.map(s => '• ' + s.dayText + ' at ' + s.timeText + ' (' + tzName + ')').join(NL);
  const subjectList = selectedOptions.length > 0 ? selectedOptions.join(', ') : 'Spanish Classes';

  let message = 'Hi Camila, I would like to book these times for Spanish classes:' + NL + NL + timeList + NL + NL;
  message += 'Class Focus: ' + subjectList + NL;
  message += "Student's Name: " + studentName + NL;
  if (notes) {
    message += 'Notes: ' + notes + NL;
  }

  return { message, studentName };
}

function sendViaWhatsApp() {
  if (selectedSlots.length === 0) return;
  const data = buildMessageData();
  const phoneNumber = '51944244795';
  const url = 'https://wa.me/' + phoneNumber + '?text=' + encodeURIComponent(data.message);
  window.open(url, '_blank');
}

function sendViaGmail() {
  if (selectedSlots.length === 0) return;
  const data = buildMessageData();
  const recipient = 'nathaliacamis@gmail.com';
  const subject = 'Spanish Class Booking Request - ' + data.studentName;
  
  const mailtoUrl = 'https://mail.google.com/mail/?view=cm&fs=1&to=' + recipient + '&su=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(data.message);
  window.open(mailtoUrl, '_blank');
}

function initCalendar() {
  currentTz = detectInitialTimezone();
  const tzSelect = document.getElementById('tz-select');
  if (tzSelect) {
    tzSelect.value = currentTz;
  }

  const scrollArea = document.getElementById('scroll-area');
  const headerWrapper = document.getElementById('week-header-wrapper');

  if (scrollArea && headerWrapper) {
    scrollArea.addEventListener('scroll', () => {
      headerWrapper.scrollLeft = scrollArea.scrollLeft;
    });
  }

  renderCalendar();
  setTimeout(() => {
    if (scrollArea) {
      const info = getCurrentTimeInfo(currentTz);
      // Auto-scroll so current time is comfortably in view
      const targetScroll = Math.max(0, Math.min(info.topPx - 180, 24 * 60 - scrollArea.clientHeight));
      scrollArea.scrollTop = targetScroll;
    }
  }, 100);
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCalendar);
  } else {
    initCalendar();
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    renderCalendar();
    const scrollArea = document.getElementById('scroll-area');
    if (scrollArea && scrollArea.scrollTop === 0) {
      const info = getCurrentTimeInfo(currentTz);
      const targetScroll = Math.max(0, Math.min(info.topPx - 180, 24 * 60 - scrollArea.clientHeight));
      scrollArea.scrollTop = targetScroll;
    }
  });
}
