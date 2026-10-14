/*
 * In-memory stand-in for the tracking backend (tracking-api).
 *
 * Only used while `useTrackingMocks` is true in the environment. It implements the same request /
 * response shapes documented in docs/TRACKING_API_CONTRACT.md, keeps changes for the lifetime of the
 * browser tab, and simulates employee movement so the live map changes on every poll.
 *
 * Delete this folder once the real tracking-api is available.
 */
import { FieldOfficer, OfficerRole } from '../models/field-officer';
import { GeoPoint, TrackingBranch } from '../models/geo';
import { GeoTag, GeoTagKind } from '../models/geo-tag';
import { EmployeeRoute, LivePosition, LiveStatus, RoutePoint, RouteStop } from '../models/live-position';
import { OverdueCustomer } from '../models/overdue-customer';
import { OutOfRadiusRequest } from '../models/approval-request';
import { AlertSeverity, AlertType, TrackingAlert } from '../models/tracking-alert';
import { TrackingSettings } from '../models/tracking-settings';
import {
  TaskHistoryEntry,
  TaskStatus,
  TaskTarget,
  TaskType,
  TrackingTask,
} from '../models/tracking-task';
import { distanceMeters, offsetPoint, toDateKey } from '../utils/geo-utils';

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

const rand = mulberry32(20261014);
const between = (min: number, max: number) => min + rand() * (max - min);
const intBetween = (min: number, max: number) => Math.floor(between(min, max + 1));
const pick = <T>(arr: readonly T[]): T => arr[Math.floor(rand() * arr.length)];
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
// Seed data
// ---------------------------------------------------------------------------------------------
const CURRENT_USER = { id: 'current-user', name: 'Current User' };

export interface MockDb {
  branches: TrackingBranch[];
  officers: FieldOfficer[];
  groups: { id: string; code: string; name: string; branchId: string; location: GeoPoint; village: string }[];
  customers: OverdueCustomer[];
  /** Regular (non-overdue) customers, only used for geo-tags and visit targets. */
  regularCustomers: { id: string; name: string; loanAccountNo: string; branchId: string; location: GeoPoint | null; address: string }[];
  tasks: TrackingTask[];
  history: TaskHistoryEntry[];
  alerts: TrackingAlert[];
  approvals: OutOfRadiusRequest[];
  geoTags: GeoTag[];
  settings: TrackingSettings;
  currentUser: { id: string; name: string };
}

const BRANCHES: TrackingBranch[] = [
  { id: uuid('b', 1), code: 'BRS', name: 'Barasat', location: { lat: 22.7225, lng: 88.481 }, operatingRadiusKm: 30 },
  { id: uuid('b', 2), code: 'KNG', name: 'Krishnanagar', location: { lat: 23.4013, lng: 88.501 }, operatingRadiusKm: 30 },
  { id: uuid('b', 3), code: 'BDN', name: 'Bardhaman', location: { lat: 23.24, lng: 87.869 }, operatingRadiusKm: 30 },
];

const VILLAGES: Record<string, string[]> = {
  BRS: ['Duttapukur', 'Madhyamgram', 'Habra', 'Amdanga', 'Kadambagachi', 'Noapara', 'Shasan', 'Guma'],
  KNG: ['Ghurni', 'Bahadurpur', 'Dhubulia', 'Asannagar', 'Bhimpur', 'Krishnagar Rural', 'Taherpur', 'Badkulla'],
  BDN: ['Galsi', 'Memari', 'Saktigarh', 'Talit', 'Rayna', 'Khandaghosh', 'Kurmun', 'Nari'],
};

const OFFICER_SEED: [string, OfficerRole, number, string][] = [
  ['Subhajit Das', 'BM', 1, 'Branch Manager'],
  ['Rupa Mondal', 'CO', 1, 'Credit Officer'],
  ['Ankit Ghosh', 'CO', 1, 'Credit Officer'],
  ['Moumita Saha', 'CO', 1, 'Senior Credit Officer'],
  ['Sourav Biswas', 'BM', 2, 'Branch Manager'],
  ['Priyanka Roy', 'CO', 2, 'Credit Officer'],
  ['Arindam Paul', 'CO', 2, 'Credit Officer'],
  ['Tanmoy Sarkar', 'BM', 3, 'Branch Manager'],
  ['Riya Banerjee', 'CO', 3, 'Credit Officer'],
  ['Debasish Pal', 'CO', 3, 'Credit Officer'],
  ['Sanjay Kundu', 'AM', 1, 'Area Manager'],
  ['Partha Mukherjee', 'DM', 3, 'Divisional Manager'],
];

