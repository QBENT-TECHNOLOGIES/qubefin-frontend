import { httpResource } from "@angular/common/http";
import { computed, inject, Injectable, signal } from "@angular/core";
import { ApiPaths } from "qubefin-core";
import { IMonthlyPayroll, IMonthWisePayroll, Payroll } from "../models/payroll-model";
import { PayrollService } from "../services/payroll-service";

@Injectable({
    providedIn: 'root'
})
export class PayrollStore {
    private readonly payrollService = inject(PayrollService);
    private readonly payrollId = signal<string | undefined>(undefined);
    payrollsResource = httpResource<{ payrolls: Payroll[] }>(
        () => `${ApiPaths.PAYROLL}/payrolls`
    );
    readonly payrolls = computed(() =>
        this.payrollsResource.value()?.payrolls ?? []
    );

    readonly loading = computed(() => this.payrollsResource.isLoading());
    readonly error = computed(() => this.payrollsResource.error());
    private readonly payrollResource = httpResource<Payroll>(() => {
        const id = this.payrollId();
        if (!id) return undefined;
        return `${ApiPaths.PAYROLL}/payroll/${id}`;
    });
    readonly payroll = computed(() => this.payrollResource.value() ?? undefined);
    readonly payrollLoading = computed(() => this.payrollResource.isLoading());
    readonly payrollError = computed(() => this.payrollResource.error());

    setPayrollId(id: string | undefined) {
        if (this.payrollId() === id) return;
        this.payrollId.set(id);
    }

    refreshList() {
        this.payrollsResource.reload();
    }
    refreshDetail() {
        this.payrollResource.reload();
    }

    private readonly monthlyPayrollParams = signal<{ month: number; year: number } | undefined>(undefined);

    monthlyPayrollResource = httpResource<{ payroll: IMonthlyPayroll }>(() => {
        const params = this.monthlyPayrollParams();
        if (!params) return undefined;
        return `${ApiPaths.PAYROLL}/payrolls/${params.month}/${params.year}`;
    });

    readonly monthlyPayroll = computed(() => this.monthlyPayrollResource.value()?.payroll ?? undefined);
    readonly monthlyPayrollLoading = computed(() => this.monthlyPayrollResource.isLoading());
    readonly monthlyPayrollError = computed(() => this.monthlyPayrollResource.error());

    setMonthlyPayrollParams(month: number, year: number) {
        const current = this.monthlyPayrollParams();
        if (current?.month === month && current?.year === year) return;
        this.monthlyPayrollParams.set({ month, year });
    }

    refreshMonthlyPayroll() {
        this.monthlyPayrollResource.reload();
    }
    monthlyPayrollSummariesResource = httpResource<{ payrolls: IMonthWisePayroll[] }>(
        () => `${ApiPaths.PAYROLL}/month-wise-payroll`
    );
    readonly monthlyPayrollSummaries = computed(() =>
        this.monthlyPayrollSummariesResource.value()?.payrolls ?? []
    );
    readonly monthlyPayrollSummariesLoading = computed(() => this.monthlyPayrollSummariesResource.isLoading());
    readonly monthlyPayrollSummariesError = computed(() => this.monthlyPayrollSummariesResource.error());

    refreshMonthlyPayrollSummaries() {
        this.monthlyPayrollSummariesResource.reload();
    }
    readonly isCreatingPayroll = signal<boolean>(false);
    createPayroll(companyId: string) {
        this.isCreatingPayroll.set(true);
        this.payrollService.createPayroll(companyId).subscribe({
            next: (response) => {
                this.isCreatingPayroll.set(false);
                this.refreshMonthlyPayrollSummaries();
            },
            error: (err) => {
                this.isCreatingPayroll.set(false);
                let errorMessage = "Failed to generate payroll. Please try again.";
                if (err.error && Array.isArray(err.error) && err.error.length > 0 && err.error[0].message) {
                    errorMessage = err.error[0].message;
                }
                else if (err.error && typeof err.error === 'string') {
                    errorMessage = err.error;
                }
                alert("⚠️ " + errorMessage);
            }
        });
    }
    readonly isUpdatingPayroll = signal<boolean>(false);
    updatePayrollComponents(command: any, onSuccess: () => void) {
        this.isUpdatingPayroll.set(true);
        this.payrollService.updateEmployeePayroll(command).subscribe({
            next: (response) => {
                this.isUpdatingPayroll.set(false);
                this.refreshDetail();
                this.refreshMonthlyPayroll();
                this.refreshMonthlyPayrollSummaries();
                onSuccess();
            },
            error: (err) => {
                this.isUpdatingPayroll.set(false);
                let errorMessage = "Failed to update payroll.";
                if (err.error?.message) errorMessage = err.error.message;
                alert("⚠️ " + errorMessage);
            }
        });
    }

    readonly lockingMonthId = signal<string | null>(null);
    lockMonthlyPayroll(month: number, year: number) {
        const lockId = `${year}-${month}`;
        this.lockingMonthId.set(lockId);
        this.payrollService.lockPayroll(year, month).subscribe({
            next: () => {
                this.lockingMonthId.set(null);
                this.refreshMonthlyPayrollSummaries();
            },
            error: (err) => {
                this.lockingMonthId.set(null);
            }
        });
    }
}