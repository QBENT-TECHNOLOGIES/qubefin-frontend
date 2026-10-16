/*
 * In-memory stand-in for the tracking backend (tracking-api).
 *
 * Only used while `useTrackingMocks` is true in the environment. It implements the request / response
 * shapes in docs/TRACKING_API_CONTRACT.md and keeps changes for the lifetime of the browser tab.
 *
 * How the demo data hangs together:
 *   1. Org units (Dhupguri Division → 2 areas → 7 branches), staff, centres and customers are generated.
 *   2. Jobs are created for every field employee with tasks planned across the current and previous week.
 *   3. A GPS day is simulated for each employee and day. Task completions (arrival, photo fix, time) are
 *      taken from that simulation, so the live map, day history and job progress always agree.
 *
 * Unit names are real; coordinates are approximate and every person / customer name is fictional.
 * Delete this folder once the real tracking-api is available.
 */
import { FieldOfficer, OfficerRole } from '../models/field-officer';
import { GeoPoint, TrackingBranch } from '../models/geo';
import { GeoTag, GeoTagKind } from '../models/geo-tag';
import {
  EmployeeRoute,
  LivePosition,
  LiveStatus,
  RoutePoint,
  RouteStop,
  RouteTaskPoint,
} from '../models/live-position';
import { OverdueCustomer } from '../models/overdue-customer';
import { OutOfRadiusRequest } from '../models/approval-request';
import { AlertSeverity, AlertType, TrackingAlert } from '../models/tracking-alert';
import { TrackingSettings } from '../models/tracking-settings';
import { Job, JobHistoryEntry, JobTask, TaskOrigin, TaskTarget, TaskType } from '../models/job';
import { distanceMeters, offsetPoint, toDateKey } from '../utils/geo-utils';
import { TASK_TYPE } from '../utils/tracking-labels';

// ---------------------------------------------------------------------------------------------
// Deterministic random numbers so the demo data is the same on every reload.
// ---------------------------------------------------------------------------------------------
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(20261016);
const between = (min: number, max: number) => min + rand() * (max - min);
const intBetween = (min: number, max: number) => Math.floor(between(min, max + 1));
const pick = <T>(arr: readonly T[]): T => arr[Math.floor(rand() * arr.length)];
const shuffle = <T>(arr: readonly T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const uuid = (prefix: string, n: number) => `${prefix}-${n.toString().padStart(4, '0')}-0000-4000-8000-000000000000`;

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Local Date for `dateKey` at hh:mm. */
function at(dateKey: string, hour: number, minute = 0): Date {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y, m - 1, d, hour, minute, 0, 0);
}

function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

const iso = (d: Date) => d.toISOString();
const addMinutes = (d: Date, mins: number) => new Date(d.getTime() + mins * 60_000);
const dayOf = (isoString: string) => toDateKey(new Date(isoString));
const shiftKey = (dateKey: string, days: number) => toDateKey(addDays(at(dateKey, 12), days));

/** Placeholder "photo" so evidence thumbnails render without a file server. */
function evidencePhoto(title: string, p: GeoPoint, when: Date, hue: number): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="420" viewBox="0 0 640 420">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${hue},55%,62%)"/><stop offset="1" stop-color="hsl(${(hue + 40) % 360},50%,38%)"/></linearGradient></defs>
<rect width="640" height="420" fill="url(#g)"/>
<path d="M0 330 L120 250 L220 300 L340 210 L470 290 L640 220 L640 420 L0 420Z" fill="rgba(0,0,0,.18)"/>
<rect x="250" y="150" width="140" height="110" rx="6" fill="rgba(255,255,255,.85)"/><path d="M235 158 L320 95 L405 158Z" fill="rgba(255,255,255,.92)"/>
<rect x="300" y="200" width="40" height="60" fill="hsl(${hue},40%,40%)"/>
<rect x="0" y="360" width="640" height="60" fill="rgba(0,0,0,.55)"/>
<text x="20" y="386" font-family="Inter,Arial" font-size="18" fill="#fff" font-weight="600">${title.replace(/[<&>]/g, '')}</text>
<text x="20" y="408" font-family="Inter,Arial" font-size="14" fill="#e2e8f0">${p.lat.toFixed(5)}, ${p.lng.toFixed(5)} · ${when.toLocaleString('en-IN')}</text>
<text x="620" y="40" text-anchor="end" font-family="Inter,Arial" font-size="13" fill="rgba(255,255,255,.85)">SAMPLE PHOTO · MOCK DATA</text>
</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

// ---------------------------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------------------------
const CURRENT_USER = { id: 'current-user', name: 'Current User' };
const SYSTEM = { id: 'system', name: 'System' };

interface Person {
  id: string;
  name: string;
}

/** Simulated GPS day (stops are raw; they are classified when served). */
interface SimDay {
  points: RoutePoint[];
  stops: { location: GeoPoint; from: string; to: string }[];
  punchInAt: string;
  punchOutAt: string;
}

export interface MockDb {
  branches: TrackingBranch[];
  officers: FieldOfficer[];
  groups: { id: string; code: string; name: string; branchId: string; location: GeoPoint; village: string }[];
  customers: OverdueCustomer[];
  /** Regular (non-overdue) members, only used for geo-tags and visit targets. */
  regularCustomers: { id: string; name: string; loanAccountNo: string; branchId: string; location: GeoPoint | null; address: string; groupName: string }[];
  jobs: Job[];
  history: JobHistoryEntry[];
  alerts: TrackingAlert[];
  approvals: OutOfRadiusRequest[];
  geoTags: GeoTag[];
  settings: TrackingSettings;
  /** employeeId|yyyy-MM-dd → simulated day. */
  days: Map<string, SimDay>;
  currentUser: Person;
  counters: { job: number; task: number; history: number };
}

// ---------------------------------------------------------------------------------------------
// Org seed
// ---------------------------------------------------------------------------------------------
const DIVISION = 'Dhupguri Division';
const BRANCH_SEED: [code: string, name: string, area: string, lat: number, lng: number][] = [
  ['DPG', 'Dhupguri', 'Falakata Area', 26.5895, 89.0074],
  ['FLK', 'Falakata', 'Falakata Area', 26.5262, 89.2075],
  ['MDH', 'Madarihat', 'Falakata Area', 26.7015, 89.285],
  ['DKM', 'Daukimari', 'Falakata Area', 26.585, 88.905],
  ['APD', 'Alipurduar', 'Alipurduar Area', 26.4836, 89.5229],
  ['KMG', 'Kamakhyaguri', 'Alipurduar Area', 26.44, 89.72],
  ['KMR', 'Kumargram', 'Alipurduar Area', 26.615, 89.83],
];

const BRANCHES: TrackingBranch[] = BRANCH_SEED.map(([code, name, areaName, lat, lng], i) => ({
  id: uuid('b', i + 1),
  code,
  name,
  areaName,
  divisionName: DIVISION,
  location: { lat, lng },
  operatingRadiusKm: 30,
}));
const branchByCode = (code: string) => BRANCHES.find((b) => b.code === code)!;

const VILLAGES: Record<string, string[]> = {
  DPG: ['Gadheyarkuthi', 'Magurmari', 'Jharaltagram', 'Barogharia', 'Shalbari', 'Bhandiguri', 'Sakoyajhora'],
  FLK: ['Jateswar', 'Dhaloguri', 'Parangerpar', 'Guabarnagar', 'Shishubari', 'Mairadanga', 'Deogaon'],
  MDH: ['Banarhat Road', 'Lankapara', 'Totopara', 'Shishujhumra', 'Ballalguri', 'Hantapara', 'Dalgaon'],
  DKM: ['Daukimari Hat', 'Kalirhat', 'Pashchim Daukimari', 'Bhotpatti', 'Kathalbari', 'Sonakhali', 'Madhya Daukimari'],
  APD: ['Sobhaganj', 'Majherdabri', 'Patlakhawa', 'Paschim Chakowakheti', 'Salkumarhat', 'Tapsikhata', 'Parorpar'],
  KMG: ['Bhelakoba', 'Chengmari', 'Dhaulaguri', 'Rampur', 'Shamukatala', 'Nimtijhora', 'Turturi'],
  KMR: ['Kumargram Hat', 'Raidak Ghat', 'Bhalka', 'Kamakhyaguri Road', 'Newland', 'Barobisha', 'Haldibari'],
};