const FIRST = ['Mitali', 'Sabina', 'Rekha', 'Jharna', 'Anjali', 'Sumitra', 'Laxmi', 'Rina', 'Tumpa', 'Shefali', 'Nasrin', 'Papiya', 'Kakali', 'Mampi', 'Sathi', 'Purnima', 'Bulbul', 'Rehana', 'Champa', 'Basanti'];
const LAST = ['Mondal', 'Bibi', 'Ghosh', 'Halder', 'Sardar', 'Khatun', 'Das', 'Pramanik', 'Mahato', 'Bag', 'Sheikh', 'Roy', 'Barman', 'Malik'];
const CO_BORROWER = ['Ratan', 'Sukumar', 'Abdul', 'Gopal', 'Haripada', 'Rafiq', 'Bikash', 'Nemai', 'Shyamal', 'Jahangir'];

function buildDb(): MockDb {
  const now = new Date();
  const branchById = new Map(BRANCHES.map((b) => [b.id, b]));

  // --- Officers ------------------------------------------------------------------------------
  const officers: FieldOfficer[] = OFFICER_SEED.map(([name, role, branchNo, designation], i) => {
    const branch = BRANCHES[branchNo - 1];
    const home = offsetPoint(branch.location!, between(2500, 9000), between(0, 360));
    return {
      id: uuid('e', i + 1),
      employeeCode: `WG${(1040 + i * 7).toString()}`,
      name,
      role,
      designation,
      branchId: branch.id,
      branchName: branch.name,
      phone: `98${intBetween(30000000, 99999999)}`,
      homeLocation: i === 9 ? null : home,
      reportingOfficerName: role === 'CO' ? OFFICER_SEED.find((o) => o[1] === 'BM' && o[2] === branchNo)?.[0] ?? null : role === 'BM' ? 'Sanjay Kundu' : role === 'AM' ? 'Partha Mukherjee' : null,
    };
  });
  const officerById = new Map(officers.map((o) => [o.id, o]));
  const cos = officers.filter((o) => o.role === 'CO');
  const fieldStaff = officers.filter((o) => o.role !== 'DM');

  // --- Groups / centres ----------------------------------------------------------------------
  const groups: MockDb['groups'] = [];
  BRANCHES.forEach((b) => {
    VILLAGES[b.code].slice(0, 5).forEach((village, j) => {
      groups.push({
        id: uuid(`g${b.code.toLowerCase()}`, j + 1),
        code: `${b.code}-G${(j + 1).toString().padStart(2, '0')}`,
        name: `${village} Mahila Group`,
        branchId: b.id,
        location: offsetPoint(b.location!, between(3000, 14000), between(0, 360)),
        village,
      });
    });
  });

  // --- Customers -----------------------------------------------------------------------------
  const customers: OverdueCustomer[] = [];
  const regularCustomers: MockDb['regularCustomers'] = [];
  let custNo = 1;
  BRANCHES.forEach((b) => {
    const branchGroups = groups.filter((g) => g.branchId === b.id);
    for (let k = 0; k < 16; k++) {
      const group = pick(branchGroups);
      const name = `${pick(FIRST)} ${pick(LAST)}`;
      const loanNo = `WG${b.code}${(100200 + custNo * 13).toString()}`;
      const location = rand() < 0.88 ? offsetPoint(group.location, between(120, 900), between(0, 360)) : null;
      const address = `${intBetween(2, 140)}, ${group.village}, ${b.name} Block`;
      if (k < 9) {
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
        regularCustomers.push({ id: uuid('c', custNo), name, loanAccountNo: loanNo, branchId: b.id, location, address });
      }
      custNo++;
    }
  });

  // --- Tasks ---------------------------------------------------------------------------------
  const tasks: TrackingTask[] = [];
  const history: TaskHistoryEntry[] = [];
  let taskNo = 1;
  let historyNo = 1;
  const pushHistory = (task: TrackingTask, action: TaskHistoryEntry['action'], when: Date, by: { id: string; name: string }, extra: Partial<TaskHistoryEntry> = {}) => {
    history.push({
      id: uuid('h', historyNo++),
      taskId: task.id,
      action,
      performedById: by.id,
      performedByName: by.name,
      performedAt: iso(when),
      fromAssigneeName: null,
      toAssigneeName: null,
      remarks: null,
      ...extra,
    });
  };

  const managers = officers.filter((o) => o.role === 'BM' || o.role === 'AM' || o.role === 'DM');
  const odToAssign = customers.filter((c) => c.homeLocation).slice(0, 14);

  for (let dayOffset = -6; dayOffset <= 2; dayOffset++) {
    const dateKey = toDateKey(addDays(now, dayOffset));
    const weekday = at(dateKey, 12).getDay();
    if (weekday === 0) continue; // Sunday off

    fieldStaff.forEach((officer) => {
      const branch = branchById.get(officer.branchId)!;
      const perDay = officer.role === 'CO' ? intBetween(2, 4) : intBetween(0, 2);
      for (let n = 0; n < perDay; n++) {
        const type: TaskType =
          officer.role === 'CO'
            ? pick<TaskType>(['CustomerVisit', 'GroupMeeting', 'GroupMeeting', 'OdFollowUp', 'LeadSourcing', 'CustomerVisit'])
            : pick<TaskType>(['OdFollowUp', 'GroupMeeting', 'Survey', 'CustomerVisit']);

        let target: TaskTarget;
        let odCustomer: OverdueCustomer | undefined;
        if (type === 'OdFollowUp' && odToAssign.length) {
          odCustomer = odToAssign.find((c) => c.branchId === branch.id && !c.followUp) ?? undefined;
          if (!odCustomer) continue;
          target = { kind: 'OdCustomer', refId: odCustomer.id, name: odCustomer.customerName, address: odCustomer.address, location: odCustomer.homeLocation!, matchRadiusMeters: 100 };
        } else if (type === 'GroupMeeting' || type === 'Survey') {
          const g = pick(groups.filter((x) => x.branchId === branch.id));
          target = { kind: 'GroupCentre', refId: g.id, name: type === 'Survey' ? `${g.village} – area survey` : `${g.name} (${g.code})`, address: `${g.village}, ${branch.name}`, location: g.location, matchRadiusMeters: 150 };
        } else if (type === 'LeadSourcing') {
          const village = pick(VILLAGES[branch.code]);
          target = { kind: 'Custom', refId: null, name: `${village} – new lead sourcing`, address: `${village}, ${branch.name}`, location: offsetPoint(branch.location!, between(4000, 18000), between(0, 360)), matchRadiusMeters: 300 };
        } else {
          const c = pick(regularCustomers.filter((x) => x.branchId === branch.id && x.location));
          target = { kind: 'Customer', refId: c.id, name: c.name, address: c.address, location: c.location!, matchRadiusMeters: 100 };
        }

        const startHour = 10 + n * 2 + intBetween(0, 1);
        const due = at(dateKey, Math.min(startHour + 2, 18), pick([0, 30]));
        const assignedAt = addMinutes(at(dateKey, 9, 0), -intBetween(30, 900));
        const source = rand() < 0.55 ? 'System' : 'Manual';
        const assigner = source === 'System' ? { id: 'system', name: 'Allocation Engine' } : pick(managers);

        // Status from where the day is relative to "now".
        let status: TaskStatus = 'Assigned';
        const planned = at(dateKey, startHour, intBetween(0, 40));
        if (dayOffset < 0) status = rand() < 0.86 ? 'Completed' : rand() < 0.7 ? 'Missed' : 'Cancelled';
        else if (dayOffset === 0) {
          if (planned.getTime() + 80 * 60_000 < now.getTime()) status = rand() < 0.85 ? 'Completed' : 'Missed';
          else if (planned.getTime() + 25 * 60_000 < now.getTime()) status = 'InProgress';
          else if (planned.getTime() < now.getTime()) status = 'Arrived';
        }

        const id = uuid('t', taskNo);
        const task: TrackingTask = {
          id,
          taskNo: `TSK-${(24000 + taskNo).toString()}`,
          type,
          title:
            type === 'OdFollowUp' ? `OD follow-up – ${target.name}` :
            type === 'GroupMeeting' ? `Centre meeting – ${target.name.split(' (')[0]}` :
            type === 'CustomerVisit' ? `Customer visit – ${target.name}` :
            type === 'Survey' ? `Area survey – ${target.address.split(',')[0]}` :
            `Lead sourcing – ${target.address.split(',')[0]}`,
          description: type === 'OdFollowUp' ? `Overdue ₹${odCustomer!.overdueAmount.toLocaleString('en-IN')} · ${odCustomer!.dpd} DPD. Collect or record PTP date.` : null,
          priority: type === 'OdFollowUp' ? 'High' : pick(['Normal', 'Normal', 'Low', 'High'] as const),
          source,
          status,
          assigneeId: officer.id,
          assigneeName: officer.name,
          assigneeRole: officer.role,
          branchId: branch.id,
          branchName: branch.name,
          target,
          scheduledDate: dateKey,
          dueBy: iso(due),
          assignedById: assigner.id,
          assignedByName: assigner.name,
          timeline: { assignedAt: iso(assignedAt), arrivedAt: null, startedAt: null, completedAt: null },
          verification: null,
          odOutcome: null,
          isLate: false,
        };

        pushHistory(task, 'Created', assignedAt, assigner, { toAssigneeName: officer.name, remarks: source === 'System' ? 'Auto-allocated by rule' : null });

        // Occasionally reassigned before the day started.
        if (rand() < 0.12 && officer.role === 'CO') {
          const other = pick(cos.filter((c) => c.branchId === officer.branchId && c.id !== officer.id));
          if (other) {
            pushHistory(task, 'Reassigned', addMinutes(assignedAt, 40), pick(managers), {
              fromAssigneeName: other.name,
              toAssigneeName: officer.name,
              remarks: `${other.name.split(' ')[0]} on leave`,
            });
          }
        }

        if (status !== 'Assigned' && status !== 'Cancelled' && status !== 'Missed') {
          const arrived = addMinutes(planned, intBetween(-10, 25));
          const mismatch = rand() < 0.12;
          const arrivalPoint = offsetPoint(target.location, mismatch ? between(350, 900) : between(4, 70), between(0, 360));
          task.timeline.arrivedAt = iso(arrived);
          pushHistory(task, 'Arrived', arrived, officer);
          task.verification = {
            arrivalLocation: arrivalPoint,
            arrivalDistanceMeters: Math.round(distanceMeters(arrivalPoint, target.location)),
            completionLocation: null,
            completionDistanceMeters: null,
            locationMatched: null,
            photoUrl: null,
            photoTakenAt: null,
          };
          if (status === 'InProgress' || status === 'Completed') {
            const started = addMinutes(arrived, intBetween(2, 8));
            task.timeline.startedAt = iso(started);
            pushHistory(task, 'Started', started, officer);
          }
          if (status === 'Completed') {
            const done = addMinutes(arrived, intBetween(20, 75));
            const completionPoint = offsetPoint(arrivalPoint, between(2, 25), between(0, 360));
            const dist = Math.round(distanceMeters(completionPoint, target.location));
            task.timeline.completedAt = iso(done);
            task.verification.completionLocation = completionPoint;
            task.verification.completionDistanceMeters = dist;
            task.verification.locationMatched = dist <= target.matchRadiusMeters;

            const paid = type === 'OdFollowUp' && rand() < 0.4;
            if (type === 'OdFollowUp') {
              task.odOutcome = {
                customerAvailable: rand() < 0.85,
                paid,
                amountCollected: paid ? odCustomer!.overdueAmount : null,
                ptpDate: paid ? null : toDateKey(addDays(done, intBetween(3, 12))),
                remarks: paid ? 'Full overdue collected' : pick(['Husband working outside, promised to pay', 'Crop sale pending', 'Medical expense this month']),
              };
            }
            if (!paid) {
              task.verification.photoUrl = evidencePhoto(task.title, completionPoint, done, hashString(id) % 360);
              task.verification.photoTakenAt = iso(addMinutes(done, -1));
            }
            pushHistory(task, 'Completed', done, officer, { remarks: task.verification.locationMatched ? null : `Photo ${dist} m from geo-tag` });
            task.isLate = done.getTime() > due.getTime();
          }
        }
        if (status === 'Missed') {
          pushHistory(task, 'MarkedMissed', addMinutes(due, 5), { id: 'system', name: 'Allocation Engine' }, { remarks: 'Not completed by due time' });
          task.isLate = true;
        }
        if (status === 'Cancelled') {
          pushHistory(task, 'Cancelled', addMinutes(assignedAt, 120), pick(managers), { remarks: 'Customer shifted / meeting postponed' });
        }
        if ((status === 'Assigned' || status === 'Arrived' || status === 'InProgress') && due.getTime() < now.getTime()) {
          task.isLate = true;
        }

        if (odCustomer) {
          odCustomer.followUp = {
            taskId: task.id,
            taskNo: task.taskNo,
            assigneeName: officer.name,
            assigneeRole: officer.role,
            scheduledDate: dateKey,
            status,
            outcome: task.odOutcome,
          };
        }

        tasks.push(task);
        taskNo++;
      }
    });
  }

  // --- Alerts --------------------------------------------------------------------------------
  const alerts: TrackingAlert[] = [];
  const alertTemplates: { type: AlertType; severity: AlertSeverity; msg: (o: FieldOfficer, v: number) => string; unit: string | null; value: () => number }[] = [
    { type: 'Stationary', severity: 'Medium', msg: (o, v) => `${o.name} has been stationary for ${v} minutes while travelling.`, unit: 'min', value: () => intBetween(16, 48) },
    { type: 'NearHome', severity: 'Medium', msg: (o, v) => `${o.name} is ${v} m from the registered residence during duty hours.`, unit: 'm', value: () => intBetween(8, 48) },
    { type: 'GpsOff', severity: 'High', msg: (o, v) => `GPS / location was switched off on ${o.name}'s device for ${v} minutes.`, unit: 'min', value: () => intBetween(6, 55) },
    { type: 'OutsideBranchRadius', severity: 'High', msg: (o, v) => `${o.name} is ${v} km from the assigned branch (limit 30 km) without approval.`, unit: 'km', value: () => +between(31, 46).toFixed(1) },
    { type: 'LocationMismatch', severity: 'High', msg: (o, v) => `Task completion photo by ${o.name} was taken ${v} m away from the geo-tagged location.`, unit: 'm', value: () => intBetween(320, 950) },
    { type: 'LateTask', severity: 'Low', msg: (o, v) => `${o.name} completed a task ${v} minutes after the due time.`, unit: 'min', value: () => intBetween(15, 90) },
  ];
  for (let i = 0; i < 28; i++) {
    const tpl = pick(alertTemplates);
    const officer = pick(fieldStaff);
    const branch = branchById.get(officer.branchId)!;
    const value = tpl.value();
    const raised = addMinutes(now, -intBetween(5, 60 * 24 * 4));
    const age = (now.getTime() - raised.getTime()) / 3_600_000;
    const status = age < 3 ? 'Open' : age < 20 ? pick(['Open', 'Acknowledged'] as const) : pick(['Resolved', 'Resolved', 'Acknowledged'] as const);
    const location =
      tpl.type === 'NearHome' && officer.homeLocation ? offsetPoint(officer.homeLocation, value, between(0, 360)) :
      tpl.type === 'OutsideBranchRadius' ? offsetPoint(branch.location!, value * 1000, between(0, 360)) :
      offsetPoint(branch.location!, between(1500, 15000), between(0, 360));
    const reporting = officer.reportingOfficerName ?? 'Partha Mukherjee';
    alerts.push({
      id: uuid('a', i + 1),
      type: tpl.type,
      severity: tpl.severity,
      employeeId: officer.id,
      employeeName: officer.name,
      role: officer.role,
      branchId: branch.id,
      branchName: branch.name,
      message: tpl.msg(officer, value),
      location,
      measuredValue: value,
      measuredUnit: tpl.unit,
      taskId: null,
      raisedAt: iso(raised),
      status,
      notifiedTo: [reporting, 'Administration'],
      acknowledgedByName: status !== 'Open' ? reporting : null,
      acknowledgedAt: status !== 'Open' ? iso(addMinutes(raised, intBetween(5, 90))) : null,
      resolvedByName: status === 'Resolved' ? reporting : null,
      resolvedAt: status === 'Resolved' ? iso(addMinutes(raised, intBetween(90, 400))) : null,
      resolutionRemarks: status === 'Resolved' ? pick(['Spoke to employee – lunch break', 'Network issue in the area', 'Approved field camp', 'Warning issued']) : null,
    });
  }
  alerts.sort((a, b) => b.raisedAt.localeCompare(a.raisedAt));

  // --- Out-of-radius approvals ---------------------------------------------------------------
  const approvals: OutOfRadiusRequest[] = [];
  const reasons = [
    'Potential new centre – 18 women interested, referred by existing borrower',
    'Customer relocated to relative’s village, visiting for collection',
    'Area survey requested by DM for new branch feasibility',
    'Joint lead sourcing camp with neighbouring branch',
    'Group leader’s house for a dispute resolution meeting',
  ];
  for (let i = 0; i < 8; i++) {
    const officer = pick(fieldStaff.filter((o) => o.role !== 'AM'));
    const branch = branchById.get(officer.branchId)!;
    const dist = +between(31, 52).toFixed(1);
    const destination = offsetPoint(branch.location!, dist * 1000, between(0, 360));
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
      destinationName: `${pick(['Chakdaha', 'Ranaghat', 'Kalna', 'Bolpur', 'Basirhat', 'Bongaon', 'Katwa', 'Shantipur'])} (outside radius)`,
      destination,
      distanceFromBranchKm: dist,
      requestedForDate: toDateKey(addDays(now, i < 4 ? intBetween(0, 2) : -intBetween(1, 3))),
      requestedAt: iso(requestedAt),
      status,
      decidedByName: status === 'Pending' ? null : 'Sanjay Kundu',
      decidedAt: status === 'Pending' ? null : iso(addMinutes(requestedAt, intBetween(30, 300))),
      decisionRemarks: status === 'Approved' ? 'Approved for one day' : status === 'Rejected' ? 'Not in this quarter’s expansion plan' : null,
    });
  }
  approvals.sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));

  // --- Geo-tags ------------------------------------------------------------------------------
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
      taggedByName: location ? pick(officers).name : null,
      taggedAt: location ? iso(taggedAt) : null,
      history: location ? [{ location, radiusMeters, changedByName: pick(officers).name, changedAt: iso(taggedAt), reason: 'Initial geo-tag' }] : [],
    });
  };
  BRANCHES.forEach((b) => addTag('Branch', b.id, `${b.name} Branch`, b.code, b.id, `${b.name} Main Road`, b.location, 30_000, false));
  groups.forEach((g) => addTag('GroupCentre', g.id, g.name, g.code, g.branchId, `${g.village}`, g.location, 150, false));
  regularCustomers.forEach((c) => addTag('Customer', c.id, c.name, c.loanAccountNo, c.branchId, c.address, c.location, 100, true));
  customers.forEach((c) => addTag('OdCustomer', c.id, c.customerName, c.loanAccountNo, c.branchId, c.address, c.homeLocation, 100, true));
  officers.forEach((o) => addTag('EmployeeHome', o.id, o.name, o.employeeCode, o.branchId, null, o.homeLocation, 50, false));

  // --- Settings ------------------------------------------------------------------------------
  const settings: TrackingSettings = {
    homeRadiusMeters: 50,
    stationaryMinutes: 15,
    branchRadiusKm: 30,
    locationMatchRadiusMeters: 100,
    gpsOffGraceMinutes: 5,
    positionIntervalSeconds: 60,
    workingHoursStart: '09:30',
    workingHoursEnd: '18:00',
    notifyReportingOfficer: true,
    notifyCreditOfficer: true,
    notifyAdministration: true,
    autoAssignOdFollowUps: true,
    autoAssignOdMinDpd: 7,
    autoAssignGroupMeetings: true,
    autoAllocationTime: '07:30',
    exceptions: [
      { id: uuid('x', 1), name: 'Lunch break', appliesTo: 'Stationary', description: 'Stationary alerts suppressed during lunch.', fromTime: '13:30', toTime: '14:15', isActive: true },
      { id: uuid('x', 2), name: 'Branch meeting days', appliesTo: 'Stationary', description: 'Weekly review meeting at the branch.', fromTime: '09:30', toTime: '11:00', isActive: true },
      { id: uuid('x', 3), name: 'CO lives in the operating village', appliesTo: 'NearHome', description: 'Approved list of COs whose home is inside their centre cluster.', fromTime: null, toTime: null, isActive: false },
    ],
    lastModifiedByName: 'Partha Mukherjee',
    lastModifiedAt: iso(addDays(now, -9)),
  };

  return {
    branches: BRANCHES,
    officers,
    groups,
    customers,
    regularCustomers,
    tasks: tasks.sort((a, b) => b.scheduledDate.localeCompare(a.scheduledDate) || a.dueBy.localeCompare(b.dueBy)),
    history,
    alerts,
    approvals,
    geoTags,
    settings,
    currentUser: CURRENT_USER,
  };
}

