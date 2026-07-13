import { httpResource } from "@angular/common/http";
import { computed, Injectable, signal } from "@angular/core";
import { ApiPaths } from "qubefin-core";
import { IMonthlyPayroll, IMonthWisePayroll, Payroll } from "../models/payroll-model";

@Injectable({
    providedIn: 'root'
})
export class PayrollStore {
    private readonly payrollId = signal<string | undefined>(undefined);
    payrollsResource = httpResource<{ payrolls: Payroll[] }>(
        () => `${ApiPaths.PAYROLL}/payrolls`
    );
    readonly payrolls = computed(() =>
        this.payrollsResource.value()?.payrolls ?? []
    );

    readonly loading = computed(() => this.payrollsResource.isLoading());
    readonly error = computed(() => this.payrollsResource.error());
    private readonly payrollResource = httpResource<{ payroll: Payroll }>(() => {
        const id = this.payrollId();
        if (!id) return undefined;
        return `${ApiPaths.PAYROLL}/payroll/${id}`;
    });
    readonly payroll = computed(() => this.payrollResource.value()?.payroll ?? undefined);
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
}