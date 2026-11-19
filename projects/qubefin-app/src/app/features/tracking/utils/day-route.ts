import { GeoPoint } from '../models/geo';
import { JobTaskPoint } from '../models/job';
import { EmployeeRoute, RouteStop, RouteTaskPoint } from '../models/live-position';
import { centroid, distanceMeters, toDateKey } from './geo-utils';
import { LiveGpsFix, MotionSegment } from './live-message';

/** Match radius used for a task point (`jobs/task-points` does not send one; OD follow-ups use 100 m). */
export const TASK_POINT_RADIUS_METERS = 100;
/** A stop this close to the branch office is at the branch. */
const BRANCH_STOP_METERS = 200;
/** The day is live while the last fix is at most this old (or a motion period is still open and not offline). */
const LIVE_FIX_MS = 15 * 60_000;

export interface DayRouteInput {
  employeeId: string;
  /** yyyy-MM-dd, local day. */
  date: string;
  /** The day's fixes, oldest first (`POST /api/v1/gps/history`). */
  fixes: LiveGpsFix[];
  /** Motion periods overlapping the day, oldest first (`POST /api/v1/motion/history`). */
  motions: MotionSegment[];
  /** The employee's tasks (`jobs/task-points?assigneeId=&pendingOnly=false`). */
  tasks: JobTaskPoint[];
  branch: { name: string; location: GeoPoint | null } | null;
  home: GeoPoint | null;
  settings: { stopMinMinutes: number; stopRadiusMeters: number; homeRadiusMeters: number };
  now?: Date;
}

/**
 * One employee's day for Tracking History and the "Show route" of Live Tracking, built on the web from the GPS service:
 * the trail from the GPS fixes, the stops from the `STOPPED` motion periods (at least `stopMinMinutes`, cut to the day),
 * moving time from the `MOVING` periods. A stop is Designated at a task point of the employee's jobs (match radius +
 * `stopRadiusMeters`) or at the branch, Undesignated anywhere else (marked Home near the registered home). Replaces
 * `employees/{id}/route`, which is not built.
 */
export function buildDayRoute(i: DayRouteInput): EmployeeRoute {
  const now = i.now ?? new Date();
  const dayStart = new Date(`${i.date}T00:00:00`).getTime();
  const dayEnd = dayStart + 24 * 3600_000;
  const cut = Math.min(dayEnd, now.getTime());
  const isToday = i.date === toDateKey(now);

  const fixes = i.fixes.filter((f) => Date.parse(f.at) <= cut);
  const points = fixes.map((f) => ({ lat: f.location.lat, lng: f.location.lng, at: f.at, speedKmph: f.speedKmph }));
  const first = points[0]?.at ?? null;
  const last = points.at(-1)?.at ?? null;
  // Live: a recent fix, or a motion period still open (the phone may send nothing while it stands still).
  const openNow = i.motions.find((m) => !m.to && m.status !== 'Offline');
  const live = isToday && !!last && (now.getTime() - Date.parse(last) <= LIVE_FIX_MS || !!openNow);

  // Motion periods cut to the hours the phone sent fixes (first fix to last fix, or to now while live): some periods run
  // for days with no fix at all (e.g. MOVING from 10 to 18 Nov, seen 19 Nov 2026), which says nothing about the day.
  const from = first ? Math.max(Date.parse(first), dayStart) : 0;
  const until = last ? (live ? cut : Math.min(Date.parse(last), cut)) : 0;
  const periods = i.motions
    .map((m) => ({ ...m, start: Math.max(Date.parse(m.from), from), end: Math.min(m.to ? Date.parse(m.to) : now.getTime(), until) }))
    .filter((m) => m.end > m.start);
  const minutes = (m: { start: number; end: number }) => Math.round((m.end - m.start) / 60_000);

  const taskPoints: RouteTaskPoint[] = i.tasks
    .filter((t) => activeOn(t, i.date))
    .map((t) => ({
      taskId: t.taskId,
      taskNo: t.taskNo,
      jobId: t.jobId,
      jobNo: t.jobCode,
      title: t.taskTitle,
      type: t.taskType,
      location: t.targetLocation,
      matchRadiusMeters: TASK_POINT_RADIUS_METERS,
      status: t.status,
      // `jobs/task-points` has no completion time, so "completed this day" is not known.
      completedAt: null,
      visited: false,
    }));

  const tolerance = i.settings.stopRadiusMeters;
  const stops: RouteStop[] = [];
  for (const m of periods) {
    if (m.status !== 'Idle' || minutes(m) < i.settings.stopMinMinutes) continue;
    const during = fixes.filter((f) => {
      const t = Date.parse(f.at);
      return t >= m.start && t <= m.end;
    });
    // Where they stood: the fixes during the stop; else the period's own point (STOPPED records are sent the right way round).
    const location = during.length ? centroid(during.map((f) => f.location), during[0].location) : m.location;
    if (!location) continue;
    stops.push(classify(stops.length + 1, location, m.start, m.end, taskPoints, i, tolerance));
  }

  let totalM = 0;
  for (let k = 1; k < points.length; k++) totalM += distanceMeters(points[k - 1], points[k]);
  const totalKm = +(totalM / 1000).toFixed(1);
  const stopMinutes = stops.reduce((s, x) => s + x.durationMinutes, 0);
  // Union of the MOVING periods (the service sends overlapping ones).
  const movingFromMotion = Math.round(unionMs(periods.filter((m) => m.status === 'Moving')) / 60_000);
  const spanMinutes = first && last ? Math.round((Date.parse(last) - Date.parse(first)) / 60_000) : 0;
  const designated = stops.filter((s) => s.kind === 'Designated');
  const undesignated = stops.filter((s) => s.kind === 'Undesignated');

  return {
    employeeId: i.employeeId,
    date: i.date,
    isLive: live,
    points,
    stops,
    taskPoints,
    totalDistanceKm: totalKm,
    // Punch in / out is not in the GPS service; the page shows the first and last fix instead.
    punchInAt: null,
    punchOutAt: null,
    summary: {
      totalDistanceKm: totalKm,
      movingMinutes: periods.length ? movingFromMotion : Math.max(0, spanMinutes - stopMinutes),
      designatedStops: designated.length,
      designatedMinutes: designated.reduce((s, x) => s + x.durationMinutes, 0),
      undesignatedStops: undesignated.length,
      undesignatedMinutes: undesignated.reduce((s, x) => s + x.durationMinutes, 0),
      tasksCompleted: 0,
      taskPointsVisited: taskPoints.filter((p) => p.visited).length,
      taskPointsPlanned: taskPoints.length,
      firstFixAt: first,
      lastFixAt: last,
    },
  };
}

