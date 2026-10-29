import { NgClass } from '@angular/common';
import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { Sort } from '@angular/material/sort';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActivatedRoute, Router } from '@angular/router';
import { LucideDynamicIcon } from '@lucide/angular';
import { EMPTY_UUID } from 'qubefin-core';
import { JobSearchRequest, JobStatus } from '../../models/job';
import { JobStore } from '../../stores/job-store';
import { TrackingLookupStore } from '../../stores/tracking-lookup-store';
import { pollWhileVisible } from '../../utils/poll';
import { DPD_RANGES } from '../../utils/dpd';
import { JOB_STATUS, ROLE_LABEL, optionsOf } from '../../utils/tracking-labels';
import { JobForm } from '../../components/jobs/job-form/job-form';
import { JobList } from '../../components/jobs/job-list/job-list';
import { JobView } from '../../components/jobs/job-view/job-view';
import { MockActorSwitch } from '../../mocks/mock-actor-switch';
import { TrkDateField } from '../../components/shared/date-field/trk-date-field';

/** Jobs: create (with tasks), assign now or later, transfer, extend, and audit. */
@Component({
  selector: 'qfin-jobs',
  imports: [NgClass, FormsModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatPaginatorModule, MatTooltipModule, LucideDynamicIcon, JobList, JobView, JobForm, MockActorSwitch, TrkDateField],
  templateUrl: './jobs.html',
})
export class Jobs {
  readonly store = inject(JobStore);
  readonly lookup = inject(TrackingLookupStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly EMPTY_UUID = EMPTY_UUID;
  readonly statusOptions = optionsOf(JOB_STATUS);
  readonly ROLE_LABEL = ROLE_LABEL;
  readonly DPD_RANGES = DPD_RANGES;

  readonly isViewMode = signal(true);
  readonly selectedJobId = signal<string>(EMPTY_UUID);
  readonly showFilters = signal(true);
  readonly searchDraft = signal(this.store.searchText());

  readonly hasPanel = computed(() => this.selectedJobId() !== EMPTY_UUID || !this.isViewMode());

  readonly kpis = computed(() => {
    const s = this.store.summary();
    return [
      { key: null, label: 'All jobs', value: s.total, icon: 'briefcase', color: '#334155' },
      { key: 'Unassigned' as JobStatus, label: 'Unassigned', value: s.unassigned, icon: 'user-plus', color: '#64748B' },
      { key: 'Assigned' as JobStatus, label: 'Not started', value: s.assigned, icon: 'clipboard-list', color: '#2563EB' },
      { key: 'InProgress' as JobStatus, label: 'In progress', value: s.inProgress, icon: 'activity', color: '#7C3AED' },
      { key: 'Delayed' as JobStatus, label: 'Delayed', value: s.delayed, icon: 'hourglass', color: '#E11D48' },
      { key: 'Completed' as JobStatus, label: 'Completed', value: s.completed, icon: 'circle-check', color: '#16A34A' },
    ];
  });

  private openedLink: string | null = null;
  private readonly query = toSignal(this.route.queryParamMap, { initialValue: this.route.snapshot.queryParamMap });

  constructor() {
    // Deep link: /secure/tracking/jobs?job=<id>
    // Each link is opened once, so a job that fails to load is not reopened while the URL catches up.
    effect(() => {
      const id = this.query().get('job');
      if (id === this.openedLink) return;
      this.openedLink = id;
      if (id && id !== untracked(this.selectedJobId)) untracked(() => this.onView(id, false));
    });

    // A job that is not found (outside the user's scope, or a stale link) closes the panel;
    // the error interceptor has already said why.
    effect(() => {
      if (this.store.jobError() && untracked(this.selectedJobId) !== EMPTY_UUID) {
        untracked(() => {
          this.store.setJobId(undefined);
          this.closePanel();
        });
      }
    });

    pollWhileVisible(() => {
      this.store.refreshList();
      if (this.selectedJobId() !== EMPTY_UUID && this.isViewMode()) this.store.refreshDetail();
    });
  }

  // --- Filters ---------------------------------------------------------------------------
  applySearch() {
    this.store.setFilter(this.store.searchText, this.searchDraft().trim());
  }

  filterKpi(status: JobStatus | null) {
    this.store.setFilter(this.store.status, this.store.status() === status ? null : status);
  }

  resetFilters() {
    this.searchDraft.set('');
    this.store.searchText.set('');
    this.store.status.set(null);
    this.store.branchId.set(null);
    this.store.assigneeId.set(null);
    this.store.dueFrom.set(null);
    this.store.dpdRange.set(null);
    this.store.setFilter(this.store.dueTo, null);
  }

  onPage(e: PageEvent) {
    this.store.pageSize.set(e.pageSize);
    this.store.pageIndex.set(e.pageIndex);
  }

  onSort(e: Sort) {
    this.store.sortOn.set(e.active as JobSearchRequest['sortOn']);
    this.store.setFilter(this.store.sortDirection, (e.direction || 'asc') as 'asc' | 'desc');
  }

  // --- Panel -----------------------------------------------------------------------------
  onView(id: string, updateUrl = true) {
    this.selectedJobId.set(id);
    this.isViewMode.set(true);
    if (updateUrl) this.syncUrl(id);
  }

  onAdd() {
    this.selectedJobId.set(EMPTY_UUID);
    this.isViewMode.set(false);
    this.syncUrl(null);
  }

  onSaved(id: string) {
    this.onView(id);
  }

  closePanel() {
    this.selectedJobId.set(EMPTY_UUID);
    this.isViewMode.set(true);
    this.syncUrl(null);
  }

  /** Mock only: another user was picked, so reload everything that depends on who is asking. */
  onActorChanged() {
    this.closePanel();
    this.store.setJobId(undefined);
    this.resetFilters();
    this.lookup.refresh();
    this.store.refreshList();
  }

  private syncUrl(id: string | null) {
    this.router.navigate([], { queryParams: { job: id }, queryParamsHandling: 'merge', replaceUrl: true });
  }
}
