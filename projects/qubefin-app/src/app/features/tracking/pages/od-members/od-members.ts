import { DatePipe, DecimalPipe, NgClass } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink } from '@angular/router';
import { LucideDynamicIcon } from '@lucide/angular';
import { AlertService } from 'qubefin-core';
import { OdMember } from '../../models/od-member';
import { OdMemberService } from '../../services/od-member-service';
import { OdMemberStore } from '../../stores/od-member-store';
import { TrackingLookupStore } from '../../stores/tracking-lookup-store';
import { JobStore } from '../../stores/job-store';
import { AddOdToJobRequest } from '../../models/od-member';
import { googleMapsLink } from '../../utils/geo-utils';
import { JOB_TASK_STATUS, Tone } from '../../utils/tracking-labels';
import { DPD_RANGES, dpdRangeOf } from '../../utils/dpd';
import { AddToJobDialog, AddToJobDialogData } from '../../components/jobs/add-to-job-dialog/add-to-job-dialog';
import { TrackingChip } from '../../components/shared/tracking-chip/tracking-chip';

@Component({
  selector: 'qfin-od-members',
  imports: [
    NgClass,
    DatePipe,
    DecimalPipe,
    FormsModule,
    RouterLink,
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatTooltipModule,
    LucideDynamicIcon,
    TrackingChip,
  ],
  templateUrl: './od-members.html',
})
export class OdMembers {
  readonly store = inject(OdMemberStore);
  readonly lookup = inject(TrackingLookupStore);
  private readonly jobStore = inject(JobStore);
  private readonly service = inject(OdMemberService);
  private readonly alerts = inject(AlertService);
  private readonly dialog = inject(MatDialog);

  /** Widened for mat-table rows, which are typed `any` in templates. */
  readonly JOB_TASK_STATUS: Record<string, Tone> = JOB_TASK_STATUS;
  readonly googleMapsLink = googleMapsLink;
  readonly DPD_RANGES = DPD_RANGES;
  readonly columns = ['select', 'memberName', 'group', 'overdueAmount', 'dpd', 'home', 'followUp'];

  readonly searchDraft = signal(this.store.searchText());
  readonly selected = signal<Map<string, OdMember>>(new Map());

  readonly selectedCount = computed(() => this.selected().size);
  readonly selectedAmount = computed(() => [...this.selected().values()].reduce((s, c) => s + c.overdueAmount, 0));
  readonly assignableRows = computed(() => this.store.members().filter((c) => this.canAssign(c)));
  readonly allSelected = computed(() => this.assignableRows().length > 0 && this.assignableRows().every((c) => this.selected().has(c.id)));

  hasOpenFollowUp(c: OdMember) {
    return c.followUp?.status === 'Pending';
  }

  /** Home geo-tagged but not verified yet: cannot be put in a job until it is. */
  isUnverified(c: OdMember) {
    return !!c.homeLocation && !c.locationVerified;
  }

  canAssign(c: OdMember) {
    return !!c.homeLocation && c.locationVerified && !this.hasOpenFollowUp(c);
  }

  /** Why the row cannot be selected, for the checkbox tooltip. */
  blockedReason(c: OdMember): string {
    if (!c.homeLocation) return 'Home not geo-tagged yet';
    if (!c.locationVerified) return 'Location not verified: the member can be added to a job once the home location is verified from the mobile app';
    if (this.hasOpenFollowUp(c)) return 'Already pending in ' + c.followUp?.jobNo;
    return '';
  }

  /** Same ranges as the DPD filter (`utils/dpd.ts`). */
  dpdClass(dpd: number) {
    switch (dpdRangeOf(dpd).value) {
      case 'Over90':
        return 'bg-rose-600 text-white';
      case 'Days61To90':
        return 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300';
      case 'Days31To60':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300';
      default:
        return 'bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-300';
    }
  }

  toggle(c: OdMember, checked: boolean) {
    const next = new Map(this.selected());
    if (checked) next.set(c.id, c);
    else next.delete(c.id);
    this.selected.set(next);
  }

  toggleAll(checked: boolean) {
    const next = new Map(this.selected());
    this.assignableRows().forEach((c) => (checked ? next.set(c.id, c) : next.delete(c.id)));
    this.selected.set(next);
  }

  clearSelection() {
    this.selected.set(new Map());
  }

  applySearch() {
    this.store.setFilter(this.store.searchText, this.searchDraft().trim());
  }

  onPage(e: PageEvent) {
    this.store.pageSize.set(e.pageSize);
    this.store.pageIndex.set(e.pageIndex);
  }

  onSort(e: Sort) {
    this.store.sortOn.set(e.active);
    this.store.setFilter(this.store.sortDirection, (e.direction || 'desc') as 'asc' | 'desc');
  }

  addToJob() {
    const picked = [...this.selected().values()];
    if (!picked.length) return;
    this.dialog
      .open<AddToJobDialog, AddToJobDialogData, AddOdToJobRequest>(AddToJobDialog, {
        data: { members: picked },
        panelClass: 'glass-modal',
        maxWidth: '96vw',
      })
      .afterClosed()
      .subscribe((req) => {
        if (!req) return;
        this.service.addToJob(req).subscribe((r) => {
          this.clearSelection();
          this.store.refresh();
          this.jobStore.refreshList();
          const n = r.addedTaskIds.length;
          const where = `${r.job.jobNo}${r.job.assigneeName ? ' (' + r.job.assigneeName + ')' : ' – not assigned yet'}`;
          if (r.skipped.length) {
            this.alerts.warning(`${n} added to ${where}, ${r.skipped.length} skipped`, r.skipped.map((s) => s.reason).join(' · '));
          } else {
            this.alerts.success('Added to job', `${n} OD follow-up task${n > 1 ? 's' : ''} in ${where}.`);
          }
        });
      });
  }
}
