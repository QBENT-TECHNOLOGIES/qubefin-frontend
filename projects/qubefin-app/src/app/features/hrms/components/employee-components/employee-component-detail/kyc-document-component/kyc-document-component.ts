import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSelectModule } from '@angular/material/select';
import { EMPTY_UUID } from 'qubefin-core';
import { form, FormField, required, schema } from '@angular/forms/signals';
import { LucideDynamicIcon } from '@lucide/angular';
import { MatStepperModule } from '@angular/material/stepper';
import { EmployeeService } from '../../../../services/employee-service';
import { rxResource } from '@angular/core/rxjs-interop';
import { of, tap } from 'rxjs';
import { EmployeeDocument, IEmployeeDocument, KycDocument } from '../../../../models/employee-detail';
import { APP_ICONS_MAP } from '../../../../../../lucide-icons';
import { EmployeeStore } from '../../../../stores/employee-store';
import Swal from 'sweetalert2';
import { MatTooltipModule } from '@angular/material/tooltip';


interface KycFormModel {
  documents: IEmployeeDocument[];
}


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
    LucideDynamicIcon,
    MatTooltipModule
  ],
  templateUrl: './kyc-document-component.html',
})
export class KycDocumentComponentDetail {


  empId = input<string>(EMPTY_UUID);

  onKycUpdate = output<void>();

  kycDocs = input<KycDocument[]>([]);
  isEditMode = computed(() => !!this.empId() && this.empId() !== EMPTY_UUID);

  private readonly employeeStore = inject(EmployeeStore);
    private readonly employeeService = inject(EmployeeService);
    readonly iconMap = APP_ICONS_MAP;



  protected readonly kycModel = signal<KycFormModel>({
    documents: []
  });



  protected readonly kycSchema = schema<KycFormModel>((path) => {

    required(path.documents);

  });



  protected readonly kycForm = form(
    this.kycModel,
    this.kycSchema
  );



  constructor(){


    effect(() => {

      const docs = this.kycDocs();


      if(
        docs.length &&
        this.kycModel().documents.length === 0
      ){


        const mandatoryDocs =
          docs.filter(x => x.isMandatory);



        this.kycModel.set({

          documents: mandatoryDocs.map(doc => {


            const model = new EmployeeDocument();


            model.documentName = doc.name;
            model.documentNo = "";
            model.validFrom = null;
            model.validTill = null;
            model.documentCategory = "KYC";
            model.employeeId = this.empId();


            return model;

          })

        });


      }


    });


  }

  onDocumentChange(index: number) {

    this.kycModel.update(state => {

      const documents = [...state.documents];

      const current = documents[index];

      documents[index] = {
        ...current,
        documentNo: "",
        validFrom: null,
        validTill: null,
        fileName: null
      };

      return {
        documents
      };

    });

  }


  private getSelectedDocument(name:string){

    return this.kycDocs()
      .find(x => x.name === name);

  }





  selectedDocument(index:number){


    const name =
      this.kycModel()
        .documents[index]
        ?.documentName;



    return this.getSelectedDocument(name);


  }





  addDocument(){
    const model = new EmployeeDocument();
    model.documentCategory = "KYC";
    model.employeeId = this.empId();
    this.kycModel.update(state => ({
      documents:[
        ...state.documents,
        model
      ]
    }));
  }

  removeDocument(index:number){
    this.kycModel.update(state => ({
      documents:
        state.documents.filter((_,i)=>i !== index)
    }));
  }

  availableDocuments(index: number) {
    const selectedNames = this.kycModel()
      .documents
      .map(x => x.documentName)
      .filter(Boolean);

    return this.kycDocs().filter(doc =>
      !selectedNames.includes(doc.name) ||
      doc.name === this.kycModel().documents[index]?.documentName
    );

  }
  hasMissingMandatoryDocuments(): boolean {

    const mandatoryDocs = this.kycDocs()
      .filter(doc => doc.isMandatory);


    const uploadedDocIds = this.kycModel()
      .documents
      .filter(doc => !!doc.documentName)
      .map(doc => doc.documentName);

    return mandatoryDocs.some(doc =>
        !uploadedDocIds.includes(doc.name)
      );
  }

  hasMissingDateValidation(): boolean {
    return this.kycModel()
      .documents
      .some(doc => {
        const selectedDoc = this.kycDocs()
          .find(x => x.name === doc.documentName);

        return selectedDoc?.isDateValidate &&
          (!doc.validFrom || !doc.validTill);

      });

  }
  hasMissingDocumentNumbers(): boolean {

    return this.kycModel()
      .documents
      .some(doc =>
        !!doc.documentName &&
        !doc.documentNo?.trim()
      );

  }
  hasInvalidDateRange(): boolean {
    return this.kycModel().documents.some((_, index) =>
      this.isValidTillInvalid(index)
    );
  }

  onSubmit(){

    const dataToSave = [...this.kycForm().value().documents];    
    if (this.hasMissingMandatoryDocuments()) {
      Swal.fire('Oh!','Please upload all mandatory KYC documents.','error');
      return;
    }
    if (this.hasMissingDocumentNumbers()) {
      Swal.fire('Oh!','Document Number is required.','error');
      return;

    }
    if(this.hasMissingDateValidation()){
      Swal.fire('Oh!','Valid From and Valid Till are required.','error');
      return;
    }
    if (this.hasInvalidDateRange()) {
      Swal.fire(
        'Oh!',
        'Valid Till must be greater than or equal to Valid From.',
        'error'
      );
      return;
    }
    if(!this.kycForm().valid()){
          return;
        }
    // const data =
    //   this.kycForm().value();
    // const dataToSave = [...data.documents];

    this.employeeService.updateKycInfo(this.empId(),dataToSave).subscribe({
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

  isValidTillInvalid(index: number): boolean {
    const document = this.kycModel().documents[index];
    if (!document.validFrom || !document.validTill) {
      return false;
    }
    return new Date(document.validTill) < new Date(document.validFrom);
  }

  private kycResource = rxResource({
    params: () => ({ id: this.empId(), editMode: this.isEditMode() }),
    stream: ({ params }) => {
      if (params.editMode && params.id !== EMPTY_UUID) {        
        return this.employeeService.getKycData(params.id).pipe(
          tap((resp: any) => {
            this.kycModel.update(state => ({
              documents: (resp.documents ?? []).map(
                (doc: IEmployeeDocument) =>
                  new EmployeeDocument({
                    ...doc,
                    validFrom: doc.validFrom ? new Date(doc.validFrom) : null,
                    validTill: doc.validTill ? new Date(doc.validTill) : null,
                  })
              ),
            }));
          })
        );
      } else {
        this.kycModel.set({

          documents:[]

        });
        return of(null); // Safely stream an empty observable
      }
    }
  });
}