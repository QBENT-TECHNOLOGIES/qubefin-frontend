# Tracking API Contract (`tracking-api`)

> Contract between the **web frontend** (task assignment + monitoring) and the **backend**.
> The frontend currently runs against an in-browser mock that implements exactly this contract
> (`features/tracking/mocks/`). The backend team can build to this document. When the real service is up,
> set `useTrackingMocks: false` in the environment file. No other frontend change should be needed.

**Source of truth for shapes:** the TypeScript interfaces in
`projects/qubefin-app/src/app/features/tracking/models/*.ts`. This document names them and adds the rules
the server must enforce.

---

## 1. Conventions

| Item | Rule |
|---|---|
| Base path | `{gatewayPath}tracking-api/…`. The frontend sends relative URLs (`ApiPaths.TRACKING`), and `AuthInterceptor` adds the gateway and `Authorization: Bearer <accessToken>`. |
| Scope | Every list is filtered **server-side** to what the caller may see. A CO sees only their own data. BM, AM and DM see their branch, area or division. The UI never filters by hierarchy itself. |
| Ids | GUID strings. |
| Dates | `yyyy-MM-dd` for calendar days (`scheduledDate`, `fromDate`…). ISO-8601 with offset for instants (`dueBy`, `raisedAt`, timeline stamps). |
| Coordinates | `{ "lat": number, "lng": number }`, WGS-84, 6 decimals (`GeoPoint`). |
| Errors | Non-2xx with `{ "message": "human readable" }` (400) or `{ "errors": ["…"] }`. `HttpErrorInterceptor` shows them as a popup. |
| Writes | Return the updated entity (or the documented response). Every write is audited with user + server time. |
| Polling | Live screens poll every **30 s** (positions, alerts, task lists, approvals). Keep these endpoints cheap. SignalR can replace polling later without changing response shapes. |

---

## 2. Lookups

| Method | Path | Response |
|---|---|---|
| GET | `branches` | `TrackingBranch[]`: id, name, code, `location` (nullable), `operatingRadiusKm` |
| GET | `field-officers?branchId=` | `FieldOfficer[]`: id, employeeCode, name, `role` (`CO`·`BM`·`AM`·`DM`), designation, branchId/Name, phone, `homeLocation`, reportingOfficerName |

`field-officers` must only return people the caller is allowed to assign work to.

---

## 3. Tasks

| Method | Path | Body | Response |
|---|---|---|---|
| POST | `tasks/search` | `TaskSearchRequest` | `TaskSearchResponse` `{ tasks, totalRecords, summary }` |
| GET | `tasks/{id}` | – | `TrackingTask` |
| GET | `tasks/{id}/history` | – | `TaskHistoryEntry[]` (newest first) |
| POST | `tasks` | `CreateTaskRequest` | `TrackingTask` |
| PUT | `tasks/{id}/reassign` | `{ assigneeId, remarks }` | `TrackingTask` |
| POST | `tasks/bulk-reassign` | `{ taskIds[], assigneeId, remarks }` | `{ updated: number }` |
| PUT | `tasks/{id}/cancel` | `{ remarks }` | `TrackingTask` |

**Search filters:** `searchText` (task no, title, assignee, target name), `status`, `type`, `source` (`System`·`Manual`), `branchId`, `assigneeId`, `fromDate`/`toDate` (inclusive, on `scheduledDate`), paging, and `sortOn` ∈ `dueBy`·`scheduledDate`·`assigneeName`·`status`.
`status = InProgress` means **on site**: it returns tasks that are `Arrived` **or** `InProgress`.
`summary` is computed over the same filters **excluding** `status`: `total, assigned, inProgress (Arrived+InProgress), completed, missed, late`.

**Task lifecycle** (`TaskStatus`): `Assigned → Arrived → InProgress → Completed`, or `Missed` / `Cancelled`.

Server rules:
1. **Timestamps are server-generated.** `timeline.assignedAt/arrivedAt/startedAt/completedAt` are stamped when the server receives the mobile event. Clients can never send or edit them (requirement 4.4, "Task timing and schedule integrity").
2. `arrivedAt` is accepted only when the device fix is within `target.matchRadiusMeters` of `target.location`. Store the fix and the distance in `verification.arrivalLocation` / `arrivalDistanceMeters`.
3. On completion, store the photo URL, the photo's own GPS fix, `completionDistanceMeters`, and `locationMatched = distance ≤ matchRadiusMeters` (requirement 3.2).
4. `isLate` = completed after `dueBy`, or still open after `dueBy`.
5. A job marks open tasks `Missed` after `dueBy` and writes a `MarkedMissed` history entry.
6. Reassigning resets progress (`status = Assigned`, clears arrival/start/verification) and writes `Reassigned` with from/to names and remarks. Completed, cancelled or missed tasks cannot be reassigned or cancelled (return 400).
7. **Audit trail** (`TaskHistoryEntry`) is append-only: `Created, Assigned, Reassigned, Cancelled, Arrived, Started, Completed, MarkedMissed`.
8. `source = System` for tasks created by the allocation job (§8); `assignedByName = "Allocation Engine"` or similar.

`CreateTaskRequest.target` (`TaskTarget`) is either a geo-tagged entity (`kind` + `refId`; `location` is copied from the geo-tag at creation) or `kind: "Custom"` with a location the user picked on the map.

---

## 4. Overdue (OD) follow-up

| Method | Path | Body | Response |
|---|---|---|---|
| POST | `overdue-customers/search` | `OverdueCustomerSearchRequest` | `{ customers: OverdueCustomer[], totalRecords, totalOverdueAmount }` |
| POST | `overdue-customers/assign-follow-up` | `{ customerIds[], assigneeId, scheduledDate, remarks }` | `{ createdTaskIds[], skipped: [{ customerId, reason }] }` |

