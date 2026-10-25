/**
 * Spanish Classes with Yill - Calendar & Availability Logic
 *
 * Rules Enforced:
 * 1. Sync with Google Calendar: Automatically calculates available 30-min slots by removing any timed busy conflicts.
 * 2. Keep Sundays unavailable: Sunday (dayIdx 6) is strictly locked to [] under all circumstances.
 * 3. Ignore all-day events: Events without specific start/end dateTime (i.e. start.date only) are ignored.
 * 4. Display recurring weekdays only: Headers show only Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday (no specific calendar date numbers).
 * 5. Background synchronization: Syncs with calendar data in the background while keeping the recurring weekday display consistent.
 */

let weekDays = [];

function updateWeekDays(tz) {
  const dayShortNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const dayFullNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      weekday: 'short'
    });
    const parts = formatter.formatToParts(now);
    const map = {};
    parts.forEach(p => { map[p.type] = p.value; });

    const dayMap = { 'Mon': 0, 'Tue': 1, 'Wed': 2, 'Thu': 3, 'Fri': 4, 'Sat': 5, 'Sun': 6 };
    const currentDayIdx = dayMap[map.weekday] !== undefined ? dayMap[map.weekday] : 0;

    // Rule 4: Display recurring weekdays only (no specific calendar dates)
    weekDays = [];
    for (let i = 0; i < 7; i++) {
      weekDays.push({
        name: dayFullNames[i],
        shortName: dayShortNames[i],
        full: dayFullNames[i],
        isToday: (i === currentDayIdx)
      });
    }
  } catch (e) {
    weekDays = dayFullNames.map((full, i) => ({
      name: full,
      shortName: dayShortNames[i],
      full: full,
      isToday: (i === 0)
    }));
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

// Daily working window in Washington PT (6:00 AM to 10:00 PM PT = 8:00 AM to 12:00 AM PET)
const DEFAULT_WORKING_HOURS_PT = Array.from({ length: 32 }, (_, i) => 6.0 + i * 0.5);

// Background Google Calendar Sync Configuration
const GOOGLE_CALENDAR_CONFIG = {
  calendarId: 'yill.salvatore@gmail.com',
  apiKey: '',       // Optional: Google Calendar API key (if calendar free/busy is public)
  syncEndpoint: 'https://script.google.com/macros/s/AKfycbzw_LUK6FT81-gvA1hFCD3GU8kh_3XN0jtii0XxjqYDyRJJjzjgwIM1k7IqpMVkmp_g/exec'
};

// Initialize week days
updateWeekDays(currentTz);

/**
 * 30-MINUTE SLOTS (WA TIME) - Synchronized with Google Calendar (yill.salvatore@gmail.com)
 * Rules applied:
 * - Rule 1: All timed events removed from working window (6:00 AM - 10:00 PM PT)
 * - Rule 2: Sundays strictly unavailable (hours: [])
 * - Rule 3: All-day events (e.g., "Cancelar Google One", "Revisión estado financiero") ignored
 */
let baseAvailableSlots = [
  // Monday (idx 0) - Busy: Kayla (13.5-14.25), Kailani (14.25-15.0), Suzie (15.0-16.0), Lena (16.0-17.0), Alex (17.0-18.0), Daniel (18.0-19.0), Adam (19.0-20.0)
  { dayIdx: 0, hours: [6.0, 6.5, 7.0, 7.5, 8.0, 8.5, 9.0, 9.5, 10.0, 10.5, 11.0, 11.5, 12.0, 12.5, 13.0, 20.0, 20.5, 21.0, 21.5] },

  // Tuesday (idx 1) - Busy: Natalia (14.0-15.0), Suzie (15.0-16.0), Janae (16.0-16.5), Lena (16.5-17.5), Ruzgar (17.5-18.5), Lucas & Aleister (19.5-20.5)
  { dayIdx: 1, hours: [6.0, 6.5, 7.0, 7.5, 8.0, 8.5, 9.0, 9.5, 10.0, 10.5, 11.0, 11.5, 12.0, 12.5, 13.0, 13.5, 18.5, 19.0, 20.5, 21.0, 21.5] },

  // Wednesday (idx 2) - Busy: Suzie (13.0-14.0), Benjamin (14.0-15.0), Belma (15.0-16.0), Oliver (16.0-17.0), Janae (17.0-17.5), Ruzgar (17.5-18.5), Adam (18.5-19.5), Wesley & KC (19.5-20.5)
  { dayIdx: 2, hours: [6.0, 6.5, 7.0, 7.5, 8.0, 8.5, 9.0, 9.5, 10.0, 10.5, 11.0, 11.5, 12.0, 12.5, 20.5, 21.0, 21.5] },

  // Thursday (idx 3) - Busy: Kayla (13.5-14.25), Kailani (14.25-15.0), Suzie (15.0-16.0), Janae (16.0-16.5), Lena (16.5-17.5)
  { dayIdx: 3, hours: [6.0, 6.5, 7.0, 7.5, 8.0, 8.5, 9.0, 9.5, 10.0, 10.5, 11.0, 11.5, 12.0, 12.5, 13.0, 17.5, 18.0, 18.5, 19.0, 19.5, 20.0, 20.5, 21.0, 21.5] },

  // Friday (idx 4) - Busy: Natalia (14.0-15.0), Suzie (15.0-16.0), Lena (16.0-17.0), Teah (17.0-18.0)
  { dayIdx: 4, hours: [6.0, 6.5, 7.0, 7.5, 8.0, 8.5, 9.0, 9.5, 10.0, 10.5, 11.0, 11.5, 12.0, 12.5, 13.0, 13.5, 18.0, 18.5, 19.0, 19.5, 20.0, 20.5, 21.0, 21.5] },

  // Saturday (idx 5) - Busy: Macie-Brielle (7.0-7.5), Caiah (7.5-8.0), Adriel (8.0-8.5), Aleister/Lucas/Eva (8.5-9.5), OB (9.5-10.5), Iana (10.5-11.25), Lena (11.5-12.5)
  // Note: All-day event "Cancelar Google One" is ignored per Rule 3
  { dayIdx: 5, hours: [6.0, 6.5, 12.5, 13.0, 13.5, 14.0, 14.5, 15.0, 15.5, 16.0, 16.5, 17.0, 17.5, 18.0, 18.5, 19.0, 19.5, 20.0, 20.5, 21.0, 21.5] },

  // Sunday (idx 6) - Rule 2: Always unavailable under all circumstances
  { dayIdx: 6, hours: [] }
];

function groupSlotsIntoBlocks() {
  const groupedEvents = [];
  let eventId = 1;

  baseAvailableSlots.forEach(dayData => {
    // Rule 2: Enforce Sunday is always empty regardless of external data
    if (dayData.dayIdx === 6) return;

    const sortedHours = [...dayData.hours].sort((a, b) => a - b);
    if (sortedHours.length === 0) return;

    // Step 1: Segment sorted 30-min intervals into contiguous availability windows
    const contiguousWindows = [];
    let currentWindow = [sortedHours[0]];

    for (let i = 1; i < sortedHours.length; i++) {
      if (Math.abs(sortedHours[i] - (sortedHours[i - 1] + 0.5)) < 1e-6) {
        currentWindow.push(sortedHours[i]);
      } else {
        contiguousWindows.push(currentWindow);
        currentWindow = [sortedHours[i]];
      }
    }
    contiguousWindows.push(currentWindow);

    // Step 2: Optimize each contiguous window holistically to maximize 1-hour slots
    // and only use a 30-minute slot when an odd half-hour remains
    contiguousWindows.forEach(windowSlots => {
      const n = windowSlots.length;

      if (n === 1) {
        groupedEvents.push({
          id: 'block-' + (eventId++),
          dayIdx: dayData.dayIdx,
          startHour: windowSlots[0],
          durationHours: 0.5,
          title: 'Available'
        });
      } else if (n % 2 === 0) {
        // Even number of 30-min slots (1h, 2h, 3h, ...):
        // Pair completely into uninterrupted 1-hour slots (zero 30-min fragmentation),
        // including windows starting on the half-hour (e.g., 6:30 PM - 7:30 PM).
        for (let j = 0; j < n; j += 2) {
          groupedEvents.push({
            id: 'block-' + (eventId++),
            dayIdx: dayData.dayIdx,
            startHour: windowSlots[j],
            durationHours: 1.0,
            title: 'Available'
          });
        }
      } else {
        // Odd number of 30-min slots >= 3 (1.5h, 2.5h, 4.5h, ...):
        // Produces Math.floor(n / 2) 1-hour slots and exactly one 30-min slot.
        // Place the single 30-min slot at the boundary that aligns all 1-hour slots on the hour (:00).
        if (windowSlots[0] % 1 !== 0) {
          // Starts at :30 (ends at :00) -> 30-min slot first, then on-the-hour 1-hour slots
          groupedEvents.push({
            id: 'block-' + (eventId++),
            dayIdx: dayData.dayIdx,
            startHour: windowSlots[0],
            durationHours: 0.5,
            title: 'Available'
          });
          for (let j = 1; j < n; j += 2) {
            groupedEvents.push({
              id: 'block-' + (eventId++),
              dayIdx: dayData.dayIdx,
              startHour: windowSlots[j],
              durationHours: 1.0,
              title: 'Available'
            });
          }
        } else {
          // Starts at :00 (ends at :30) -> on-the-hour 1-hour slots first, then 30-min slot at end
          for (let j = 0; j < n - 1; j += 2) {
            groupedEvents.push({
              id: 'block-' + (eventId++),
              dayIdx: dayData.dayIdx,
              startHour: windowSlots[j],
              durationHours: 1.0,
              title: 'Available'
            });
          }
          groupedEvents.push({
            id: 'block-' + (eventId++),
            dayIdx: dayData.dayIdx,
            startHour: windowSlots[n - 1],
            durationHours: 0.5,
            title: 'Available'
          });
        }
      }
    });
  });

  return groupedEvents;
}

let baseEvents = groupSlotsIntoBlocks();
let selectedSlots = [];

/**
 * Background Calendar Synchronization Engine
 * Computes available slots from raw Google Calendar event items while enforcing:
 * - Rule 1: Busy timed events remove overlapping 30-min slots
 * - Rule 2: Sunday (dayIdx === 6) is always unavailable
 * - Rule 3: All-day events (events with start.date instead of start.dateTime) are ignored
 */
function applyCalendarEventsToAvailability(calendarItems) {
  if (!Array.isArray(calendarItems)) return;

  const busyIntervalsByDay = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
  const dayMap = { 'Mon': 0, 'Tue': 1, 'Wed': 2, 'Thu': 3, 'Fri': 4, 'Sat': 5, 'Sun': 6 };

  calendarItems.forEach(item => {
    if (!item || item.status === 'cancelled') return;

    // Rule 3: Ignore all-day events (only process events with specific start.dateTime and end.dateTime)
    if (!item.start || !item.start.dateTime || !item.end || !item.end.dateTime) {
      return;
    }

    // Ignore transparent ("Free") events such as flight reminders marked as free
    if (item.transparency === 'transparent' || item.availability === 'AVAILABILITY_FREE') {
      return;
    }

    const startDate = new Date(item.start.dateTime);
    const endDate = new Date(item.end.dateTime);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return;

    // Convert event start/end to Washington PT ('America/Los_Angeles')
    const ptFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Los_Angeles',
      weekday: 'short',
      hour: 'numeric',
      minute: 'numeric',
      hour12: false
    });

    const startParts = {};
    ptFormatter.formatToParts(startDate).forEach(p => { startParts[p.type] = p.value; });
    const endParts = {};
    ptFormatter.formatToParts(endDate).forEach(p => { endParts[p.type] = p.value; });

    const dayIdx = dayMap[startParts.weekday];
    if (dayIdx === undefined || dayIdx === 6) return; // Rule 2: Sunday always unavailable

    let startH = parseInt(startParts.hour, 10) || 0;
    if (startH === 24) startH = 0;
    const startM = parseInt(startParts.minute, 10) || 0;

    let endH = parseInt(endParts.hour, 10) || 0;
    if (endH === 24) endH = 0;
    const endM = parseInt(endParts.minute, 10) || 0;

    const startFloat = startH + startM / 60;
    let endFloat = endH + endM / 60;
    if (endFloat <= startFloat) endFloat = 24.0;

    busyIntervalsByDay[dayIdx].push([startFloat, endFloat]);
  });

  const updatedSlots = [];
  for (let d = 0; d < 7; d++) {
    // Rule 2: Keep Sundays unavailable under all circumstances
    if (d === 6) {
      updatedSlots.push({ dayIdx: 6, hours: [] });
      continue;
    }

    const busyList = busyIntervalsByDay[d] || [];
    const freeHours = DEFAULT_WORKING_HOURS_PT.filter(slotStart => {
      const slotEnd = slotStart + 0.5;
      const hasConflict = busyList.some(([bStart, bEnd]) => Math.max(slotStart, bStart) < Math.min(slotEnd, bEnd));
      return !hasConflict;
    });

    updatedSlots.push({ dayIdx: d, hours: freeHours });
  }

  baseAvailableSlots = updatedSlots;
  baseEvents = groupSlotsIntoBlocks();
  renderCalendar();
}

