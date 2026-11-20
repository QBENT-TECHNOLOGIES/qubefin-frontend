import { computed, Injectable } from '@angular/core';
import { ApiPaths } from 'qubefin-core';
import { httpResource } from '@angular/common/http';
import { PayslipListModel } from '../models/payslip-list-model';

@Injectable({
  providedIn: 'root',
})
export class PayslipStore {
  private readonly basePath = `${ApiPaths.PAYROLL}/payslips`;

  readonly PayslipsListResource = httpResource<PayslipListModel[]>(() => `${this.basePath}`);

  readonly PayslipsList = computed(() => this.PayslipsListResource.value() ?? []);

  readonly loading = computed(() => this.PayslipsListResource.isLoading());
  readonly error = computed(() => this.PayslipsListResource.error());
}
