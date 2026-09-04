/**
 * Spanish Classes with Yill - Calendar & Availability Logic
 */

const weekDays = [
  { name: 'lun', date: 20, full: 'Monday 20' },
  { name: 'mar', date: 21, full: 'Tuesday 21' },
  { name: 'mié', date: 22, full: 'Wednesday 22', isToday: true },
  { name: 'jue', date: 23, full: 'Thursday 23' },
  { name: 'vie', date: 24, full: 'Friday 24' },
  { name: 'sáb', date: 25, full: 'Saturday 25' },
  { name: 'dom', date: 26, full: 'Sunday 26' }
];

const displayHours24 = Array.from({ length: 24 }, (_, i) => i);

const timezoneOffsets = {
  'America/Los_Angeles': 0, // Washington State (USA - PT)
  'America/Lima': 2,        // Peru (PET)
  'Europe/London': 8,       // England (BST/GMT)
  'Europe/Rome': 9          // Italy (CEST/CET)
};

const timezonePages = {
  'America/Los_Angeles': 'washington.html',
  'America/Lima': 'peru.html',
  'Europe/London': 'london.html',
  'Europe/Rome': 'rome.html'
};

const autoTzMap = {
  // Pacific
  'America/Los_Angeles': 'America/Los_Angeles',
  'America/Vancouver': 'America/Los_Angeles',
  'America/Tijuana': 'America/Los_Angeles',
  'PST8PDT': 'America/Los_Angeles',
  // UK / Ireland
  'Europe/London': 'Europe/London',
  'Europe/Dublin': 'Europe/London',
  'GB': 'Europe/London',
  // Central / Western Europe
  'Europe/Rome': 'Europe/Rome',
  'Europe/Paris': 'Europe/Rome',
  'Europe/Madrid': 'Europe/Rome',
  'Europe/Berlin': 'Europe/Rome',
  'Europe/Amsterdam': 'Europe/Rome',
  'Europe/Brussels': 'Europe/Rome',
  'Europe/Vienna': 'Europe/Rome',
  'Europe/Zurich': 'Europe/Rome',
  'Europe/Prague': 'Europe/Rome',
  'Europe/Warsaw': 'Europe/Rome',
  // Peru
  'America/Lima': 'America/Lima'
};

const timezoneAliases = {
  'wa': 'America/Los_Angeles',
  'washington': 'America/Los_Angeles',
  'pt': 'America/Los_Angeles',
  'us': 'America/Los_Angeles',
  'usa': 'America/Los_Angeles',
  'peru': 'America/Lima',
  'lima': 'America/Lima',
  'pet': 'America/Lima',
  'london': 'Europe/London',
  'england': 'Europe/London',
  'uk': 'Europe/London',
  'gmt': 'Europe/London',
  'bst': 'Europe/London',
  'rome': 'Europe/Rome',
  'italy': 'Europe/Rome',
  'italia': 'Europe/Rome',
  'cet': 'Europe/Rome',
  'cest': 'Europe/Rome'
};

let currentTz = 'America/Los_Angeles';

// 30-MINUTE SLOTS (WA TIME)
const baseAvailableSlots = [
  // Lunes (idx 0)
  { dayIdx: 0, hours: [6.0, 6.5, 7.0, 7.5, 8.0, 8.5, 9.0, 9.5, 10.0, 10.5, 11.0, 11.5, 12.0, 12.5, 13.0, 13.5, 14.0, 14.5, 17.0, 17.5, 18.0, 18.5, 20.0, 20.5, 21.0, 21.5] },

  // Martes (idx 1)
  { dayIdx: 1, hours: [6.0, 6.5, 7.0, 7.5, 9.5, 10.0, 10.5, 11.0, 11.5, 12.0, 12.5, 13.0, 17.0, 17.5, 18.0, 18.5, 19.0, 20.5, 21.0, 21.5] },

  // Miércoles (idx 2)
  { dayIdx: 2, hours: [6.0, 6.5, 7.0, 7.5, 8.0, 8.5, 9.0, 9.5, 10.0, 10.5, 11.0, 11.5, 12.0, 12.5, 14.0, 14.5, 15.0, 15.5, 17.0, 17.5, 18.0, 20.5, 21.0, 21.5] },

  // Jueves (idx 3)
  { dayIdx: 3, hours: [6.0, 6.5, 7.0, 7.5, 9.5, 10.0, 10.5, 11.0, 11.5, 12.0, 12.5, 13.0, 17.0, 17.5, 18.5, 19.0, 19.5, 20.0, 20.5, 21.0, 21.5] },

  // Viernes (idx 4)
  { dayIdx: 4, hours: [6.0, 6.5, 7.0, 7.5, 8.0, 8.5, 9.0, 9.5, 10.0, 10.5, 11.0, 11.5, 12.0, 12.5, 13.0, 13.5, 14.0, 14.5, 17.0, 17.5, 18.0, 18.5, 19.0, 19.5, 20.0, 20.5, 21.0, 21.5] },

  // Sábado (idx 5)
  { dayIdx: 5, hours: [6.0, 6.5, 7.0, 7.5, 8.0, 9.5, 10.0, 11.5, 12.0, 12.5, 13.0, 13.5, 14.0, 14.5, 15.0, 15.5, 16.0, 16.5, 17.0, 17.5, 18.0, 18.5, 19.0, 19.5, 20.0, 20.5, 21.0, 21.5] },

  // Domingo (idx 6)
  { dayIdx: 6, hours: [] }
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
          id: 'block-' + (eventId++),
          dayIdx: dayData.dayIdx,
          startHour: current,
          durationHours: 1.0,
          title: 'Available'
        });
        i += 2;
      } else {
        groupedEvents.push({
          id: 'block-' + (eventId++),
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
      timeLine.style.top = (18 * 60 + 30) + 'px';
      dayCol.appendChild(timeLine);
    }

    daysGrid.appendChild(dayCol);
  });

  // 4. Render Event Chips
  const offset = timezoneOffsets[currentTz] !== undefined ? timezoneOffsets[currentTz] : 0;

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

