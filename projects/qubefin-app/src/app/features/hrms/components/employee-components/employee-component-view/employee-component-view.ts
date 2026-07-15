import { Component, effect, inject, model, output } from '@angular/core';

import { EMPTY_UUID } from 'qubefin-core';
import { LucidePencil, LucidePiggyBank, LucideCheck, LucideLayoutGrid, LucideListOrdered, LucideReceiptText, LucideShieldPlus, LucideTag, LucideWallet, LucideX, LucideDynamicIcon } from '@lucide/angular';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DatePipe } from '@angular/common';
import { EmployeeStore } from '../../../stores/employee-store';
import { APP_ICONS_MAP } from '../../../../../lucide-icons';

@Component({
  selector: 'qfin-employee-component-view',
  imports: [MatIconModule,
    DatePipe,
    MatTooltipModule,
    LucidePencil,
    LucideWallet,
    LucideDynamicIcon
    ],
  templateUrl: './employee-component-view.html',
})
export class EmployeeComponentView {
  employeeStore = inject(EmployeeStore);
  employeeId = model<string>(EMPTY_UUID);
  showEdit = output<boolean>();
  employeeDetail = this.employeeStore.employeeInfoComponent;
  readonly iconMap = APP_ICONS_MAP;
  
  constructor() {
    effect(() => {
      if (this.employeeId() && this.employeeId() !== EMPTY_UUID) {
        this.employeeStore.setEmployeeComponentId(this.employeeId());
        console.log(this.employeeDetail());
      }
    });
  }
  onShowEdit() {
    this.showEdit.emit(true);
  }
}
