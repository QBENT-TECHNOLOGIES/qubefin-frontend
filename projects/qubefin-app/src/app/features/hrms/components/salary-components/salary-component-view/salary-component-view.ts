import { Component, effect, inject, model, output } from '@angular/core';
import { SalaryStore } from '../../../stores/salary-store';
import { EMPTY_UUID } from 'qubefin-core';
import { LucidePencil, LucideUserCheck, LucideCalendarPlus, LucideUserCog, LucideCalendarClock, LucideUser, LucideLayers, LucideBuilding2, LucideMapPinned, LucideLandmark, LucideFactory, LucideSquarePen, LucidePiggyBank, LucideCheck, LucideLayoutGrid, LucideListOrdered, LucideReceiptText, LucideShieldPlus, LucideTag, LucideWallet, LucideX } from '@lucide/angular';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'qfin-salary-component-view',
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
  templateUrl: './salary-component-view.html',
})
export class SalaryComponentView {
  salaryStore = inject(SalaryStore);
  salaryId = model<string>(EMPTY_UUID);
  showEdit = output<boolean>();
  salaryDetail = this.salaryStore.salaryComponent;
  constructor() {
    effect(() => {
      if (this.salaryId() && this.salaryId() !== EMPTY_UUID) {
        this.salaryStore.setSalaryComponentId(this.salaryId());
      }
    });
  }
  onShowEdit() {
    this.showEdit.emit(true);
  }
}
