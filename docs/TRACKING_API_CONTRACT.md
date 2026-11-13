# Tracking API Contract (`tracking-api`)

> Contract between the **web frontend** (jobs, assignment and monitoring) and the **backend**.
> The frontend currently runs against an in-browser mock that implements exactly this contract
> (`features/tracking/mocks/`). The backend team can build to this document. When the real service is up,
> set `useTrackingMocks: false` in the environment file. No other frontend change should be needed.

**Who builds what.** This team owns the **web frontend and its API integration**; the backend (`tracking-api`, database) is built
by another developer. This document is the API requirement handed to them: endpoints, shapes and the rules the server must enforce.

**Where the rules come from.** Some rules come from the *Tracking Software* meeting minutes; others were decided with the product
owner afterwards. **Where the two conflict, the product owner's decisions (recorded in this document) win.**

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
> **Changed 2 Nov 2026** (client request: an AM first spreads every point across the COs, then still needs to give the BM jobs
> on the same points):
> * **Duplicate rule relaxed** (rule 3.2.3, replaces the old "conflict rule" and rule 3.2.4): the same place may have the same
>   task type pending with **different people**. Only the **same person** twice is refused. Pending with someone else → the task
>   is added and returned in a new `warnings[]` list.
> * **Assignee required** on `POST jobs` and `od-members/add-to-job` (`newJob.assigneeId`). "Assign later" is gone: no
>   `Unassigned` status, no `PUT jobs/{id}/assign`, no `canAssign`, no `unassigned` count, no `Assigned` history entry.
> * **New task fields:** `priority` (`VeryHigh` · `High` · `Medium` · `Low`, default `Medium`), `accompaniedById` / `accompaniedByName`
>   (optional). The existing `notes` field is shown as **Instruction**. These are **task-level only** (set per task; no job-level defaults).
> * `TransferJobResponse.skipped[]`, `OdMember.pendingWith[]`, `JobTaskPoint.priority`, `AddOdToJobRequest.members[]`
>   (per-member `{ memberId, priority, notes, accompaniedById }`, replaces `memberIds` / `notes`), `AddOdToJobResponse.warnings[]`.
> **Changed 3 Nov 2026:** ABM = **Additional** Branch Manager, the **same level as BM** with the same functionality (was: a level below BM),
> with one exception: a **BM oversees the ABM's jobs** in their branch (see, monitor, update; not assign, transfer or cancel).
> New `FieldOfficer.canAssign`: `field-officers` now lists everyone the caller may monitor, and `canAssign` says who may get work.
> **Added 3 Nov 2026** (filters only, no rule change): when a group or member is introduced in the system it is mapped to a
> **branch** and a **Credit Officer**, and each member is mapped to a **group**. New: `GET groups` lookup (§2);
> `creditOfficerId/Name` and `groupId/Name` on `GeoTagPoint` (§8); `groupId`, `creditOfficerId/Name` on `OdMember` and
> `creditOfficerId` / `groupId` filters on `od-members/search` (§4). The mapping **never limits assignment**: any place can still be
> given to anyone the job rules (§3) allow, e.g. a point mapped to one CO can be given to another CO or to the BM.
> **Added 3 Nov 2026** (list display only): `JobSummary.typeCounts` = tasks per type, e.g. `{ "GroupVisit": 3, "OdFollowUp": 1 }` (§3).
> **Changed 4 Nov 2026** (product owner, after the access-control test of the tracking screens):
> * **Settings:** `PUT settings` is for **Admin only** (Super Admin / Application Administrator), otherwise 403. `GET settings` stays
>   open to every tracking user (Live Tracking, Tracking History and the mobile app read it). §8.
> * **Out-of-radius approvals:** for the time being only an **Admin** decides (`PUT approvals/{id}/decision`, otherwise 403). §7.
> * **Scope on the monitoring screens** (applies §1 and §2, which these endpoints did not yet spell out): `live/positions`,
>   `employees/{id}/route` and `approvals` cover only the people the caller may **monitor** (the `field-officers` list, §2);
>   anyone else is 404 / left out. `geo-tags` and `geo-tags/points` cover the caller's branches; employee homes only the people
>   they may monitor. §5, §7, §8.
> * **Geo Tags/POIs is view only on the web:** `PUT geo-tags/{id}` is **removed**. No location is changed from the web (this replaces
>   requirement 2.5 "change of group meeting location" from the minutes). Locations are captured and verified on the mobile app. §8, rule 3.2.13.
> * **Alerts:** who may see, acknowledge and resolve an alert is **still to be agreed** (§6). Until then the endpoints are unchanged.

---

## 1. Conventions

