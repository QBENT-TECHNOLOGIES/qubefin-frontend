import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, input, output, signal, ViewChild, ElementRef } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSelectModule } from '@angular/material/select';
import { EMPTY_UUID } from 'qubefin-core';
import { form, FormField, required, schema, Schema } from '@angular/forms/signals';
import { LucideDynamicIcon } from '@lucide/angular';
import { EmployeeStore } from '../../../stores/employee-store';
import { EmployeeService } from '../../../services/employee-service';
import { EmployeePersonalInfo, IEmployeePersonalInfo } from '../../../models/employee-detail';
import { MatStepperModule } from '@angular/material/stepper';
import { APP_ICONS_MAP } from '../../../../../lucide-icons';
import { PersonalComponentDetail } from './personal-component/personal-component';
import { AddressComponentDetail } from './address-component/address-component';


@Component({
  selector: 'qfin-employee-component-detail',
  imports: [
    CommonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatSelectModule,
    MatCheckboxModule,
    MatStepperModule,
    LucideDynamicIcon,
    PersonalComponentDetail,
    AddressComponentDetail,
  ],
  templateUrl: './employee-component-detail.html',
})
export class EmployeeComponentDetail {
  emptyGuid = EMPTY_UUID;
  employeeId = input<string>(EMPTY_UUID);
  // onCancel = output<void>();
  onChildSave = output<void>();
  
readonly activeStepIndex = signal(0);
  private readonly employeeStore = inject(EmployeeStore);


  @ViewChild('stepper', { read: ElementRef })
  stepper!: ElementRef;

  constructor() {
    
    
  }
  onStepChange(index: number) {
    this.activeStepIndex.set(index);
  }
  handleSave(){
    this.onChildSave.emit();
  }

   

  ngAfterViewInit() {

    const header = this.stepper.nativeElement.querySelector(
      '.mat-horizontal-stepper-header-container'
    );

    if (!header) return;

    header.addEventListener(
      'wheel',
      (event: WheelEvent) => {

        event.preventDefault();

        header.scrollBy({
          left: event.deltaY,
          behavior: 'smooth'
        });

      },
      { passive: false }
    );
  }
}