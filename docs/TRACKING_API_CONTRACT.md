# Tracking API Contract (`tracking-api`)

> Contract between the **web frontend** (jobs, assignment and monitoring) and the **backend**.
> The frontend currently runs against an in-browser mock that implements exactly this contract
> (`features/tracking/mocks/`). The backend team can build to this document. When the real service is up,
> set `useTrackingMocks: false` in the environment file. No other frontend change should be needed.

**Source of truth for shapes:** the TypeScript interfaces in
`projects/qubefin-app/src/app/features/tracking/models/*.ts` (jobs and tasks: `models/job.ts`). This document
names them and adds the rules the server must enforce. Shared business rules are also in `utils/job-rules.ts`.

**Terminology.** *Member* is the primary business entity (never "customer"; microfinance usage). An **OD Member** is a
Member whose loan account is overdue (Loan Status Report). Use these names in labels, APIs, payloads and reports: kinds
`Member` / `OdMember`, fields `memberId` / `memberName` / `memberAvailable`, endpoints `od-members/*`. A late *job* is
`Delayed`, never "overdue", so it is not confused with an OD Member.
> Renamed 27 Oct 2026: `overdue-customers/*` → `od-members/*`, `OverdueCustomer*` → `OdMember*`, `customers` → `members`,
> `customerId(s)` / `customerName` / `customerAvailable` → `memberId(s)` / `memberName` / `memberAvailable`,
> `GeoTagKind`/`TaskTargetKind` `Customer` / `OdCustomer` → `Member` / `OdMember`, `OutOfRadiusActivity` `CustomerVisit` → `MemberVisit`.
> Added 27 Oct 2026: DPD range filter (`dpdRange`) on `od-members/search` (replaces `minDpd`) and `jobs/search`;
> location verification for groups and members (`GeoTagPoint.verified`, `OdMember.locationVerified`, rule 3.2.13).

---

## 1. Conventions

