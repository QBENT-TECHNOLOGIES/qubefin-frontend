# Tracking API Contract (`tracking-api`)

> Contract between the **web frontend** (jobs, assignment and monitoring) and the **backend**.
> The frontend currently runs against an in-browser mock that implements exactly this contract
> (`features/tracking/mocks/`). The backend team can build to this document. When the real service is up,
> set `useTrackingMocks: false` in the environment file. No other frontend change should be needed.

**Source of truth for shapes:** the TypeScript interfaces in
`projects/qubefin-app/src/app/features/tracking/models/*.ts` (jobs and tasks: `models/job.ts`). This document
names them and adds the rules the server must enforce. Shared business rules are also in `utils/job-rules.ts`.

---

## 1. Conventions

| Item | Rule |
|---|---|
| Base path | `{gatewayPath}tracking-api/…`. The frontend sends relative URLs (`ApiPaths.TRACKING`), and `AuthInterceptor` adds the gateway and `Authorization: Bearer <accessToken>`. |
| Scope | Every list is filtered **server-side** to what the caller may see and act on (own branch / area / division, per the position hierarchy DM > AM > BM > ABM > CO). The UI never filters by hierarchy itself. |
| Ids | GUID strings. |
| Dates | `yyyy-MM-dd` for calendar days (`startFrom`, `completeBy`, `date`…). ISO-8601 with offset for instants (`createdAt`, `completedAt`, `performedAt`…). |
| Coordinates | `{ "lat": number, "lng": number }`, WGS-84, 6 decimals (`GeoPoint`). |
| Errors | Non-2xx with `{ "message": "human readable" }` (400) or `{ "errors": ["…"] }`. `HttpErrorInterceptor` shows them as a popup, so messages must be readable by a branch user. |
| Writes | Return the updated entity (or the documented response). Every write is audited with user + server time. |
| Polling | Live screens poll every **30 s** (positions, routes for today, alerts, job lists, approvals). Keep these endpoints cheap. SignalR can replace polling later without changing response shapes. |

---

## 2. Lookups

| Method | Path | Response |
|---|---|---|
| GET | `branches` | `TrackingBranch[]`: id, name, code, `areaName`, `divisionName`, `location` (nullable), `operatingRadiusKm` |
| GET | `field-officers?branchId=` | `FieldOfficer[]`: id, employeeCode, name, `role` (`CO`·`ABM`·`BM`·`AM`·`DM`), designation, `branchId`/`branchName` (posting), `unitName` (branch / area / division in charge of), `branchIds` (branches they may work in), phone, `homeLocation`, reportingOfficerName |

* `field-officers` returns only people the caller may assign work to. `branchId` filters to people whose `branchIds` include it.
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
| `Customer` | `MemberVisit` | – |
| `OdCustomer` | `OdFollowUp` | `MemberVisit` (e.g. a loan-use check on an overdue member) |
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
(job has a task in that branch), `assigneeId`, `dueFrom`/`dueTo` (inclusive, on `completeBy`), paging, and
`sortOn` ∈ `completeBy`·`createdAt`·`assigneeName`·`status`. `summary` is computed over the same filters **excluding** status:
`total, unassigned, assigned, inProgress, overdue, completed`.

### 3.1 Status

`JobStatus` is **derived** by the server on every read and write:

| Status | When |
|---|---|
| `Cancelled` | Cancelled by a user, or every task was cancelled / rejected / moved out with none done |
| `Completed` | No pending task left and at least one done |
| `Unassigned` | No assignee yet |
| `Overdue` | Pending tasks and today is after `completeBy` |
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
   Window = `startFrom` (or the creation day) to `completeBy`; an overdue job stays active until today. Duplicates inside one request
   are also refused. Conflicting tasks are **skipped, not failed**, and returned in `skipped[]` with the reason
   (e.g. "Already pending as TSK-48001 in JOB-26001"). If nothing could be added on create, return 400.
