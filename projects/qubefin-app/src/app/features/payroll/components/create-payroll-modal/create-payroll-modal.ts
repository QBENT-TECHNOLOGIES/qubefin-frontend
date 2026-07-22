import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { LucideDynamicIcon } from '@lucide/angular';
import { MatDialogRef, MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { CompanyStore } from '../../../global/stores/company-store';
import { PayrollStore } from '../../stores/payroll-store';
import { APP_ICONS_MAP } from '../../../../lucide-icons';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';

@Component({
    selector: 'qfin-create-payroll-modal',
    imports: [CommonModule, MatDialogModule, LucideDynamicIcon, MatSelectModule, MatFormFieldModule],
    templateUrl: './create-payroll-modal.html',
})
export class CreatePayrollModal {
    readonly dialogRef = inject(MatDialogRef<CreatePayrollModal>);
    readonly companyStore = inject(CompanyStore);
    readonly payrollStore = inject(PayrollStore);
    readonly iconMap = APP_ICONS_MAP;
    readonly selectedCompanyId = signal<string>('');

    onCompanyChange(event: Event) {
        const select = event.target as HTMLSelectElement;
        this.selectedCompanyId.set(select.value);
    }
    onGenerate() {
        const companyId = this.selectedCompanyId();
        if (companyId) {
            this.payrollStore.createPayroll(companyId);
            this.dialogRef.close(true);
        }
    }
}