const OFFICER_SEED: [name: string, role: OfficerRole, branchCode: string][] = [
  ['Partha Mukherjee', 'DM', 'DPG'],
  ['Sanjay Kundu', 'AM', 'FLK'],
  ['Ranjit Barman', 'AM', 'APD'],
  ['Subhajit Das', 'BM', 'DPG'],
  ['Sourav Biswas', 'BM', 'FLK'],
  ['Tanmoy Sarkar', 'BM', 'MDH'],
  ['Bappaditya Roy', 'BM', 'DKM'],
  ['Amitava Dey', 'BM', 'APD'],
  ['Dipankar Saha', 'BM', 'KMG'],
  ['Moumita Saha', 'ABM', 'DPG'],
  ['Sudipa Paul', 'ABM', 'APD'],
  ['Rahul Adhikary', 'ABM', 'KMR'],
  ['Rupa Mondal', 'CO', 'DPG'],
  ['Ankit Ghosh', 'CO', 'DPG'],
  ['Nirmal Roy', 'CO', 'DPG'],
  ['Priyanka Roy', 'CO', 'FLK'],
  ['Arindam Paul', 'CO', 'FLK'],
  ['Riya Banerjee', 'CO', 'MDH'],
  ['Debasish Pal', 'CO', 'MDH'],
  ['Suman Barman', 'CO', 'DKM'],
  ['Tapasi Sarkar', 'CO', 'DKM'],
  ['Biswajit Das', 'CO', 'APD'],
  ['Mithun Karjee', 'CO', 'APD'],
  ['Pallabi Ghosh', 'CO', 'KMG'],
  ['Jayanta Rava', 'CO', 'KMG'],
  ['Sanchita Basak', 'CO', 'KMR'],
  ['Uttam Narzary', 'CO', 'KMR'],
];

const DESIGNATION: Record<OfficerRole, string> = {
  CO: 'Credit Officer',
  ABM: 'Assistant Branch Manager',
  BM: 'Branch Manager',
  AM: 'Area Manager',
  DM: 'Divisional Manager',
};

const FIRST = ['Mitali', 'Sabina', 'Rekha', 'Jharna', 'Anjali', 'Sumitra', 'Laxmi', 'Rina', 'Tumpa', 'Shefali', 'Nasrin', 'Papiya', 'Kakali', 'Mampi', 'Sathi', 'Purnima', 'Bulbul', 'Rehana', 'Champa', 'Basanti', 'Dipali', 'Malati'];
const LAST = ['Roy', 'Barman', 'Das', 'Sarkar', 'Adhikary', 'Oraon', 'Mahato', 'Khatun', 'Bibi', 'Ray', 'Mondal', 'Basak', 'Narzary', 'Karjee'];
const CO_BORROWER = ['Ratan', 'Sukumar', 'Abdul', 'Gopal', 'Haripada', 'Rafiq', 'Bikash', 'Nemai', 'Shyamal', 'Jahangir'];

// ---------------------------------------------------------------------------------------------
// Job helpers (shared with the backend handlers)
// ---------------------------------------------------------------------------------------------

/** Recomputes counts, branches and status. Call after any change to a job or its tasks. */
export function refreshJob(job: Job, today = toDateKey()): Job {
  const counted = job.tasks.filter((t) => t.status === 'Pending' || t.status === 'Completed');
  job.taskCount = counted.length;
  job.doneCount = counted.filter((t) => t.status === 'Completed').length;
  job.openCount = counted.filter((t) => t.status === 'Pending').length;
  job.selfAddedCount = counted.filter((t) => t.origin === 'SelfAdded').length;
  const source = counted.length ? counted : job.tasks;
  job.types = [...new Set(source.map((t) => t.type))];
  const branches = new Map(source.map((t) => [t.target.branchId, t.target.branchName]));
  job.branchIds = [...branches.keys()];
  job.branchNames = [...branches.values()];
  counted.forEach((t) => (t.isLate = t.status === 'Completed' ? !!t.completedAt && dayOf(t.completedAt) > job.completeBy : today > job.completeBy));

  if (job.status === 'Cancelled') return job;
  if (job.openCount === 0 && job.doneCount > 0) job.status = 'Completed';
  else if (job.openCount === 0) job.status = 'Cancelled';
  else if (!job.assigneeId) job.status = 'Unassigned';
  else if (today > job.completeBy) job.status = 'Overdue';
  else if (job.doneCount > 0) job.status = 'InProgress';
  else job.status = 'Assigned';
  return job;
}

export function nextJobNo(d: MockDb): string {
  return `JOB-${(26000 + ++d.counters.job).toString()}`;
}

export function nextTaskNo(d: MockDb): string {
  return `TSK-${(48000 + ++d.counters.task).toString()}`;
}

export function pushHistory(d: MockDb, job: Job, action: JobHistoryEntry['action'], by: Person, when: Date, extra: Partial<JobHistoryEntry> = {}) {
  d.history.push({
    id: uuid('h', ++d.counters.history),
    jobId: job.id,
    action,
    performedByName: by.name,
    performedAt: iso(when),
    fromAssigneeName: null,
    toAssigneeName: null,
    taskNos: [],
    relatedJobId: null,
    relatedJobNo: null,
    remarks: null,
    ...extra,
  });
}

export function newJob(d: MockDb, init: { title: string; description: string | null; creator: Person & { unitName?: string }; assignee: FieldOfficer | null; startFrom: string | null; completeBy: string; createdAt: Date }): Job {
  const id = uuid('j', d.counters.job + 1);
  return {
    id,
    jobNo: nextJobNo(d),
    title: init.title,
    description: init.description,
    status: init.assignee ? 'Assigned' : 'Unassigned',
    assigneeId: init.assignee?.id ?? null,
    assigneeName: init.assignee?.name ?? null,
    assigneeRole: init.assignee?.role ?? null,
    unitName: init.assignee?.unitName ?? init.creator.unitName ?? DIVISION,
    branchIds: [],
    branchNames: [],
    createdById: init.creator.id,
    createdByName: init.creator.name,
    createdAt: iso(init.createdAt),
    startFrom: init.startFrom,
    completeBy: init.completeBy,
    taskCount: 0,
    doneCount: 0,
    openCount: 0,
    selfAddedCount: 0,
    types: [],
    transferredFromJobId: null,
    transferredFromJobNo: null,
    tasks: [],
  };
}

export function newTask(d: MockDb, job: Job, init: { type: TaskType; title: string; notes: string | null; target: TaskTarget; origin: TaskOrigin; addedBy: Person; addedAt: Date }): JobTask {
  const task: JobTask = {
    id: uuid('t', d.counters.task + 1),
    taskNo: nextTaskNo(d),
    jobId: job.id,
    type: init.type,
    title: init.title,
    notes: init.notes,
    target: init.target,
    status: 'Pending',
    origin: init.origin,
    addedByName: init.addedBy.name,
    addedAt: iso(init.addedAt),
    arrivedAt: null,
    completedAt: null,
    completedByName: null,
    remarks: null,
    verification: null,
    odOutcome: null,
    isLate: false,
    transferredToJobId: null,
    transferredToJobNo: null,
    closedReason: null,
  };
  job.tasks.push(task);
  return task;
}

/** Copy of a pending task for a partial transfer. */
export function moveTask(d: MockDb, task: JobTask, from: Job, to: Job, when: Date): JobTask {
  const copy: JobTask = { ...task, id: uuid('t', d.counters.task + 1), taskNo: nextTaskNo(d), jobId: to.id, addedAt: iso(when), addedByName: d.currentUser.name };
  to.tasks.push(copy);
  task.status = 'Transferred';
  task.transferredToJobId = to.id;
  task.transferredToJobNo = to.jobNo;
  task.closedReason = `Moved to ${to.jobNo}`;
  void from;
  return copy;
}