4. **OD customers** can only be pending in one job at a time (any window).
5. `completeBy` cannot be in the past on create; `startFrom` ≤ `completeBy`. Extending needs a later date (not in the past) and a reason.
6. **Assign** only an unassigned job; otherwise use transfer.
7. **Transfer** (open jobs with pending tasks, reason required):
   * `taskIds: null` → **whole job**: the job gets the new assignee; completed tasks keep `completedByName`. History `Transferred`.
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
    TasksAdded, TaskSelfAdded, TaskCompleted, TaskCancelled, TaskRejected, DateExtended, BecameOverdue, Completed, Cancelled`,
    with performer, server time, from / to assignee, task numbers, related job and remarks.
12. A nightly job writes `BecameOverdue` (and raises an `OverdueJob` alert, §6) for jobs that pass `completeBy` with pending tasks.

---

## 4. Overdue (OD) follow-up

| Method | Path | Body | Response |
|---|---|---|---|
| POST | `overdue-customers/search` | `OverdueCustomerSearchRequest` | `{ customers: OverdueCustomer[], totalRecords, totalOverdueAmount }` |
| POST | `overdue-customers/add-to-job` | `AddOdToJobRequest` | `AddOdToJobResponse` `{ job, addedTaskIds[], skipped: [{ customerId, reason }] }` |

* Data comes from the **Loan Status Report** (LOS/LMS). `dpd` = days past due.
* `followUp` = the customer's latest OD follow-up task (pending first, then most recent), with job no / status, assignee
  (null while the job is unassigned), `completeBy`, task `status` and `outcome` (`OdVisitOutcome`: customerAvailable, paid,
  amountCollected, **ptpDate**). `onlyUnassigned=true` hides customers with a pending follow-up.
* OD customers are **never assigned directly**. `add-to-job` takes exactly one of `jobId` (an open job) or `newJob`
  (`NewJobHeader`: title, description, assigneeId (optional), startFrom, completeBy). Each customer becomes one `OdFollowUp`
  task at the geo-tagged home, with `notes` copied to every task.
* Skip (do not fail) customers with **no home geo-tag**, already **pending** in a job, or outside the holder's branch (rule 3.2.2).
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
| `OverdueJob` | Job passed `completeBy` with pending tasks | – |

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
| GET | `geo-tags/points?branchId=&kinds=GroupCentre,Customer,OdCustomer` | – | `GeoTagPointsResponse` `{ points: GeoTagPoint[], untaggedByKind }` |
| PUT | `geo-tags/{id}` | `{ location, radiusMeters, reason }` | `GeoTag` |
| GET | `settings` | – | `TrackingSettings` |
| PUT | `settings` | `TrackingSettings` | `TrackingSettings` |

* `geo-tags/points` is the **light** call behind the task picker: every geo-tagged place of the listed kinds in one branch, with no
  photo or history, so a branch with thousands of members stays small. `GeoTagPoint`: id, kind, refId, name, refCode, branchId/Name,
  address, location, radiusMeters, and for `OdCustomer` only `dpd` and `overdueAmount` from the Loan Status Report (null otherwise).
  **One point per person:** a member who is currently overdue is returned once, as `OdCustomer` (not also as `Customer`).
  `untaggedByKind` = per kind, places in the branch with no location yet. Same scope rules as `geo-tags`. If a branch ever gets too
  large even for this, add an optional `bbox=swLat,swLng,neLat,neLng` filter; the response shape stays the same.
* `GeoTagKind`: `Branch` · `GroupCentre` · `Customer` · `OdCustomer` · `EmployeeHome`. `branchIds` is a comma-separated list
  (the task builder searches the assignee's branches).
* The web UI edits **Branch, GroupCentre and EmployeeHome** (requirement 2.5, "change of group meeting location"). Customer and
  OD-customer homes are captured on the mobile app with the borrower and co-borrower photo, so the UI shows them read-only.
* Every change appends to `history` (`GeoTagChange` with reason). `reason` is required. A branch geo-tag should stay in sync with the
  Organisation Unit's latitude/longitude.
* `TrackingSettings` holds the §6 thresholds, **stop detection** (`stopMinMinutes`, default 5; `stopRadiusMeters`, default 75),
  working hours, notification switches, auto-allocation rules (`autoAssignOdFollowUps` + `autoAssignOdMinDpd` = add newly overdue
  customers to the CO's open OD job; `autoAssignGroupVisits` (renamed from `autoAssignGroupMeetings`) = add group visits to the CO's weekly job from the group meeting schedule; `autoAllocationTime`),
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
3. Remove `trackingMockInterceptor` from `app.config.ts` and delete `features/tracking/mocks/`.
