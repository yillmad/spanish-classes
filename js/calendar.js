/**
 * Spanish Classes with Yill - Calendar & Availability Logic
 *
 * Rules Enforced:
 * 1. Sync with Google Calendar: Automatically calculates available 30-min slots by removing any timed busy conflicts.
 * 2. Keep Sundays unavailable: Sunday (dayIdx 6) is strictly locked to [] under all circumstances.
 * 3. Ignore all-day events: Events without specific start/end dateTime (i.e. start.date only) are ignored.
 * 4. Display recurring weekdays only: Headers show only Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday (no specific calendar date numbers).
 * 5. Dynamic Rolling Availability:
 *    - Days that already passed this week: take availability of next week.
 *    - Days that have not yet arrived this week: take availability of this week.
 *    - Hours that already passed today: take availability of the same day next week.
 *    - Hours that have not passed today: take availability of today.
 *    - 1-hour slots are prioritized, 30-minute slots used only when necessary.
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

function getPTDateParts(dateObj) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false
  });
  const parts = {};
  formatter.formatToParts(dateObj).forEach(p => { parts[p.type] = p.value; });
  const dayMap = { 'Mon': 0, 'Tue': 1, 'Wed': 2, 'Thu': 3, 'Fri': 4, 'Sat': 5, 'Sun': 6 };
  let h = parseInt(parts.hour, 10) || 0;
  if (h === 24) h = 0;
  const m = parseInt(parts.minute, 10) || 0;
  return {
    year: parseInt(parts.year, 10),
    month: parseInt(parts.month, 10),
    day: parseInt(parts.day, 10),
    dayIdx: dayMap[parts.weekday] !== undefined ? dayMap[parts.weekday] : 0,
    weekday: parts.weekday,
    floatHour: h + m / 60,
    dateStr: `${parts.year}-${parts.month}-${parts.day}`
  };
}

function getMondayOfCurrentWeek(ptParts) {
  const d = new Date(Date.UTC(ptParts.year, ptParts.month - 1, ptParts.day));
  d.setUTCDate(d.getUTCDate() - ptParts.dayIdx);
  return d;
}

function getTargetDateStr(currentMondayUTC, daysOffset) {
  const d = new Date(currentMondayUTC.getTime());
  d.setUTCDate(d.getUTCDate() + daysOffset);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
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
  'Europe/Berlin': 'Europe/Rome',
  'Europe/Amsterdam': 'Europe/Rome',
  'Europe/Brussels': 'Europe/Rome',
  'Europe/Vienna': 'Europe/Rome',
  'Europe/Zurich': 'Europe/Rome',
  'Europe/Prague': 'Europe/Rome',
  'Europe/Warsaw': 'Europe/Rome',
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
 * Contiguous Window Slot Optimizer
 * Maximizes 1-hour slots and utilizes 30-min slots only when an odd half-hour remains.
 */
function optimizeContiguousWindow(windowSlots) {
  const blocks = [];
  const n = windowSlots.length;
  if (n === 1) {
    blocks.push({ startHour: windowSlots[0], durationHours: 0.5 });
  } else if (n % 2 === 0) {
    // Even number of 30-min intervals -> all full 1-hour slots
    for (let j = 0; j < n; j += 2) {
      blocks.push({ startHour: windowSlots[j], durationHours: 1.0 });
    }
  } else {
    // Odd number of 30-min intervals -> Math.floor(n/2) 1-hour slots + 1 30-min slot
    if (windowSlots[0] % 1 !== 0) {
      // Starts at :30 -> 30-min slot first, aligning remaining 1-hour slots on the hour
      blocks.push({ startHour: windowSlots[0], durationHours: 0.5 });
      for (let j = 1; j < n; j += 2) {
        blocks.push({ startHour: windowSlots[j], durationHours: 1.0 });
      }
    } else {
      // Starts at :00 -> 1-hour slots on the hour, 30-min slot at the end
      for (let j = 0; j < n - 1; j += 2) {
        blocks.push({ startHour: windowSlots[j], durationHours: 1.0 });
      }
      blocks.push({ startHour: windowSlots[n - 1], durationHours: 0.5 });
    }
  }
  return blocks;
}

