import { Component, effect, inject, model, output } from '@angular/core';
import { EMPTY_UUID, PermissionStore } from 'qubefin-core';
import { OrganizationUnitStore } from '../../stores/organization-unit-store';
import { LucideDynamicIcon } from '@lucide/angular';
import { APP_ICONS_MAP } from '../../../../lucide-icons';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'qfin-organization-unit-view-component',
  imports: [DatePipe, LucideDynamicIcon],
  templateUrl: './organization-unit-view.html',
})
export class OrganizationUnitViewComponent {
  permissionStore = inject(PermissionStore);
  organizationUnitStore = inject(OrganizationUnitStore);

  organizationUnitId = model<string>(EMPTY_UUID);
  readonly iconMap = APP_ICONS_MAP;

  showEdit = output<boolean>();

  organizationUnit = this.organizationUnitStore.organizationUnit;

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
}
