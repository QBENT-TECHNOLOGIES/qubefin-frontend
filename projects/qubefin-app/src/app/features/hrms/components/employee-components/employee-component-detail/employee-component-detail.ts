import { CommonModule } from '@angular/common';
import { Component, inject, input, output, signal, ViewChild, ElementRef, effect } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSelectModule } from '@angular/material/select';
import { EMPTY_UUID } from 'qubefin-core';
import { LucideDynamicIcon } from '@lucide/angular';
import { EmployeeStore } from '../../../stores/employee-store';
import { MatStepperModule } from '@angular/material/stepper';
import { PersonalComponentDetail } from './personal-component/personal-component';
import { AddressComponentDetail } from './address-component/address-component';
import { ContactComponentDetail } from './contact-component/contact-component';
import { OfficialComponentDetail } from './official-component/official-component';
import { KycDocumentComponentDetail } from './kyc-document-component/kyc-document-component';
import { ReferenceComponentDetail } from './reference-component/reference-component';


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
    ContactComponentDetail,
    OfficialComponentDetail,
    KycDocumentComponentDetail,
    ReferenceComponentDetail
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
  utilityComponents = this.employeeStore.utilityComponent;
  kycComponents = this.employeeStore.kycComponent;
  

  @ViewChild('stepper', { read: ElementRef })
  stepper!: ElementRef;

  constructor() {
  effect(() => {
    console.log('Utilities:', this.utilityComponents());
    console.log('KYC DOCUMENTS:', this.kycComponents());
  });
}
  onStepChange(index: number) {
    this.activeStepIndex.set(index);
  }
  handlePersonal(){
    this.onStepChange(1);
  }
  handleAddress(){
    this.onStepChange(2);
  }
  handleContact(){
    this.onStepChange(3);

  }
  handleOfficial(){
    this.onStepChange(4);

  }
  handleKyc(){
    this.onStepChange(5);
  }
  handleReference(){
    this.onStepChange(0);
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