function groupSlotsIntoContiguousBlocks(hoursList) {
  if (!hoursList || hoursList.length === 0) return [];
  const sorted = [...hoursList].sort((a, b) => a - b);
  const windows = [];
  let curr = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    if (Math.abs(sorted[i] - (sorted[i - 1] + 0.5)) < 1e-6) {
      curr.push(sorted[i]);
    } else {
      windows.push(curr);
      curr = [sorted[i]];
    }
  }
  windows.push(curr);

  const blocks = [];
  windows.forEach(w => {
    blocks.push(...optimizeContiguousWindow(w));
  });
  return blocks;
}

// Global state of computed available slots and events
let baseAvailableSlots = [];
let baseEvents = [];
let selectedSlots = [];
let latestRawCalendarItems = [];

/**
 * Dynamic Rolling Availability Engine
 * Computes availability strictly following:
 * - Days that already passed this week: take availability of next week
 * - Days that have not yet arrived this week: take availability of this week
 * - Hours that already passed today: take availability of the same day next week
 * - Hours that have not passed today: take availability of today
 * - Sunday: strictly locked as unavailable under all circumstances
 */
function recalculateRollingAvailability(calendarItems) {
  if (Array.isArray(calendarItems) && calendarItems.length > 0) {
    latestRawCalendarItems = calendarItems;
  }
  const items = latestRawCalendarItems || [];

  const now = new Date();
  const ptParts = getPTDateParts(now);
  const currentDayIdx = ptParts.dayIdx;
  const currentHourFloat = ptParts.floatHour;
  const currentMonday = getMondayOfCurrentWeek(ptParts);

  // Parse all timed non-transparent events into PT
  const parsedEvents = [];
  const ptFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false
  });

  items.forEach(item => {
    if (!item || item.status === 'cancelled') return;
    // Rule 3: Ignore all-day events
    if (!item.start || !item.start.dateTime || !item.end || !item.end.dateTime) return;
    // Ignore transparent / free events
    if (item.transparency === 'transparent' || item.availability === 'AVAILABILITY_FREE') return;

    const sDate = new Date(item.start.dateTime);
    const eDate = new Date(item.end.dateTime);
    if (isNaN(sDate.getTime()) || isNaN(eDate.getTime())) return;

    const sParts = {};
    ptFormatter.formatToParts(sDate).forEach(p => { sParts[p.type] = p.value; });
    const eParts = {};
    ptFormatter.formatToParts(eDate).forEach(p => { eParts[p.type] = p.value; });

    let sH = parseInt(sParts.hour, 10) || 0;
    if (sH === 24) sH = 0;
    const sM = parseInt(sParts.minute, 10) || 0;

    let eH = parseInt(eParts.hour, 10) || 0;
    if (eH === 24) eH = 0;
    const eM = parseInt(eParts.minute, 10) || 0;

    const startFloat = sH + sM / 60;
    let endFloat = eH + eM / 60;
    if (sParts.year === eParts.year && sParts.month === eParts.month && sParts.day === eParts.day) {
      if (endFloat <= startFloat) endFloat = 24.0;
    } else {
      endFloat = 24.0;
    }

    parsedEvents.push({
      dateStr: `${sParts.year}-${sParts.month}-${sParts.day}`,
      startFloat: startFloat,
      endFloat: endFloat
    });
  });

  const updatedSlots = [];
  const generatedBlocks = [];
  let blockId = 1;

  for (let d = 0; d < 7; d++) {
    // Rule 2: Sunday always unavailable under all circumstances
    if (d === 6) {
      updatedSlots.push({ dayIdx: 6, hours: [] });
      continue;
    }

    const freePastHours = [];   // Belongs to next week
    const freeFutureHours = []; // Belongs to this week

    DEFAULT_WORKING_HOURS_PT.forEach(h => {
      const slotS = h;
      const slotE = h + 0.5;

      let isNextWeek = false;
      let daysOffset = 0;

      if (d < currentDayIdx) {
        // Day already passed this week -> Next week
        isNextWeek = true;
        daysOffset = 7 + d;
      } else if (d > currentDayIdx) {
        // Day has not yet arrived this week -> This week
        isNextWeek = false;
        daysOffset = d;
      } else {
        // Today!
        if (h < currentHourFloat) {
          // Hour already passed today -> Next week
          isNextWeek = true;
          daysOffset = 7 + d;
        } else {
          // Hour has not yet passed today -> Today
          isNextWeek = false;
          daysOffset = d;
        }
      }

      const targetDateStr = getTargetDateStr(currentMonday, daysOffset);

      // Check conflict with parsed events on targetDateStr
      const isBusy = parsedEvents.some(ev => {
        return ev.dateStr === targetDateStr && Math.max(slotS, ev.startFloat) < Math.min(slotE, ev.endFloat);
      });

      if (!isBusy) {
        if (isNextWeek) {
          freePastHours.push({ hour: h, targetDateStr: targetDateStr });
        } else {
          freeFutureHours.push({ hour: h, targetDateStr: targetDateStr });
        }
      }
    });

    // Combine hours for baseAvailableSlots record
    const allFreeHours = [...freePastHours.map(x => x.hour), ...freeFutureHours.map(x => x.hour)].sort((a, b) => a - b);
    updatedSlots.push({ dayIdx: d, hours: allFreeHours });

    // Group into 1-hour and 30-min blocks according to contiguous windows
    if (d !== currentDayIdx) {
      const isDayNextWeek = (d < currentDayIdx);
      const targetHours = isDayNextWeek ? freePastHours.map(x => x.hour) : freeFutureHours.map(x => x.hour);
      const targetDateStr = isDayNextWeek ? getTargetDateStr(currentMonday, 7 + d) : getTargetDateStr(currentMonday, d);

      const blocks = groupSlotsIntoContiguousBlocks(targetHours);
      blocks.forEach(b => {
        generatedBlocks.push({
          id: 'block-' + (blockId++),
          dayIdx: d,
          startHour: b.startHour,
          durationHours: b.durationHours,
          isNextWeek: isDayNextWeek,
          targetDateStr: targetDateStr,
          title: 'Available'
        });
      });
    } else {
      // Today: optimize past-today (next week) and future-today (today) independently
      // so no 1-hour block ever crosses between next week and today
      const targetPastDateStr = getTargetDateStr(currentMonday, 7 + d);
      const targetFutureDateStr = getTargetDateStr(currentMonday, d);

      const pastBlocks = groupSlotsIntoContiguousBlocks(freePastHours.map(x => x.hour));
      const futureBlocks = groupSlotsIntoContiguousBlocks(freeFutureHours.map(x => x.hour));

      pastBlocks.forEach(b => {
        generatedBlocks.push({
          id: 'block-' + (blockId++),
          dayIdx: d,
          startHour: b.startHour,
          durationHours: b.durationHours,
          isNextWeek: true,
          targetDateStr: targetPastDateStr,
          title: 'Available'
        });
      });

      futureBlocks.forEach(b => {
        generatedBlocks.push({
          id: 'block-' + (blockId++),
          dayIdx: d,
          startHour: b.startHour,
          durationHours: b.durationHours,
          isNextWeek: false,
          targetDateStr: targetFutureDateStr,
          title: 'Available'
        });
      });
    }
  }

  generatedBlocks.sort((a, b) => {
    if (a.dayIdx !== b.dayIdx) return a.dayIdx - b.dayIdx;
    return a.startHour - b.startHour;
  });

  baseAvailableSlots = updatedSlots;
  baseEvents = generatedBlocks;
  renderCalendar();
}

