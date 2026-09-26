import test from 'node:test';
import assert from 'node:assert/strict';
import { businessDeadline, businessMinutes, parseBusinessCalendar } from '../dist/domain/business-calendar.js';
const calendar = parseBusinessCalendar();
test('SLA excludes lunch, nights, weekends and configured holidays', () => {
  assert.equal(businessDeadline('2026-09-25T04:00:00Z', 120, calendar), '2026-09-25T07:00:00.000Z');
  assert.equal(businessDeadline('2026-09-25T09:00:00Z', 120, calendar), '2026-09-28T02:00:00.000Z');
  assert.equal(businessDeadline('2026-09-25T09:00:00Z', 120, parseBusinessCalendar('2026-09-28')), '2026-09-29T02:00:00.000Z');
  assert.equal(businessMinutes('2026-09-25T04:00:00Z', '2026-09-25T07:00:00Z', calendar), 120);
  assert.equal(businessMinutes('2026-09-25T05:00:00Z', '2026-09-25T06:00:00Z', calendar), 0);
  assert.equal(businessMinutes('2026-09-25T09:00:00Z', '2026-09-28T02:00:01Z', calendar) > 120, true);
});
test('invalid configuration fails early', () => {
  for (const raw of ['2026-02-30', '2026-2-01', 'invalid', '2026-01-01,']) assert.throws(() => parseBusinessCalendar(raw));
  assert.throws(() => businessMinutes('2026-01-02', '2026-01-01', calendar));
});
