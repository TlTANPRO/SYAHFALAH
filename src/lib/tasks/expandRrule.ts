/**
 * src/lib/tasks/expandRrule.ts
 *
 * RRULE expansion helper (read-time occurrence generation per RFC 5545).
 * Wraps the `rrule` npm library which is already a project dependency.
 *
 * Usage:
 *   const dates = expandRrule('FREQ=WEEKLY;BYDAY=MO', new Date('2026-01-01'), new Date('2026-01-31'));
 *   // → [Date(2026-01-05), Date(2026-01-12), Date(2026-01-19), Date(2026-01-26)]
 *
 *   const dates2 = expandRrule(null, ...);  // → []
 */

import { RRule, rrulestr } from 'rrule';

export interface ExpandOptions {
  /** Inclusive start of range. Defaults to today (UTC midnight). */
  start?: Date;
  /** Exclusive end of range. Defaults to start + 14 days. */
  end?: Date;
  /** Hard cap on returned occurrences (safety). Default 1000. */
  max?: number;
}

const DEFAULT_MAX = 1000;
const DEFAULT_WINDOW_DAYS = 14;

function utcMidnight(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/**
 * Expand an RRULE string into Date[] within [start, end).
 * Returns [] for null/empty/invalid rule.
 */
export function expandRrule(rule: string | null | undefined, opts: ExpandOptions = {}): Date[] {
  if (!rule || rule.trim() === '') return [];
  const start = opts.start ?? utcMidnight(new Date());
  const end = opts.end ?? new Date(start.getTime() + DEFAULT_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const max = opts.max ?? DEFAULT_MAX;
  try {
    const r = rrulestr(`DTSTART:${formatDtstart(start)}\nRRULE:${rule}`) as RRule;
    return r.between(start, end, true, (_, i) => i < max);
  } catch (e) {
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.warn(`[expandRrule] invalid rule "${rule}":`, (e as Error).message);
    }
    return [];
  }
}

function formatDtstart(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  );
}

/**
 * Convenience: expand a task (with optional recurrence_rule/start/end) and yield
 * concrete occurrence dates in [from, to). Returns [scheduledDate] for ad_hoc tasks.
 */
export interface TaskLike {
  scheduled_date: string; // YYYY-MM-DD
  recurrence_rule?: string | null;
  recurrence_start?: string | null;
  recurrence_end?: string | null;
}

export function occurrencesFor(task: TaskLike, from: Date, to: Date): Date[] {
  if (!task.recurrence_rule) {
    return [new Date(task.scheduled_date + 'T00:00:00Z')];
  }
  const start = task.recurrence_start ? new Date(task.recurrence_start + 'T00:00:00Z') : from;
  const end = task.recurrence_end ? new Date(task.recurrence_end + 'T00:00:00Z') : to;
  return expandRrule(task.recurrence_rule, { start: start > from ? start : from, end });
}