* Data comes from the **Loan Status Report** (LOS/LMS). `dpd` = days past due.
* `followUp` = latest OD follow-up task for that customer, with `status` and `outcome` (`OdVisitOutcome`: customerAvailable, paid, amountCollected, **ptpDate**, remarks).
* Assigning creates one `OdFollowUp` task per customer, targeting the customer's geo-tagged home. Skip (do not fail) customers with **no home geo-tag** or an **open** follow-up, and return them in `skipped` with a reason.
* Outcome rules (mobile side, validated by the server): if paid, the photo is optional. If not paid, `ptpDate` is required.

---

## 5. Live monitoring

| Method | Path | Response |
|---|---|---|
| GET | `live/positions?branchId=` | `LivePosition[]`: latest fix per employee in scope |
| GET | `employees/{id}/route?date=yyyy-MM-dd` | `EmployeeRoute`: `points[]` (lat, lng, at, speedKmph), `stops[]` (location, from, to, durationMinutes, label), `totalDistanceKm`, punchIn/Out |

`LivePosition.status` (computed server-side): `OnTask` (inside an active task radius) · `Moving` · `Idle` (stationary) · `GpsOff` · `Offline` (no fix for longer than about 3× the position interval) · `NotPunchedIn`.
Also return `distanceFromBranchKm`, `openAlertCount`, `currentTaskId/Title`, `batteryPct`, `accuracyMeters`.
`route.stops` = clusters where speed ≈ 0 for ≥ 5 min. Set `label` when a stop matches a task or branch geo-tag.

---

## 6. Alerts

| Method | Path | Body | Response |
|---|---|---|---|
| POST | `alerts/search` | `AlertSearchRequest` | `{ alerts: TrackingAlert[], totalRecords, openByType: Record<AlertType, number> }` |
| GET | `alerts/open-count` | – | `number` (for a future header badge) |
| PUT | `alerts/{id}/acknowledge` | `{}` | `TrackingAlert` |
| PUT | `alerts/{id}/resolve` | `{ remarks }` | `TrackingAlert` |

Alert types and the rules the **backend** evaluates on incoming fixes (thresholds from §8, all subject to active exceptions and working hours):

| `AlertType` | Rule (from the meeting minutes) | Default |
|---|---|---|
| `NearHome` | Within `homeRadiusMeters` of the registered residence during duty / field work | 50 m |
| `GpsOff` | GPS or location disabled for longer than `gpsOffGraceMinutes` during duty | 5 min |
| `Stationary` | Stationary for longer than `stationaryMinutes` while travelling → notify the concerned CO + reporting officials | 15 min |
| `OutsideBranchRadius` | Beyond `branchRadiusKm` of the assigned branch **without an approved request** (§7) | 30 km |
| `LocationMismatch` | Completion photo outside the task's match radius | 100 m |
| `LateTask` | Task completed after `dueBy` | – |

`notifiedTo` lists who received it (reporting officer, CO, "Administration") per the notification settings. The backend should also push these into the existing `global-api/notifications` feed so the header bell picks them up.

---

## 7. Out-of-radius approvals

| Method | Path | Body | Response |
|---|---|---|---|
| GET | `approvals?status=Pending\|Approved\|Rejected` | – | `OutOfRadiusRequest[]` (newest first) |
| PUT | `approvals/{id}/decision` | `{ approved: boolean, remarks }` | `OutOfRadiusRequest` |

Requests are raised from the mobile app before lead sourcing or other field activity beyond the branch radius (requirement 1.7). Only authorised higher officials may decide. Remarks are required when rejecting. An approved request suppresses `OutsideBranchRadius` alerts for that employee, date and destination area.

---

## 8. Geo-tags and settings

| Method | Path | Body | Response |
|---|---|---|---|
| GET | `geo-tags?kind=&searchText=&branchId=&onlyUntagged=` | – | `GeoTag[]` |
| PUT | `geo-tags/{id}` | `{ location, radiusMeters, reason }` | `GeoTag` |
| GET | `settings` | – | `TrackingSettings` |
| PUT | `settings` | `TrackingSettings` | `TrackingSettings` |

* `GeoTagKind`: `Branch` · `GroupCentre` · `Customer` · `OdCustomer` · `EmployeeHome`.
* The web UI edits **Branch, GroupCentre and EmployeeHome** (requirement 2.5, "change of group meeting location"). Customer and OD-customer homes are captured on the mobile app with the borrower and co-borrower photo, so the UI shows them read-only.
* Every change appends to `history` (`GeoTagChange` with reason). `reason` is required. A branch geo-tag should stay in sync with the Organisation Unit's latitude/longitude.
* `TrackingSettings` holds the thresholds in §6, working hours, notification switches, **system allocation rules** (`autoAssignOdFollowUps` + `autoAssignOdMinDpd`, `autoAssignGroupMeetings`, `autoAllocationTime`), and management-defined `exceptions[]` (name, appliesTo, optional daily window, active). The mobile app must read the same settings (for example `positionIntervalSeconds`).

---

## 9. Mobile-side inputs (not part of this web scope)

For completeness, these events feed the data above. They come from the mobile app and are not called by the web: punch-in/out with odometer photos, periodic GPS fixes (with GPS-on/off state and battery), task arrive/start/complete with photo + fix, OD outcome (paid / PTP), geo-tag capture with photo, out-of-radius request, and the group-formation form (from LOS/MIS).

---

## 10. Switching from mock to real backend

1. Implement the endpoints above under `tracking-api` on the gateway.
2. In `environment*.ts`, set `useTrackingMocks: false`.
3. Remove `trackingMockInterceptor` from `app.config.ts` and delete `features/tracking/mocks/`.
