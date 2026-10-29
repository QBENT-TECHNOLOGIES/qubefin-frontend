import { Component, computed, effect, inject, model, output } from '@angular/core';
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

@Component({
  selector: 'qfin-organization-unit-view-component',
  imports: [DatePipe, LucideDynamicIcon, MatTableModule, MatTooltipModule],
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
  // readonly desigantions = [
  //   { id: '1', name: 'Designation 1', post: 'post1', grade: 'grade1', role: 'role1' },
  //   { id: '2', name: 'Designation 2', post: 'post2', grade: 'grade2', role: 'role2' },
  //   { id: '3', name: 'Designation 3', post: 'post3', grade: 'grade3', role: 'role3' },
  // ];
  displayedColumns = computed(() => {
    return ['sl', 'name', 'post', 'grade', 'employee', 'isActive', 'actions'];
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
}