| Item | Rule |
|---|---|
| Base path | `{gatewayPath}tracking-api/…`. The frontend sends relative URLs (`ApiPaths.TRACKING`), and `AuthInterceptor` adds the gateway and `Authorization: Bearer <accessToken>`. |
| Scope | Every list is filtered **server-side** to what the caller may see and act on (own branch / area / division, per the hierarchy Admin > DM > AM > BM > ABM > CO, §3.3). The UI never filters by hierarchy itself; it only shows or hides actions from `job.permissions`. |
| Ids | GUID strings. |
| Dates | `yyyy-MM-dd` for calendar days (`startFrom`, `completeBy`, `date`…). ISO-8601 with offset for instants (`createdAt`, `completedAt`, `performedAt`…). |
| Coordinates | `{ "lat": number, "lng": number }`, WGS-84, 6 decimals (`GeoPoint`). |
| Errors | Non-2xx with `{ "message": "human readable" }` (400 invalid, 403 not allowed for this user, 404 not found or outside the caller's scope) or `{ "errors": ["…"] }`. `HttpErrorInterceptor` shows them as a popup, so messages must be readable by a branch user. |
| DPD ranges | `dpdRange` ∈ `Days1To30` (1–30 days) · `Days31To60` (31–60) · `Days61To90` (61–90) · `Over90` (91 and above, shown as "90+"), or null = any. Both bounds inclusive, no overlap. Same ranges everywhere (`utils/dpd.ts`). |
| Writes | Return the updated entity (or the documented response). Every write is audited with user + server time. |
| Polling | Live screens poll every **30 s** (positions, routes for today, alerts, job lists, approvals). Keep these endpoints cheap. SignalR can replace polling later without changing response shapes. |

---

## 2. Lookups

| Method | Path | Response |
|---|---|---|
| GET | `me` | `TrackingViewer`: `employeeId` (null for an admin without an employee record), name, `role` (`Admin`·`DM`·`AM`·`BM`·`ABM`·`CO`), `unitName`, `branchIds` (scope), `canCreateJobs` |
| GET | `branches` | `TrackingBranch[]`: id, name, code, `areaName`, `divisionName`, `location` (nullable), `operatingRadiusKm` |
| GET | `field-officers?branchId=` | `FieldOfficer[]`: id, employeeCode, name, `role` (`CO`·`ABM`·`BM`·`AM`·`DM`), designation, `branchId`/`branchName` (posting), `unitName` (branch / area / division in charge of), `branchIds` (branches they may work in), phone, `homeLocation`, reportingOfficerName |

* `branches` returns the branches in the caller's scope (every branch for an Admin).
* `field-officers` returns only people the caller may assign work to: a **lower role** whose `branchIds` all lie inside the
  caller's scope (§3.3). The same list feeds the monitoring filters. `branchId` filters to people whose `branchIds` include it.
* `me.role = "Admin"` covers both **Super Admin** and **Application Administrator**; they have the same access in tracking.
  `canCreateJobs` is false when nobody is below the caller (a CO).
* `branchIds`: one branch for CO / ABM / BM; every branch of the area (AM) or division (DM).

---

## 3. Jobs and tasks

A **job** is the unit of assignment: one assignee (or none yet), one `completeBy` date, and any number of **tasks** of
mixed types. Tasks have a location but no time and no order.

`TaskType`: `GroupVisit` · `MemberVisit` · `OdFollowUp` · `LeadSourcing` · `Survey`. (`CentreMeeting` was removed: a group /
centre meeting is a `GroupVisit`. No Centre Meeting data exists, so nothing to migrate.)

**Type follows the place.** The web picks the type from the target (`utils/job-rules.ts` → `TYPES_FOR_KIND`; first = default):

| `target.kind` | Default type | Also allowed |
|---|---|---|
| `GroupCentre` | `GroupVisit` | `Survey`, `LeadSourcing` |
| `Member` | `MemberVisit` | – |
| `OdMember` | `OdFollowUp` | `MemberVisit` (e.g. a loan-use check on an OD member) |
| `Branch` | `Survey` | – |
| `Custom` (point on the map) | `LeadSourcing` | `Survey` |

The server should reject a task whose type is not allowed for its `target.kind` (400). Lead sourcing and surveys are mostly
self-added on the mobile app; the web only offers them as a point clicked on the map.

| Method | Path | Body | Response |
|---|---|---|---|
| POST | `jobs/search` | `JobSearchRequest` | `JobSearchResponse` `{ jobs: JobSummary[], totalRecords, summary }` |
| GET | `jobs/open?assigneeId=&branchId=` | – | `JobSummary[]`: open jobs, soonest due first (for "add to existing job") |
| GET | `jobs/task-points?branchId=&assigneeId=&pendingOnly=true` | – | `JobTaskPoint[]`: task locations of open jobs (overview map, duplicate hints) |
| GET | `jobs/{id}` | – | `Job` (with `tasks`) |
| GET | `jobs/{id}/history` | – | `JobHistoryEntry[]` (newest first) |
| POST | `jobs` | `CreateJobRequest` | `AddTasksResponse` `{ job, skipped }` |
| PUT | `jobs/{id}/assign` | `{ assigneeId, remarks }` | `Job` |
| PUT | `jobs/{id}/transfer` | `TransferJobRequest` | `TransferJobResponse` `{ job, newJob }` |
| POST | `jobs/{id}/tasks` | `{ tasks: NewTaskInput[] }` | `AddTasksResponse` |
| PUT | `jobs/{id}/tasks/{taskId}/cancel` | `{ remarks }` | `Job` |
| PUT | `jobs/{id}/tasks/{taskId}/reject` | `{ remarks }` | `Job` (self-added tasks only) |
| PUT | `jobs/{id}/extend` | `{ completeBy, remarks }` | `Job` |
| PUT | `jobs/{id}/cancel` | `{ remarks }` | `Job` |

**Search filters:** `searchText` (job no, title, assignee, creator, task no, place name), `status`, `openOnly`, `branchId`
(job has a task in that branch), `assigneeId`, `dueFrom`/`dueTo` (inclusive, on `completeBy`), `dpdRange` (job has at least one
`OdMember` task, pending or completed, whose member's **current** DPD from the Loan Status Report is in the range), paging, and
`sortOn` ∈ `completeBy`·`createdAt`·`assigneeName`·`status`. `summary` is computed over the same filters **excluding** status:
`total, unassigned, assigned, inProgress, delayed, completed`.

### 3.1 Status

`JobStatus` is **derived** by the server on every read and write:

| Status | When |
|---|---|
| `Cancelled` | Cancelled by a user, or every task was cancelled / rejected / moved out with none done |
| `Completed` | No pending task left and at least one done |
| `Unassigned` | No assignee yet |
| `Delayed` | Pending tasks and today is after `completeBy`. Called *Delayed*, not *Overdue*, so it is never confused with an overdue (OD) member |
| `InProgress` | At least one task done, some pending |
| `Assigned` | Assigned, nothing done yet (shown as "Not started") |

`JobTaskStatus`: `Pending` → `Completed` (mobile app), or `Cancelled` / `Rejected` / `Transferred`. Only `Pending` and
`Completed` tasks count in `taskCount`, `doneCount`, `openCount`. `TaskOrigin`: `Assigned` (web) or `SelfAdded` (mobile).

### 3.2 Rules the server must enforce

1. **Every task needs a location** (`target.location`) and a `target.branchId`. Geo-tagged places (`kind` + `refId`) copy the
   location from the geo-tag at the time the task is added; `kind: "Custom"` is a point picked on the map.
2. **Branch rule.** A CO, ABM or BM may only hold a job whose tasks are all in their own branch. An AM or DM may hold a job whose
   tasks are in any branch they cover (`branchIds`). Checked on create, assign, transfer and add tasks. An unassigned job may span
   branches; it can then only be assigned to someone who covers all of them. Return 400 with the reason.
3. **Conflict rule.** The same place may not have the same task type `Pending` in two open jobs whose date windows overlap.
   Window = `startFrom` (or the creation day) to `completeBy`; a delayed job stays active until today. Duplicates inside one request
   are also refused. Conflicting tasks are **skipped, not failed**, and returned in `skipped[]` with the reason
   (e.g. "Already pending as TSK-48001 in JOB-26001"). If nothing could be added on create, return 400.
4. **OD members** can only be pending in one job at a time (any window).
5. `completeBy` cannot be in the past on create; `startFrom` ≤ `completeBy`. Extending needs a later date (not in the past) and a reason.
6. **Assign** only an unassigned job; otherwise use transfer.
7. **Transfer** (open jobs with pending tasks, reason required; only the creator or someone above them, §3.3). Completed tasks
   always stay with whoever did them, because their route and travel allowance depend on it:
   * `taskIds: null` on a job with **nothing done** → **whole job**: the job gets the new assignee. History `Transferred`.
   * `taskIds: null` on a job with completed tasks → handled as a partial transfer of **every pending task** (below); the original
     job keeps the original assignee and its completed tasks.
   * `taskIds: [...]` → **partial**: a new job is created for the new assignee with copies of those pending tasks (new task numbers),
     `transferredFromJobId/No` set, `completeBy` from the request (default: the original's). The original tasks become
     `Transferred` with `transferredToJobId/No`. History `TasksTransferredOut` on the old job, `Created` + `TasksTransferredIn` on the new one.
   * A partial transfer of every pending task of a job with nothing done is treated as a whole transfer.
8. **Cancel task**: pending only. **Reject task**: pending `SelfAdded` only. **Cancel job**: open jobs; pending tasks become
   `Cancelled`, completed ones stay on record.
9. **Timestamps are server-generated** (`arrivedAt`, `completedAt`, `photoTakenAt`), stamped when the mobile event arrives.
   Clients can never send or edit them (requirement 4.4).
10. On completion (mobile), store the photo URL, the photo's GPS fix, `completionDistanceMeters`, and
    `locationMatched = distance ≤ target.matchRadiusMeters` (requirement 3.2). `isLate` = completed after `completeBy`
    (or still pending after it).
11. **Audit trail** (`JobHistoryEntry`) is append-only: `Created, Assigned, Transferred, TasksTransferredOut, TasksTransferredIn,
    TasksAdded, TaskSelfAdded, TaskCompleted, TaskCancelled, TaskRejected, DateExtended, BecameDelayed, Completed, Cancelled`,
    with performer, server time, from / to assignee, task numbers, related job and remarks.
12. A nightly job writes `BecameDelayed` (and raises a `DelayedJob` alert, §6) for jobs that pass `completeBy` with pending tasks.
13. **Verified locations only.** A `GroupCentre`, `Member` or `OdMember` target can be put in a job (create, add tasks,
    `od-members/add-to-job`) only when its geo-tag is **verified**. Otherwise the task is **skipped** with the reason
    "Location not verified" (same as rule 3 conflicts). The web shows these places with a "Location Not Verified" badge and does not
    let them be selected. Verification is done from the **mobile app**; when a group location is changed on the web (§8), `verified`
    goes back to false until it is verified again on the mobile app. Branches and map points are not affected. Tasks already in a job,
    and tasks self-added on the mobile app, are not affected.

### 3.3 Roles: who may see and do what

Hierarchy, top to bottom: **Admin** (Super Admin and Application Administrator, equal access) > **DM** (Division Manager) >
**AM** (Area Manager) > **BM** (Branch Manager) > **ABM** > **CO** (Credit Officer). DM, AM, BM, ABM and CO are tracked in the field;
their tracking data feeds petrol and travel allowances. Scope = own branch (BM / ABM / CO), area (AM), division (DM), everything (Admin).
(ABM is not in the client's role list; it is kept between BM and CO until confirmed.)

1. **Who can get work from whom.** A user may create or assign jobs for anyone in a **lower role inside their own scope**: an AM for the
   BMs and COs of their area, a DM for anyone in their division. Usually it is the next role down, but skipping is allowed (an AM may
   give a job straight to a CO, with no BM approval). Return 403 otherwise.
2. **Multi-branch jobs.** Only an AM, DM or Admin can hold tasks in several branches (rule 3.2.2). A DM may give an AM one job with tasks
   in several branches as long as all of them are in that AM's area; an Admin may do the same for an AM or DM.
3. **No delegation.** The assignee does the job personally. They cannot transfer it, pass tasks down, or add tasks from the web;
   they add tasks to their own job from the **mobile app** only (`SelfAdded`). On the web, every action is off for the assignee.
4. **Cancel or transfer** an open job (whole, or its pending tasks): the job's **creator, or anyone above the creator** in scope
   (e.g. the DM above the AM who created it, or an Admin). This is how work moves when the assignee is on leave or has moved.
5. **Update** (add tasks, extend the date, cancel a task, reject a self-added task): the creator, anyone above the creator, **and any
   manager above the assignee** in scope. Example: an AM gives a job straight to a CO; the CO's BM can see, monitor and update it,
   but only the AM (or someone above) can transfer or cancel it.
6. **Visibility** (`jobs/search`, `jobs/{id}`, `jobs/task-points`, `jobs/open`): Admin sees everything; everyone sees jobs they
   created or hold; plus jobs inside their scope held by someone below them, and unassigned jobs inside their scope created by them or
   by someone below them. Anything else is 404. `jobs/open` (add to an existing job) lists only jobs the caller may update.
7. **`Job.permissions`** (on `GET jobs/{id}` and every write that returns a `Job`) carries the result for the caller:
   `{ canAssign, canTransfer, canCancel, canUpdate }`. The web shows the matching buttons and nothing else; the server still checks
   every write and answers 403 with a readable reason.

---

## 4. OD Members (overdue follow-up)

| Method | Path | Body | Response |
|---|---|---|---|
| POST | `od-members/search` | `OdMemberSearchRequest` | `{ members: OdMember[], totalRecords, totalOverdueAmount }` |
| POST | `od-members/add-to-job` | `AddOdToJobRequest` | `AddOdToJobResponse` `{ job, addedTaskIds[], skipped: [{ memberId, reason }] }` |

* Data comes from the **Loan Status Report** (LOS/LMS). `dpd` = days past due.
* `followUp` = the member's latest OD follow-up task (pending first, then most recent), with job no / status, assignee
  (null while the job is unassigned), `completeBy`, task `status` and `outcome` (`OdVisitOutcome`: memberAvailable, paid,
  amountCollected, **ptpDate**). `onlyUnassigned=true` hides members with a pending follow-up.
* Filters: `searchText`, `branchId`, `dpdRange` (§1 DPD ranges; replaces `minDpd`), `onlyUnassigned`, paging, `sortOn` ∈
  `dpd`·`memberName`·`overdueAmount`.
* `locationVerified` = the member's home geo-tag is verified (rule 3.2.13). The web disables selection and shows a
  "Location Not Verified" badge when it is false.
* OD members are **never assigned directly**. `add-to-job` takes exactly one of `jobId` (an open job) or `newJob`
  (`NewJobHeader`: title, description, assigneeId (optional), startFrom, completeBy). Each member becomes one `OdFollowUp`
  task at the geo-tagged home, with `notes` copied to every task.
* Skip (do not fail) members with **no home geo-tag**, a home location that is **not verified** (rule 3.2.13), already **pending**
  in a job, or outside the holder's branch (rule 3.2.2).
* Outcome rules (mobile side, validated by the server): if paid, the photo is optional. If not paid, `ptpDate` is required.

---

## 5. Live monitoring and day route

| Method | Path | Response |
|---|---|---|
| GET | `live/positions?branchId=` | `LivePosition[]`: latest fix per employee in scope |
| GET | `employees/{id}/route?date=yyyy-MM-dd` | `EmployeeRoute` |

`LivePosition.status` (server-side): `OnTask` (inside a pending task's radius) · `AtBranch` · `Moving` · `Idle` (stationary
elsewhere) · `GpsOff` · `Offline` (no fix for longer than about 3× the position interval) · `NotPunchedIn` · `PunchedOut`.
Also return `currentTaskId/Title`, `currentJobId/No`, `openTaskCount` (pending tasks in open jobs), `distanceTodayKm`,
`distanceFromBranchKm`, `openAlertCount`, `batteryPct`, `accuracyMeters`.

`EmployeeRoute` (one employee, one day):

* `points[]` (lat, lng, at, speedKmph) — for today, up to now; `isLive` while the employee is punched in today.
* `stops[]` — clusters where the employee stayed within `stopRadiusMeters` for at least `stopMinMinutes` (settings). Each stop:
  `seq, location, from, to, durationMinutes`, and
  * `kind: "Designated"` when it is within a task point's `matchRadiusMeters + stopRadiusMeters` (`place: "Task"`, with
    `taskId/No`, `jobId/No`, `taskCompleted` if that task was completed during the stop) or at the branch (`place: "Branch"`);
  * `kind: "Undesignated"` anywhere else (`place: "Home"` when near the registered residence), with `distanceMeters` to the nearest task point.
* `taskPoints[]` — the task points the employee was expected to work on that day: pending tasks of their open jobs active that day,
  plus tasks completed that day. `status` as at the end of that day, `completedAt` if completed that day, `visited` if any stop was inside it.
* `summary` — `totalDistanceKm` (sum of the GPS path), `movingMinutes`, designated / undesignated stop count and minutes,
  `tasksCompleted`, `taskPointsVisited` / `taskPointsPlanned`, first / last fix. Also `punchInAt` / `punchOutAt`.
* **Optional, recommended:** `roadPath[]` (`RoadPathPoint`: lat, lng, `pointIndex` = index into `points[]` of the last original fix
  at or before it) and `roadDistanceKm`: the trail snapped to roads with the **Roads API** (Snap to Roads, `interpolate=true`,
  100 points per request, consecutive points within ~300 m, do not snap across GPS gaps). Snap once per finished day and store it;
  for today, snap only the new fixes. While these fields are absent, the web snaps in the browser on demand (cached per tab), which
  costs a Roads request per ~100 fixes for every viewer.

---

## 6. Alerts

| Method | Path | Body | Response |
|---|---|---|---|
| POST | `alerts/search` | `AlertSearchRequest` | `{ alerts: TrackingAlert[], totalRecords, openByType: Record<AlertType, number> }` |
| GET | `alerts/open-count` | – | `number` (for a future header badge) |
| PUT | `alerts/{id}/acknowledge` | `{}` | `TrackingAlert` |
| PUT | `alerts/{id}/resolve` | `{ remarks }` | `TrackingAlert` |

Alert types and the rules the **backend** evaluates (thresholds from §8, subject to active exceptions and working hours):

| `AlertType` | Rule (from the meeting minutes) | Default |
|---|---|---|
| `NearHome` | Within `homeRadiusMeters` of the registered residence during duty / field work | 50 m |
| `GpsOff` | GPS or location disabled for longer than `gpsOffGraceMinutes` during duty | 5 min |
| `Stationary` | Stationary for longer than `stationaryMinutes` while travelling → notify the concerned CO + reporting officials | 15 min |
| `OutsideBranchRadius` | Beyond `branchRadiusKm` of the assigned branch **without an approved request** (§7) | 30 km |
| `LocationMismatch` | Completion photo outside the task's match radius | 100 m |
| `DelayedJob` | Job passed `completeBy` with pending tasks (status `Delayed`) | – |

`jobId`/`jobNo`/`taskId` link an alert to its job when there is one. `notifiedTo` lists who received it (reporting officer, CO,
"Administration"). The backend should also push these into the existing `global-api/notifications` feed so the header bell picks them up.

---

## 7. Out-of-radius approvals

| Method | Path | Body | Response |
|---|---|---|---|
| GET | `approvals?status=Pending\|Approved\|Rejected` | – | `OutOfRadiusRequest[]` (newest first) |
| PUT | `approvals/{id}/decision` | `{ approved: boolean, remarks }` | `OutOfRadiusRequest` |

Requests are raised from the mobile app before lead sourcing or other field activity beyond the branch radius (requirement 1.7).
Only authorised higher officials may decide. Remarks are required when rejecting. An approved request suppresses
`OutsideBranchRadius` alerts for that employee, date and destination area.

---

## 8. Geo-tags and settings

| Method | Path | Body | Response |
|---|---|---|---|
| GET | `geo-tags?kind=&searchText=&branchIds=&onlyUntagged=` | – | `GeoTag[]` |
| GET | `geo-tags/points?branchId=&kinds=GroupCentre,Member,OdMember` | – | `GeoTagPointsResponse` `{ points: GeoTagPoint[], untaggedByKind }` |
| PUT | `geo-tags/{id}` | `{ location, radiusMeters, reason }` | `GeoTag` |
| GET | `settings` | – | `TrackingSettings` |
| PUT | `settings` | `TrackingSettings` | `TrackingSettings` |

* `geo-tags/points` is the **light** call behind the task picker: every geo-tagged place of the listed kinds in one branch, with no
  photo or history, so a branch with thousands of members stays small. `GeoTagPoint`: id, kind, refId, name, refCode, branchId/Name,
  address, location, radiusMeters, `verified` (rule 3.2.13: an unverified `Member` / `OdMember` is shown with a badge and cannot be
  selected), and for `OdMember` only `dpd` and `overdueAmount` from the Loan Status Report (null otherwise).
  **One point per person:** a member who is currently overdue is returned once, as `OdMember` (not also as `Member`).
  `untaggedByKind` = per kind, places in the branch with no location yet. Same scope rules as `geo-tags`. If a branch ever gets too
  large even for this, add an optional `bbox=swLat,swLng,neLat,neLng` filter; the response shape stays the same.
* `verified` on `GroupCentre`, `Member` and `OdMember` geo-tags is set from the mobile app (rule 3.2.13). A `PUT geo-tags/{id}` on a
  `GroupCentre` resets it to false; the Geo Tags page shows "Location Not Verified" for these.
* `GeoTagKind`: `Branch` · `GroupCentre` · `Member` · `OdMember` · `EmployeeHome`. `branchIds` is a comma-separated list
  (the task builder searches the assignee's branches).
* The web UI edits **Branch, GroupCentre and EmployeeHome** (requirement 2.5, "change of group meeting location"). Member and
  OD member homes are captured on the mobile app with the borrower and co-borrower photo, so the UI shows them read-only.
* Every change appends to `history` (`GeoTagChange` with reason). `reason` is required. A branch geo-tag should stay in sync with the
  Organisation Unit's latitude/longitude.
* `TrackingSettings` holds the §6 thresholds, **stop detection** (`stopMinMinutes`, default 5; `stopRadiusMeters`, default 75),
  working hours, notification switches, auto-allocation rules (`autoAssignOdFollowUps` + `autoAssignOdMinDpd` = add newly overdue
  members to the CO's open OD job; `autoAssignGroupVisits` (renamed from `autoAssignGroupMeetings`) = add group visits to the CO's weekly job from the group meeting schedule; `autoAllocationTime`),
  and management-defined `exceptions[]`. The mobile app must read the same settings (for example `positionIntervalSeconds`).

---

## 9. Google Maps Platform APIs

All on the one browser key (`MAP_API_KEY`, restricted by HTTP referrer and to these APIs):

| API | Used for | Called from |
|---|---|---|
| Maps JavaScript API | every map | browser |
| Geocoding API | address search in the map picker | browser |
| **Routes API** | best-order road route with distance / time, two-wheeler (Google beta, must show a warning; falls back to car where Google has no two-wheeler route). Max 25 stops per request; >10 stops or optimised order bill at a higher tier. Job Monitoring "Plan route", Day Route "planned route", task picker "Trip estimate". Only on click, cached per set of points. | browser (`Route` class) |
| **Roads API** | Day Route trail snapped to roads and road distance | browser for now; backend preferred (§5 `roadPath`) |
| Route Optimization API | not used by the web. It authenticates with OAuth (service account), so it belongs in the backend — e.g. a future auto-allocation that splits a branch's open tasks across several officers. | backend only |

Turn-by-turn navigation is a mobile-app concern: a "Navigate" button can open Google Maps with
`https://www.google.com/maps/dir/?api=1&destination=<lat>,<lng>` (no API, no cost).

---

## 10. Mobile-side inputs (not part of this web scope)

These events feed the data above. They come from the mobile app and are not called by the web: punch-in/out with odometer photos,
periodic GPS fixes (with GPS-on/off state and battery), task arrival and completion with GPS photo + remarks, OD outcome (paid / PTP),
**self-added tasks** (origin `SelfAdded`, same location and branch rules; history `TaskSelfAdded`), geo-tag capture with photo,
out-of-radius request, and the group-formation form (from LOS/MIS).

---

## 11. Switching from mock to real backend

1. Implement the endpoints above under `tracking-api` on the gateway.
2. In `environment*.ts`, set `useTrackingMocks: false`.
3. Remove `trackingMockInterceptor` from `app.config.ts`, remove `<qfin-trk-mock-actor>` (the mock-only "acting as" picker) from
   `pages/jobs/jobs.html` and its import in `jobs.ts`, and delete `features/tracking/mocks/`.
