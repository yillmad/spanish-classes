/**
 * Spanish Classes with Yill - Calendar & Booking Logic
 */

const translations = {
  en: {
    weekDays: [
      { name: 'Mon', date: 20, full: 'Monday 20' },
      { name: 'Tue', date: 21, full: 'Tuesday 21' },
      { name: 'Wed', date: 22, full: 'Wednesday 22', isToday: true },
      { name: 'Thu', date: 23, full: 'Thursday 23' },
      { name: 'Fri', date: 24, full: 'Friday 24' },
      { name: 'Sat', date: 25, full: 'Saturday 25' },
      { name: 'Sun', date: 26, full: 'Sunday 26' }
    ],
    available: 'Available',
    selected: '✓ Selected',
    selectedCount: (n) => `${n} slot${n > 1 ? 's' : ''} selected`,
    slotAt: (day, time, tz) => `${day} at ${time} (${tz})`,
    defaultStudentName: 'Student',
    defaultSubjectList: 'Spanish Classes',
    greeting: 'Hi Yill, I would like to book these times for Spanish classes:',
    classFocusLabel: 'Class Focus:',
    studentNameLabel: "Student's Name:",
    notesLabel: 'Notes:',
    gmailSubject: (name) => `Spanish Class Booking Request - ${name}`
  },
  es: {
    weekDays: [
      { name: 'lun', date: 20, full: 'Lunes 20' },
      { name: 'mar', date: 21, full: 'Martes 21' },
      { name: 'mié', date: 22, full: 'Miércoles 22', isToday: true },
      { name: 'jue', date: 23, full: 'Jueves 23' },
      { name: 'vie', date: 24, full: 'Viernes 24' },
      { name: 'sáb', date: 25, full: 'Sábado 25' },
      { name: 'dom', date: 26, full: 'Domingo 26' }
    ],
    available: 'Disponible',
    selected: '✓ Seleccionado',
    selectedCount: (n) => `${n} horario${n > 1 ? 's' : ''} seleccionado${n > 1 ? 's' : ''}`,
    slotAt: (day, time, tz) => `${day} a las ${time} (${tz})`,
    defaultStudentName: 'Estudiante',
    defaultSubjectList: 'Clases de Español',
    greeting: 'Hola Yill, me gustaría reservar estos horarios para clases de español:',
    classFocusLabel: 'Enfoque de la clase:',
    studentNameLabel: 'Nombre del estudiante:',
    notesLabel: 'Notas:',
    gmailSubject: (name) => `Solicitud de Reserva de Clases de Español - ${name}`
  }
};

const currentLang = document.documentElement.lang === 'es' ? 'es' : 'en';
const i18n = translations[currentLang];
const weekDays = i18n.weekDays;

const displayHours24 = Array.from({ length: 24 }, (_, i) => i);

