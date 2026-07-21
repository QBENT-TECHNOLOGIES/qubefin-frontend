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
import { MatStepperModule } from '@angular/material/stepper';
import { EmployeeStore } from '../../../../stores/employee-store';
import { EmployeeService } from '../../../../services/employee-service';
import { APP_ICONS_MAP } from '../../../../../../lucide-icons';
import { rxResource } from '@angular/core/rxjs-interop';
import { of, tap } from 'rxjs';
import { EmployeeDocument, IEmployeeDocument, KycDocument } from '../../../../models/employee-detail';

@Component({
  selector: 'qfin-kyc-document-component',
  imports: [
    CommonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatSelectModule,
    MatCheckboxModule,
    FormField,
    MatStepperModule,
    LucideDynamicIcon
  ],
  templateUrl: './kyc-document-component.html',
})
export class KycDocumentComponentDetail {
  empId = input<string>(EMPTY_UUID);
//   onCancel = output<void>();
  onKycUpdate = output<void>();
  kycDocs = input<KycDocument[]>([]);

  private readonly employeeStore = inject(EmployeeStore);
  private readonly employeeService = inject(EmployeeService);
  readonly iconMap = APP_ICONS_MAP;
  isEditMode = computed(() => !!this.empId() && this.empId() !== EMPTY_UUID);

  protected readonly kycModel = signal<IEmployeeDocument>(new EmployeeDocument());

  // protected readonly kycSchema: Schema<IEmployeeDocument> = schema((path) => {
  // });
  protected readonly kycSchema = schema<IEmployeeDocument>((path) => {

    required(path.documentName);

    required(path.documentNo, {
      when: () => {
        const documentName = this.kycModel().documentName;

        const doc = this.kycDocs().find(d => d.name === documentName);

        return !!doc?.isMandatory;
      }
    });

    required(path.validFrom, {
      when: () => {
      const documentName = this.kycModel().documentName;

      const doc = this.kycDocs().find(d => d.name === documentName);
        return !!doc?.isDateValidate;
      }
    });

    required(path.validTill, {
      when: () => {
      const documentName = this.kycModel().documentName;

      const doc = this.kycDocs().find(d => d.name === documentName);
        return !!doc?.isDateValidate;
      }
    });
  });

  protected readonly kycForm = form(this.kycModel, this.kycSchema);

  @ViewChild('stepper', { read: ElementRef })
  stepper!: ElementRef;
  
  readonly selectedDocument = computed(() =>
    this.kycDocs().find(
      d => d.id === this.kycForm.documentName().value()
    )
  );

  constructor(){
    effect(() => {
  const doc = this.selectedDocument();

  
  if (doc && !doc.isDateValidate) {
    this.kycModel.update(model => ({
      ...model,
      validFrom: null,
      validTill: null
    }));
  }
});
  }
  // protected readonly kycDocuments = computed(() => this.kycDocs());
   private kycResource = rxResource({
    params: () => ({ id: this.empId(), editMode: this.isEditMode() }),
    stream: ({ params }) => {
      if (params.editMode && params.id !== EMPTY_UUID) {
        this.employeeStore.setEmployeeComponentId(params.id);
        
        return this.employeeService.getKycData(params.id).pipe(
          tap((resp: any) => {
            this.employeeStore.setEmployeeComponentId(resp.id);
            this.kycModel.set(new EmployeeDocument(resp));
          })
        );
      } else {
        this.kycModel.set(new EmployeeDocument());
        this.kycModel.set(new EmployeeDocument());
        return of(null); // Safely stream an empty observable
      }
    }
  });

  onSubmit() {
    // console.log(this.presentAddressForm().value());
    // console.log(this.permanentAddressForm().value());
    
    if (!this.kycForm().valid()) {
      return;
    }

    const data = this.kycForm().value();
    const dataToSave: any = this.kycForm().value();
    dataToSave.documentCategory = "KYC";
    dataToSave.documentName = dataToSave.documentName == "" ? null : dataToSave.documentName;
    dataToSave.documentNo = dataToSave.documentNo == "" ? null : dataToSave.documentNo;
    dataToSave.validFrom = dataToSave.validFrom == "" ? null : new Date(dataToSave.validFrom);
    dataToSave.validTill = dataToSave.validTill == "" ? null : new Date(dataToSave.validTill);
    dataToSave.fileName = dataToSave.fileName == "" ? null : dataToSave.fileName;
    dataToSave.fileNo = dataToSave.fileNo == "" ? null : dataToSave.fileNo;
    if (this.isEditMode()) {
      this.employeeService.updateKycInfo( this.empId(),dataToSave).subscribe({
        next: () => {
          this.employeeStore.refreshList();
          this.employeeStore.refreshDetail();
          this.onKycUpdate.emit();
        },
        error: (err: any) => {
          if (err.error?.isError) {
          }
        }
      });
    }
  }
}