#!/usr/bin/env bun
/**
 Quick smoke test for expandRrule — verify rrule API works.
 Usage: bun run scripts/test-expandRrule.ts
*/
import { expandRrule, occurrencesFor } from '../src/lib/tasks/expandRrule.ts';

// 1. Weekly Monday for 3 weeks
const weekly = expandRrule('FREQ=WEEKLY;BYDAY=MO', {
  start: new Date('2026-01-01T00:00:00Z'),
  end: new Date('2026-01-22T00:00:00Z'),
});
console.log('weekly MO Jan 2026:', weekly.map((d) => d.toISOString().slice(0, 10)));
// Expect: 2026-01-05, 2026-01-12, 2026-01-19

// 2. Daily weekdays
const weekdays = expandRrule('FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR', {
  start: new Date('2026-01-05T00:00:00Z'),
  end: new Date('2026-01-10T00:00:00Z'),
});
console.log('weekdays Jan 5-9:', weekdays.map((d) => d.toISOString().slice(0, 10)));
// Expect: 01-05, 01-06, 01-07, 01-08, 01-09

// 3. Null rule
const none = expandRrule(null);
console.log('null rule:', none);
// Expect: []

// 4. occurrencesFor with task shape
const occ = occurrencesFor(
  {
    scheduled_date: '2026-01-05',
    recurrence_rule: 'FREQ=WEEKLY;BYDAY=MO',
    recurrence_start: '2026-01-05',
  },
  new Date('2026-01-01T00:00:00Z'),
  new Date('2026-01-29T00:00:00Z'),
);
console.log('occurrencesFor weekly MO:', occ.map((d) => d.toISOString().slice(0, 10)));
// Expect: 2026-01-05, 2026-01-12, 2026-01-19, 2026-01-26

console.log('OK');