const timezoneOffsets = {
  'America/Los_Angeles': 0, // Main View: Washington State (PT)
  'America/Lima': 2,        // Peru (PET) -> +2 hours relative to WA
  'Europe/London': 8,       // England -> +8 hours
  'Europe/Rome': 9          // Italy -> +9 hours
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

// SMART GROUPING: MERGES ADJACENT 30-MIN SLOTS INTO 1-HOUR BLOCKS WHENEVER POSSIBLE
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
          id: `block-${eventId++}`,
          dayIdx: dayData.dayIdx,
          startHour: current,
          durationHours: 1.0,
          title: i18n.available
        });
        i += 2;
      } else {
        groupedEvents.push({
          id: `block-${eventId++}`,
          dayIdx: dayData.dayIdx,
          startHour: current,
          durationHours: 0.5,
          title: i18n.available
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
  return `${h} ${period}`;
}

function formatTimeLabel(floatHour24) {
  const h = Math.floor(floatHour24) % 24;
  const mins = Math.round((floatHour24 % 1) * 60);
  const period = h >= 12 ? 'p.m.' : 'a.m.';
  const displayHour = h % 12 === 0 ? 12 : h % 12;
  const displayMins = mins === 0 ? ':00' : `:${mins < 10 ? '0' : ''}${mins}`;
  return `${displayHour}${displayMins} ${period}`;
}

function renderCalendar() {
  // 1. Render Header
  const headerContainer = document.getElementById('week-header');
  if (!headerContainer) return;
  headerContainer.innerHTML = '';
  weekDays.forEach(day => {
    const dayEl = document.createElement('div');
    dayEl.className = `day-col-header ${day.isToday ? 'is-today' : ''}`;
    dayEl.innerHTML = `
      <span class="day-name">${day.name}</span>
      <span class="day-number">${day.date}</span>
    `;
    headerContainer.appendChild(dayEl);
  });

  // 2. Render Time Column
  const timeColumn = document.getElementById('time-column');
  if (!timeColumn) return;
  timeColumn.innerHTML = '';
  displayHours24.forEach(hour24 => {
    const timeLabel = document.createElement('div');
    timeLabel.className = 'time-slot-label';
    timeLabel.innerText = formatHourGoogle(hour24);
    timeColumn.appendChild(timeLabel);
  });

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
      timeLine.style.top = `${18 * 60 + 30}px`;
      dayCol.appendChild(timeLine);
    }

    daysGrid.appendChild(dayCol);
  });

  // 4. Render Event Chips
  const offset = timezoneOffsets[currentTz];

  baseEvents.forEach(evt => {
    let adjustedHour = evt.startHour + offset;
    let dayShift = Math.floor(adjustedHour / 24);
    let finalHour = (adjustedHour % 24 + 24) % 24;
    let targetDayIdx = evt.dayIdx + dayShift;

    if (targetDayIdx >= 0 && targetDayIdx < weekDays.length) {
      const dayCol = daysGrid.children[targetDayIdx];
      if (dayCol) {
        const chip = document.createElement('div');
        const slotKey = `${evt.id}-${targetDayIdx}`;
        const isSelected = selectedSlots.some(s => s.slotKey === slotKey);
        
        const topPx = finalHour * 60 + 1;
        const heightPx = evt.durationHours * 60 - 2;
        const timeRangeText = `${formatTimeLabel(finalHour)} - ${formatTimeLabel(finalHour + evt.durationHours)}`;

        chip.className = `event-chip ${isSelected ? 'selected' : ''}`;
        chip.innerText = isSelected ? i18n.selected : (evt.durationHours === 0.5 ? formatTimeLabel(finalHour) : i18n.available);
        chip.title = timeRangeText;
        chip.style.top = `${topPx}px`;
        chip.style.height = `${heightPx}px`;

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
    countText.innerText = i18n.selectedCount(selectedSlots.length);
  } else {
    badge.style.display = 'none';
  }
}

function changeTimezone(newTz) {
  currentTz = newTz;
  renderCalendar();
}

function openBookingModal() {
  const listContainer = document.getElementById('selected-slots-list');
  const tzSelect = document.getElementById('tz-select');
  const tzName = tzSelect.options[tzSelect.selectedIndex].text;

  listContainer.innerHTML = '';
  selectedSlots.forEach(s => {
    const li = document.createElement('li');
    li.innerText = i18n.slotAt(s.dayText, s.timeText, tzName);
    listContainer.appendChild(li);
  });

  document.getElementById('modal-overlay').style.display = 'flex';
}

function closeModal() {
  document.getElementById('modal-overlay').style.display = 'none';
}

function buildMessageData() {
  const studentNameInput = document.getElementById('student-name');
  const studentName = (studentNameInput && studentNameInput.value.trim()) || i18n.defaultStudentName;
  const notesInput = document.getElementById('notes');
  const notes = notesInput ? notesInput.value.trim() : '';
  
  const selectedOptions = Array.from(document.querySelectorAll('input[name="class-option"]:checked'))
    .map(cb => cb.value);

  const tzSelect = document.getElementById('tz-select');
  const tzName = tzSelect ? tzSelect.options[tzSelect.selectedIndex].text : '';

  const timeList = selectedSlots.map(s => `• ${i18n.slotAt(s.dayText, s.timeText, tzName)}`).join('
');
  const subjectList = selectedOptions.length > 0 ? selectedOptions.join(', ') : i18n.defaultSubjectList;

  let message = `${i18n.greeting}

${timeList}

`;
  message += `${i18n.classFocusLabel} ${subjectList}
`;
  message += `${i18n.studentNameLabel} ${studentName}
`;
  if (notes) {
    message += `${i18n.notesLabel} ${notes}
`;
  }

  return { message, studentName };
}

function sendViaWhatsApp() {
  if (selectedSlots.length === 0) return;
  const { message } = buildMessageData();
  const phoneNumber = '51952401591';
  const url = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank');
}

function sendViaGmail() {
  if (selectedSlots.length === 0) return;
  const { message, studentName } = buildMessageData();
  const recipient = 'yill.salvatore@gmail.com';
  const subject = i18n.gmailSubject(studentName);
  
  const mailtoUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${recipient}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
  window.open(mailtoUrl, '_blank');
}

// Horizontal Scroll Sync & Init
window.addEventListener('DOMContentLoaded', () => {
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
});