let db: MockDb | null = null;

export function mockDb(): MockDb {
  if (!db) db = buildDb();
  return db;
}

// ---------------------------------------------------------------------------------------------
// Live simulation
// ---------------------------------------------------------------------------------------------

/** Positions that move a little on every call, driven by the clock. */
export function simulateLivePositions(): LivePosition[] {
  const d = mockDb();
  const now = new Date();
  const today = toDateKey(now);
  const branchById = new Map(d.branches.map((b) => [b.id, b]));
  const minuteOfDay = now.getHours() * 60 + now.getMinutes();
  const withinShift = minuteOfDay >= 9 * 60 + 30 && minuteOfDay <= 18 * 60 + 30;

  return d.officers
    .filter((o) => o.role !== 'DM')
    .map((o, i) => {
      const branch = branchById.get(o.branchId)!;
      const todays = d.tasks.filter((t) => t.assigneeId === o.id && t.scheduledDate === today && t.status !== 'Cancelled');
      const active = todays.find((t) => t.status === 'Arrived' || t.status === 'InProgress');
      const openAlerts = d.alerts.filter((a) => a.employeeId === o.id && a.status === 'Open').length;

      // A few fixed "personas" so every status appears.
      let status: LiveStatus;
      if (i === 6) status = 'GpsOff';
      else if (i === 9) status = 'Offline';
      else if (i === 8 && !withinShift) status = 'NotPunchedIn';
      else if (active) status = 'OnTask';
      else status = Math.floor(now.getTime() / 90_000 + i) % 4 === 0 ? 'Idle' : 'Moving';

      // Wander between the branch and today's targets as time passes.
      const stops = [branch.location!, ...todays.map((t) => t.target.location)];
      const phase = (now.getTime() / 600_000 + i * 0.37) % stops.length;
      const from = stops[Math.floor(phase)];
      const to = stops[(Math.floor(phase) + 1) % stops.length];
      const f = phase - Math.floor(phase);
      let location: GeoPoint | null = active
        ? offsetPoint(active.target.location, 20 + (i % 3) * 15, (i * 47) % 360)
        : { lat: from.lat + (to.lat - from.lat) * f, lng: from.lng + (to.lng - from.lng) * f };

      if (i === 3) location = offsetPoint(branch.location!, 33_500 + (now.getMinutes() % 5) * 300, 40); // outside 30 km
      if (i === 2 && o.homeLocation) location = offsetPoint(o.homeLocation, 28, 120); // near home

      const lastSeen = status === 'GpsOff' ? addMinutes(now, -23) : status === 'Offline' ? addMinutes(now, -95) : addMinutes(now, -(i % 3));
      if (status === 'NotPunchedIn') location = null;

      return {
        employeeId: o.id,
        employeeName: o.name,
        role: o.role,
        branchId: o.branchId,
        branchName: o.branchName,
        location,
        accuracyMeters: status === 'GpsOff' ? null : 6 + (i % 5) * 3,
        speedKmph: status === 'Moving' ? 18 + (i % 4) * 6 : 0,
        lastSeenAt: status === 'NotPunchedIn' ? null : iso(lastSeen),
        gpsEnabled: status !== 'GpsOff',
        status,
        punchedInAt: status === 'NotPunchedIn' ? null : iso(at(today, 9, 30 + (i % 4) * 7)),
        currentTaskId: active?.id ?? null,
        currentTaskTitle: active?.title ?? null,
        distanceFromBranchKm: location ? +(distanceMeters(location, branch.location!) / 1000).toFixed(1) : null,
        batteryPct: 22 + ((i * 17) % 75),
        openAlertCount: openAlerts,
      } satisfies LivePosition;
    });
}

