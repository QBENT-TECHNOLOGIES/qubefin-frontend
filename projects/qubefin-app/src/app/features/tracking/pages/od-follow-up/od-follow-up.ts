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
import { OverdueCustomer } from '../../models/overdue-customer';
import { OdFollowUpService } from '../../services/od-follow-up-service';
import { OdFollowUpStore } from '../../stores/od-follow-up-store';
import { TrackingLookupStore } from '../../stores/tracking-lookup-store';
import { TrackingTaskStore } from '../../stores/tracking-task-store';
import { googleMapsLink, toDateKey } from '../../utils/geo-utils';
import { TASK_STATUS, Tone } from '../../utils/tracking-labels';
import {
  AssignOfficerDialog,
  AssignOfficerDialogData,
  AssignOfficerDialogResult,
} from '../../components/shared/assign-officer-dialog/assign-officer-dialog';
import { TrackingChip } from '../../components/shared/tracking-chip/tracking-chip';

const OPEN = new Set(['Assigned', 'Arrived', 'InProgress']);

@Component({
  selector: 'qfin-od-follow-up',
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
  templateUrl: './od-follow-up.html',
})
export class OdFollowUp {
  readonly store = inject(OdFollowUpStore);
  readonly lookup = inject(TrackingLookupStore);
  private readonly taskStore = inject(TrackingTaskStore);
  private readonly service = inject(OdFollowUpService);
  private readonly alerts = inject(AlertService);
  private readonly dialog = inject(MatDialog);

  /** Widened for mat-table rows, which are typed `any` in templates. */
  readonly TASK_STATUS: Record<string, Tone> = TASK_STATUS;
  readonly googleMapsLink = googleMapsLink;
  readonly dpdBuckets = [
    { value: null, label: 'Any DPD' },
    { value: 1, label: '1+ days' },
    { value: 30, label: '30+ days' },
    { value: 60, label: '60+ days' },
    { value: 90, label: '90+ days' },
  ];
  readonly columns = ['select', 'customerName', 'group', 'overdueAmount', 'dpd', 'home', 'followUp'];

  readonly searchDraft = signal(this.store.searchText());
  readonly selected = signal<Map<string, OverdueCustomer>>(new Map());

  readonly selectedCount = computed(() => this.selected().size);
  readonly selectedAmount = computed(() => [...this.selected().values()].reduce((s, c) => s + c.overdueAmount, 0));
  readonly assignableRows = computed(() => this.store.customers().filter((c) => this.canAssign(c)));
  readonly allSelected = computed(() => this.assignableRows().length > 0 && this.assignableRows().every((c) => this.selected().has(c.id)));

  hasOpenFollowUp(c: OverdueCustomer) {
    return !!c.followUp && OPEN.has(c.followUp.status);
  }

  canAssign(c: OverdueCustomer) {
    return !!c.homeLocation && !this.hasOpenFollowUp(c);
  }

  dpdClass(dpd: number) {
    if (dpd >= 90) return 'bg-rose-600 text-white';
    if (dpd >= 60) return 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300';
    if (dpd >= 30) return 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300';
    return 'bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-300';
  }

  toggle(c: OverdueCustomer, checked: boolean) {
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

  assign() {
    const picked = [...this.selected().values()];
    if (!picked.length) return;
    const branches = new Set(picked.map((c) => c.branchId));
    this.dialog
      .open<AssignOfficerDialog, AssignOfficerDialogData, AssignOfficerDialogResult>(AssignOfficerDialog, {
        data: {
          title: `Assign follow-up for ${picked.length} customer${picked.length > 1 ? 's' : ''}`,
          subtitle: `Total overdue ₹${this.selectedAmount().toLocaleString('en-IN')}. The officer must visit the geo-tagged home.`,
          branchId: branches.size === 1 ? picked[0].branchId : null,
          showDate: true,
          defaultDate: toDateKey(),
          confirmText: 'Assign visits',
        },
        panelClass: 'glass-modal',
        maxWidth: '95vw',
      })
      .afterClosed()
      .subscribe((res) => {
        if (!res) return;
        this.service
          .assign({ customerIds: picked.map((c) => c.id), assigneeId: res.assigneeId, scheduledDate: res.scheduledDate, remarks: res.remarks || null })
          .subscribe((r) => {
            this.clearSelection();
            this.store.refresh();
            this.taskStore.refreshList();
            if (r.skipped.length) {
              this.alerts.warning(
                `${r.createdTaskIds.length} assigned, ${r.skipped.length} skipped`,
                r.skipped.map((s) => s.reason).join(' · '),
              );
            } else {
              this.alerts.success('Follow-ups assigned', `${r.createdTaskIds.length} visit task${r.createdTaskIds.length > 1 ? 's' : ''} created.`);
            }
          });
      });
  }
}
