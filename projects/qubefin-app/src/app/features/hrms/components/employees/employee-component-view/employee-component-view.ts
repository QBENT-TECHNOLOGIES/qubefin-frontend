import { Component, computed, effect, inject, model, output } from '@angular/core';

import { AlertService, DocumentModalService, EMPTY_UUID } from 'qubefin-core';
import { LucideDynamicIcon } from '@lucide/angular';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DatePipe } from '@angular/common';
import { EmployeeStore } from '../../../stores/employee-store';
import { EmployeeService } from '../../../services/employee-service';
import { APP_ICONS_MAP } from '../../../../../lucide-icons';
import { rxResource } from '@angular/core/rxjs-interop';
import { firstValueFrom, of } from 'rxjs';
import { ReportService } from '../../../../Report/Service/report-service';

@Component({
  selector: 'qfin-employee-component-view',
  imports: [MatIconModule, DatePipe, MatTooltipModule, LucideDynamicIcon],
  templateUrl: './employee-component-view.html',
})
export class EmployeeComponentView {
  employeeStore = inject(EmployeeStore);
  private readonly employeeService = inject(EmployeeService);
  employeeId = model<string>(EMPTY_UUID);
  showEdit = output<boolean>();
  employeeDetail = this.employeeStore.employeeInfoComponent;
  auditInfo = this.employeeStore.employeeAuditInfo;
  readonly iconMap = APP_ICONS_MAP;
  readonly reportService = inject(ReportService);
  readonly alertService = inject(AlertService);
  readonly documentModalService = inject(DocumentModalService);

  private readonly officialResource = rxResource({
    params: () => ({ id: this.employeeId() }),
    stream: ({ params }) => {
      if (!params.id || params.id === EMPTY_UUID) {
        return of(null);
      }

      return this.employeeService.getOfficialData(params.id);
    },
  });

  readonly showAppointmentLetter = computed(() => {
    const joiningDate = (this.officialResource.value() as any)?.joiningDate;
    if (!joiningDate) {
      return false;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return new Date(joiningDate) >= today;
  });

  constructor() {
    effect(() => {
      if (this.employeeId() && this.employeeId() !== EMPTY_UUID) {
        this.employeeStore.setEmployeeComponentId(this.employeeId());
      }
    });
  }
  onShowEdit() {
    this.showEdit.emit(true);
  }

  async onViewDocument() {
    try {
      const companyId = (this.officialResource.value() as any)?.companyId;
      if(!companyId || !this.employeeId()){
        return;
      }

      const file = await firstValueFrom(this.reportService.getAppoinmentLetter(this.employeeId(), companyId));
      const fileUrl = URL.createObjectURL(file);

      const fullName = `${this.employeeDetail()?.firstName} ${this.employeeDetail()?.middleName ?? ''} ${this.employeeDetail()?.lastName}`

      this.documentModalService.open({
        url: fileUrl,
        documentName: `Appoinment_Letter_${fullName}_${this.employeeDetail()?.code}`,
        extension: 'pdf',
        downloadAccess: true,
      });
    } catch (error: any) {
      this.alertService.error('Failed', error?.error?.message ?? 'Unable to load payslip.');
    } finally {}
  }
}
