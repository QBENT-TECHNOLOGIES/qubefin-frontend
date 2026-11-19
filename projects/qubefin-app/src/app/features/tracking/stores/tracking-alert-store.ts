import { httpResource } from '@angular/common/http';
import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { ApiPaths, AuthStore } from 'qubefin-core';
import { AlertSearchResponse, AlertSeverity, AlertStatus, AlertType, TrackingAlert } from '../models/tracking-alert';
import { toDateKey } from '../utils/geo-utils';
import { sameAlert } from '../utils/live-message';

@Injectable({ providedIn: 'root' })
export class TrackingAlertStore {
  readonly status = signal<AlertStatus | null>('Open');
  readonly type = signal<AlertType | null>(null);
  readonly severity = signal<AlertSeverity | null>(null);
  readonly branchId = signal<string | null>(null);
  readonly employeeId = signal<string | null>(null);
  readonly fromDate = signal<string | null>(null);
  readonly toDate = signal<string | null>(null);
  readonly pageIndex = signal(0);
  readonly pageSize = signal(10);

  readonly searchResource = httpResource<AlertSearchResponse>(() => ({
    url: `${ApiPaths.TRACKING}/alerts/search`,
    method: 'POST',
    body: {
      status: this.status(),
      type: this.type(),
      severity: this.severity(),
      branchId: this.branchId(),
      employeeId: this.employeeId(),
      fromDate: this.fromDate(),
      toDate: this.toDate(),
      pageIndex: this.pageIndex(),
      pageSize: this.pageSize(),
    },
  }));

  /**
   * Alarms pushed on the live socket this session, newest first. Nothing fills it since `/alarms` was replaced by `/motion`
   * (19 Nov 2026); kept, with the "New" highlight, until the backend says where alarms are pushed now (contract §12).
   */
  private readonly pushed = signal<TrackingAlert[]>([]);
  /** Ids of pushed alarms that came without one (made up on the web). */
  private readonly localIds = signal<ReadonlySet<string>>(new Set());

  private readonly response = computed(() => (this.searchResource.hasValue() ? this.searchResource.value() : undefined));
  private readonly serverAlerts = computed(() => this.response()?.alerts ?? []);

  /** Pushed alarms that match the filters and are not in the polled page yet; shown on top of page 1. */
  readonly liveAlerts = computed(() => {
    const server = this.serverAlerts();
    return this.pushed().filter((a) => this.matches(a, true) && !server.some((s) => sameAlert(s, a)));
  });

  readonly alerts = computed(() => (this.pageIndex() === 0 ? [...this.liveAlerts(), ...this.serverAlerts()] : this.serverAlerts()));
  readonly totalRecords = computed(() => (this.response()?.totalRecords ?? 0) + this.liveAlerts().length);
  /** Open alerts per type for the cards (not narrowed by the type filter), pushed alarms included. */
  readonly openByType = computed(() => {
    const base = this.response()?.openByType ?? null;
    const server = this.serverAlerts();
    const live = this.pushed().filter((a) => a.status === 'Open' && this.matches(a, false) && !server.some((s) => sameAlert(s, a)));
    if (!live.length) return base;
    const counts: Record<string, number> = { ...(base ?? {}) };
    live.forEach((a) => (counts[a.type] = (counts[a.type] ?? 0) + 1));
    return counts as Record<AlertType, number>;
  });
  readonly loading = computed(() => this.searchResource.isLoading());
  readonly error = computed(() => this.searchResource.error());

  constructor() {
    // Another sign-in on this tab must not see the previous user's pushed alarms.
    const auth = inject(AuthStore);
    effect(() => {
      auth.accessToken();
      this.pushed.set([]);
      this.localIds.set(new Set());
    });
  }

  /** Pushed alarm (not from the polled list yet): highlighted as new. */
  isLive(a: TrackingAlert): boolean {
    return this.liveAlerts().includes(a);
  }

  /** Pushed without a server id: acknowledge / resolve wait for the next refresh. */
  isUnsaved(a: TrackingAlert): boolean {
    return this.localIds().has(a.id);
  }

  setFilter<T>(sig: { set(v: T): void }, value: T) {
    sig.set(value);
    this.pageIndex.set(0);
  }

  refresh() {
    this.searchResource.reload();
  }

  /** The search filters, applied in the browser to a pushed alarm. */
  private matches(a: TrackingAlert, withType: boolean): boolean {
    const day = toDateKey(new Date(a.raisedAt));
    return (
      (!this.status() || a.status === this.status()) &&
      (!withType || !this.type() || a.type === this.type()) &&
      (!this.severity() || a.severity === this.severity()) &&
      (!this.branchId() || a.branchId === this.branchId()) &&
      (!this.employeeId() || a.employeeId === this.employeeId()) &&
      (!this.fromDate() || day >= this.fromDate()!) &&
      (!this.toDate() || day <= this.toDate()!)
    );
  }
}
