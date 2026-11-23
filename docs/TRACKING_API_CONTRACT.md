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
| Polling | Live screens poll every **30 s** (positions, routes for today, alerts, job lists, approvals). Keep these endpoints cheap. Live Tracking also gets the team's active roster and the selected person's GPS fixes and motion states **pushed** over a STOMP socket (§5.1); polling stays on as the backup. |

---

## 2. Lookups

| Method | Path | Response |
|---|---|---|
| GET | `organization-units` (was `branches`) | `TrackingBranch[]`: id, name, code, `areaName`, `divisionName`, `location` (nullable), `branchOperatingRadiusInKm` (**metres**, see below) |
| POST | `groups/search` (was `GET groups`) | `{ items: TrackingGroup[], totalRecords }`: id, code, name, `organizationUnitId`/`branchName`, `coEmployeeId`/`coName` (mapped CO, nullable), plus address, location, photo, collection day/time… (not used). Groups in the caller's scope. Feeds the Group filter on OD Members (D2, see below). |
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
  * `geo-tags/search` (E1, Geo Tags page; **changed 19 Nov 2026** from `GET geo-tags?kind=&searchText=&organizationUnitId=&onlyUntagged=`
    to a paged POST): body `GeoTagSearchRequest` `{ kind, searchText, organizationUnitId, onlyUntagged, sortOn, sortDirection,
    pageIndex, pageSize }` (`sortOn` `name`; `organizationUnitId` = the branch filter, null = every branch in scope). The web reads
    the answer as `PagedResult<GeoTag>` `{ items, totalRecords }`, the shape of `groups/search` (to confirm, §12 item 26). The page
    shows 25 rows a page (10 / 25 / 50 / 100), sorted by name; changing the kind, search, branch or *Missing only* goes back to page 1,
    and the map shows the pins of the current page. `GeoTag` has **no `id`**: `refId` identifies the row. `verified` and
    `history` are **not sent** (optional in the model; the page shows no verification badge or location history while absent).
  * `PUT geo-tags/{refId}` (E2, `{ location, radiusMeters, reason }`) **exists on the backend but the web does not use it**:
    Geo Tags stays view only (product owner, 4 Nov 2026; confirmed 13 Nov 2026). See §12.
  * `od-members/search` (D1, OD Members page; 17 Nov 2026): request `organizationUnitId` (the branch filter, spelled with **z**;
    was `branchId`; `organisationUnitId` / `branchId` are ignored), `creditOfficerId`, `groupId`, `dpdRange`, `onlyUnassigned`,
    `searchText` (member name, loan account no…), `sortOn` ∈ `memberName`·`overdueAmount`·`dpd` (anything else 400),
    `sortDirection`, `pageIndex`, `pageSize` (1–100). `OdMember`: `organizationUnitId` (z; was `branchId`), new `loanId`,
    `memberCode`, `groupCode`; `centreName` is **not** sent. `followUp`: `jobCode` (was `jobNo`), new `assigneeId`. `pendingWith[]`:
    `jobCode` (was `jobNo`), new `taskId`. A validation 400 here comes as `{ type, title, status, errors: ["…"] }`, e.g.
    `"Sort on must be memberName, overdueAmount or dpd."`.
  * `groups/search` (D2, OD Members Group filter; 18 Nov 2026; was `GET groups?branchId=&creditOfficerId=`): body
    `{ searchText, organizationUnitId, coEmployeeId, sortOn, sortDirection, pageIndex, pageSize }`. Paging is **required**;
    `pageSize` up to 500 (1000 is refused). `sortOn` `name` or `code` (anything else is ignored). `searchText` matches the group
    name. `TrackingGroup`: `organizationUnitId` (was `branchId`), `coEmployeeId` / `coName` (were `creditOfficerId` /
    `creditOfficerName`). The filter loads one page of 500 for the chosen branch and/or Credit Officer, sorted by name.
  * `jobs/open` (D3, Add to job dialog: *Add to existing job*; 18 Nov 2026): query `organizationUnitId` (the branch; was
    `branchId`) and `assigneeId`, both optional. Answers `JobSummary[]` in the same shape as `jobs/search`. The dialog sends
    `organizationUnitId` when all the selected members are in one branch.
  * **OD members are saved with C1 / C2** (decided 18 Nov 2026; replaces `POST od-members/add-to-job`, which is **not needed**).
    The *Add to job* dialog on OD Members sends each member as a normal task, `{ taskType: "OdFollowUp", taskTitle: "OD Follow-up – <name>",
    notes, priority, coOrdinatedBy, target: { kind: "OdMember", originRefId: <member id>, targetName, targetLocation: <home>,
    organizationUnitId, branchName, radiusMeters: 100 } }`: to an existing job with `POST jobs/{id}/tasks` (C2), or to a new job with
    `POST jobs` (C1, the dialog's title, description, assignee, start and complete-by). The server applies the usual task rules
    (duplicate rule 3.2.3, branch rule 3.2.2, verified location 3.2.13) and answers with its message. Checked 18 Nov 2026: a new job
    JOB-260006 (test, left open) with one OD follow-up for Nupur Bala Bose, stored as sent.
  * **`organizationUnit…` with a z everywhere** (seen 18 Nov 2026; settles §12 point 8). The backend now spells it with **z** in
    every response and query: `field-officers` (`organizationUnitId`, `organizationUnitName`, `organizationUnits`), `JobSummary` /
    `Job` (`organizationUnitIds`), `TaskTarget` (`organizationUnitId`), `JobTaskPoint`, `GeoTagPoint`, and the queries of
    `jobs/search`, `jobs/task-points`, `geo-tags/points` (the **s** spelling there is now **400**) and `geo-tags`. The web renamed
    every model, query and screen to match. Where this document still writes `organisationUnit…` (s), read it with a z.
    Exceptions: `geo-tags` (E1) rows still send `branchId`, and login-info sends `accessOrganizationUnits`.
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
| GET | `jobs/open?organizationUnitId=&assigneeId=` | – | `JobSummary[]`: open jobs, soonest due first (for "add to existing job"; D3) |
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
| ~~POST~~ | ~~`od-members/add-to-job`~~ | – | **Not needed** (18 Nov 2026): the web adds OD follow-ups with `POST jobs` (C1) or `POST jobs/{id}/tasks` (C2), see §2. |

* Data comes from the **Loan Status Report** (LOS/LMS). `dpd` = days past due.
* `followUp` = the member's latest OD follow-up task (pending first, then most recent), with job no / status, assignee,
  `completeBy`, task `status` and `outcome` (`OdVisitOutcome`: memberAvailable, paid,
  amountCollected, **ptpDate**). `onlyUnassigned=true` hides members with a pending follow-up.
* `pendingWith` = every pending OD follow-up of the member, one per open job: `{ jobId, jobCode, taskId, taskNo, assigneeId, assigneeName }`.
  The web uses it to lock the member for the same person and to warn for others (rule 3.2.3).
* `groupId` / `groupName` = the group the member is mapped to; `creditOfficerId` / `creditOfficerName` = the member's mapped Credit
  Officer (normally the group's CO). **Filter only**: the follow-up can be given to anyone the job rules allow.
* Filters: `searchText` (member, loan account, group or CO name), `organizationUnitId` (branch), `creditOfficerId` (mapped CO), `groupId` (mapped group),
  `dpdRange` (§1 DPD ranges; replaces `minDpd`), `onlyUnassigned`, paging, `sortOn` ∈
  `dpd`·`memberName`·`overdueAmount`.
* `locationVerified` = the member's home geo-tag is verified (rule 3.2.13). The web disables selection and shows a
  "Location Not Verified" badge when it is false.
* OD members are **never assigned directly**: each becomes an `OdFollowUp` task in a job, saved with C1 / C2 (§2). Per member the
  dialog collects its own priority (default `Medium`), Instruction (`notes`) and optional companion (no job-level defaults), plus an
  open job or a new job's header. It leaves out members with no home geo-tag, already pending with the chosen assignee, or outside
  the assignee's branch; the server checks the same (rules 3.2.2, 3.2.3, 3.2.13) and notes in its message any member also pending
  with someone else.
* Outcome rules (mobile side, validated by the server): if paid, the photo is optional. If not paid, `ptpDate` is required.

---

## 5. Live monitoring and day route

| Method | Path | Response |
|---|---|---|
| GET | `live/positions?branchId=` | `LivePosition[]`: latest fix per employee in scope |
| GET | `employees/{id}/route?date=yyyy-MM-dd` | `EmployeeRoute`. **Not needed while the GPS service is configured** (19 Nov 2026): the web builds the day from the GPS service, §5.2. |

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

### 5.1 Live push (STOMP socket, 17 Nov 2026; topics changed 19 Nov 2026)

Live updates are pushed as they happen, over **STOMP on SockJS** (same as the backend's `test.html`):

| Item | Value |
|---|---|
| Endpoint | `http://3.111.193.85:8080/ws/live?token=<accessToken>` (dev; `liveSocketUrl` in `environment*.ts`, empty = polling only, as in production for now) |
| Auth | The same access token as the REST calls, in the `token` query parameter. The web reconnects with the new token after a new sign-in. |
| Topics (19 Nov 2026) | Four per user, under `/topic/employee/{employeeId}/`: **`gps`** (latest position per batch), **`motion`** (state changes `MOVING` / `STOPPED` / `ON_TASK` / `OFFLINE`; replaced `/alarms`), **`geofence`** (enter / exit / change of a task geofence) and **`active-users`** (per-batch roster of the people whose status is not `OFFLINE`). |
| Who subscribes (19 Nov 2026) | While Live Tracking is open: **team** connection = `/topic/employee/{me}/active-users` (the roster of the active people under the signed-in user; `me` = `employeeId` from `app-api/users/login-info`, the same as the token's `EmployeeId`); **person** connection = `/topic/employee/{selected}/gps` and `/topic/employee/{selected}/motion` for the person clicked, switched when another is clicked. |
| Connections | Two per browser tab (`services/live-socket.service.ts`), because the server answers a refused SUBSCRIBE by closing the whole connection: a refused person must not stop the team roster. Each reconnects every 5 s (up to 60 s) and closes 15 s after the last screen leaves or on sign-out. A refused set of topics is tried again after 5 minutes, or at once for another person. |
| Server check | **Accepted since 19 Nov 2026, 16:52 IST**: the own `active-users` and the selected person's `/gps` and `/motion` (before that the person's topics were refused with `SUBSCRIBE rejected: topic belongs to another employee`). If a refusal comes back, the card says so and the trail and motion points are reloaded every 30 s from the REST calls (§5.2). No message has been seen yet: nobody in the test team was sending at the time (§12 item 18). |

**Today's trail on click (17 Nov 2026).** When a person is clicked on Live Tracking, the web first loads their fixes of today
from the GPS service, `GET http://3.111.193.85:8080/api/v1/gps?employeeId={id}` with header `Authorization: Bearer <accessToken>`
(`gpsServiceUrl` in `environment*.ts`, `services/gps-history.service.ts`). Response: `[{ id, gpsTime, locationId, userId,
isMockLocation, batteryPercentage, receivedAt, courseDegree, speed, latitude, longitude, accuracy }]`. The web keeps the fixes of
today (local day, by `gpsTime`), sorted by `gpsTime`, draws them as a line and then extends the line from the `/gps` topic (reloaded
every 30 s instead while that topic is refused or down). After a reconnect it loads the trail again to fill the gap. Fixes with `isMockLocation: true` are counted and flagged in the
person's panel. This server is not behind the gateway, so the call does not go through the app's interceptors.

How the web uses the messages (Live Tracking, `stores/live-tracking-store.ts`):

* **`/active-users`** (team) → the **status badge** of each person in the list and the **KPI counts** at the top. Seen
  23 Nov 2026: **one person per message**, about every 5 minutes each:
  `{ employeeId, motion, taskId, taskName, latitude, longitude, lastGpsTime, updatedAt }` (`motion` MOVING → Moving,
  STOPPED → Stationary, ON_TASK → On task, OFFLINE → Offline). Each message updates that person only and moves their marker
  (`latitude` / `longitude` at `lastGpsTime`); an update counts for 12 minutes, after which the polled status is shown again.
  People not heard from keep the polled status. (A list of everyone active, if one is ever sent, replaces all: not listed =
  Offline.) A message the web cannot read is logged once as `[live] active-users message not understood`.
* **`/gps`** (selected person) → today's trail grows (after `GET /api/v1/gps` loaded it up to now, §5.2) and the marker and list
  row move. A message may hold one fix, a list, or a batch `{ userId, locations: [...] }`. A fresh fix with GPS off shows GPS off;
  one from someone shown Offline / GPS off shows them Moving / Stationary until the next roster.
* **`/motion`** (selected person) → their status (newer than the roster wins), and today's motion periods are reloaded from
  `GET /api/v1/motion`: the **STOPPED, ON_TASK and OFFLINE** periods are drawn on the map as pins where they began (title: state,
  from – to, length; the current one highlighted). The position of a period is checked against the GPS fix taken closest in
  time and swapped back when latitude and longitude came swapped (§12 item 21); without one, that fix is used. The card no longer
  lists the periods.
* `/geofence` and the own `/gps` / `/motion` are not subscribed now. **Alerts:** nothing is pushed for alarms since `/alarms` was
  removed, so the Alerts page relies on its 30 s poll (§12 item 17).

**Message shapes are not agreed yet.** No message arrived during a 2-minute test on 19 Nov 2026 (nobody was moving), so the web
reads them tolerantly (`utils/live-message.ts`, field names case-insensitive) and logs the first message of each topic to the
browser console (`[live] First motion message: …`). What it reads:

* GPS: `{ employeeId | userId, latitude, longitude, gpsTime, speed, accuracy, batteryPercentage, isMockLocation }` (the
  `/api/v1/gps` record), or `lat`/`lng`, a nested `location`, `recordedAt` / `timestamp` / epoch s or ms. A plain `speed` is taken
  as **m/s**.
* Motion: `{ employeeId, motion, startedAt, latitude?, longitude? }`, the shape of the GPS service's
  `GET /api/v1/motion?employeeId=` record `{ employeeId, motion, startedAt, endedAt, latitude, longitude, source }` (Swagger,
  19 Nov 2026). Also read: `state` / `status` for `motion`, `timestamp` for `startedAt`.
* Geofence (assumed): `{ employeeId, event: ENTER | EXIT | CHANGE, taskId, taskTitle?, jobId?, jobNo?, occurredAt, latitude?,
  longitude? }`. Also read: `eventType` / `transition` / `type`, `ENTERED` / `EXITED`, `timestamp`.
* Active users (assumed): a list, or `{ activeUsers | users: [...] }`, of ids or of `{ employeeId | userId, status?, latitude?,
  longitude?, lastSeenAt? }`.

### 5.2 GPS service: today and day history (19 Nov 2026)

The GPS service (`gpsServiceUrl`, dev `http://3.111.193.85:8080`, not behind the gateway; header `Authorization: Bearer
<accessToken>`; `services/gps-history.service.ts`) has four read endpoints. All answer only for people the caller may monitor;
anyone else, **the caller included**, gets 400 `{ message: "You do not have permission to view this employee's location." }`
(or "… motion history."), shown on the screen.

| Method | Path | Body | Used by |
|---|---|---|---|
| GET | `/api/v1/gps?employeeId=` | – | Live Tracking: today's trail of the clicked person (§5.1) |
| GET | `/api/v1/motion?employeeId=` | – | Live Tracking: the clicked person's STOPPED / ON_TASK / OFFLINE points today |
| POST | `/api/v1/gps/history` | `{ employeeId, date: "yyyy-MM-dd" }` | Tracking History, Live Tracking *Show route*: the day's trail |
| POST | `/api/v1/motion/history` | `{ employeeId, date }` | Tracking History, *Show route*: the day's stops and moving time |

* GPS records: `[{ id, gpsTime, locationId, userId, isMockLocation, batteryPercentage, receivedAt, courseDegree, speed, latitude,
  longitude, accuracy }]`, **newest first**, times in UTC **without a zone**. The web sorts them, keeps the local day asked for and
  reads `speed` as m/s.
* Motion records (`MotionHistoryResponse`): `[{ employeeId, motion, startedAt, endedAt, latitude, longitude, source }]`, newest
  first; `motion` seen: `MOVING`, `STOPPED`; `endedAt` null while it lasts; `source` `GPS`. `motion` (today) returns the periods that
  overlap today, `motion/history` those that overlap the date (they may start days earlier).
* **The web builds the day** (`utils/day-route.ts`, `services/day-route.service.ts`) into the same `EmployeeRoute` the page already
  uses: trail = the GPS fixes; motion periods are cut to the hours the phone sent fixes (first fix to last fix, or to now while the
  day is live); **stops** = `STOPPED` periods of at least `stopMinMinutes`, placed at the average of the fixes during the stop;
  **moving time** = the `MOVING` periods (overlaps counted once). A stop is *Designated* at a task point of the employee's jobs
  (`jobs/task-points?assigneeId=&pendingOnly=false`, jobs active that day; match radius 100 m + `stopRadiusMeters`) or within
  200 m of the branch; otherwise *Undesignated* (*Near home* within `homeRadiusMeters` + `stopRadiusMeters` of `presentLocation`).
  Punch in / out and task completion times are not in these sources, so the page shows the first / last fix and "0 tasks
  completed" (open points in §12).
* Live Tracking, on click: `GET /api/v1/gps` (today's trail up to now) and `GET /api/v1/motion` (today's periods since the first fix;
  STOPPED / ON_TASK / OFFLINE plotted, the open period sets the status), then the person's `/gps` and `/motion` topics (§5.1).
  Both REST calls are repeated every 30 s while that person's live connection is not up.

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
| POST | `geo-tags/search` (was `GET geo-tags?…`, 19 Nov 2026) | `GeoTagSearchRequest` `{ kind, searchText, organizationUnitId, onlyUntagged, sortOn, sortDirection, pageIndex, pageSize }` | `{ items: GeoTag[], totalRecords }` (E1) |
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

Found while connecting the web to the dev backend (A1–A3, B1–B5, C1–C7, D1–D3, E1). Dev gateway moved to `15.206.8.100` (17 Nov 2026). Numbers refer to the integration steps.

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
5a. **`jobs/open` lists the caller's own job (D3).** Signed in as Atanu Tarafdar (Area Manager), `jobs/open` returns JOB-260003,
   which he **holds** (created by Purnendu Ghosh). §3.3 rules 3 and 6: the assignee cannot add tasks from the web, and `jobs/open`
   lists only jobs the caller may **update**. If it stays, adding tasks or OD members to it should be refused by C2 (`POST jobs/{id}/tasks`).
5. **Names with double spaces.** Employee names come as "Ratan  Barman" (59 of 68 in `field-officers`; also in messages and
   `employee`). Please trim / join the name parts with one space.

**Missing or inconsistent fields**

6. **E1 `GeoTag` has no `id`, `verified` or `history`**, while B5 `GeoTagPoint` for the same places sends `id` and `verified`.
   The page needs `verified` (rule 3.2.13, "Location Not Verified" badge) and `history` (location changes, read only). Is `refId`
   the intended key?
7. **`branchOperatingRadiusInKm` holds metres (A2).** Rename it (e.g. `branchOperatingRadiusInMeters`) or send km.
8. ~~**`organizationUnitId` vs `organisationUnitId`.**~~ **Settled (18 Nov 2026):** the backend uses the z spelling everywhere;
   the web follows. Remaining: `geo-tags` (E1) rows send `branchId` (could be `organizationUnitId` too).
9. **`typeCounts` (B1)** is not sent yet; the list shows the task-type icons without numbers.
10. **`verification` / `odOutcome` on `JobTask` (B2)**: no sample with values yet; the web keeps the contract shape. Please share a
    completed task (with photo) and a completed OD follow-up.
11. **Write responses are messages only (C1–C7).** Fine for the web (it shows the message and reloads). Two asks: (a) a partial
    transfer (C3 with `taskIds`) should name the new job in the message, or return its id, so the user can open it; (b) errors come
    in two shapes: `{ message, metadata, reasons }` (job writes) and `{ type, title, status, errors[] }` (validation, e.g. D1). Are
    `metadata` / `reasons` ever filled? One shape would be simpler; the web shows `message` or the `errors` list.
12. **Page size (B1).** `jobs/search` allows `pageSize` ≤ 100. Job Monitoring shows the first 100 open jobs and says how many more
    match. Is 100 the final limit, or can monitoring get a higher one?

**Not delivered yet** (the web still uses the mock for these screens). The OD Members page is fully on the real backend (D1–D3,
plus C1 / C2 to save; `od-members/add-to-job` is not needed).

13. `GET live/positions`, `POST alerts/search`, `GET alerts/open-count`, `PUT alerts/{id}/acknowledge`,
    `PUT alerts/{id}/resolve`, `GET approvals`, `PUT approvals/{id}/decision`, `GET settings`, `PUT settings`.

**Decisions (product owner)**

14. **E2 `PUT geo-tags/{refId}` was built, but Geo Tags is view only on the web** (4 Nov, confirmed 13 Nov). Should the endpoint be
    removed, or restricted to someone (who)? Not tested from the web, so who it accepts today is not known.
15. **Alerts:** who may see, acknowledge and resolve an alert (§6) is still open.
16. **Roles outside the tracking hierarchy** (Zonal Head, State Head, HOD, HR Manager, Chief Executive Officer, Chief Operating
    Officer, Deputy Manager, Assistant Vice President, Executive Assistant Manager) have **no rights** in the web's role rules today.
    Confirm, or say where each one sits.

**Live socket (17 Nov 2026, §5.1; topics changed 19 Nov 2026)**

17. **Message shapes** for `/gps`, `/motion`, `/geofence` and `/active-users`: please share one real message of each (none arrived
    in a test on 19 Nov 2026). In particular: is `/gps` one fix or the whole batch; is `speed` m/s; are times UTC; does `/motion`
    carry `employeeId` and `startedAt` like `GET /api/v1/motion`; what are the `/geofence` event names and does it carry `taskId` /
    `jobId`; is `/active-users` the full list of active people the viewer may monitor (so someone missing is offline) or only the
    people in that batch? And **alarms**: `/alarms` is gone, so where do alarms come from now (still raised by the server and listed
    by `alerts/search`, or derived from `/motion`, e.g. a long `STOPPED`, and `/geofence`)? Until then the Alerts page only polls.
18. **Live broadcast — subscriptions fixed, messages not seen yet.** Since 19 Nov 2026, 16:52 IST the server accepts
    `/topic/employee/{me}/active-users` and the selected person's `/gps` and `/motion` (before: `SUBSCRIBE rejected`). No message
    arrived in a 70 s test because nobody in the test team was sending (last fix 14:39 IST). Still to confirm with a moving phone:
    the shape of each message, and that `/active-users` is the **full** list of active people under the caller (the web shows
    everyone not listed as Offline).
19. **CORS and production:** the SockJS `info` request comes from the web's origin (e.g. `http://localhost:4200`), so the endpoint
    must allow it. Which URL (and HTTPS / WSS) is used in production? Until then production stays on polling (`liveSocketUrl: ''`).
20. **GPS history (`/api/v1/gps`).** Authenticated with `Authorization: Bearer <accessToken>` (confirmed 17 Nov 2026; not
    `X-Signature`); CORS for `http://localhost:4200` works (18 Nov 2026). Seen on 18 Nov 2026: newest first, and **times without a
    zone** (`"gpsTime": "2026-11-18T05:28:56.262"` for 10:58 IST). The web reads a zone-less time as **UTC**; please confirm, or better
    send `Z` / an offset (same for the socket messages). Still open: (a) only **today's** fixes, or more? (b) it must check that the
    caller may monitor `employeeId` (§2). (c) Is `speed` m/s?

**GPS service history (19 Nov 2026, §5.2)**

21. **Latitude and longitude swapped in `MOVING` records** (`/api/v1/motion`, `motion/history`): e.g. `latitude: 88.3958241,
    longitude: 22.459661` (Kolkata is 22.46 N, 88.40 E). `STOPPED` records are right. The web checks a period's position against the
    trail and swaps it back when needed before plotting it (§5.1).
22. **Motion periods spanning days, sent twice.** For Sushanta Roy: `MOVING` from 10 Nov 05:20 to 18 Nov 06:41, sent again with
    the same `startedAt` and `endedAt` 18 Nov 12:34; `MOVING` from 18 Nov 05:29 to 19 Nov 07:20 (26 h, no fixes overnight). A phone
    that sends nothing should go `OFFLINE` after the usual interval (§5). The web keeps the latest copy and counts only the hours
    with fixes.
23. **Which day is `date`?** Times are UTC; is `date` the UTC day or the India day? 00:00–05:30 IST belongs to the previous UTC
    day. The web asks for the date and keeps the fixes of that local (IST) day. Sending the zone (`Z`) would also settle item 20.
24. **Own data refused.** The caller cannot read their own GPS / motion (400 "You do not have permission…"). Fine for monitoring;
    confirm it is intended (an employee's own *Tracking History* would need it).
25. **For a full Tracking History**, the GPS service lacks **punch in / out** and the web lacks **task completion times**
    (`jobs/task-points` has no `completedAt` or match radius). Should `employees/{id}/route` (§5) still be built server-side,
    with stops classified there, or should `jobs/task-points` gain `taskCompletedOn` and `radiusMeters`?

**Geo Tags paging (19 Nov 2026, E1)**

26. **`geo-tags/search` response and limits.** The web expects `{ items: GeoTag[], totalRecords }` (like `groups/search`). Please
    confirm the property names, the allowed `sortOn` values (only `name` known; `code`?) and the largest `pageSize` (the web offers
    up to 100).

**Test data note:** some dev places are far from their branch (e.g. *Annapurna Mahila Group*, Sitai Branch, and member *Anima Biswas*,
Alipurduar Branch, are tagged near Kolkata, ~450 km away). Expected for test data; real data would trip the branch-radius rules.
