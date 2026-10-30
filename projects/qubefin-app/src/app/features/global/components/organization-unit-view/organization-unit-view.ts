import {
  Component,
  computed,
  effect,
  inject,
  linkedSignal,
  model,
  output,
  signal,
} from '@angular/core';
import { EMPTY_UUID, PermissionStore } from 'qubefin-core';
import { OrganizationUnitStore } from '../../stores/organization-unit-store';
import { LucideDynamicIcon } from '@lucide/angular';
import { APP_ICONS_MAP } from '../../../../lucide-icons';
import { DatePipe } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { DesignationEditModal } from '../designation-edit-modal/designation-edit-modal';
import { MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { OrganizationUnitService } from '../../services/organization-unit-service';
import { AlertService } from 'qubefin-core';
import { delay, finalize, Observable, of } from 'rxjs';
import { MatCheckbox, MatCheckboxChange } from '@angular/material/checkbox';

@Component({
  selector: 'qfin-organization-unit-view-component',
  imports: [DatePipe, LucideDynamicIcon, MatTableModule, MatTooltipModule, MatCheckbox],
  templateUrl: './organization-unit-view.html',
})
export class OrganizationUnitViewComponent {
  private readonly dialog = inject(MatDialog);
  permissionStore = inject(PermissionStore);
  organizationUnitStore = inject(OrganizationUnitStore);
  private readonly alertService = inject(AlertService);
  private readonly organizationUnitService = inject(OrganizationUnitService);

  organizationUnitId = model<string>(EMPTY_UUID);
  readonly iconMap = APP_ICONS_MAP;

  showEdit = output<boolean>();

  readonly inchargeLocked = signal(false);
  readonly processingId = signal<string | null>(null);
  readonly currentInchargeId = linkedSignal<string | null>(
    () => this.organizationUnit()?.designations?.find((d) => d.isIncharge)?.id ?? null,
  );
  organizationUnit = this.organizationUnitStore.organizationUnit;
  hasLocation = computed(() => {
    const unit = this.organizationUnit();
    return unit?.latitude != null && unit?.longitude != null;
  });

  onMapClick() {
    const unit = this.organizationUnit();
    if (unit?.latitude == null || unit?.longitude == null) return;

    const url = `https://www.google.com/maps/search/?api=1&query=${unit.latitude},${unit.longitude}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  displayedColumns = computed(() => {
    if (this.organizationUnit()?.organizationUnitTypeName === 'HeadOffice')
      return ['sl', 'name', 'post', 'grade', 'employee', 'isActive', 'actions'];
    else return ['sl', 'name', 'post', 'grade', 'employee', 'isActive', 'incharge', 'actions'];
  });
  constructor() {
    effect(() => {
      if (this.organizationUnitId()) {
        this.organizationUnitStore.setOrganizationUnitId(this.organizationUnitId());
      }
    });
  }

  onShowEdit() {
    this.showEdit.emit(true);
  }
  onDesignation(id: string) {
    this.dialog.open(DesignationEditModal, {
      data: { id: this.organizationUnitId(), name: this.organizationUnit()?.name },
      maxWidth: '95vw',
      panelClass: 'glass-modal',
    });
  }
  onUpdateDesigantionStatus(id: string, isActive: boolean) {
    this.alertService
      .confirm(
        'Confirmation',
        'Are you sure you want to ' + (isActive ? 'disable' : 'enable') + ' this designation?',
      )
      .then((result) => {
        if (result.isConfirmed) {
          this.organizationUnitService.updateDesignationStatus(id).subscribe({
            next: () => {
              this.alertService
                .success('Success', `Designation ${isActive ? 'Disabled' : 'Enabled'} Successfully`)
                .then(() => {
                  this.organizationUnitStore.refresh();
                });
            },
            error: (err: any) => {},
          });
        }
      });
  }

  onInchargeChange(designationId: string, event: MatCheckboxChange) {
    if (this.inchargeLocked() || !event.checked) return;

    const unit = this.organizationUnit();
    const designationName =
      unit?.designations?.find((d) => d.id === designationId)?.name ?? 'Designation';
    const unitName = unit?.name ?? 'this unit';

    this.alertService
      .confirm(
        'Confirmation',
        `Are you sure you want to make ${designationName} the incharge of ${unitName}?`,
      )
      .then((result) => {
        if (!result.isConfirmed) {
          event.source.checked = false;
          return;
        }
        this.saveIncharge(designationId, designationName, unitName);
      });
  }

  private saveIncharge(designationId: string, designationName: string, unitName: string) {
    const previousId = this.currentInchargeId();
    this.inchargeLocked.set(true);
    this.processingId.set(designationId);
    this.currentInchargeId.set(designationId);

    this.organizationUnitService
      .updateDesignationIncharge(designationId)
      .pipe(
        finalize(() => {
          this.processingId.set(null);
          this.inchargeLocked.set(false);
        }),
      )
      .subscribe({
        next: () => {
          this.alertService.success(
            'Success',
            `${designationName} is now incharge in ${unitName}.`,
          );
          this.organizationUnitStore.refresh();
        },
        error: () => {
          this.currentInchargeId.set(previousId);
        },
      });
  }
}
