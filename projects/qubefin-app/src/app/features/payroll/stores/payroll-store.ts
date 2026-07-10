import { httpResource } from "@angular/common/http";
import { computed, Injectable, signal } from "@angular/core";
import { ApiPaths } from "qubefin-core";
import { Payroll } from "../models/payroll-model";

@Injectable({
    providedIn: 'root'
})
export class PayrollStore {
    private readonly payrollId = signal<string | undefined>(undefined);
    payrollsResource = httpResource<{ payrolls: Payroll[] }>(
        () => `${ApiPaths.HRMS}/payrolls`
    );
    readonly payrolls = computed(() =>
        this.payrollsResource.value()?.payrolls ?? []
    );

    readonly loading = computed(() => this.payrollsResource.isLoading());
    readonly error = computed(() => this.payrollsResource.error());
    private readonly payrollResource = httpResource<{ payroll: Payroll }>(() => {
        const id = this.payrollId();
        if (!id) return undefined;
        return `${ApiPaths.HRMS}/payroll/${id}`;
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

}