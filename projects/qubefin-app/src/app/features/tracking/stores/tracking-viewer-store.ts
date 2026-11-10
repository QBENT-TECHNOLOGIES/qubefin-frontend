import { Injectable, computed, inject } from '@angular/core';
import { LoggedInUserInfoStore } from '../../../layouts/secure/store/logged-in-user-info-store';
import { TrackingViewer, ViewerRole } from '../models/field-officer';

/**
 * The signed-in user as tracking sees them: role, unit and branch scope.
 *
 * Comes from GET app-api/users/login-info (`LoggedInUserInfoStore`, loaded right after login), which replaced
 * GET tracking-api/me on 10 Nov 2026, so there is no extra request. `organisationUnitIds` are the ids of
 * `accessOrganizationUnits`. Null until login-info has loaded and after logout.
 */
@Injectable({ providedIn: 'root' })
export class TrackingViewerStore {
  private readonly userStore = inject(LoggedInUserInfoStore);

  readonly viewer = computed<TrackingViewer | null>(() => {
    const u = this.userStore.loggedInUserInfo();
    if (!u) return null;
    return {
      employeeId: u.employeeId || null,
      name: u.employee,
      role: u.role as ViewerRole, // a role name tracking does not know gets no rank (no rights), see ROLE_RANK
      unitName: u.unitName,
      organisationUnitIds: (u.accessOrganizationUnits ?? []).map((ou) => ou.id),
      canCreateJobs: !!u.canCreateJobs,
    };
  });
  readonly loading = this.userStore.loading;
  readonly error = this.userStore.error;

  refresh() {
    this.userStore.refresh();
  }
}