| Item | Rule |
|---|---|
| Base path | `{gatewayPath}tracking-api/…`. The frontend sends relative URLs (`ApiPaths.TRACKING`), and `AuthInterceptor` adds the gateway and `Authorization: Bearer <accessToken>`. |
| Scope | Every list is filtered **server-side** to what the caller may see and act on (own branch / area / division, per the hierarchy Admin > DM > AM > BM = ABM > CO, §3.3). The UI never filters by hierarchy itself; it only shows or hides actions from `job.permissions`. Direct calls outside the caller's scope (an id from another branch) answer 404, exactly as if the record did not exist. |
| Screen access | The web opens a tracking screen only when the user has its menu (Admin → Menus, `app-api/menus/tree-by-user`); typing the URL of a hidden screen goes to `/unauthorized`. This is a convenience, not security: **every `tracking-api` call must still be checked on the server** for the caller's role and scope. |
| Ids | GUID strings. |
| Dates | `yyyy-MM-dd` for calendar days (`startFrom`, `completeBy`, `date`…). ISO-8601 with offset for instants (`createdAt`, `completedAt`, `performedAt`…). |
| Coordinates | `{ "lat": number, "lng": number }`, WGS-84, 6 decimals (`GeoPoint`). |
| Errors | Non-2xx with `{ "message": "human readable" }` (400 invalid, 403 not allowed for this user, 404 not found or outside the caller's scope) or `{ "errors": ["…"] }`. `HttpErrorInterceptor` shows them as a popup, so messages must be readable by a branch user. |
| DPD ranges | `dpdRange` ∈ `Days1To30` (1–30 days) · `Days31To60` (31–60) · `Days61To90` (61–90) · `Over90` (91 and above, shown as "90+"), or null = any. Both bounds inclusive, no overlap. Same ranges everywhere (`utils/dpd.ts`). |
| Writes | Return the documented response (the job writes C1–C7 return a message for the user; the web then reloads). Every write is audited with user + server time. |
| Polling | Live screens poll every **30 s** (positions, routes for today, alerts, job lists, approvals). Keep these endpoints cheap. SignalR can replace polling later without changing response shapes. |

---

## 2. Lookups

| Method | Path | Response |
|---|---|---|
| GET | `organization-units` (was `branches`) | `TrackingBranch[]`: id, name, code, `areaName`, `divisionName`, `location` (nullable), `branchOperatingRadiusInKm` (**metres**, see below) |
| GET | `groups?branchId=&creditOfficerId=` | `TrackingGroup[]`: id, code, name, `branchId`/`branchName`, `creditOfficerId`/`creditOfficerName` (mapped CO, nullable), sorted by name. Groups in the caller's scope; both filters optional. Feeds the Group filter on OD Members. |
| GET | `field-officers?organizationUnitId=` | `FieldOfficer[]`: id, employeeCode, name, `role` (role name, e.g. `Credit Officer`), designation, `organisationUnitId`/`organisationUnitName` (posting branch), `unitName` (branch / area / division in charge of), `organisationUnits` (`[{ id, name }]`, branches they may work in), phone, `presentLocation` (home, nullable), reportingOfficerName, `canAssign` |

* **Names follow the backend as built** (decided 6 Nov 2026). The frontend models (`models/*.ts`) use the backend's own paths,
  property names and values, with no mapping layer, and the mock answers in the same shape. When an endpoint is delivered
  with different names, the model, the screens and the mock are renamed to match. So far:
  * `me` (A1) is **removed** (10 Nov 2026): the signed-in user's tracking scope comes from the existing
    `GET app-api/users/login-info` (`EmployeeProfileResponse` in `app/models/employee-profile-response.ts`), which now also
    returns `role`, `unitName`, `canCreateJobs` and `accessOrganizationUnits[]` (`{ id, name, latitude, longitude,
    attendanceInTime, attendanceOutTime, checkRadiusInMeter }`; the ids are the branch scope). `TrackingViewerStore` builds the
    web's `TrackingViewer` from it, so no tracking call is made for the user.
  * `branches` (A2) is served at `organization-units`. `branchOperatingRadiusInKm` holds **metres** despite its name
    (`30000` = 30 km); screens divide by 1000 to show or compare km (was `operatingRadiusKm` in km).
  * `field-officers` (A3): query `organizationUnitId` (spelled with **z**; was `branchId`); `organisationUnitId` /
    `organisationUnitName` (posting branch; were `branchId` / `branchName`), `presentLocation` (the geo-tagged present / home
    address used for the near-home rule; was `homeLocation`). **Changed by 13 Nov 2026:** the branches an officer may work in come as
    `organisationUnits: [{ id, name }]` (was `organisationUnitIds: string[]`, before that `branchIds`); the web reads the ids with
    `unitIdsOf()` in `models/field-officer.ts`.
  * `jobs/search` (B1): request `organisationUnitId` (was `branchId`), `sortOn` ∈ `endDate`·`createdOn`·`assigneeName`·`status`
    (were `completeBy`·`createdAt`). `JobSummary` (and so `Job`): `jobCode` (was `jobNo`), `jobTitle` (`title`),
    `organisationUnitIds` (`branchIds`), `createdOn` (`createdAt`), `startDate` (`startFrom`), `endDate` (`completeBy`),
    `transferJobRefId` / `transferJobRefCode` (the job it was split from; were `transferredFromJobId` / `transferredFromJobNo`).
    *Complete by* and *start from* stay the labels on screen. `typeCounts` is not sent yet (optional; the list shows type icons
    without numbers).
  * `jobs/{id}` (B2): `Job` adds `jobDescription` (was `description`) and `createdBy` (creator's id; was `createdById`).
    `JobTask`: `taskType` (`type`), `taskTitle` (`title`), `coOrdinatedBy` / `coOrdinatedByName` (the companion shown as
    *Accompanied by*; were `accompaniedById` / `accompaniedByName`), `taskAddedOn` (`addedAt`), `arrivedOn` (`arrivedAt`),
    `taskCompletedOn` (`completedAt`), `transferredToJobCode` (`transferredToJobNo`), `taskCancelReason` (`closedReason`), and new
    **`canReject`** (per caller: the web shows *Reject* only when it is true). `TaskTarget`: `originRefId` (`refId`), `targetName`
    (`name`), `targetLocation` (`location`), `organisationUnitId` (`branchId`), `radiusMeters` (the match radius; was
    `matchRadiusMeters`); `address` is **not** sent. The same `TaskTarget` is sent inside new tasks (`NewTaskInput.target`).
    `verification` and `odOutcome` keep the contract shape (`TaskVerification`, `OdVisitOutcome`) until a sample with values arrives.
  * `jobs/{id}/history` (B3): `relatedJobCode` (was `relatedJobNo`); new `oldCompleteBy` / `newCompleteBy` on `DateExtended`
    entries (the timeline shows "old → new").
  * `jobs/task-points` (B4): query `organisationUnitId` (was `branchId`; with **s**), `assigneeId`, `pendingOnly`, all optional.
    `JobTaskPoint`: `jobCode` (`jobNo`), `jobStartDate` / `jobEndDate` (`jobStartFrom` / `jobCompleteBy`), `taskTitle` (`title`),
    `taskType` (`type`), `originRefId` (`refId`), `targetLocation` (`location`), and new `organisationUnitId` (the task's branch).
  * `geo-tags/points` (B5): query `organisationUnitId` (**required**; was `branchId`) and `kinds`. `GeoTagPoint`: `organisationUnitId`
    (`branchId`), `taskLocationMatchInMeters` (the match radius a task there gets; was `radiusMeters`), and new `taggedByName` /
    `taggedAt` (who captured the location on the mobile app, and when).
  * `POST jobs` (C1): `CreateJobRequest` `{ jobTitle, jobDescription, assigneeId, startDate, endDate, tasks: NewTaskInput[] }`
    (were `title`, `description`, `startFrom`, `completeBy`). `NewTaskInput` `{ taskType, taskTitle, notes, priority,
    coOrdinatedBy, target: TaskTarget }` (were `type`, `title`, `accompaniedById`). **Response** `CreateJobResponse`
    `{ jobId, message }`, e.g. `"Job JOB-260006 created for Ratan Barman with 1 task."`. Skipped tasks and "also pending with"
    notes are **inside `message`** (no structured `job` / `skipped` / `warnings`). The web shows the message, reloads the list and
    opens the new job by `jobId`.
  * `POST jobs/{id}/tasks` (C2): body `AddTasksRequest` `{ tasks: NewTaskInput[] }`. **Response** a plain JSON string
    (`AddTasksMessage`), e.g. `"1 task added to JOB-260006. Note: Member Visit – Anima Biswas — Also pending with Atanu Tarafdar
    (JOB-260005)."`. When nothing can be added: 400 `{ message, metadata, reasons }`, e.g. `"No task could be added: Member Visit
    – Anima Biswas — Already pending in this job"` (the web's error popup shows it). The web shows the message (as a warning when
    it carries a *Note* or skipped tasks) and reloads the job.
  * Job and task actions (C3–C7, checked 13 Nov 2026 on a test job). Bodies: `PUT jobs/{id}/transfer` (C3)
    `TransferJobRequest` `{ assigneeId, taskIds, remarks, endDate }` (`endDate` was `completeBy`; the new job's date for a
    partial transfer, null for a whole one); `PUT jobs/{id}/extend` (C4) `{ endDate, remarks }` (was `completeBy`);
    `PUT jobs/{id}/cancel` (C5), `PUT jobs/{id}/tasks/{taskId}/cancel` (C6), `PUT jobs/{id}/tasks/{taskId}/reject` (C7)
    `{ remarks }`. **Every response is a plain JSON string** (`JobActionMessage`), not the `Job` / `TransferJobResponse` of this
    contract, e.g. `"JOB-260006 transferred to Subrata Barman."`, `"JOB-260006 complete-by date extended from 14 Nov 2026 to 20 Nov
    2026."`, `"Task TSK-26039000004 cancelled."`, `"Task TSK-26039000003 rejected."`. Refused: 400 `{ message, metadata, reasons }`,
    e.g. `"JOB-260006 is Cancelled and cannot be cancelled."`. The web shows the message (a warning when a transfer message carries
    a *Note* about tasks not moved) and reloads the job and the list. History entries for all of them were correct.
  * `geo-tags` (E1, Geo Tags page): query `kind`, `searchText`, `onlyUntagged` and **`organisationUnitId`** (the branch filter;
    was `branchIds`; `branchId` / `branchIds` are ignored). `GeoTag` has **no `id`**: `refId` identifies the row. `verified` and
    `history` are **not sent** (optional in the model; the page shows no verification badge or location history while absent).
  * `PUT geo-tags/{refId}` (E2, `{ location, radiusMeters, reason }`) **exists on the backend but the web does not use it**:
    Geo Tags stays view only (product owner, 4 Nov 2026; confirmed 13 Nov 2026). See §12.
  * Open points found while integrating are listed in **§12**.
  * **Page size** (seen 13 Nov 2026): `jobs/search` accepts `pageSize` 1–100 only (400 otherwise). Job Monitoring loads the first
    100 open jobs (soonest due) and says how many more match, so the user can narrow by branch or employee.
* **Role values are the backend's role names** (since 6 Nov 2026; were codes; aligned with the backend 13 Nov 2026). Tracking ranks
  five of them: `Divisional Manager` > `Area Manager` > `Branch Manager` = `Assistant Branch Manager` > `Credit Officer`
  (`OfficerRole` / `ROLE_RANK`; were *Division Manager* and *Additional Branch Manager*). **Admin** (13 Nov 2026; `AdminRole`,
  `isAdminRole()`, all equal, above every field role): *Super Admin* comes as `Admin`; an *Application Administrator* comes as
  `Executive Officer`, `Manager`, `Assistant Manager`, `Executive`, `Director`, `Vice President`, `Office Assistant`, `Auditor` or
  `Managing Director`. The same values come in every `role` / `assigneeRole` field (login-info,
  `field-officers`, jobs, live positions, alerts, approvals). Elsewhere in this document *Admin*, *DM*, *AM*, *BM*, *ABM* and *CO*
  are shorthand for these names.
  The backend's full role list: Assistant Branch Manager, Zonal Head, HR Manager, Auditor, Executive Officer, Office Assistant,
  Director, Managing Director, Area Manager, Manager, Credit Officer, HOD, Chief Executive Officer, Chief Operating Officer,
  Executive Assistant Manager, Branch Manager, Divisional Manager, Vice President, Assistant Vice President, Deputy Manager,
  State Head (plus `Admin`). Any role that is neither ranked nor Admin (e.g. Zonal Head, State Head, HOD) has **no rights** in the
  web's role rules and is shown under its own name.
* `organization-units` (`branches`) returns the branches in the caller's scope (every branch for an Admin).
* `field-officers` returns everyone the caller may **monitor**: people in a **lower role** whose `organisationUnitIds` all lie inside the
  caller's scope, plus, for a BM, the ABM(s) of their branch (§3.3 exception). `canAssign` = the caller may give this person work
  (true for the lower roles, **false for the ABM listed to a BM**). The web uses the whole list for monitoring filters (Jobs & Tasks,
  Job Monitoring, Tracking History) and only `canAssign` people for *Assign to* / *Transfer to*. `organizationUnitId` filters to
  people whose `organisationUnitIds` include it.
* Every Admin role (above) has the same access in tracking (`isAdminRole()`).
  `canCreateJobs` is false when nobody is below the caller (a CO).
* login-info `accessOrganizationUnits` and field-officers `organisationUnitIds`: one branch for CO / ABM / BM; every branch of the
  area (AM) or division (DM); every branch for an Admin.

---

## 3. Jobs and tasks

A **job** is the unit of assignment: one assignee (required from creation), one `completeBy` date, and any number of **tasks** of
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
| GET | `jobs/task-points?organisationUnitId=&assigneeId=&pendingOnly=true` | – | `JobTaskPoint[]`: task locations of open jobs (overview map, duplicate hints) |
| GET | `jobs/{id}` | – | `Job` (with `tasks`) |
| GET | `jobs/{id}/history` | – | `JobHistoryEntry[]` (newest first) |
| POST | `jobs` | `CreateJobRequest` (`assigneeId` **required**) | `CreateJobResponse` `{ jobId, message }` |
| PUT | `jobs/{id}/transfer` | `TransferJobRequest` | message (string) |
| POST | `jobs/{id}/tasks` | `{ tasks: NewTaskInput[] }` | message (string); 400 when nothing could be added |
| PUT | `jobs/{id}/tasks/{taskId}/cancel` | `{ remarks }` | message (string) |
| PUT | `jobs/{id}/tasks/{taskId}/reject` | `{ remarks }` | message (string); self-added tasks only |
| PUT | `jobs/{id}/extend` | `{ endDate, remarks }` | message (string) |
| PUT | `jobs/{id}/cancel` | `{ remarks }` | message (string) |

**Search filters:** `searchText` (job code, title, assignee, creator, task no, place name), `status`, `openOnly`, `organisationUnitId`
(job has a task in that branch), `assigneeId`, `dueFrom`/`dueTo` (inclusive, on `endDate`), `dpdRange` (job has at least one
`OdMember` task, pending or completed, whose member's **current** DPD from the Loan Status Report is in the range), paging, and
`sortOn` ∈ `endDate`·`createdOn`·`assigneeName`·`status`, `sortDirection` `asc`·`desc`. `summary` is computed over the same filters **excluding** status:
`total, assigned, inProgress, delayed, completed`.

**`JobSummary.typeCounts`** (every `JobSummary`, so also `jobs/open` and `Job`): number of tasks per `TaskType`, counted on the same
basis as `taskCount` (pending + completed), e.g. `{ "GroupVisit": 3, "MemberVisit": 2, "OdFollowUp": 1 }`. Types with no task are
left out; the values add up to `taskCount`. The Jobs & Tasks list shows it in its *Tasks* column. Optional: while it is absent the
web shows the type icons (`types`) without numbers.

**Task fields set on the web** (`NewTaskInput`, stored on `JobTask`, shown to the assignee on the mobile app):

| Field | Required | Notes |
|---|---|---|
| `priority` | yes (default `Medium`) | `VeryHigh` · `High` · `Medium` · `Low`. 400 for any other value. |
| `notes` | no | Shown as **Instruction**. |
| `coOrdinatedBy` | no | Someone who goes along (e.g. the BM going with a CO; *Accompanied by* on screen; was `accompaniedById`). Must be an employee who works in the task's branch, or the caller; never the job's assignee (400). The server stores `coOrdinatedByName`. **Information only:** the task, its route and its allowance stay with the assignee; the companion gets no task. |

### 3.1 Status

`JobStatus` is **derived** by the server on every read and write:

| Status | When |
|---|---|
| `Cancelled` | Cancelled by a user, or every task was cancelled / rejected / moved out with none done |
| `Completed` | No pending task left and at least one done |
| `Delayed` | Pending tasks and today is after `completeBy`. Called *Delayed*, not *Overdue*, so it is never confused with an overdue (OD) member |
| `InProgress` | At least one task done, some pending |
| `Assigned` | Nothing done yet (shown as "Not started"). Every job has an assignee from creation. |

`JobTaskStatus`: `Pending` → `Completed` (mobile app), or `Cancelled` / `Rejected` / `Transferred`. Only `Pending` and
`Completed` tasks count in `taskCount`, `doneCount`, `openCount`. `TaskOrigin`: `Assigned` (web) or `SelfAdded` (mobile).

### 3.2 Rules the server must enforce

1. **Every task needs a location** (`target.location`) and a `target.branchId`. Geo-tagged places (`kind` + `refId`) copy the
   location from the geo-tag at the time the task is added; `kind: "Custom"` is a point picked on the map.
2. **Branch rule.** A CO, ABM or BM may only hold a job whose tasks are all in their own branch. An AM or DM may hold a job whose
   tasks are in any branch they cover (`branchIds`). Checked on create, transfer and add tasks. Return 400 with the reason.
3. **Duplicate rule** (since 2 Nov 2026; `duplicateCheck` in `utils/job-rules.ts`). Key = task type + place (`kind` + `refId`).
   Window = `startFrom` (or the creation day) to `completeBy`; a delayed job stays active until today.
   * Already in the same request, or already pending in the same job → **skipped** ("Listed twice in this request",
     "Already pending in this job").
   * The **same person** (the job's assignee) already has it pending in another open job whose window overlaps → **skipped**
     ("Already pending with Rupa Mondal in JOB-26002"). For `OdFollowUp` the window does not matter: one person, one pending
     follow-up per OD member.
   * **Someone else** has it pending → **added**, with a note ("Also pending with Rupa Mondal (JOB-26002)"). For `POST jobs` and
     `POST jobs/{id}/tasks` the notes and skipped tasks come inside the response `message` (C1/C2); elsewhere in `warnings[]`.
     Each task is done and completed separately by its own assignee; completing one never closes the other.
   Skipped tasks are not failures; if nothing could be added on create, return 400.
4. **OD members** follow rule 3 (they may be pending with several people, e.g. a CO and the BM). Auto-allocation (§8) still adds a
   newly overdue member only when that CO does not already have it pending.
5. `completeBy` cannot be in the past on create; `startFrom` ≤ `completeBy`. Extending needs a later date (not in the past) and a reason.
6. **Assignee required.** `POST jobs` and a new job from `od-members/add-to-job` without `assigneeId` → 400 "Select who will do this job."
   There is no assign endpoint; to change the person, use transfer.
7. **Transfer** (open jobs with pending tasks, reason required; only the creator or someone above them, §3.3). Completed tasks
   always stay with whoever did them, because their route and travel allowance depend on it:
   * `taskIds: null` on a job with **nothing done** → **whole job**: the job gets the new assignee. History `Transferred`.
   * `taskIds: null` on a job with completed tasks → handled as a partial transfer of **every pending task** (below); the original
     job keeps the original assignee and its completed tasks.
   * `taskIds: [...]` → **partial**: a new job is created for the new assignee with copies of those pending tasks (new task numbers),
     `transferredFromJobId/No` set, `completeBy` from the request (default: the original's). The original tasks become
     `Transferred` with `transferredToJobId/No`. History `TasksTransferredOut` on the old job, `Created` + `TasksTransferredIn` on the new one.
   * A partial transfer of every pending task of a job with nothing done is treated as a whole transfer.
   * Tasks the **new assignee already has pending** (rule 3, same person) do **not** move: they stay in the original job and come
     back in the response message (C3). If none can move, return 400 ("Nothing to transfer: … already has these tasks pending").
     If some cannot move, the rest are handled as a partial transfer.
8. **Cancel task**: pending only. **Reject task**: pending `SelfAdded` only. **Cancel job**: open jobs; pending tasks become
   `Cancelled`, completed ones stay on record.
9. **Timestamps are server-generated** (`arrivedAt`, `completedAt`, `photoTakenAt`), stamped when the mobile event arrives.
   Clients can never send or edit them (requirement 4.4).
10. On completion (mobile), store the photo URL, the photo's GPS fix, `completionDistanceMeters`, and
    `locationMatched = distance ≤ target.matchRadiusMeters` (requirement 3.2). `isLate` = completed after `completeBy`
    (or still pending after it).
11. **Audit trail** (`JobHistoryEntry`) is append-only: `Created, Transferred, TasksTransferredOut, TasksTransferredIn,
    TasksAdded, TaskSelfAdded, TaskCompleted, TaskCancelled, TaskRejected, DateExtended, BecameDelayed, Completed, Cancelled`,
    with performer, server time, from / to assignee, task numbers, related job and remarks.
12. A nightly job writes `BecameDelayed` (and raises a `DelayedJob` alert, §6) for jobs that pass `completeBy` with pending tasks.
13. **Verified locations only.** A `GroupCentre`, `Member` or `OdMember` target can be put in a job (create, add tasks,
    `od-members/add-to-job`) only when its geo-tag is **verified**. Otherwise the task is **skipped** with the reason
    "Location not verified" (same as rule 3 conflicts). The web shows these places with a "Location Not Verified" badge and does not
    let them be selected. Verification is done from the **mobile app** (the web never changes a location, §8). Branches and map points
    are not affected. Tasks already in a job, and tasks self-added on the mobile app, are not affected.

### 3.3 Roles: who may see and do what

Hierarchy, top to bottom: **Admin** (Super Admin and Application Administrator, equal access) > **DM** (Divisional Manager) >
**AM** (Area Manager) > **BM** (Branch Manager) = **ABM** (Assistant Branch Manager) > **CO** (Credit Officer). DM, AM, BM, ABM and CO
are tracked in the field; their tracking data feeds petrol and travel allowances. Scope = own branch (BM / ABM / CO), area (AM),
division (DM), everything (Admin).
**BM and ABM have the same operational functionality** in tracking: same level, same scope (their branch), same rights. Both can give
jobs to the branch's COs and manage jobs held by COs; an AM or above gives jobs to either. Being the same level, a BM and an ABM do not
give each other jobs (rule 1 compares levels).
**Exception — a BM oversees the ABM's jobs** (product owner decision, 3 Nov 2026): for jobs held by an ABM of the BM's own branch,
the BM is treated like a manager above the assignee: the BM **sees and monitors** them (rule 6) and may **update** them (rule 5: add
tasks, extend the date, cancel a task, reject a self-added task). The BM still **cannot assign** work to the ABM (rule 1) and cannot
**transfer or cancel** the ABM's jobs unless the BM created them (rule 4: creator or someone above the creator). It is one-way: an ABM
gets no such right over a BM's jobs.

1. **Who can get work from whom.** A user may create jobs for anyone in a **lower role inside their own scope**: an AM for the
   BMs and COs of their area, a DM for anyone in their division. Usually it is the next role down, but skipping is allowed (an AM may
   give a job straight to a CO, with no BM approval). Return 403 otherwise.
2. **Multi-branch jobs.** Only an AM, DM or Admin can hold tasks in several branches (rule 3.2.2). A DM may give an AM one job with tasks
   in several branches as long as all of them are in that AM's area; an Admin may do the same for an AM or DM.
3. **No delegation.** The assignee does the job personally. They cannot transfer it, pass tasks down, or add tasks from the web;
   they add tasks to their own job from the **mobile app** only (`SelfAdded`). On the web, every action is off for the assignee.
4. **Cancel or transfer** an open job (whole, or its pending tasks): the job's **creator, or anyone above the creator** in scope
   (e.g. the DM above the AM who created it, or an Admin). This is how work moves when the assignee is on leave or has moved.
5. **Update** (add tasks, extend the date, cancel a task, reject a self-added task): the creator, anyone above the creator, **and any
   manager above the assignee** in scope, **and a BM for jobs held by an ABM of their branch**. Example: an AM gives a job straight to
   a CO (or to the ABM); the branch's BM can see, monitor and update it, but only the AM (or someone above) can transfer or cancel it.
6. **Visibility** (`jobs/search`, `jobs/{id}`, `jobs/task-points`, `jobs/open`): Admin sees everything; everyone sees jobs they
   created or hold; plus jobs inside their scope held by someone below them, and, for a BM, jobs held by an ABM of their branch.
   Anything else is 404. `jobs/open` (add to an existing job) lists only jobs the caller may update.
7. **`Job.permissions`** (on `GET jobs/{id}` and every write that returns a `Job`) carries the result for the caller:
   `{ canTransfer, canCancel, canUpdate }`. The web shows the matching buttons and nothing else; the server still checks
   every write and answers 403 with a readable reason.

---

## 4. OD Members (overdue follow-up)

| Method | Path | Body | Response |
|---|---|---|---|
| POST | `od-members/search` | `OdMemberSearchRequest` | `{ members: OdMember[], totalRecords, totalOverdueAmount }` |
| POST | `od-members/add-to-job` | `AddOdToJobRequest` | `AddOdToJobResponse` `{ job, addedTaskIds[], skipped: [{ memberId, reason }], warnings: [{ memberId, reason }] }` |

* Data comes from the **Loan Status Report** (LOS/LMS). `dpd` = days past due.
* `followUp` = the member's latest OD follow-up task (pending first, then most recent), with job no / status, assignee,
  `completeBy`, task `status` and `outcome` (`OdVisitOutcome`: memberAvailable, paid,
  amountCollected, **ptpDate**). `onlyUnassigned=true` hides members with a pending follow-up.
* `pendingWith` = every pending OD follow-up of the member, one per open job: `{ jobId, jobNo, taskNo, assigneeId, assigneeName }`.
  The web uses it to lock the member for the same person and to warn for others (rule 3.2.3).
* `groupId` / `groupName` = the group the member is mapped to; `creditOfficerId` / `creditOfficerName` = the member's mapped Credit
  Officer (normally the group's CO). **Filter only**: the follow-up can be given to anyone the job rules allow.
* Filters: `searchText` (member, loan account, group or CO name), `branchId`, `creditOfficerId` (mapped CO), `groupId` (mapped group),
  `dpdRange` (§1 DPD ranges; replaces `minDpd`), `onlyUnassigned`, paging, `sortOn` ∈
  `dpd`·`memberName`·`overdueAmount`.
* `locationVerified` = the member's home geo-tag is verified (rule 3.2.13). The web disables selection and shows a
  "Location Not Verified" badge when it is false.
* OD members are **never assigned directly**. `add-to-job` takes exactly one of `jobId` (an open job) or `newJob`
  (`NewJobHeader`: title, description, **assigneeId (required)**, startFrom, completeBy). Members are sent as
  `members: OdTaskInput[]` (`{ memberId, priority, notes, accompaniedById }`, replacing `memberIds`): each member becomes one
  `OdFollowUp` task at the geo-tagged home with **its own** priority (default `Medium`), Instruction (`notes`) and optional
  companion. There are no job-level defaults for these fields.
* Skip (do not fail) members with **no home geo-tag**, a home location that is **not verified** (rule 3.2.13), already **pending
  with the same person** (rule 3.2.3), or outside the holder's branch (rule 3.2.2). Members pending with **someone else** are added
  and listed in `warnings[]`.
* Outcome rules (mobile side, validated by the server): if paid, the photo is optional. If not paid, `ptpDate` is required.

---

## 5. Live monitoring and day route

| Method | Path | Response |
|---|---|---|
| GET | `live/positions?branchId=` | `LivePosition[]`: latest fix per employee in scope |
| GET | `employees/{id}/route?date=yyyy-MM-dd` | `EmployeeRoute` |

**Who may see whom** (4 Nov 2026): both endpoints cover only the people the caller may **monitor**, i.e. the `field-officers` list
(§2: lower roles in the caller's scope, plus the ABM for a BM; everyone for an Admin). `live/positions` leaves everyone else out;
`employees/{id}/route` for anyone else answers 404 "Employee not found". Tracking History therefore never shows a manager's or a
peer's route.

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

> **Open (4 Nov 2026):** who may **see**, **acknowledge** and **resolve** an alert is not settled yet. The meeting minutes only say who
> is *notified*. To be agreed with the product owner; until then the endpoints are unchanged.

---

## 7. Out-of-radius approvals

| Method | Path | Body | Response |
|---|---|---|---|
| GET | `approvals?status=Pending\|Approved\|Rejected` | – | `OutOfRadiusRequest[]` (newest first) |
| PUT | `approvals/{id}/decision` | `{ approved: boolean, remarks }` | `OutOfRadiusRequest` |

Requests are raised from the mobile app before lead sourcing or other field activity beyond the branch radius (requirement 1.7).
**Who decides** (product owner, 4 Nov 2026): for the time being only an **Admin** (Super Admin / Application Administrator).
Anyone else gets 403 "Only a Super Admin or Application Administrator can approve or reject out-of-radius requests." The web shows
Approve / Reject only to an Admin (login-info `role` is an Admin role, §2); other users see "Waiting for a Super Admin or Application Administrator to decide."
**Who sees** the requests: `GET approvals` lists only requests of people the caller may monitor (§2); a decision on any other request is 404.
Remarks are required when rejecting. An approved request suppresses `OutsideBranchRadius` alerts for that employee, date and destination area.

---

## 8. Geo-tags and settings

| Method | Path | Body | Response |
|---|---|---|---|
| GET | `geo-tags?kind=&searchText=&organisationUnitId=&onlyUntagged=` | – | `GeoTag[]` (E1) |
| GET | `geo-tags/points?organisationUnitId=&kinds=GroupCentre,Member,OdMember` | – | `GeoTagPointsResponse` `{ points: GeoTagPoint[], untaggedByKind }` |
| GET | `settings` | – | `TrackingSettings` |
| PUT | `settings` | `TrackingSettings` | `TrackingSettings` |

* `geo-tags/points` is the **light** call behind the task picker: every geo-tagged place of the listed kinds in one branch, with no
  photo or history, so a branch with thousands of members stays small. `GeoTagPoint`: id, kind, refId, name, refCode, branchId/Name,
  address, location, radiusMeters, `verified` (rule 3.2.13: an unverified `Member` / `OdMember` is shown with a badge and cannot be
  selected), `creditOfficerId` / `creditOfficerName` (the mapped CO of a `GroupCentre`, `Member` or `OdMember`; null otherwise),
  `groupId` / `groupName` (the mapped group of a `Member` / `OdMember`; null otherwise), and for `OdMember` only `dpd` and
  `overdueAmount` from the Loan Status Report (null otherwise). The task picker filters by Credit Officer on these fields in the
  browser (the branch is already loaded whole); they never block a selection.
  **One point per person:** a member who is currently overdue is returned once, as `OdMember` (not also as `Member`).
  `untaggedByKind` = per kind, places in the branch with no location yet. Same scope rules as `geo-tags`. If a branch ever gets too
  large even for this, add an optional `bbox=swLat,swLng,neLat,neLng` filter; the response shape stays the same.
* `verified` on `GroupCentre`, `Member` and `OdMember` geo-tags is set from the mobile app (rule 3.2.13); the Geo Tags page shows
  "Location Not Verified" for those still waiting.
* `GeoTagKind`: `Branch` · `GroupCentre` · `Member` · `OdMember` · `EmployeeHome`. `organisationUnitId` filters to one branch.
* **View only on the web** (product owner, 4 Nov 2026; replaces requirement 2.5 "change of group meeting location"). There is no
  `PUT geo-tags`: the web never changes a location. Group, member, OD member and employee-home locations are captured on the mobile
  app (member homes with the borrower and co-borrower photo) and verified there. A branch geo-tag stays in sync with the
  Organisation Unit's latitude/longitude.
* **Scope** (4 Nov 2026): `geo-tags` and `geo-tags/points` cover places in the caller's branches (every branch for an Admin).
  `EmployeeHome` geo-tags cover only the people the caller may monitor (§2), so a BM cannot see their AM's home.
* `history` lists every location change (`GeoTagChange`: location, radius, who, when, reason), shown read-only on the Geo Tags page.
* `TrackingSettings` holds the §6 thresholds, **stop detection** (`stopMinMinutes`, default 5; `stopRadiusMeters`, default 75),
  working hours, notification switches, auto-allocation rules (`autoAssignOdFollowUps` + `autoAssignOdMinDpd` = add newly overdue
  members to the CO's open OD job; `autoAssignGroupVisits` (renamed from `autoAssignGroupMeetings`) = add group visits to the CO's weekly job from the group meeting schedule; `autoAllocationTime`),
  and management-defined `exceptions[]`. The mobile app must read the same settings (for example `positionIntervalSeconds`).
* **Who may change settings** (product owner, 4 Nov 2026): `PUT settings` is **Admin only** (Super Admin / Application Administrator);
  anyone else gets 403. `GET settings` stays open to every tracking user. The Settings menu is created for Admins only.

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
**self-added tasks** (origin `SelfAdded`, same location and branch rules; history `TaskSelfAdded`; default priority `Medium`), geo-tag capture with photo,
out-of-radius request, and the group-formation form (from LOS/MIS).
The mobile app should show each task's **priority**, **Instruction** (`notes`) and **Accompanied by** (`accompaniedByName`),
and can sort the task list by priority.

---

## 11. Switching from mock to real backend

1. Implement the endpoints above under `tracking-api` on the gateway.
2. **Step by step:** while `useTrackingMocks` is true, endpoints listed in `trackingLiveEndpoints` (dev environment, format
   `'METHOD path'`, `{x}` = one GUID path segment, e.g. `'GET jobs/{id}'`, which does not match `jobs/open`) already go to the real backend; the mock answers the rest.
   Add each endpoint there as the backend delivers it. When all are live, set `useTrackingMocks: false` in `environment*.ts`.
3. Remove `trackingMockInterceptor` from `app.config.ts`, remove `<qfin-trk-mock-actor>` (the mock-only "acting as" picker) from
   `pages/jobs/jobs.html` and its import in `jobs.ts`, and delete `features/tracking/mocks/`.

---

## 12. Open questions for the backend and the product owner (13 Nov 2026)

Found while connecting the web to the dev backend (A1–A3, B1–B5, C1–C7, E1). Numbers refer to the integration steps.

**Bugs (backend)**

1. **Reject works on any task (C7).** `JobTask.canReject` is `true` for tasks assigned from the web (`origin: "Assigned"`), and
   `PUT jobs/{id}/tasks/{taskId}/reject` rejected one. Rule 3.2.8: only pending `SelfAdded` tasks; otherwise 400 and
   `canReject: false`. The web shows *Reject* from `canReject` alone.
2. **Closed jobs still allow every action (B2).** `Job.permissions` is `{ canTransfer: true, canCancel: true, canUpdate: true }` on a
   `Cancelled` job. For `Completed` / `Cancelled` all three should be false; the web shows the buttons from these flags.
3. **Branch radius ×1000 in geo-tags (E1).** `kind=Branch` returns `radiusMeters: 30000000` (30,000 km) for a branch whose
   `organization-units` value is `30000` (30 km).
4. **Employee homes refused (E1).** `geo-tags?kind=EmployeeHome` answers **403** (empty body) for a Divisional Manager. §8: it should
   list the homes of the people the caller may monitor.
5. **Names with double spaces.** Employee names come as "Ratan  Barman" (59 of 68 in `field-officers`; also in messages and
   `employee`). Please trim / join the name parts with one space.

**Missing or inconsistent fields**

6. **E1 `GeoTag` has no `id`, `verified` or `history`**, while B5 `GeoTagPoint` for the same places sends `id` and `verified`.
   The page needs `verified` (rule 3.2.13, "Location Not Verified" badge) and `history` (location changes, read only). Is `refId`
   the intended key?
7. **`branchOperatingRadiusInKm` holds metres (A2).** Rename it (e.g. `branchOperatingRadiusInMeters`) or send km.
8. **`organizationUnitId` vs `organisationUnitId`.** `field-officers` takes `organizationUnitId` (z); `jobs/search`,
   `jobs/task-points`, `geo-tags/points` and `geo-tags` use `organisationUnitId` (s). One spelling, please.
9. **`typeCounts` (B1)** is not sent yet; the list shows the task-type icons without numbers.
10. **`verification` / `odOutcome` on `JobTask` (B2)**: no sample with values yet; the web keeps the contract shape. Please share a
    completed task (with photo) and a completed OD follow-up.
11. **Write responses are messages only (C1–C7).** Fine for the web (it shows the message and reloads). Two asks: (a) a partial
    transfer (C3 with `taskIds`) should name the new job in the message, or return its id, so the user can open it; (b) the
    error body is `{ message, metadata, reasons }`: are `metadata` / `reasons` ever filled? The web shows `message` only.
12. **Page size (B1).** `jobs/search` allows `pageSize` ≤ 100. Job Monitoring shows the first 100 open jobs and says how many more
    match. Is 100 the final limit, or can monitoring get a higher one?

**Not delivered yet** (the web still uses the mock for these screens)

13. `GET jobs/open` (add to an existing job), `GET groups`, `POST od-members/search`, `POST od-members/add-to-job`,
    `GET live/positions`, `GET employees/{id}/route`, `POST alerts/search`, `GET alerts/open-count`, `PUT alerts/{id}/acknowledge`,
    `PUT alerts/{id}/resolve`, `GET approvals`, `PUT approvals/{id}/decision`, `GET settings`, `PUT settings`.

**Decisions (product owner)**

14. **E2 `PUT geo-tags/{refId}` was built, but Geo Tags is view only on the web** (4 Nov, confirmed 13 Nov). Should the endpoint be
    removed, or restricted to someone (who)? Not tested from the web, so who it accepts today is not known.
15. **Alerts:** who may see, acknowledge and resolve an alert (§6) is still open.
16. **Roles outside the tracking hierarchy** (Zonal Head, State Head, HOD, HR Manager, Chief Executive Officer, Chief Operating
    Officer, Deputy Manager, Assistant Vice President, Executive Assistant Manager) have **no rights** in the web's role rules today.
    Confirm, or say where each one sits.

**Test data note:** some dev places are far from their branch (e.g. *Annapurna Mahila Group*, Sitai Branch, and member *Anima Biswas*,
Alipurduar Branch, are tagged near Kolkata, ~450 km away). Expected for test data; real data would trip the branch-radius rules.