// ---------------------------------------------------------------------------------------------
// Build
// ---------------------------------------------------------------------------------------------
function buildDb(): MockDb {
  const now = new Date();
  const today = toDateKey(now);
  const branchById = new Map(BRANCHES.map((b) => [b.id, b]));

  // --- Staff ---------------------------------------------------------------------------------
  const areaBranches = (area: string) => BRANCHES.filter((b) => b.areaName === area).map((b) => b.id);
  const officers: FieldOfficer[] = OFFICER_SEED.map(([name, role, code], i) => {
    const branch = branchByCode(code);
    const unitName = role === 'DM' ? DIVISION : role === 'AM' ? branch.areaName : branch.name;
    const branchIds = role === 'DM' ? BRANCHES.map((b) => b.id) : role === 'AM' ? areaBranches(branch.areaName) : [branch.id];
    return {
      id: uuid('e', i + 1),
      employeeCode: `QF${(2040 + i * 7).toString()}`,
      name,
      role,
      designation: DESIGNATION[role],
      branchId: branch.id,
      branchName: branch.name,
      unitName,
      branchIds,
      phone: `98${intBetween(30000000, 99999999)}`,
      homeLocation: name === 'Jayanta Rava' ? null : offsetPoint(branch.location!, between(2500, 8000), between(0, 360)),
      reportingOfficerName: null,
    };
  });
  // Reporting line: CO → BM (or ABM where there is no BM) → AM → DM.
  officers.forEach((o) => {
    const inBranch = (r: OfficerRole) => officers.find((x) => x.role === r && x.branchId === o.branchId);
    const am = officers.find((x) => x.role === 'AM' && x.branchIds.includes(o.branchId));
    if (o.role === 'CO') o.reportingOfficerName = (inBranch('BM') ?? inBranch('ABM') ?? am)?.name ?? null;
    else if (o.role === 'ABM') o.reportingOfficerName = (inBranch('BM') ?? am)?.name ?? null;
    else if (o.role === 'BM') o.reportingOfficerName = am?.name ?? null;
    else if (o.role === 'AM') o.reportingOfficerName = 'Partha Mukherjee';
  });
  const byName = (n: string) => officers.find((o) => o.name === n)!;
  const fieldStaff = officers.filter((o) => o.role !== 'DM');

  // --- Centres / groups -----------------------------------------------------------------------
  const groups: MockDb['groups'] = [];
  BRANCHES.forEach((b) => {
    VILLAGES[b.code].slice(0, 6).forEach((village, j) => {
      groups.push({
        id: uuid(`g${b.code.toLowerCase()}`, j + 1),
        code: `${b.code}-C${(j + 1).toString().padStart(2, '0')}`,
        name: `${village} Mahila Group`,
        branchId: b.id,
        location: offsetPoint(b.location!, between(2500, 12000), between(0, 360)),
        village,
      });
    });
  });

  // --- Members / overdue customers -------------------------------------------------------------
  const customers: OverdueCustomer[] = [];
  const regularCustomers: MockDb['regularCustomers'] = [];
  let custNo = 1;
  BRANCHES.forEach((b) => {
    const branchGroups = groups.filter((g) => g.branchId === b.id);
    for (let k = 0; k < 15; k++) {
      const group = pick(branchGroups);
      const name = `${pick(FIRST)} ${pick(LAST)}`;
      const loanNo = `QF${b.code}${(300200 + custNo * 13).toString()}`;
      const location = rand() < 0.9 ? offsetPoint(group.location, between(120, 800), between(0, 360)) : null;
      const address = `${intBetween(2, 140)}, ${group.village}, ${b.name}`;
      if (k < 8) {
        const dpd = pick([4, 7, 12, 18, 25, 33, 41, 58, 64, 90, 105]);
        customers.push({
          id: uuid('c', custNo),
          loanAccountNo: loanNo,
          customerName: name,
          coBorrowerName: `${pick(CO_BORROWER)} ${name.split(' ')[1]}`,
          groupName: group.name,
          centreName: `${group.village} Centre`,
          branchId: b.id,
          branchName: b.name,
          phone: `9${intBetween(100000000, 999999999)}`,
          address,
          overdueAmount: Math.round(between(1200, 18500) / 10) * 10,
          dpd,
          lastPaymentDate: toDateKey(addDays(now, -dpd - intBetween(5, 25))),
          homeLocation: location,
          followUp: null,
        });
      } else {
        regularCustomers.push({ id: uuid('c', custNo), name, loanAccountNo: loanNo, branchId: b.id, location, address, groupName: group.name });
      }
      custNo++;
    }
  });

  const d: MockDb = {
    branches: BRANCHES,
    officers,
    groups,
    customers,
    regularCustomers,
    jobs: [],
    history: [],
    alerts: [],
    approvals: [],
    geoTags: [],
    settings: defaultSettings(now),
    days: new Map(),
    currentUser: CURRENT_USER,
    counters: { job: 0, task: 0, history: 0 },
  };

  // --- Targets --------------------------------------------------------------------------------
  const branchOf = (id: string) => branchById.get(id)!;
  const groupTarget = (g: MockDb['groups'][number]): TaskTarget => ({
    kind: 'GroupCentre', refId: g.id, name: `${g.name} (${g.code})`, address: `${g.village}, ${branchOf(g.branchId).name}`,
    location: g.location, branchId: g.branchId, branchName: branchOf(g.branchId).name, matchRadiusMeters: 150,
  });
  const memberTarget = (c: MockDb['regularCustomers'][number]): TaskTarget => ({
    kind: 'Customer', refId: c.id, name: c.name, address: c.address, location: c.location!, branchId: c.branchId, branchName: branchOf(c.branchId).name, matchRadiusMeters: 100,
  });
  const odTarget = (c: OverdueCustomer): TaskTarget => ({
    kind: 'OdCustomer', refId: c.id, name: c.customerName, address: c.address, location: c.homeLocation!, branchId: c.branchId, branchName: c.branchName, matchRadiusMeters: 100,
  });
  const pointTarget = (b: TrackingBranch, name: string, km: [number, number]): TaskTarget => {
    const village = pick(VILLAGES[b.code]);
    return {
      kind: 'Custom', refId: null, name: `${village} – ${name}`, address: `${village}, ${b.name}`,
      location: offsetPoint(b.location!, between(km[0] * 1000, km[1] * 1000), between(0, 360)), branchId: b.id, branchName: b.name, matchRadiusMeters: 300,
    };
  };
  const titleFor = (type: TaskType, t: TaskTarget) =>
    type === 'CentreMeeting' ? `Centre meeting – ${t.name.split(' (')[0].replace(' Mahila Group', '')}` :
    type === 'GroupVisit' ? `Group visit – ${t.name.split(' (')[0]}` :
    type === 'Survey' ? `Survey – ${t.name}` :
    type === 'LeadSourcing' ? `Lead sourcing – ${t.name.split(' – ')[0]}` :
    `${TASK_TYPE[type].label} – ${t.name}`;

  // --- Jobs -----------------------------------------------------------------------------------
  /** Day each task is planned for in the simulation (mock-only; real tasks have no date). */
  const plan = new Map<string, string>();
  const weekday = (now.getDay() + 6) % 7; // Monday = 0
  const thisMonday = shiftKey(today, -weekday);
  const thisSaturday = shiftKey(thisMonday, 5);
  const lastMonday = shiftKey(thisMonday, -7);
  const lastSaturday = shiftKey(lastMonday, 5);
  const workDays = (from: string, to: string) => {
    const out: string[] = [];
    for (let k = from; k <= to; k = shiftKey(k, 1)) if (at(k, 12).getDay() !== 0) out.push(k);
    return out;
  };
  const usedOd = new Set<string>();
  const odFor = (branchId: string, n: number) => {
    const list = customers.filter((c) => c.branchId === branchId && c.homeLocation && !usedOd.has(c.id)).sort((a, b) => b.dpd - a.dpd).slice(0, n);
    list.forEach((c) => usedOd.add(c.id));
    return list;
  };
  const supervisor = (o: FieldOfficer): Person & { unitName: string } => {
    const name = o.reportingOfficerName ?? 'Partha Mukherjee';
    const s = byName(name);
    return { id: s.id, name: s.name, unitName: s.unitName };
  };
  const addPlanned = (job: Job, type: TaskType, target: TaskTarget, day: string, by: Person, origin: TaskOrigin = 'Assigned', notes: string | null = null) => {
    const addedAt = origin === 'SelfAdded' ? at(day, 10, intBetween(0, 50)) : new Date(job.createdAt);
    const t = newTask(d, job, { type, title: titleFor(type, target), notes, target, origin, addedBy: by, addedAt });
    plan.set(t.id, day);
    return t;
  };

  // Kept aside for a job that is created now and assigned later.
  const reservedOd = odFor(branchByCode('DPG').id, 2);

  const coJobs: { job: Job; officer: FieldOfficer }[] = [];
  officers.filter((o) => o.role === 'CO').forEach((co, i) => {
    const branch = branchOf(co.branchId);
    const myGroups = shuffle(groups.filter((g) => g.branchId === branch.id));
    const myMembers = shuffle(regularCustomers.filter((c) => c.branchId === branch.id && c.location));
    const boss = supervisor(co);

    // Last week's plan: mostly done; some COs left tasks behind (overdue).
    const prev = newJob(d, { title: 'Weekly field plan', description: 'Centre meetings, group and member visits for the week.', creator: boss, assignee: co, startFrom: lastMonday, completeBy: lastSaturday, createdAt: at(shiftKey(lastMonday, -2), 17, 10) });
    const prevDays = workDays(lastMonday, lastSaturday);
    [myGroups[0], myGroups[1]].forEach((g, k) => addPlanned(prev, 'CentreMeeting', groupTarget(g), prevDays[k * 3], boss));
    addPlanned(prev, 'GroupVisit', groupTarget(myGroups[2]), prevDays[1], boss);
    addPlanned(prev, 'MemberVisit', memberTarget(myMembers[0]), prevDays[2], boss);
    addPlanned(prev, 'MemberVisit', memberTarget(myMembers[1]), prevDays[4], boss);
    addPlanned(prev, 'LeadSourcing', pointTarget(branch, 'new lead sourcing', [5, 16]), prevDays[5], boss);
    d.jobs.push(prev);
    coJobs.push({ job: prev, officer: co });

    // This week's plan.
    const cur = newJob(d, { title: 'Weekly field plan', description: 'Centre meetings, group and member visits for the week.', creator: boss, assignee: co, startFrom: thisMonday, completeBy: thisSaturday, createdAt: at(shiftKey(thisMonday, -2), 17, 25) });
    const curDays = workDays(thisMonday, thisSaturday);
    [myGroups[3], myGroups[4]].forEach((g, k) => addPlanned(cur, 'CentreMeeting', groupTarget(g), curDays[Math.min(k * 3, curDays.length - 1)], boss));
    addPlanned(cur, 'GroupVisit', groupTarget(myGroups[5]), curDays[1], boss);
    addPlanned(cur, 'GroupVisit', groupTarget(myGroups[0]), curDays[weekday] ?? curDays[3], boss);
    addPlanned(cur, 'MemberVisit', memberTarget(myMembers[2]), curDays[2], boss);
    addPlanned(cur, 'MemberVisit', memberTarget(myMembers[3]), curDays[weekday] ?? curDays[4], boss);
    if (i % 3 === 0) addPlanned(cur, 'Survey', pointTarget(branch, 'livelihood survey', [3, 10]), curDays[4], boss);
    if (i % 2 === 0) addPlanned(cur, 'LeadSourcing', pointTarget(branch, 'new lead sourcing', [6, 18]), curDays[5], boss);
    // Added by the CO from the mobile app.
    if (i % 3 === 1 && myMembers[4]) addPlanned(cur, 'MemberVisit', memberTarget(myMembers[4]), curDays[Math.max(0, weekday - 1)], co, 'SelfAdded', null);
    if (i % 4 === 2) addPlanned(cur, 'LeadSourcing', pointTarget(branch, 'referral from member', [2, 8]), curDays[weekday] ?? curDays[0], co, 'SelfAdded', null);
    d.jobs.push(cur);
    coJobs.push({ job: cur, officer: co });

    // Next week's plan, already handed over to some COs.
    if (i % 4 === 0) {
      const nextMonday = shiftKey(thisMonday, 7);
      const next = newJob(d, { title: 'Weekly field plan', description: 'Centre meetings and member visits for next week.', creator: boss, assignee: co, startFrom: nextMonday, completeBy: shiftKey(nextMonday, 5), createdAt: addMinutes(now, -intBetween(30, 300)) });
      addPlanned(next, 'CentreMeeting', groupTarget(myGroups[1]), shiftKey(nextMonday, 1), boss);
      addPlanned(next, 'CentreMeeting', groupTarget(myGroups[2]), shiftKey(nextMonday, 3), boss);
      if (myMembers[5]) addPlanned(next, 'MemberVisit', memberTarget(myMembers[5]), shiftKey(nextMonday, 2), boss);
      d.jobs.push(next);
    }

    // OD follow-ups, created two days ago with a short deadline.
    const ods = odFor(branch.id, i % 2 === 0 ? 3 : 2);
    if (ods.length) {
      const odStart = shiftKey(today, -2);
      const od = newJob(d, { title: 'OD follow-up', description: 'Visit each overdue customer at home. Collect, or record the promise-to-pay date.', creator: boss, assignee: co, startFrom: odStart, completeBy: shiftKey(today, i % 5 === 0 ? -1 : 3), createdAt: at(odStart, 9, 5) });
      const odDays = [odStart, shiftKey(odStart, 1), today, shiftKey(today, 1)].filter((k) => at(k, 12).getDay() !== 0);
      ods.forEach((c, k) => addPlanned(od, 'OdFollowUp', odTarget(c), odDays[k % odDays.length], boss, 'Assigned', `Overdue ₹${c.overdueAmount.toLocaleString('en-IN')} · ${c.dpd} DPD.`));
      d.jobs.push(od);
      coJobs.push({ job: od, officer: co });
    }
  });

  // Branch managers / ABMs: supervision visits set by the area manager.
  officers.filter((o) => o.role === 'BM' || o.role === 'ABM').forEach((m, i) => {
    const branch = branchOf(m.branchId);
    const boss = supervisor(m);
    const job = newJob(d, { title: m.role === 'BM' ? 'Branch supervision visits' : 'Centre support visits', description: 'Surprise attendance at centre meetings and high-DPD customer visits.', creator: boss, assignee: m, startFrom: thisMonday, completeBy: thisSaturday, createdAt: at(shiftKey(thisMonday, -3), 16, 40) });
    const days = workDays(thisMonday, thisSaturday);
    const g = shuffle(groups.filter((x) => x.branchId === branch.id));
    addPlanned(job, 'CentreMeeting', groupTarget(g[0]), days[1], boss);
    addPlanned(job, 'GroupVisit', groupTarget(g[1]), days[weekday] ?? days[2], boss);
    const od = odFor(branch.id, 1)[0];
    if (od) addPlanned(job, 'OdFollowUp', odTarget(od), days[Math.max(0, weekday - 1)], boss, 'Assigned', `High DPD (${od.dpd}). Meet the customer with the CO.`);
    if (i % 2 === 0) addPlanned(job, 'Survey', pointTarget(branch, 'market survey', [4, 12]), days[4], boss);
    d.jobs.push(job);
  });

  // Area managers: centre audits across their branches, set by the DM.
  const dm = byName('Partha Mukherjee');
  officers.filter((o) => o.role === 'AM').forEach((am) => {
    const job = newJob(d, { title: 'Area review – centre audits', description: 'Audit one centre meeting in each branch and check the registers.', creator: { id: dm.id, name: dm.name, unitName: DIVISION }, assignee: am, startFrom: thisMonday, completeBy: shiftKey(thisSaturday, 7), createdAt: at(shiftKey(thisMonday, -4), 11, 0) });
    const days = workDays(thisMonday, thisSaturday);
    am.branchIds.forEach((bid, k) => {
      const g = pick(groups.filter((x) => x.branchId === bid));
      addPlanned(job, 'CentreMeeting', groupTarget(g), days[(k * 2) % days.length], { id: dm.id, name: dm.name });
    });
    addPlanned(job, 'Survey', pointTarget(branchOf(am.branchIds[am.branchIds.length - 1]), 'new branch feasibility survey', [12, 22]), shiftKey(thisSaturday, 3), { id: dm.id, name: dm.name });
    d.jobs.push(job);
  });

  // Created now, to be assigned later.
  const dpg = branchByCode('DPG');
  const subhajit = byName('Subhajit Das');
  const unassigned1 = newJob(d, { title: 'OD recovery – 60+ DPD', description: 'High-DPD customers. Decide who goes after the branch review.', creator: { ...subhajit, unitName: dpg.name }, assignee: null, startFrom: null, completeBy: shiftKey(today, 5), createdAt: addMinutes(now, -180) });
  reservedOd.forEach((c) => addPlanned(unassigned1, 'OdFollowUp', odTarget(c), shiftKey(today, 9), subhajit, 'Assigned', `Overdue ₹${c.overdueAmount.toLocaleString('en-IN')} · ${c.dpd} DPD.`));
  d.jobs.push(unassigned1);
  const flk = branchByCode('FLK');
  const sourav = byName('Sourav Biswas');
  const unassigned2 = newJob(d, { title: 'Lead sourcing drive', description: 'New villages along the highway.', creator: { ...sourav, unitName: flk.name }, assignee: null, startFrom: shiftKey(today, 3), completeBy: shiftKey(today, 10), createdAt: addMinutes(now, -60 * 26) });
  addPlanned(unassigned2, 'LeadSourcing', pointTarget(flk, 'new lead sourcing', [8, 20]), shiftKey(today, 9), sourav);
  addPlanned(unassigned2, 'LeadSourcing', pointTarget(flk, 'new lead sourcing', [8, 20]), shiftKey(today, 9), sourav);
  addPlanned(unassigned2, 'Survey', pointTarget(flk, 'household survey', [6, 14]), shiftKey(today, 9), sourav);
  d.jobs.push(unassigned2);
  const sanjay = byName('Sanjay Kundu');
  const unassigned3 = newJob(d, { title: 'Joint centre audits – Dhupguri & Daukimari', description: 'Spans two branches, so only an AM or DM can hold it.', creator: { ...sanjay, unitName: sanjay.unitName }, assignee: null, startFrom: null, completeBy: shiftKey(today, 7), createdAt: addMinutes(now, -60 * 5) });
  [dpg, branchByCode('DKM')].forEach((b) => addPlanned(unassigned3, 'CentreMeeting', groupTarget(pick(groups.filter((g) => g.branchId === b.id))), shiftKey(today, 9), sanjay));
  d.jobs.push(unassigned3);

  // History for creation / assignment.
  d.jobs.forEach((job) => {
    pushHistory(d, job, 'Created', { id: job.createdById, name: job.createdByName }, new Date(job.createdAt), {
      toAssigneeName: job.assigneeName,
      taskNos: job.tasks.filter((t) => t.origin === 'Assigned').map((t) => t.taskNo),
      remarks: job.assigneeId ? null : 'Created without an assignee',
    });
  });

  // A partial transfer: Ankit was on leave, two tasks moved to Nirmal.
  const ankit = byName('Ankit Ghosh');
  const nirmal = byName('Nirmal Roy');
  const ankitWeek = coJobs.find((x) => x.officer.id === ankit.id && x.job.startFrom === thisMonday && x.job.title === 'Weekly field plan')!.job;
  const toMove = ankitWeek.tasks.filter((t) => (plan.get(t.id) ?? '') >= today).slice(0, 2);
  if (toMove.length) {
    const when = addMinutes(at(today, 9, 10), -60 * 24);
    const moved = newJob(d, { title: `${ankitWeek.title} (from ${ankitWeek.jobNo})`, description: ankitWeek.description, creator: { id: subhajit.id, name: subhajit.name, unitName: dpg.name }, assignee: nirmal, startFrom: toDateKey(when), completeBy: ankitWeek.completeBy, createdAt: when });
    moved.transferredFromJobId = ankitWeek.id;
    moved.transferredFromJobNo = ankitWeek.jobNo;
    toMove.forEach((t) => plan.set(moveTask(d, t, ankitWeek, moved, when).id, plan.get(t.id)!));
    moved.tasks.forEach((t) => (t.addedByName = subhajit.name));
    const nos = toMove.map((t) => t.taskNo);
    pushHistory(d, ankitWeek, 'TasksTransferredOut', subhajit, when, { fromAssigneeName: ankit.name, toAssigneeName: nirmal.name, taskNos: nos, relatedJobId: moved.id, relatedJobNo: moved.jobNo, remarks: 'Ankit on leave on these days' });
    pushHistory(d, moved, 'Created', subhajit, when, { toAssigneeName: nirmal.name, remarks: `Created by a partial transfer from ${ankitWeek.jobNo}` });
    pushHistory(d, moved, 'TasksTransferredIn', subhajit, when, { fromAssigneeName: ankit.name, toAssigneeName: nirmal.name, taskNos: moved.tasks.map((t) => t.taskNo), relatedJobId: ankitWeek.id, relatedJobNo: ankitWeek.jobNo, remarks: 'Ankit on leave on these days' });
    d.jobs.push(moved);
  }

  // A whole-job transfer: Arindam's OD job used to be Priyanka's.
  const arindamOd = coJobs.find((x) => x.officer.name === 'Arindam Paul' && x.job.title === 'OD follow-up')?.job;
  if (arindamOd) {
    pushHistory(d, arindamOd, 'Transferred', sourav, addMinutes(new Date(arindamOd.createdAt), 95), { fromAssigneeName: 'Priyanka Roy', toAssigneeName: 'Arindam Paul', remarks: 'Customers are in Arindam’s centres' });
  }

  // A cancelled job.
  const tanmoy = byName('Tanmoy Sarkar');
  const cancelled = newJob(d, { title: 'Flood relief survey', description: 'Called off – the district administration is running the survey.', creator: { id: tanmoy.id, name: tanmoy.name, unitName: 'Madarihat' }, assignee: byName('Riya Banerjee'), startFrom: shiftKey(today, -4), completeBy: shiftKey(today, 2), createdAt: at(shiftKey(today, -5), 15, 30) });
  addPlanned(cancelled, 'Survey', pointTarget(branchByCode('MDH'), 'flood damage survey', [4, 10]), shiftKey(today, 9), tanmoy);
  cancelled.tasks.forEach((t) => {
    t.status = 'Cancelled';
    t.closedReason = 'Job cancelled';
  });
  cancelled.status = 'Cancelled';
  pushHistory(d, cancelled, 'Created', tanmoy, new Date(cancelled.createdAt), { toAssigneeName: cancelled.assigneeName, taskNos: cancelled.tasks.map((t) => t.taskNo) });
  pushHistory(d, cancelled, 'Cancelled', tanmoy, at(shiftKey(today, -3), 11, 20), { remarks: 'District administration is doing the survey' });
  d.jobs.push(cancelled);

  function completeTask(t: JobTask, o: FieldOfficer, stop: { location: GeoPoint; from: string; to: string }, done: Date, job: Job, r: () => number) {
    const arrival = offsetPoint(stop.location, r() * 20, r() * 360);
    const photo = offsetPoint(stop.location, r() * 12, r() * 360);
    const dist = Math.round(distanceMeters(photo, t.target.location));
    t.status = 'Completed';
    t.arrivedAt = stop.from;
    t.completedAt = iso(done);
    t.completedByName = o.name;
    t.verification = {
      arrivalLocation: arrival,
      arrivalDistanceMeters: Math.round(distanceMeters(arrival, t.target.location)),
      completionLocation: photo,
      completionDistanceMeters: dist,
      locationMatched: dist <= t.target.matchRadiusMeters,
      photoUrl: null,
      photoTakenAt: null,
    };
    const paid = t.type === 'OdFollowUp' && r() < 0.4;
    if (t.type === 'OdFollowUp') {
      const c = customers.find((x) => x.id === t.target.refId);
      t.odOutcome = { customerAvailable: r() < 0.85, paid, amountCollected: paid ? (c?.overdueAmount ?? null) : null, ptpDate: paid ? null : toDateKey(addDays(done, 3 + Math.floor(r() * 9))) };
      t.remarks = paid ? 'Full overdue collected' : pick(['Husband working outside, promised to pay', 'Crop sale pending', 'Medical expense this month']);
    } else {
      t.remarks = pick(['Meeting held, all members present', 'Done', 'Attendance 18/20, collection complete', 'Discussed loan renewal', 'Two interested households, details captured', null]);
    }
    if (!paid || r() < 0.5) {
      t.verification.photoUrl = evidencePhoto(t.title, photo, done, hashString(t.id) % 360);
      t.verification.photoTakenAt = iso(addMinutes(done, -1));
    }
    void job;
  }

  // --- Simulate GPS days and complete tasks from them ------------------------------------------------
  const jobOfTask = new Map<string, Job>();
  d.jobs.forEach((j) => j.tasks.forEach((t) => jobOfTask.set(t.id, j)));
  const days = workDays(lastMonday, today);
  fieldStaff.forEach((o, i) => {
    days.forEach((day) => {
      const tasks = d.jobs
        .filter((j) => j.assigneeId === o.id && j.status !== 'Cancelled')
        .flatMap((j) => j.tasks.filter((t) => t.status === 'Pending' && plan.get(t.id) === day));
      const r = mulberry32(hashString(o.id + day));
      // Days in the past: about 1 in 9 tasks is skipped (left pending → overdue job).
      const visiting = day < today ? tasks.filter(() => r() > 0.11) : tasks;
      const sim = simulateDay(o, branchOf(o.branchId), day, visiting.map((t) => t.target), r, { nearHome: i % 9 === 4 && r() < 0.3, mismatchIdx: r() < 0.12 ? Math.floor(r() * visiting.length) : -1 });
      d.days.set(`${o.id}|${day}`, sim.day);

      visiting.forEach((t, k) => {
        const stop = sim.taskStops[k];
        if (!stop) return;
        const done = addMinutes(new Date(stop.from), Math.max(8, (new Date(stop.to).getTime() - new Date(stop.from).getTime()) / 60_000 - intBetween(3, 8)));
        if (done.getTime() > now.getTime()) return; // still on site / not reached yet
        completeTask(t, o, stop, done, jobOfTask.get(t.id)!, r);
      });
    });
  });

  // Overdue jobs from last week whose leftovers were never done → history + alerts.
  d.jobs.forEach((j) => refreshJob(j, today));
  d.jobs.forEach((j) => {
    const completed = j.tasks.filter((t) => t.completedAt).map((t) => t.completedAt!).sort();
    j.tasks.filter((t) => t.status === 'Completed').forEach((t) => {
      pushHistory(d, j, 'TaskCompleted', { id: j.assigneeId ?? '', name: t.completedByName ?? '' }, new Date(t.completedAt!), { taskNos: [t.taskNo], remarks: t.verification?.locationMatched === false ? `Photo ${t.verification.completionDistanceMeters} m from the geo-tag` : null });
    });
    j.tasks.filter((t) => t.origin === 'SelfAdded').forEach((t) => {
      pushHistory(d, j, 'TaskSelfAdded', { id: '', name: t.addedByName }, new Date(t.addedAt), { taskNos: [t.taskNo], remarks: 'Added from the mobile app' });
    });
    if (j.status === 'Completed' && completed.length) pushHistory(d, j, 'Completed', SYSTEM, addMinutes(new Date(completed[completed.length - 1]), 1), { remarks: 'All tasks done' });
    if (j.status === 'Overdue') pushHistory(d, j, 'BecameOverdue', SYSTEM, at(shiftKey(j.completeBy, 1), 0, 5), { remarks: `${j.openCount} task(s) pending after the complete-by date` });
  });

  // One deadline extension.
  const extended = d.jobs.find((j) => j.title === 'OD follow-up' && j.status !== 'Completed' && j.completeBy >= today);
  if (extended) pushHistory(d, extended, 'DateExtended', { id: '', name: extended.createdByName }, addMinutes(new Date(extended.createdAt), 60 * 20), { remarks: `Extended from ${shiftKey(extended.completeBy, -2)} – customer travelling` });

  d.jobs.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  // --- Alerts, approvals, geo-tags ------------------------------------------------------------------
  d.alerts = seedAlerts(d, now);
  d.approvals = seedApprovals(fieldStaff, branchById, now);
  d.geoTags = seedGeoTags(d, branchById, now);
  return d;

}

