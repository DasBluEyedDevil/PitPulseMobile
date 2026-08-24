/**
 * Event-first check-in window: venue-TZ instants that wrap midnight.
 * Fail closed on invalid TZ, unparsable clocks, or missing event_date.
 */

import { DateTime, IANAZone } from 'luxon';
import logger from '../../utils/logger';

export const CHECKIN_OUTSIDE_WINDOW_MESSAGE = 'Check-in is not within the event time window';

export type CheckinWindowEvent = {
  id?: unknown;
  event_date?: unknown;
  timezone?: unknown;
  doors_time?: unknown;
  start_time?: unknown;
  end_time?: unknown;
};

type ParsedClock = { hours: number; minutes: number; seconds: number };

const ISO_DATE = /^(\d{4}-\d{2}-\d{2})/;
const CLOCK = /^(\d{1,2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?$/;

function asIsoDate(value: unknown): string | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  if (typeof value === 'string') {
    const match = value.trim().match(ISO_DATE);
    return match ? match[1] : null;
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    // node-pg DATE is UTC midnight; never use local toISOString() for calendar math.
    return DateTime.fromJSDate(value, { zone: 'UTC' }).toISODate();
  }
  return null;
}

function parseClock(value: unknown): ParsedClock | 'missing' | 'invalid' {
  if (value === null || value === undefined) {
    return 'missing';
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '') {
      return 'missing';
    }
    const match = trimmed.match(CLOCK);
    if (!match) {
      return 'invalid';
    }
    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    const seconds = Number(match[3] || '0');
    if (hours > 23 || minutes > 59 || seconds > 59) {
      return 'invalid';
    }
    return { hours, minutes, seconds };
  }
  return 'invalid';
}

function clockToIso(clock: ParsedClock): string {
  return `${String(clock.hours).padStart(2, '0')}:${String(clock.minutes).padStart(2, '0')}:${String(
    clock.seconds
  ).padStart(2, '0')}`;
}

function clockSeconds(clock: ParsedClock): number {
  return clock.hours * 3600 + clock.minutes * 60 + clock.seconds;
}

function addHoursToClock(clock: ParsedClock, hours: number): ParsedClock {
  return {
    hours: (((clock.hours + hours) % 24) + 24) % 24,
    minutes: clock.minutes,
    seconds: clock.seconds,
  };
}

function resolveTimezone(value: unknown): 'missing' | 'invalid' | string {
  if (value === null || value === undefined) {
    return 'missing';
  }
  if (typeof value !== 'string') {
    return 'invalid';
  }
  const trimmed = value.trim();
  if (trimmed === '') {
    return 'missing';
  }
  return IANAZone.isValidZone(trimmed) ? trimmed : 'invalid';
}

function failClosed(reason: string, event: CheckinWindowEvent): false {
  logger.warn('Check-in time window failed closed', {
    reason,
    eventId: event.id ?? null,
    timezone: typeof event.timezone === 'string' ? event.timezone : null,
  });
  return false;
}

export function isCheckinWithinTimeWindow(
  event: CheckinWindowEvent,
  now: Date = new Date()
): boolean {
  const date = asIsoDate(event.event_date);
  if (!date) {
    return failClosed('missing_event_date', event);
  }

  const zone = resolveTimezone(event.timezone);
  if (zone === 'invalid') {
    return failClosed('invalid_timezone', event);
  }

  const doors = parseClock(event.doors_time);
  const startTime = parseClock(event.start_time);
  const endTime = parseClock(event.end_time);
  if (doors === 'invalid' || startTime === 'invalid' || endTime === 'invalid') {
    return failClosed('unparsable_clock', event);
  }

  const noClocks = doors === 'missing' && startTime === 'missing' && endTime === 'missing';
  const resolvedZone = zone === 'missing' ? 'UTC' : zone;

  const nowLocal = DateTime.fromJSDate(now, { zone: 'utc' }).setZone(resolvedZone);
  if (!nowLocal.isValid) {
    return failClosed('invalid_now', event);
  }

  // All-day when every clock is null (even if TZ is set) OR timezone is NULL.
  if (noClocks || zone === 'missing') {
    const startLocal = DateTime.fromISO(`${date}T00:00:00`, { zone: resolvedZone });
    if (!startLocal.isValid) {
      return failClosed('unparsable_date', event);
    }
    const endLocal = startLocal.plus({ days: 1 });
    return nowLocal >= startLocal && nowLocal < endLocal;
  }

  let startClock: ParsedClock;
  let startCrossesMidnight = false;
  if (doors !== 'missing') {
    startClock = doors;
    startCrossesMidnight =
      startTime !== 'missing' && clockSeconds(startClock) > clockSeconds(startTime);
  } else if (startTime !== 'missing') {
    startClock = addHoursToClock(startTime, -2);
    startCrossesMidnight = clockSeconds(startClock) > clockSeconds(startTime);
  } else {
    startClock = { hours: 16, minutes: 0, seconds: 0 };
  }

  let endClock: ParsedClock;
  if (endTime !== 'missing') {
    endClock = addHoursToClock(endTime, 1);
  } else if (startTime !== 'missing') {
    endClock = addHoursToClock(startTime, 6);
  } else {
    endClock = { hours: 23, minutes: 59, seconds: 0 };
  }

  let startLocal = DateTime.fromISO(`${date}T${clockToIso(startClock)}`, { zone: resolvedZone });
  let endLocal = DateTime.fromISO(`${date}T${clockToIso(endClock)}`, { zone: resolvedZone });
  if (!startLocal.isValid || !endLocal.isValid) {
    return failClosed('unparsable_local_instant', event);
  }

  // Explicit doors_time or start_time - 2h can anchor the window to the previous calendar day.
  if (startCrossesMidnight) {
    startLocal = startLocal.minus({ days: 1 });
  }
  if (endLocal <= startLocal) {
    endLocal = endLocal.plus({ days: 1 });
  }

  return nowLocal >= startLocal && nowLocal <= endLocal;
}