function changeTimezone(newTz, shouldRedirect) {
  if (shouldRedirect === undefined) shouldRedirect = true;
  if (timezoneOffsets[newTz] !== undefined) {
    currentTz = newTz;
  }
  const tzSelect = document.getElementById('tz-select');
  if (tzSelect && tzSelect.value !== currentTz) {
    tzSelect.value = currentTz;
  }
  renderCalendar();

  if (shouldRedirect && timezonePages[currentTz]) {
    const targetPage = timezonePages[currentTz];
    const currentPath = window.location.pathname;
    if (!currentPath.endsWith('/' + targetPage) && !currentPath.endsWith(targetPage)) {
      window.location.href = targetPage;
    }
  }
}

function detectInitialTimezone() {
  // 1. Explicit data-tz attribute on html or body (used by dedicated pages)
  const docTz = document.documentElement.getAttribute('data-tz') || (document.body && document.body.getAttribute('data-tz'));
  if (docTz && timezoneOffsets[docTz] !== undefined) {
    return docTz;
  }

  // 2. Query parameter (?tz=wa, ?tz=london, ?tz=peru, ?tz=rome, etc.)
  try {
    const params = new URLSearchParams(window.location.search);
    const tzParam = params.get('tz');
    if (tzParam) {
      const lower = tzParam.toLowerCase();
      if (timezoneOffsets[tzParam] !== undefined) return tzParam;
      if (timezoneAliases[lower]) return timezoneAliases[lower];
    }
  } catch (e) {}

  // 3. Browser Timezone Auto-Detection Fallback
  try {
    if (typeof Intl !== 'undefined' && Intl.DateTimeFormat) {
      const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (detected) {
        if (timezoneOffsets[detected] !== undefined) return detected;
        if (autoTzMap[detected]) return autoTzMap[detected];
        if (detected.includes('London') || detected.includes('Dublin')) return 'Europe/London';
        if (detected.startsWith('Europe/')) return 'Europe/Rome';
        if (detected.includes('Lima') || detected.includes('Bogota') || detected.includes('Quito')) return 'America/Lima';
        if (detected.includes('Los_Angeles') || detected.includes('Vancouver') || detected.includes('Tijuana')) return 'America/Los_Angeles';
      }
    }
  } catch (e) {}

  // 4. Current dropdown value or default
  const tzSelect = document.getElementById('tz-select');
  if (tzSelect && tzSelect.value && timezoneOffsets[tzSelect.value] !== undefined) {
    return tzSelect.value;
  }

  return 'America/Los_Angeles';
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

  let message = 'Hi Yill, I would like to book these times for Spanish classes:' + NL + NL + timeList + NL + NL;
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
  const phoneNumber = '51952401591';
  const url = 'https://wa.me/' + phoneNumber + '?text=' + encodeURIComponent(data.message);
  window.open(url, '_blank');
}

function sendViaGmail() {
  if (selectedSlots.length === 0) return;
  const data = buildMessageData();
  const recipient = 'yill.salvatore@gmail.com';
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
      scrollArea.scrollTop = 360;
    }
  }, 100);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCalendar);
} else {
  initCalendar();
}
window.addEventListener('load', () => {
  renderCalendar();
  const scrollArea = document.getElementById('scroll-area');
  if (scrollArea && scrollArea.scrollTop === 0) {
    scrollArea.scrollTop = 360;
  }
});
