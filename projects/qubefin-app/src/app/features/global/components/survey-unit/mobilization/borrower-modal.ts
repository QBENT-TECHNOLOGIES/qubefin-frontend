import { Component, computed, inject, signal } from '@angular/core';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { LucideDynamicIcon } from '@lucide/angular';
import { AlertService } from 'qubefin-core';
import {
  BorrowerDecision,
  getBorrowerBreaches,
  IBorrower,
  IBorrowerRequest,
  MARITAL_STATUSES,
  MAX_INDEBTEDNESS,
  MAX_YEARLY_INCOME,
} from '../../../models/mobilization';
import { MobilizationService } from '../../../services/mobilization-service';

interface IBorrowerFormModel {
  name: string;
  guardianName: string;
  mobileNo: string;
  maritalStatus: string;
  age: number | null;
  ownHouse: boolean;
  incomeActivity: string;
  income: number | null;
  loanAmount: number | null;
  hasNpa: boolean;
  hasWriteOff: boolean;
}

// Add or edit one prospective borrower. When an eligibility rule is broken the window shows an alert
// listing every breached rule; the Credit Officer chooses Add or Block and gives the reason.
@Component({
  selector: 'qfin-borrower-modal',
  imports: [MatDialogModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatCheckboxModule, LucideDynamicIcon],
  templateUrl: './borrower-modal.html',
})
export class BorrowerModal {
  readonly dialogRef = inject(MatDialogRef<BorrowerModal, boolean>);
  private readonly data = inject<{ surveyId: string; borrower: IBorrower | null }>(MAT_DIALOG_DATA);
  private readonly service = inject(MobilizationService);
  private readonly alertService = inject(AlertService);

  readonly maritalStatuses = MARITAL_STATUSES;
  readonly isEdit = this.data.borrower !== null;
  readonly saving = signal(false);

  readonly model = signal<IBorrowerFormModel>(this.initialModel());
  readonly decision = signal<BorrowerDecision | null>(this.data.borrower?.isFlagged ? (this.data.borrower.status === 'Blocked' ? 'Block' : 'Add') : null);
  readonly decisionReason = signal<string>(this.data.borrower?.decisionReason ?? '');

  // NPA and Write-off raise the alert. Recomputed as the user types.
  readonly breaches = computed(() => {
    const m = this.model();
    return getBorrowerBreaches(m.hasNpa, m.hasWriteOff);
  });

  // The two Yes / No fields of the document, filled in by themselves from the amounts typed.
  readonly incomeWithinLimit = computed(() => {
    const income = this.model().income;
    return income === null ? '' : income <= MAX_YEARLY_INCOME ? 'Yes' : 'No';
  });
  readonly indebtednessWithinLimit = computed(() => {
    const pending = this.model().loanAmount;
    return pending === null ? '' : pending <= MAX_INDEBTEDNESS ? 'Yes' : 'No';
  });

  private initialModel(): IBorrowerFormModel {
    const b = this.data.borrower;
    return {
      name: b?.name ?? '',
      guardianName: b?.guardianName ?? '',
      mobileNo: b?.mobileNo ?? '',
      maritalStatus: b?.maritalStatus ?? '',
      age: b?.age ?? null,
      ownHouse: b?.ownHouse ?? false,
      incomeActivity: b?.incomeActivity ?? '',
      income: b?.income ?? null,
      loanAmount: b?.loanAmount ?? null,
      hasNpa: b?.hasNpa ?? false,
      hasWriteOff: b?.hasWriteOff ?? false,
    };
  }

  protected update<K extends keyof IBorrowerFormModel>(field: K, value: IBorrowerFormModel[K]) {
    this.model.update((current) => ({ ...current, [field]: value }));
  }

  protected updateNumber(field: 'age' | 'income' | 'loanAmount', text: string) {
    const value = text.trim() === '' ? null : Number(text);
    this.update(field, value !== null && Number.isNaN(value) ? null : value);
  }

  protected onSave() {
    const m = this.model();
    const problem = this.firstProblem(m);
    if (problem) {
      this.alertService.error('Oops ....', problem);
      return;
    }

    const flagged = this.breaches().length > 0;
    const request: IBorrowerRequest = {
      name: m.name.trim(),
      guardianName: m.guardianName.trim(),
      mobileNo: m.mobileNo.trim(),
      maritalStatus: m.maritalStatus,
      age: m.age as number,
      ownHouse: m.ownHouse,
      incomeActivity: m.incomeActivity.trim() || null,
      income: m.income ?? 0,
      loanAmount: m.loanAmount ?? 0,
      hasNpa: m.hasNpa,
      hasWriteOff: m.hasWriteOff,
      decision: flagged ? this.decision() : null,
      decisionReason: flagged ? this.decisionReason().trim() : null,
    };

    this.saving.set(true);
    const call = this.data.borrower
      ? this.service.update(this.data.surveyId, this.data.borrower.id, request)
      : this.service.add(this.data.surveyId, request);
    call.subscribe({
      next: (resp: any) => {
        this.saving.set(false);
        this.alertService.success('Success', resp).then(() => this.dialogRef.close(true));
      },
      error: () => this.saving.set(false),
    });
  }

  // The same rules as the server, so the user sees the problem before saving.
  private firstProblem(m: IBorrowerFormModel): string | null {
    if (!m.name.trim()) return 'Name is required.';
    if (!m.guardianName.trim()) return 'Husband / Father name is required.';
    if (!/^\d{10}$/.test(m.mobileNo.trim())) return 'Mobile No must be 10 digits.';
    if (!m.maritalStatus) return 'Please select the Marital Status.';
    if (m.age === null || m.age < 1 || m.age > 120) return 'Age must be between 1 and 120.';
    if (m.income === null || m.income < 0) return 'Enter the current yearly family income.';
    if (m.loanAmount === null || m.loanAmount < 0) return 'Enter the pending loan amount (0 if none).';
    if (this.breaches().length > 0) {
      if (!this.decision()) return 'This borrower breaks an eligibility rule. Choose Add or Block.';
      if (!this.decisionReason().trim()) return 'Give the reason for your decision.';
    }
    return null;
  }
}
