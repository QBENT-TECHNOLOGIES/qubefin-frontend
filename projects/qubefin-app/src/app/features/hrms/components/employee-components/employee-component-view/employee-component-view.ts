import { Component, effect, inject, model, output } from '@angular/core';
import { SalaryStore } from '../../../stores/salary-store';
import { EMPTY_UUID } from 'qubefin-core';
import { LucidePencil, LucideUserCheck, LucideCalendarPlus, LucideUserCog, LucideCalendarClock, LucideUser, LucideLayers, LucideBuilding2, LucideMapPinned, LucideLandmark, LucideFactory, LucideSquarePen, LucidePiggyBank, LucideCheck, LucideLayoutGrid, LucideListOrdered, LucideReceiptText, LucideShieldPlus, LucideTag, LucideWallet, LucideX } from '@lucide/angular';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DatePipe } from '@angular/common';
import { EmployeeStore } from '../../../stores/employee-store';

@Component({
  selector: 'qfin-employee-component-view',
  imports: [MatIconModule,
    DatePipe,
    MatTooltipModule,
    LucidePencil,
    LucideUserCheck,
    LucideCalendarPlus,
    LucideUserCog,
    LucideCalendarClock,
    LucideWallet,
    LucideTag,
    LucideLayoutGrid,
    LucideListOrdered,
    LucideReceiptText,
    LucidePiggyBank,
    LucideShieldPlus,
    LucideCheck,
    LucideX],
  templateUrl: './employee-component-view.html',
})
export class EmployeeComponentView {
  employeeStore = inject(EmployeeStore);
  employeeId = model<string>(EMPTY_UUID);
  showEdit = output<boolean>();
  employeeDetail = this.employeeStore.employeeInfoComponent;
  
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