function defaultSettings(now: Date): TrackingSettings {
  return {
    homeRadiusMeters: 50,
    stationaryMinutes: 15,
    branchRadiusKm: 30,
    locationMatchRadiusMeters: 100,
    gpsOffGraceMinutes: 5,
    stopMinMinutes: 5,
    stopRadiusMeters: 75,
    positionIntervalSeconds: 60,
    workingHoursStart: '09:30',
    workingHoursEnd: '18:00',
    notifyReportingOfficer: true,
    notifyCreditOfficer: true,
    notifyAdministration: true,
    autoAssignOdFollowUps: false,
    autoAssignOdMinDpd: 7,
    autoAssignGroupMeetings: false,
    autoAllocationTime: '07:30',
    exceptions: [
      { id: uuid('x', 1), name: 'Lunch break', appliesTo: 'Stationary', description: 'Stationary alerts suppressed during lunch.', fromTime: '13:30', toTime: '14:15', isActive: true },
      { id: uuid('x', 2), name: 'Branch meeting days', appliesTo: 'Stationary', description: 'Weekly review meeting at the branch.', fromTime: '09:30', toTime: '11:00', isActive: true },
      { id: uuid('x', 3), name: 'CO lives in the operating village', appliesTo: 'NearHome', description: 'Approved list of COs whose home is inside their centre cluster.', fromTime: null, toTime: null, isActive: false },
    ],
    lastModifiedByName: 'Partha Mukherjee',
    lastModifiedAt: iso(addDays(now, -9)),
  };
}