/** A plausible GPS trail for one employee on one day. */
export function simulateRoute(employeeId: string, dateKey: string): EmployeeRoute {
  const d = mockDb();
  const officer = d.officers.find((o) => o.id === employeeId);
  const empty: EmployeeRoute = { employeeId, date: dateKey, points: [], stops: [], totalDistanceKm: 0, punchInAt: null, punchOutAt: null };
  if (!officer) return empty;

  const branch = d.branches.find((b) => b.id === officer.branchId)!;
  const now = new Date();
  const dayStart = at(dateKey, 9, 30);
  if (dayStart.getTime() > now.getTime() || at(dateKey, 12).getDay() === 0) return empty;

  const r = mulberry32(hashString(employeeId + dateKey));
  const tasks = d.tasks
    .filter((t) => t.assigneeId === employeeId && t.scheduledDate === dateKey && t.status !== 'Cancelled')
    .sort((a, b) => a.dueBy.localeCompare(b.dueBy));

  const waypoints: { p: GeoPoint; stayMin: number; label: string | null }[] = [
    { p: officer.homeLocation ?? offsetPoint(branch.location!, 4000, 200), stayMin: 0, label: 'Home' },
    { p: branch.location!, stayMin: 35 + Math.floor(r() * 20), label: `${branch.name} Branch` },
    ...tasks.map((t) => ({ p: t.target.location, stayMin: 20 + Math.floor(r() * 35), label: t.title })),
    { p: branch.location!, stayMin: 25, label: `${branch.name} Branch` },
  ];
  if (r() < 0.6) {
    // An unscheduled tea stop – shows up as an unlabelled stop.
    waypoints.splice(2, 0, { p: offsetPoint(branch.location!, 2500 + r() * 3000, r() * 360), stayMin: 18 + Math.floor(r() * 10), label: null });
  }

  const points: RoutePoint[] = [];
  const stops: RouteStop[] = [];
  let clock = new Date(dayStart.getTime() - 25 * 60_000);
  const limit = toDateKey(now) === dateKey ? now : at(dateKey, 18, 30);
  let totalM = 0;

  for (let w = 0; w < waypoints.length - 1 && clock < limit; w++) {
    const a = waypoints[w].p;
    const b = waypoints[w + 1].p;
    const segM = distanceMeters(a, b);
    const speedKmph = 16 + r() * 14;
    const travelMin = Math.max(4, (segM / 1000 / speedKmph) * 60);
    const steps = Math.max(3, Math.round(travelMin / 2));
    for (let s = 0; s <= steps && clock < limit; s++) {
      const f = s / steps;
      const jitter = s > 0 && s < steps ? offsetPoint({ lat: a.lat + (b.lat - a.lat) * f, lng: a.lng + (b.lng - a.lng) * f }, r() * 120, r() * 360) : { lat: a.lat + (b.lat - a.lat) * f, lng: a.lng + (b.lng - a.lng) * f };
      if (points.length) totalM += distanceMeters(points[points.length - 1], jitter);
      points.push({ lat: jitter.lat, lng: jitter.lng, at: iso(clock), speedKmph: s === steps ? 0 : +speedKmph.toFixed(1) });
      clock = addMinutes(clock, travelMin / steps);
    }
    const stay = waypoints[w + 1].stayMin;
    if (stay > 0 && clock < limit) {
      const from = new Date(clock);
      const to = new Date(Math.min(addMinutes(clock, stay).getTime(), limit.getTime()));
      stops.push({ location: b, from: iso(from), to: iso(to), durationMinutes: Math.round((to.getTime() - from.getTime()) / 60_000), label: waypoints[w + 1].label });
      for (let m = 5; m < stay && addMinutes(from, m) < limit; m += 5) {
        const p = offsetPoint(b, r() * 15, r() * 360);
        points.push({ lat: p.lat, lng: p.lng, at: iso(addMinutes(from, m)), speedKmph: 0 });
      }
      clock = to;
    }
  }

  const isPast = toDateKey(now) !== dateKey;
  return {
    employeeId,
    date: dateKey,
    points,
    stops,
    totalDistanceKm: +(totalM / 1000).toFixed(1),
    punchInAt: iso(dayStart),
    punchOutAt: isPast ? iso(at(dateKey, 18, 10)) : null,
  };
}

export { CURRENT_USER, evidencePhoto, uuid };
