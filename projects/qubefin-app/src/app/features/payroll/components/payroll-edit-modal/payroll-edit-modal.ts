import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { LucideDynamicIcon } from '@lucide/angular';
import { PayrollStore } from '../../stores/payroll-store';
import { PayrollComponent, UpdatePayrollCommand } from '../../models/payroll-model';
import { CreatePayrollModal } from '../create-payroll-modal/create-payroll-modal';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'qfin-payroll-edit-modal',
  imports: [CommonModule, FormsModule, MatDialogModule, LucideDynamicIcon],
  templateUrl: './payroll-edit-modal.html',
  styleUrls: ['./payroll-edit-modal.scss']
})
export class PayrollEditModal {
  public readonly dialogRef = inject(MatDialogRef<CreatePayrollModal>);
  private readonly data = inject(MAT_DIALOG_DATA);
  public readonly payrollStore = inject(PayrollStore);

  public isEditMode = signal(false);

  private editableEarnings = signal<PayrollComponent[]>([]);
  private editableDeductions = signal<PayrollComponent[]>([]);
  constructor() {
    if (this.data?.id) {
      this.payrollStore.setPayrollId(this.data.id);
    }
  }
  displayEarnings = computed(() => {
    if (this.isEditMode()) return this.editableEarnings();
    return this.payrollStore.payroll()?.earningHeads ?? [];
  });

  displayDeductions = computed(() => {
    if (this.isEditMode()) return this.editableDeductions();
    return this.payrollStore.payroll()?.deductionHeads ?? [];
  });
  totalEarnings = computed(() => this.displayEarnings().reduce((acc, item) => acc + (Number(item.amount) || 0), 0));
  totalDeductions = computed(() => this.displayDeductions().reduce((acc, item) => acc + (Number(item.amount) || 0), 0));
  netPay = computed(() => this.totalEarnings() - this.totalDeductions());
  getMonthName(monthNumber: number): string {
    const date = new Date();
    date.setMonth(monthNumber - 1);
    return date.toLocaleString('default', { month: 'long' });
  }
  onEdit(): void {
    const currentData = this.payrollStore.payroll();
    if (currentData) {
      this.editableEarnings.set((currentData.earningHeads ?? []).map(c => ({ ...c })));
      this.editableDeductions.set((currentData.deductionHeads ?? []).map(c => ({ ...c })));
      this.isEditMode.set(true);
    }
  }
  onEarningAmountChange(item: PayrollComponent, amount: number): void {
    this.editableEarnings.update(items =>
      items.map(i => i.id === item.id ? { ...i, amount } : i)
    );
  }

  onDeductionAmountChange(item: PayrollComponent, amount: number): void {
    this.editableDeductions.update(items =>
      items.map(i => i.id === item.id ? { ...i, amount } : i)
    );
  }

  onSave(): void {
    if (!this.data?.id) return;
    const command: UpdatePayrollCommand = {
      payrollId: this.data.id,
      earningHeads: this.displayEarnings().map(e => ({
        salaryComponentId: e.salaryComponentId,
        amount: Number(e.amount)
      })),
      deductionHeads: this.displayDeductions().map(d => ({
        salaryComponentId: d.salaryComponentId,
        amount: Number(d.amount)
      }))
    };
    this.payrollStore.updatePayrollComponents(command, () => {
      this.isEditMode.set(false);
      this.dialogRef.close(true);
    });
  }
  onCancel(): void {
    if (this.isEditMode()) {
      this.isEditMode.set(false);
    } else {
      this.dialogRef.close();
    }
  }
}