// ---------------------------------------------------------------------------------------------
// GPS day simulation
// ---------------------------------------------------------------------------------------------
function simulateDay(
  o: FieldOfficer,
  branch: TrackingBranch,
  day: string,
  targets: TaskTarget[],
  r: () => number,
  opts: { nearHome: boolean; mismatchIdx: number },
): { day: SimDay; taskStops: ({ location: GeoPoint; from: string; to: string } | undefined)[] } {
  const home = o.homeLocation ?? offsetPoint(branch.location!, 4000, 200);
  type Wp = { p: GeoPoint; stay: number; task?: number };
  const order = targets.map((t, k) => ({ t, k })).sort((a, b) => distanceMeters(branch.location!, a.t.location) - distanceMeters(branch.location!, b.t.location));
  const wps: Wp[] = [
    { p: home, stay: 0 },
    { p: branch.location!, stay: 45 + Math.floor(r() * 35) },
    ...order.map(({ t, k }) => ({
      p: k === opts.mismatchIdx ? offsetPoint(t.location, 260 + r() * 300, r() * 360) : offsetPoint(t.location, r() * 25, r() * 360),
      stay: 35 + Math.floor(r() * 40),
      task: k,
    })),
    { p: branch.location!, stay: 20 + Math.floor(r() * 15) },
  ];
  // Unplanned halts: a tea stall / market, and for some people a visit home during duty.
  if (r() < 0.55) wps.splice(2 + Math.floor(r() * Math.max(1, order.length)), 0, { p: offsetPoint(branch.location!, 1800 + r() * 4000, r() * 360), stay: 12 + Math.floor(r() * 18) });
  // Lunch at a roadside hotel on most days (undesignated).
  if (order.length >= 2 && r() < 0.7) wps.splice(2 + Math.ceil(order.length / 2), 0, { p: offsetPoint(order[0].t.location, 900 + r() * 1500, r() * 360), stay: 30 + Math.floor(r() * 15) });
  if (opts.nearHome && o.homeLocation) wps.splice(wps.length - 1, 0, { p: offsetPoint(o.homeLocation, 15 + r() * 20, r() * 360), stay: 25 + Math.floor(r() * 25) });

  const points: RoutePoint[] = [];
  const stops: SimDay['stops'] = [];
  const taskStops: ({ location: GeoPoint; from: string; to: string } | undefined)[] = [];
  const punchIn = at(day, 9, 20 + Math.floor(r() * 20));
  let clock = new Date(punchIn);
  const end = at(day, 18, 40);

  for (let w = 0; w < wps.length - 1 && clock < end; w++) {
    const a = wps[w].p;
    const b = wps[w + 1].p;
    const segM = distanceMeters(a, b);
    const speed = 18 + r() * 16;
    const travelMin = Math.max(3, (segM / 1000 / speed) * 60);
    const steps = Math.max(3, Math.round(travelMin / 1.5));
    for (let s = 0; s <= steps && clock < end; s++) {
      const f = s / steps;
      const base = { lat: a.lat + (b.lat - a.lat) * f, lng: a.lng + (b.lng - a.lng) * f };
      const p = s > 0 && s < steps ? offsetPoint(base, r() * 140, r() * 360) : base;
      points.push({ lat: p.lat, lng: p.lng, at: iso(clock), speedKmph: s === steps ? 0 : +(speed * (0.75 + r() * 0.5)).toFixed(1) });
      clock = addMinutes(clock, travelMin / steps);
    }
    let stay = wps[w + 1].stay;
    // Back at the branch for the last time: desk work until the end of the day.
    if (w + 1 === wps.length - 1) stay = Math.max(stay, (at(day, 17, 25 + Math.floor(r() * 45)).getTime() - clock.getTime()) / 60_000);
    if (stay > 0 && clock < end) {
      const from = new Date(clock);
      const to = new Date(Math.min(addMinutes(clock, stay).getTime(), end.getTime()));
      const stop = { location: b, from: iso(from), to: iso(to) };
      stops.push(stop);
      if (wps[w + 1].task !== undefined) taskStops[wps[w + 1].task!] = stop;
      for (let m = 4; m < stay; m += 4) {
        const p = offsetPoint(b, r() * 14, r() * 360);
        points.push({ lat: p.lat, lng: p.lng, at: iso(addMinutes(from, m)), speedKmph: 0 });
      }
      clock = to;
    }
  }
  return { day: { points, stops, punchInAt: iso(punchIn), punchOutAt: iso(addMinutes(clock, 5)) }, taskStops };
}

