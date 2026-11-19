import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { ApiPaths } from 'qubefin-core';
import { Observable, catchError, forkJoin, map, of } from 'rxjs';
import { JobTaskPoint } from '../models/job';
import { EmployeeRoute } from '../models/live-position';
import { TrackingLookupStore } from '../stores/tracking-lookup-store';
import { TrackingSettingsStore } from '../stores/tracking-settings-store';
import { buildDayRoute } from '../utils/day-route';
import { GpsHistoryService } from './gps-history.service';

/**
 * One employee's day (trail, stops, task points, summary) for Tracking History and Live Tracking's "Show route".
 * With the GPS service configured, built on the web (`utils/day-route.ts`) from `POST /api/v1/gps/history` and
 * `POST /api/v1/motion/history` plus the employee's task points; otherwise `GET tracking-api/employees/{id}/route`.
 * GPS-service errors reach the caller (shown on the screen); a failed task-point call only leaves the task points out.
 */
@Injectable({ providedIn: 'root' })
export class DayRouteService {
  private readonly http = inject(HttpClient);
  private readonly gps = inject(GpsHistoryService);
  private readonly lookup = inject(TrackingLookupStore);
  private readonly settingsStore = inject(TrackingSettingsStore);

  load(employeeId: string, date: string): Observable<EmployeeRoute> {
    if (!this.gps.enabled) {
      return this.http.get<EmployeeRoute>(`${ApiPaths.TRACKING}/employees/${employeeId}/route`, { params: { date } });
    }
    const tasks = this.http
      .get<JobTaskPoint[]>(`${ApiPaths.TRACKING}/jobs/task-points`, { params: { assigneeId: employeeId, pendingOnly: 'false' } })
      .pipe(catchError(() => of<JobTaskPoint[]>([])));
    return forkJoin({ fixes: this.gps.fixesOn(employeeId, date), motions: this.gps.motionsOn(employeeId, date), tasks }).pipe(
      map(({ fixes, motions, tasks }) => {
        const officer = this.lookup.officerById().get(employeeId);
        const branch = officer ? this.lookup.branchById().get(officer.organizationUnitId) : undefined;
        const s = this.settingsStore.settings();
        return buildDayRoute({
          employeeId,
          date,
          fixes,
          motions,
          tasks: tasks.filter((t) => t.assigneeId === employeeId),
          branch: branch ? { name: branch.name, location: branch.location } : null,
          home: officer?.presentLocation ?? null,
          settings: {
            stopMinMinutes: s?.stopMinMinutes ?? 5,
            stopRadiusMeters: s?.stopRadiusMeters ?? 75,
            homeRadiusMeters: s?.homeRadiusMeters ?? 50,
          },
        });
      }),
    );
  }
}
