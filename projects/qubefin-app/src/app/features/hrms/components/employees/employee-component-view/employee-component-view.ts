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
import { MatDialog } from '@angular/material/dialog';
import { JoiningInfoModal } from './joining-info-modal/joining-info-modal';

@Component({
  selector: 'qfin-employee-component-view',
  imports: [MatIconModule, DatePipe, MatTooltipModule, LucideDynamicIcon],
  templateUrl: './employee-component-view.html',
})
export class EmployeeComponentView {
  private readonly dialog = inject(MatDialog);
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

    const today = new Date(2026, 9, 1);
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
    if (!this.employeeStore.hasJoiningApproved()) {
      this.alertService.warning(null, 'Need approval from the Managing Director.');
      return;
    }

    if (!this.employeeStore.hasJoiningInfo()) {
      this.alertService.warning(null, 'No Joining Info Found, please Add');
      return;
    }

    try {
      const companyId = (this.officialResource.value() as any)?.companyId;
      if (!companyId || !this.employeeId()) {
        return;
      }

      const file = await firstValueFrom(
        this.reportService.getAppoinmentLetter(this.employeeId(), companyId),
      );
      const fileUrl = URL.createObjectURL(file);

      const fullName = `${this.employeeDetail()?.firstName} ${this.employeeDetail()?.middleName ?? ''} ${this.employeeDetail()?.lastName}`;

      this.documentModalService.open({
        url: fileUrl,
        documentName: `Appoinment_Letter_${fullName}_${this.employeeDetail()?.code}`,
        extension: 'pdf',
        downloadAccess: true,
      });
    } catch (error: any) {
      this.alertService.error('Failed', error?.error?.message ?? 'Unable to load payslip.');
    } finally {
    }
  }
  openJoiningModal() {
    this.dialog.open(JoiningInfoModal, {
      data: { employeeId: this.employeeId() },
      maxWidth: '100vw',
      panelClass: 'glass-modal',
    });
  }
  private readonly filesResource = rxResource({
    // employeeDetail() params e rakhle edit korar por refreshDetail() holeo files abar load hobe
    params: () => ({ id: this.employeeId(), detail: this.employeeDetail() }),
    stream: ({ params }) => {
      if (!params.id || params.id === EMPTY_UUID) {
        return of(null);
      }
      return this.employeeService.getPresonalData(params.id);
    },
  });

  readonly photoUrl = computed(() => (this.filesResource.value() as any)?.photoFileUrl ?? '');
  readonly photoName = computed(() => (this.filesResource.value() as any)?.photoFileName ?? '');
  readonly signatureUrl = computed(
    () => (this.filesResource.value() as any)?.signatureFileUrl ?? '',
  );
  readonly signatureName = computed(
    () => (this.filesResource.value() as any)?.signatureFileName ?? '',
  );

  openImage(url: string, name: string) {
    if (!url) return;
    this.documentModalService.open({
      url,
      documentName: name,
      extension: name.split('.').pop()?.toLowerCase() || 'jpg',
      downloadAccess: true,
    });
  }
}