// ---------------------------------------------------------------------------------------------
// Serving routes and live positions
// ---------------------------------------------------------------------------------------------

/** Task points the employee was expected to work on during `day`, as of the end of that day. */
function taskPointsFor(d: MockDb, employeeId: string, day: string): (RouteTaskPoint & { completedAtIso: string | null })[] {
  const out: (RouteTaskPoint & { completedAtIso: string | null })[] = [];
  d.jobs
    .filter((j) => j.assigneeId === employeeId && j.status !== 'Cancelled' && (!j.startFrom || j.startFrom <= day))
    .forEach((j) => {
      j.tasks.forEach((t) => {
        const doneDay = t.completedAt ? dayOf(t.completedAt) : null;
        const activeThatDay = day <= j.completeBy || j.status === 'Overdue';
        const relevant = doneDay === day || (t.status === 'Pending' && activeThatDay && dayOf(t.addedAt) <= day) || (doneDay !== null && doneDay > day && activeThatDay && dayOf(t.addedAt) <= day);
        if (!relevant) return;
        out.push({
          taskId: t.id,
          taskNo: t.taskNo,
          jobId: j.id,
          jobNo: j.jobNo,
          title: t.title,
          type: t.type,
          location: t.target.location,
          matchRadiusMeters: t.target.matchRadiusMeters,
          status: doneDay !== null && doneDay <= day ? 'Completed' : 'Pending',
          completedAt: doneDay === day ? t.completedAt : null,
          completedAtIso: t.completedAt,
          visited: false,
        });
      });
    });
  return out;
}

export function buildRoute(employeeId: string, dateKey: string): EmployeeRoute {
  return routeFrom(mockDb(), employeeId, dateKey);
}