// Initial pre-synchronized events covering current & next week
const INITIAL_CALENDAR_EVENTS = [
  // Monday Oct 26
  { start: { dateTime: '2026-10-26T15:30:00-05:00' }, end: { dateTime: '2026-10-26T16:15:00-05:00' }, status: 'confirmed' },
  { start: { dateTime: '2026-10-26T16:15:00-05:00' }, end: { dateTime: '2026-10-26T17:00:00-05:00' }, status: 'confirmed' },
  { start: { dateTime: '2026-10-26T17:00:00-05:00' }, end: { dateTime: '2026-10-26T18:00:00-05:00' }, status: 'confirmed' },
  { start: { dateTime: '2026-10-26T18:00:00-05:00' }, end: { dateTime: '2026-10-26T19:00:00-05:00' }, status: 'confirmed' },
  { start: { dateTime: '2026-10-26T19:00:00-05:00' }, end: { dateTime: '2026-10-26T20:00:00-05:00' }, status: 'confirmed' },
  { start: { dateTime: '2026-10-26T20:00:00-05:00' }, end: { dateTime: '2026-10-26T21:00:00-05:00' }, status: 'confirmed' },
  { start: { dateTime: '2026-10-26T21:00:00-05:00' }, end: { dateTime: '2026-10-26T22:00:00-05:00' }, status: 'confirmed' },
  // Tuesday Oct 27
  { start: { dateTime: '2026-10-27T16:00:00-05:00' }, end: { dateTime: '2026-10-27T17:00:00-05:00' }, status: 'confirmed' },
  { start: { dateTime: '2026-10-27T17:00:00-05:00' }, end: { dateTime: '2026-10-27T18:00:00-05:00' }, status: 'confirmed' },
  { start: { dateTime: '2026-10-27T18:00:00-05:00' }, end: { dateTime: '2026-10-27T18:30:00-05:00' }, status: 'confirmed' },
  { start: { dateTime: '2026-10-27T18:30:00-05:00' }, end: { dateTime: '2026-10-27T19:30:00-05:00' }, status: 'confirmed' },
  { start: { dateTime: '2026-10-27T19:30:00-05:00' }, end: { dateTime: '2026-10-27T20:30:00-05:00' }, status: 'confirmed' },
  { start: { dateTime: '2026-10-27T20:30:00-05:00' }, end: { dateTime: '2026-10-27T21:30:00-05:00' }, status: 'confirmed' },
  { start: { dateTime: '2026-10-27T21:30:00-05:00' }, end: { dateTime: '2026-10-27T22:30:00-05:00' }, status: 'confirmed' },
  // Wednesday Oct 28
  { start: { dateTime: '2026-10-28T15:00:00-05:00' }, end: { dateTime: '2026-10-28T16:00:00-05:00' }, status: 'confirmed' },
  { start: { dateTime: '2026-10-28T16:00:00-05:00' }, end: { dateTime: '2026-10-28T17:00:00-05:00' }, status: 'confirmed' },
  { start: { dateTime: '2026-10-28T17:00:00-05:00' }, end: { dateTime: '2026-10-28T18:00:00-05:00' }, status: 'confirmed' },
  { start: { dateTime: '2026-10-28T18:00:00-05:00' }, end: { dateTime: '2026-10-28T19:00:00-05:00' }, status: 'confirmed' },
  { start: { dateTime: '2026-10-28T19:00:00-05:00' }, end: { dateTime: '2026-10-28T19:30:00-05:00' }, status: 'confirmed' },
  { start: { dateTime: '2026-10-28T20:30:00-05:00' }, end: { dateTime: '2026-10-28T21:30:00-05:00' }, status: 'confirmed' },
  { start: { dateTime: '2026-10-28T21:30:00-05:00' }, end: { dateTime: '2026-10-28T22:30:00-05:00' }, status: 'confirmed' },
  // Thursday Oct 29
  { start: { dateTime: '2026-10-29T15:30:00-05:00' }, end: { dateTime: '2026-10-29T16:15:00-05:00' }, status: 'confirmed' },
  { start: { dateTime: '2026-10-29T16:15:00-05:00' }, end: { dateTime: '2026-10-29T17:00:00-05:00' }, status: 'confirmed' },
  { start: { dateTime: '2026-10-29T17:00:00-05:00' }, end: { dateTime: '2026-10-29T18:00:00-05:00' }, status: 'confirmed' },
  { start: { dateTime: '2026-10-29T18:00:00-05:00' }, end: { dateTime: '2026-10-29T18:30:00-05:00' }, status: 'confirmed' },
  { start: { dateTime: '2026-10-29T18:30:00-05:00' }, end: { dateTime: '2026-10-29T19:30:00-05:00' }, status: 'confirmed' },
  // Friday Oct 30
  { start: { dateTime: '2026-10-30T16:00:00-05:00' }, end: { dateTime: '2026-10-30T17:00:00-05:00' }, status: 'confirmed' },
  { start: { dateTime: '2026-10-30T17:00:00-05:00' }, end: { dateTime: '2026-10-30T18:00:00-05:00' }, status: 'confirmed' },
  { start: { dateTime: '2026-10-30T18:00:00-05:00' }, end: { dateTime: '2026-10-30T19:00:00-05:00' }, status: 'confirmed' },
  { start: { dateTime: '2026-10-30T19:00:00-05:00' }, end: { dateTime: '2026-10-30T20:00:00-05:00' }, status: 'confirmed' },
  // Saturday Oct 31
  { start: { dateTime: '2026-10-31T09:00:00-05:00' }, end: { dateTime: '2026-10-31T09:30:00-05:00' }, status: 'confirmed' },
  { start: { dateTime: '2026-10-31T09:30:00-05:00' }, end: { dateTime: '2026-10-31T10:00:00-05:00' }, status: 'confirmed' },
  { start: { dateTime: '2026-10-31T10:00:00-05:00' }, end: { dateTime: '2026-10-31T10:30:00-05:00' }, status: 'confirmed' },
  { start: { dateTime: '2026-10-31T10:30:00-05:00' }, end: { dateTime: '2026-10-31T11:30:00-05:00' }, status: 'confirmed' },
  { start: { dateTime: '2026-10-31T11:30:00-05:00' }, end: { dateTime: '2026-10-31T12:30:00-05:00' }, status: 'confirmed' },
  { start: { dateTime: '2026-10-31T12:30:00-05:00' }, end: { dateTime: '2026-10-31T13:15:00-05:00' }, status: 'confirmed' },
  { start: { dateTime: '2026-10-31T13:30:00-05:00' }, end: { dateTime: '2026-10-31T14:30:00-05:00' }, status: 'confirmed' },
  // Monday Nov 2 (Week 2)
  { start: { dateTime: '2026-11-02T15:30:00-05:00' }, end: { dateTime: '2026-11-02T16:15:00-05:00' }, status: 'confirmed' },
  { start: { dateTime: '2026-11-02T16:15:00-05:00' }, end: { dateTime: '2026-11-02T17:00:00-05:00' }, status: 'confirmed' },
  { start: { dateTime: '2026-11-02T17:00:00-05:00' }, end: { dateTime: '2026-11-02T18:00:00-05:00' }, status: 'confirmed' },
  { start: { dateTime: '2026-11-02T18:00:00-05:00' }, end: { dateTime: '2026-11-02T19:00:00-05:00' }, status: 'confirmed' },
  { start: { dateTime: '2026-11-02T19:00:00-05:00' }, end: { dateTime: '2026-11-02T20:00:00-05:00' }, status: 'confirmed' },
  { start: { dateTime: '2026-11-02T20:00:00-05:00' }, end: { dateTime: '2026-11-02T21:00:00-05:00' }, status: 'confirmed' },
  { start: { dateTime: '2026-11-02T21:00:00-05:00' }, end: { dateTime: '2026-11-02T22:00:00-05:00' }, status: 'confirmed' },
  // Tuesday Nov 3 (Week 2)
  { start: { dateTime: '2026-11-03T16:00:00-05:00' }, end: { dateTime: '2026-11-03T17:00:00-05:00' }, status: 'confirmed' },
  { start: { dateTime: '2026-11-03T17:00:00-05:00' }, end: { dateTime: '2026-11-03T18:00:00-05:00' }, status: 'confirmed' },
  { start: { dateTime: '2026-11-03T18:00:00-05:00' }, end: { dateTime: '2026-11-03T18:30:00-05:00' }, status: 'confirmed' },
  { start: { dateTime: '2026-11-03T18:30:00-05:00' }, end: { dateTime: '2026-11-03T19:30:00-05:00' }, status: 'confirmed' },
  { start: { dateTime: '2026-11-03T19:30:00-05:00' }, end: { dateTime: '2026-11-03T20:30:00-05:00' }, status: 'confirmed' },
  { start: { dateTime: '2026-11-03T21:30:00-05:00' }, end: { dateTime: '2026-11-03T22:30:00-05:00' }, status: 'confirmed' }
];