async function syncWithGoogleCalendarInBackground() {
  try {
    let url = '';
    if (GOOGLE_CALENDAR_CONFIG.syncEndpoint) {
      url = GOOGLE_CALENDAR_CONFIG.syncEndpoint;
    } else if (GOOGLE_CALENDAR_CONFIG.apiKey && GOOGLE_CALENDAR_CONFIG.calendarId) {
      // Compute active week's Monday 00:00 to Sunday 23:59:59 (on Sunday, preview upcoming week)
      const now = new Date();
      const day = now.getDay();
      const diffToMonday = day === 0 ? 1 : 1 - day;
      const monday = new Date(now);
      monday.setDate(now.getDate() + diffToMonday);
      monday.setHours(0, 0, 0, 0);

      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      sunday.setHours(23, 59, 59, 999);

      url = 'https://www.googleapis.com/calendar/v3/calendars/' +
        encodeURIComponent(GOOGLE_CALENDAR_CONFIG.calendarId) +
        '/events?singleEvents=true&orderBy=startTime' +
        '&timeMin=' + encodeURIComponent(monday.toISOString()) +
        '&timeMax=' + encodeURIComponent(sunday.toISOString()) +
        '&key=' + encodeURIComponent(GOOGLE_CALENDAR_CONFIG.apiKey);
    }

    if (!url) return;

    const response = await fetch(url, { method: 'GET', redirect: 'follow' });
    if (!response.ok) return;
    const data = await response.json();
    if (data && Array.isArray(data.items)) {
      applyCalendarEventsToAvailability(data.items);
    }
  } catch (e) {
    // Fallback silently to pre-synchronized baseAvailableSlots
  }
}

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

  // 1. Render Header (Rule 4: Display recurring weekdays only, no calendar dates)
  const headerContainer = document.getElementById('week-header');
  if (headerContainer) {
    headerContainer.innerHTML = '';
    weekDays.forEach(day => {
      const dayEl = document.createElement('div');
      dayEl.className = 'day-col-header' + (day.isToday ? ' is-today' : '');
      dayEl.innerHTML = '<span class="day-name">' + day.name + '</span>';
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

  // 4. Render Event Chips
  const offset = timezoneOffsets[currentTz] !== undefined ? timezoneOffsets[currentTz] : 0;

  baseEvents.forEach(evt => {
    let adjustedHour = evt.startHour + offset;
    let dayShift = Math.floor(adjustedHour / 24);
    let finalHour = (adjustedHour % 24 + 24) % 24;
    let targetDayIdx = evt.dayIdx + dayShift;

    // Rule 2: Never display available slots on Sunday (targetDayIdx === 6)
    if (targetDayIdx >= 0 && targetDayIdx < weekDays.length && targetDayIdx !== 6) {
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

// Update current time indicator every 30 seconds
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
  const docTz = typeof document !== 'undefined' && (document.documentElement.getAttribute('data-tz') || (document.body && document.body.getAttribute('data-tz')));
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
  const tzSelect = typeof document !== 'undefined' ? document.getElementById('tz-select') : null;
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
  syncWithGoogleCalendarInBackground();

  setTimeout(() => {
    if (scrollArea) {
      const info = getCurrentTimeInfo(currentTz);
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