/** Total time covered by the periods, overlaps counted once. */
export function unionMs(periods: { start: number; end: number }[]): number {
  const sorted = [...periods].sort((a, b) => a.start - b.start);
  let total = 0;
  let curStart = -Infinity;
  let curEnd = -Infinity;
  for (const p of sorted) {
    if (p.start > curEnd) {
      if (curEnd > curStart) total += curEnd - curStart;
      curStart = p.start;
      curEnd = p.end;
    } else curEnd = Math.max(curEnd, p.end);
  }
  if (curEnd > curStart) total += curEnd - curStart;
  return total;
}

/** The task was on the employee's list that day: its job had started, and was not past its end date (unless delayed). */
function activeOn(t: JobTaskPoint, day: string): boolean {
  if (t.jobStatus === 'Cancelled' || ['Cancelled', 'Rejected', 'Transferred'].includes(t.status)) return false;
  if (t.jobStartDate && t.jobStartDate > day) return false;
  return day <= t.jobEndDate || t.jobStatus === 'Delayed';
}

function classify(
  seq: number,
  location: GeoPoint,
  start: number,
  end: number,
  taskPoints: RouteTaskPoint[],
  i: DayRouteInput,
  tolerance: number,
): RouteStop {
  let best: RouteTaskPoint | null = null;
  let bestD = Infinity;
  for (const tp of taskPoints) {
    const d = distanceMeters(location, tp.location);
    if (d < bestD) {
      bestD = d;
      best = tp;
    }
  }
  const base = {
    seq,
    location,
    from: new Date(start).toISOString(),
    to: new Date(end).toISOString(),
    durationMinutes: Math.round((end - start) / 60_000),
    taskId: null,
    taskNo: null,
    jobId: null,
    jobNo: null,
    taskCompleted: false,
  };
  if (best && bestD <= best.matchRadiusMeters + tolerance) {
    best.visited = true;
    return { ...base, kind: 'Designated', place: 'Task', label: best.title, taskId: best.taskId, taskNo: best.taskNo, jobId: best.jobId, jobNo: best.jobNo, distanceMeters: Math.round(bestD) };
  }
  const branchAt = i.branch?.location;
  if (branchAt) {
    const d = distanceMeters(location, branchAt);
    if (d <= BRANCH_STOP_METERS) return { ...base, kind: 'Designated', place: 'Branch', label: `${i.branch!.name} Branch`, distanceMeters: Math.round(d) };
  }
  const nearest = best ? Math.round(bestD) : null;
  if (i.home && distanceMeters(location, i.home) <= i.settings.homeRadiusMeters + tolerance) {
    return { ...base, kind: 'Undesignated', place: 'Home', label: 'Near registered home', distanceMeters: nearest };
  }
  return { ...base, kind: 'Undesignated', place: null, label: null, distanceMeters: nearest };
}
