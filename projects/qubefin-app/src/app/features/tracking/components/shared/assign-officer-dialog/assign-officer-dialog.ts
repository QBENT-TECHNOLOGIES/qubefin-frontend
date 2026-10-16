import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { LucideDynamicIcon } from '@lucide/angular';
import { OfficerRole } from '../../../models/field-officer';
import { TrackingLookupStore } from '../../../stores/tracking-lookup-store';
import { ROLE_LABEL } from '../../../utils/tracking-labels';
import { jobBranchConflict } from '../../../utils/job-rules';
import { FieldOfficer } from '../../../models/field-officer';
import { toDateKey } from '../../../utils/geo-utils';

export interface AssignOfficerDialogData {
  title: string;
  subtitle?: string;
  /** Pre-select an officer (e.g. current assignee). */
  currentAssigneeId?: string | null;
  /** Limit the list to one branch (null = everyone in scope). */
  branchId?: string | null;
  /** Restrict to these roles (default: all). */
  roles?: OfficerRole[];
  /**
   * Branches of the work being assigned. People who may not hold it (a CO / ABM / BM of another
   * branch, an AM of another area) are shown disabled with the reason.
   */
  workBranchIds?: string[];
  showDate?: boolean;
  defaultDate?: string;
  remarksRequired?: boolean;
  confirmText?: string;
}

export interface AssignOfficerDialogResult {
  assigneeId: string;
  scheduledDate: string;
  remarks: string;
}

@Component({
  selector: 'qfin-assign-officer-dialog',
  imports: [FormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatSelectModule, LucideDynamicIcon],
  templateUrl: './assign-officer-dialog.html',
})
export class AssignOfficerDialog {
  readonly data = inject<AssignOfficerDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<AssignOfficerDialog, AssignOfficerDialogResult>);
  private readonly lookup = inject(TrackingLookupStore);

  readonly ROLE_LABEL = ROLE_LABEL;
  readonly today = toDateKey();

  readonly assigneeId = signal<string | null>(null);
  readonly scheduledDate = signal(this.data.defaultDate ?? toDateKey());
  readonly remarks = signal('');
  readonly submitted = signal(false);
  readonly sameBranchOnly = signal(!!this.data.branchId);

  readonly groups = computed(() =>
    this.lookup
      .officersByRole()
      .filter((g) => !this.data.roles || this.data.roles.includes(g.role))
      .map((g) => ({
        ...g,
        officers: g.officers
          .filter((o) => !this.sameBranchOnly() || !this.data.branchId || o.branchId === this.data.branchId || o.role === 'AM' || o.role === 'DM')
          .map((o) => ({ ...o, blockedReason: this.blockedReason(o) })),
      }))
      .filter((g) => g.officers.length),
  );

  readonly valid = computed(
    () =>
      !!this.assigneeId() &&
      this.assigneeId() !== this.data.currentAssigneeId &&
      (!this.data.showDate || !!this.scheduledDate()) &&
      (!this.data.remarksRequired || this.remarks().trim().length >= 3),
  );

  private readonly branchName = (id: string) => this.lookup.branchById().get(id)?.name ?? 'another branch';

  blockedReason(o: FieldOfficer): string | null {
    return this.data.workBranchIds?.length ? jobBranchConflict(o, this.data.workBranchIds, this.branchName) : null;
  }

  cancel() {
    this.dialogRef.close();
  }

  confirm() {
    this.submitted.set(true);
    if (!this.valid()) return;
    this.dialogRef.close({
      assigneeId: this.assigneeId()!,
      scheduledDate: this.scheduledDate(),
      remarks: this.remarks().trim(),
    });
  }
}