function routeFrom(d: MockDb, employeeId: string, dateKey: string): EmployeeRoute {
  const now = new Date();
  const isToday = dateKey === toDateKey(now);
  const officer = d.officers.find((o) => o.id === employeeId);
  const empty: EmployeeRoute = {
    employeeId, date: dateKey, isLive: false, points: [], stops: [], taskPoints: [], totalDistanceKm: 0, punchInAt: null, punchOutAt: null,
    summary: { totalDistanceKm: 0, movingMinutes: 0, designatedStops: 0, designatedMinutes: 0, undesignatedStops: 0, undesignatedMinutes: 0, tasksCompleted: 0, taskPointsVisited: 0, taskPointsPlanned: 0, firstFixAt: null, lastFixAt: null },
  };
  if (!officer) return empty;
  const branch = d.branches.find((b) => b.id === officer.branchId)!;
  const taskPoints = taskPointsFor(d, employeeId, dateKey);
  empty.taskPoints = taskPoints.map(({ completedAtIso: _x, ...p }) => p);
  empty.summary.taskPointsPlanned = taskPoints.length;

  const sim = d.days.get(`${employeeId}|${dateKey}`);
  if (!sim || (isToday && new Date(sim.punchInAt).getTime() > now.getTime())) return empty;

  const cut = isToday ? now.getTime() : Infinity;
  const points = sim.points.filter((p) => new Date(p.at).getTime() <= cut);
  const rawStops = sim.stops
    .filter((s) => new Date(s.from).getTime() <= cut)
    .map((s) => ({ ...s, to: new Date(Math.min(new Date(s.to).getTime(), cut)).toISOString() }))
    .filter((s) => (new Date(s.to).getTime() - new Date(s.from).getTime()) / 60_000 >= d.settings.stopMinMinutes);

  let totalM = 0;
  for (let k = 1; k < points.length; k++) totalM += distanceMeters(points[k - 1], points[k]);

  const tolerance = d.settings.stopRadiusMeters;
  const stops: RouteStop[] = rawStops.map((s, k) => {
    const mins = Math.round((new Date(s.to).getTime() - new Date(s.from).getTime()) / 60_000);
    let best: (typeof taskPoints)[number] | null = null;
    let bestD = Infinity;
    taskPoints.forEach((tp) => {
      const dist = distanceMeters(s.location, tp.location);
      if (dist < bestD) {
        bestD = dist;
        best = tp;
      }
    });
    const base = { seq: k + 1, location: s.location, from: s.from, to: s.to, durationMinutes: mins, taskId: null, taskNo: null, jobId: null, jobNo: null, taskCompleted: false };
    const tp = best as (typeof taskPoints)[number] | null;
    if (tp && bestD <= tp.matchRadiusMeters + tolerance) {
      const completedHere = !!tp.completedAtIso && new Date(tp.completedAtIso).getTime() >= new Date(s.from).getTime() - 60_000 && new Date(tp.completedAtIso).getTime() <= new Date(s.to).getTime() + 10 * 60_000;
      tp.visited = true;
      return { ...base, kind: 'Designated', place: 'Task', label: tp.title, taskId: tp.taskId, taskNo: tp.taskNo, jobId: tp.jobId, jobNo: tp.jobNo, taskCompleted: completedHere, distanceMeters: Math.round(bestD) };
    }
    const dBranch = distanceMeters(s.location, branch.location!);
    if (dBranch <= 200) return { ...base, kind: 'Designated', place: 'Branch', label: `${branch.name} Branch`, distanceMeters: Math.round(dBranch) };
    if (officer.homeLocation && distanceMeters(s.location, officer.homeLocation) <= d.settings.homeRadiusMeters + tolerance) {
      return { ...base, kind: 'Undesignated', place: 'Home', label: 'Near registered home', distanceMeters: tp ? Math.round(bestD) : null };
    }
    return { ...base, kind: 'Undesignated', place: null, label: null, distanceMeters: tp ? Math.round(bestD) : null };
  });

  const designated = stops.filter((s) => s.kind === 'Designated');
  const undesignated = stops.filter((s) => s.kind === 'Undesignated');
  const first = points[0]?.at ?? null;
  const last = points[points.length - 1]?.at ?? null;
  const spanMin = first && last ? (new Date(last).getTime() - new Date(first).getTime()) / 60_000 : 0;
  const stopMin = stops.reduce((s, x) => s + x.durationMinutes, 0);
  const punchedOut = !isToday || new Date(sim.punchOutAt).getTime() <= now.getTime();

  return {
    employeeId,
    date: dateKey,
    isLive: isToday && !punchedOut,
    points,
    stops,
    taskPoints: taskPoints.map(({ completedAtIso: _x, ...p }) => p),
    totalDistanceKm: +(totalM / 1000).toFixed(1),
    punchInAt: sim.punchInAt,
    punchOutAt: punchedOut ? sim.punchOutAt : null,
    summary: {
      totalDistanceKm: +(totalM / 1000).toFixed(1),
      movingMinutes: Math.max(0, Math.round(spanMin - stopMin)),
      designatedStops: designated.length,
      designatedMinutes: designated.reduce((s, x) => s + x.durationMinutes, 0),
      undesignatedStops: undesignated.length,
      undesignatedMinutes: undesignated.reduce((s, x) => s + x.durationMinutes, 0),
      tasksCompleted: taskPoints.filter((p) => p.completedAt).length,
      taskPointsVisited: taskPoints.filter((p) => p.visited).length,
      taskPointsPlanned: taskPoints.length,
      firstFixAt: first,
      lastFixAt: last,
    },
  };
}

/** Latest position per employee, read from today's simulated day at the current time. */
export function simulateLivePositions(): LivePosition[] {
  const d = mockDb();
  const now = new Date();
  const today = toDateKey(now);
  const branchById = new Map(d.branches.map((b) => [b.id, b]));

  return d.officers
    .filter((o) => o.role !== 'DM')
    .map((o, i) => {
      const branch = branchById.get(o.branchId)!;
      const route = buildRoute(o.id, today);
      const openAlerts = d.alerts.filter((a) => a.employeeId === o.id && a.status === 'Open').length;
      const openTaskCount = d.jobs.filter((j) => j.assigneeId === o.id && (j.status === 'Assigned' || j.status === 'InProgress' || j.status === 'Overdue')).reduce((s, j) => s + j.openCount, 0);
      const lastPoint = route.points[route.points.length - 1];
      const currentStop = route.stops.find((s) => new Date(s.to).getTime() >= now.getTime() - 90_000 && route.isLive);

      let status: LiveStatus;
      if (!route.points.length) status = 'NotPunchedIn';
      else if (!route.isLive) status = 'PunchedOut';
      else if (i === 7) status = 'GpsOff';
      else if (i === 13) status = 'Offline';
      else if (currentStop?.place === 'Task') status = 'OnTask';
      else if (currentStop?.place === 'Branch') status = 'AtBranch';
      else if (currentStop) status = 'Idle';
      else status = 'Moving';

      const lastSeen = status === 'GpsOff' ? addMinutes(now, -23) : status === 'Offline' && route.isLive ? addMinutes(now, -95) : lastPoint ? new Date(lastPoint.at) : null;
      const location: GeoPoint | null = lastPoint ? { lat: lastPoint.lat, lng: lastPoint.lng } : null;
      const task = currentStop?.place === 'Task' ? currentStop : null;

      return {
        employeeId: o.id,
        employeeName: o.name,
        role: o.role,
        branchId: o.branchId,
        branchName: o.branchName,
        location,
        accuracyMeters: status === 'GpsOff' || !location ? null : 6 + (i % 5) * 3,
        speedKmph: status === 'Moving' ? (lastPoint?.speedKmph ?? 20) : 0,
        lastSeenAt: lastSeen ? iso(lastSeen) : null,
        gpsEnabled: status !== 'GpsOff',
        status,
        punchedInAt: route.punchInAt,
        currentTaskId: task?.taskId ?? null,
        currentTaskTitle: task?.label ?? null,
        currentJobId: task?.jobId ?? null,
        currentJobNo: task?.jobNo ?? null,
        openTaskCount,
        distanceTodayKm: route.points.length ? route.totalDistanceKm : null,
        distanceFromBranchKm: location ? +(distanceMeters(location, branch.location!) / 1000).toFixed(1) : null,
        batteryPct: 22 + ((i * 17) % 75),
        openAlertCount: openAlerts,
      } satisfies LivePosition;
    });
}