// Initialize rolling availability synchronously
recalculateRollingAvailability(INITIAL_CALENDAR_EVENTS);

function applyCalendarEventsToAvailability(calendarItems) {
  recalculateRollingAvailability(calendarItems);
}

async function syncWithGoogleCalendarInBackground() {
  try {
    let url = '';
    if (GOOGLE_CALENDAR_CONFIG.syncEndpoint) {
      url = GOOGLE_CALENDAR_CONFIG.syncEndpoint;
    } else if (GOOGLE_CALENDAR_CONFIG.apiKey && GOOGLE_CALENDAR_CONFIG.calendarId) {
      const now = new Date();
      const ptParts = getPTDateParts(now);
      const currentMonday = getMondayOfCurrentWeek(ptParts);
      const twoWeeksLater = new Date(currentMonday.getTime());
      twoWeeksLater.setUTCDate(twoWeeksLater.getUTCDate() + 14);

      url = 'https://www.googleapis.com/calendar/v3/calendars/' +
        encodeURIComponent(GOOGLE_CALENDAR_CONFIG.calendarId) +
        '/events?singleEvents=true&orderBy=startTime' +
        '&timeMin=' + encodeURIComponent(currentMonday.toISOString()) +
        '&timeMax=' + encodeURIComponent(twoWeeksLater.toISOString()) +
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
    // Fallback silently to pre-synchronized availability
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
        chip.title = timeRangeText + (evt.isNextWeek ? ' (Next week)' : '');
        chip.style.top = topPx + 'px';
        chip.style.height = heightPx + 'px';

        chip.onclick = (e) => {
          e.stopPropagation();
          const dayName = weekDays[targetDayIdx].name;
          const dayLabel = evt.isNextWeek ? (dayName + ' (Next week)') : dayName;
          toggleSlotSelection(slotKey, dayLabel, timeRangeText);
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

// Update current time indicator and re-evaluate rolling slots every 60 seconds
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    updateLiveTimeIndicator();
    recalculateRollingAvailability();
  }, 60000);
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
  recalculateRollingAvailability();

  if (shouldRedirect && timezonePages[currentTz]) {
    const targetPage = timezonePages[currentTz];
    const currentPath = window.location.pathname;
    if (!currentPath.endsWith('/' + targetPage) && !currentPath.endsWith(targetPage)) {
      window.location.href = targetPage;
    }
  }
}

function detectInitialTimezone() {
  const docTz = typeof document !== 'undefined' && (document.documentElement.getAttribute('data-tz') || (document.body && document.body.getAttribute('data-tz')));
  if (docTz && timezoneOffsets[docTz] !== undefined) {
    return docTz;
  }

  try {
    const params = new URLSearchParams(window.location.search);
    const tzParam = params.get('tz');
    if (tzParam) {
      const lower = tzParam.toLowerCase();
      if (timezoneOffsets[tzParam] !== undefined) return tzParam;
      if (timezoneAliases[lower]) return timezoneAliases[lower];
    }
  } catch (e) {}

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

  recalculateRollingAvailability();
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
    recalculateRollingAvailability();
    const scrollArea = document.getElementById('scroll-area');
    if (scrollArea && scrollArea.scrollTop === 0) {
      const info = getCurrentTimeInfo(currentTz);
      const targetScroll = Math.max(0, Math.min(info.topPx - 180, 24 * 60 - scrollArea.clientHeight));
      scrollArea.scrollTop = targetScroll;
    }
  });
}