// ---------------------------------------------------------------------------------------------
// Alerts / approvals / geo-tags
// ---------------------------------------------------------------------------------------------
function seedAlerts(d: MockDb, now: Date): TrackingAlert[] {
  const alerts: TrackingAlert[] = [];
  const branchById = new Map(d.branches.map((b) => [b.id, b]));
  const officerById = new Map(d.officers.map((o) => [o.id, o]));
  let n = 1;
  const push = (o: FieldOfficer, type: AlertType, severity: AlertSeverity, message: string, raised: Date, extra: Partial<TrackingAlert> = {}) => {
    const age = (now.getTime() - raised.getTime()) / 3_600_000;
    const status = age < 3 ? 'Open' : age < 20 ? pick(['Open', 'Acknowledged'] as const) : pick(['Resolved', 'Resolved', 'Acknowledged'] as const);
    const reporting = o.reportingOfficerName ?? 'Partha Mukherjee';
    alerts.push({
      id: uuid('a', n++),
      type,
      severity,
      employeeId: o.id,
      employeeName: o.name,
      role: o.role,
      branchId: o.branchId,
      branchName: o.branchName,
      message,
      location: null,
      measuredValue: null,
      measuredUnit: null,
      jobId: null,
      jobNo: null,
      taskId: null,
      raisedAt: iso(raised),
      status,
      notifiedTo: [reporting, 'Administration'],
      acknowledgedByName: status !== 'Open' ? reporting : null,
      acknowledgedAt: status !== 'Open' ? iso(addMinutes(raised, intBetween(5, 90))) : null,
      resolvedByName: status === 'Resolved' ? reporting : null,
      resolvedAt: status === 'Resolved' ? iso(addMinutes(raised, intBetween(90, 400))) : null,
      resolutionRemarks: status === 'Resolved' ? pick(['Spoke to employee', 'Network issue in the area', 'Approved field camp', 'Warning issued']) : null,
      ...extra,
    });
  };

  // From the jobs: photos away from the geo-tag, and jobs past their date.
  d.jobs.forEach((j) => {
    const o = j.assigneeId ? officerById.get(j.assigneeId) : undefined;
    if (!o) return;
    j.tasks.filter((t) => t.verification?.locationMatched === false && t.completedAt).forEach((t) => {
      push(o, 'LocationMismatch', 'High', `${t.taskNo} completion photo by ${o.name} was taken ${t.verification!.completionDistanceMeters} m from the geo-tagged location.`, addMinutes(new Date(t.completedAt!), 1), {
        location: t.verification!.completionLocation, measuredValue: t.verification!.completionDistanceMeters, measuredUnit: 'm', jobId: j.id, jobNo: j.jobNo, taskId: t.id,
      });
    });
    if (j.status === 'Overdue') {
      push(o, 'OverdueJob', 'Medium', `${j.jobNo} “${j.title}” passed its complete-by date with ${j.openCount} task(s) pending.`, at(shiftKey(j.completeBy, 1), 0, 5), {
        measuredValue: j.openCount, measuredUnit: 'tasks', jobId: j.id, jobNo: j.jobNo,
      });
    }
  });

  // From the simulated days: visits home during duty.
  d.days.forEach((_day, key) => {
    const [employeeId, dateKey] = key.split('|');
    const route = routeFrom(d, employeeId, dateKey);
    const o = officerById.get(employeeId)!;
    route.stops.filter((s) => s.place === 'Home').forEach((s) => {
      push(o, 'NearHome', 'Medium', `${o.name} stayed ${s.durationMinutes} min near the registered residence during duty hours.`, new Date(s.from), { location: s.location, measuredValue: s.durationMinutes, measuredUnit: 'min' });
    });
  });

  // Device / rule alerts.
  const templates: { type: AlertType; severity: AlertSeverity; msg: (o: FieldOfficer, v: number) => string; unit: string; value: () => number }[] = [
    { type: 'Stationary', severity: 'Medium', msg: (o, v) => `${o.name} has been stationary for ${v} minutes while travelling.`, unit: 'min', value: () => intBetween(16, 48) },
    { type: 'GpsOff', severity: 'High', msg: (o, v) => `GPS / location was switched off on ${o.name}'s device for ${v} minutes.`, unit: 'min', value: () => intBetween(6, 55) },
    { type: 'OutsideBranchRadius', severity: 'High', msg: (o, v) => `${o.name} is ${v} km from the assigned branch (limit 30 km) without approval.`, unit: 'km', value: () => +between(31, 46).toFixed(1) },
  ];
  const staff = d.officers.filter((o) => o.role !== 'DM');
  for (let i = 0; i < 14; i++) {
    const tpl = pick(templates);
    const o = pick(staff);
    const b = branchById.get(o.branchId)!;
    const v = tpl.value();
    push(o, tpl.type, tpl.severity, tpl.msg(o, v), addMinutes(now, -intBetween(5, 60 * 24 * 5)), {
      location: tpl.type === 'OutsideBranchRadius' ? offsetPoint(b.location!, v * 1000, between(0, 360)) : offsetPoint(b.location!, between(1500, 12000), between(0, 360)),
      measuredValue: v,
      measuredUnit: tpl.unit,
    });
  }
  return alerts.filter((a) => new Date(a.raisedAt).getTime() <= now.getTime()).sort((a, b) => b.raisedAt.localeCompare(a.raisedAt));
}

function seedApprovals(fieldStaff: FieldOfficer[], branchById: Map<string, TrackingBranch>, now: Date): OutOfRadiusRequest[] {
  const approvals: OutOfRadiusRequest[] = [];
  const reasons = [
    'Potential new centre – 18 women interested, referred by an existing borrower',
    'Customer moved to a relative’s village, visiting for collection',
    'Area survey requested by the DM for new branch feasibility',
    'Joint lead sourcing camp with the neighbouring branch',
    'Group leader’s house for a dispute resolution meeting',
  ];
  for (let i = 0; i < 8; i++) {
    const officer = pick(fieldStaff.filter((o) => o.role !== 'AM'));
    const branch = branchById.get(officer.branchId)!;
    const dist = +between(31, 52).toFixed(1);
    const requestedAt = addMinutes(now, -intBetween(20, 60 * 24 * 3));
    const status = i < 4 ? 'Pending' : pick(['Approved', 'Approved', 'Rejected'] as const);
    approvals.push({
      id: uuid('r', i + 1),
      requestNo: `ORA-${(8100 + i).toString()}`,
      employeeId: officer.id,
      employeeName: officer.name,
      role: officer.role,
      branchId: branch.id,
      branchName: branch.name,
      branchLocation: branch.location,
      activity: pick(['LeadSourcing', 'LeadSourcing', 'CustomerVisit', 'Survey'] as const),
      reason: pick(reasons),
      destinationName: `${pick(['Birpara', 'Mal Bazar', 'Jalpaiguri', 'Hasimara', 'Barobisha', 'Coochbehar', 'Mathabhanga', 'Nagrakata'])} (outside radius)`,
      destination: offsetPoint(branch.location!, dist * 1000, between(0, 360)),
      distanceFromBranchKm: dist,
      requestedForDate: toDateKey(addDays(now, i < 4 ? intBetween(0, 2) : -intBetween(1, 3))),
      requestedAt: iso(requestedAt),
      status,
      decidedByName: status === 'Pending' ? null : officer.reportingOfficerName,
      decidedAt: status === 'Pending' ? null : iso(addMinutes(requestedAt, intBetween(30, 300))),
      decisionRemarks: status === 'Approved' ? 'Approved for one day' : status === 'Rejected' ? 'Not in this quarter’s expansion plan' : null,
    });
  }
  return approvals.sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));
}

function seedGeoTags(d: MockDb, branchById: Map<string, TrackingBranch>, now: Date): GeoTag[] {
  const geoTags: GeoTag[] = [];
  let tagNo = 1;
  const addTag = (kind: GeoTagKind, refId: string, name: string, refCode: string, branchId: string, address: string | null, location: GeoPoint | null, radiusMeters: number, photo: boolean) => {
    const taggedAt = addMinutes(now, -intBetween(60 * 24 * 10, 60 * 24 * 200));
    geoTags.push({
      id: uuid('gt', tagNo++),
      kind,
      refId,
      name,
      refCode,
      branchId,
      branchName: branchById.get(branchId)!.name,
      address,
      location,
      radiusMeters,
      photoUrl: location && photo ? evidencePhoto(name, location, taggedAt, hashString(refId) % 360) : null,
      verified: !!location && rand() < 0.8,
      taggedByName: location ? pick(d.officers).name : null,
      taggedAt: location ? iso(taggedAt) : null,
      history: location ? [{ location, radiusMeters, changedByName: pick(d.officers).name, changedAt: iso(taggedAt), reason: 'Initial geo-tag' }] : [],
    });
  };
  d.branches.forEach((b) => addTag('Branch', b.id, `${b.name} Branch`, b.code, b.id, `${b.name}, ${b.areaName}`, b.location, 30_000, false));
  d.groups.forEach((g) => addTag('GroupCentre', g.id, g.name, g.code, g.branchId, `${g.village}`, g.location, 150, false));
  d.regularCustomers.forEach((c) => addTag('Customer', c.id, c.name, c.loanAccountNo, c.branchId, c.address, c.location, 100, true));
  d.customers.forEach((c) => addTag('OdCustomer', c.id, c.customerName, c.loanAccountNo, c.branchId, c.address, c.homeLocation, 100, true));
  d.officers.forEach((o) => addTag('EmployeeHome', o.id, o.name, o.employeeCode, o.branchId, null, o.homeLocation, 50, false));
  return geoTags;
}

let db: MockDb | null = null;

export function mockDb(): MockDb {
  if (!db) db = buildDb();
  return db;
}

export { CURRENT_USER, SYSTEM, evidencePhoto, uuid, dayOf };
