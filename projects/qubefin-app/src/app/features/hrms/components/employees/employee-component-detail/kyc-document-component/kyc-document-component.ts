import { CommonModule, DatePipe } from '@angular/common';
import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSelectModule } from '@angular/material/select';
import { AlertService, EMPTY_UUID } from 'qubefin-core';
import { form, FormField, required, schema } from '@angular/forms/signals';
import { LucideDynamicIcon } from '@lucide/angular';
import { MatStepperModule } from '@angular/material/stepper';
import { EmployeeService } from '../../../../services/employee-service';
import { rxResource } from '@angular/core/rxjs-interop';
import { of, tap } from 'rxjs';
import {
  EmployeeDocument,
  IEmployeeDocument,
  KycDocument,
} from '../../../../models/employee-detail';
import { APP_ICONS_MAP } from '../../../../../../lucide-icons';
import { EmployeeStore } from '../../../../stores/employee-store';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DateAdapter, MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { DocumentModalService } from '../../../../../../shared/services/document-modal.service';

interface KycFormModel {
  documents: IEmployeeDocument[];
}

@Component({
  selector: 'qfin-kyc-document-component',
  providers: [DatePipe],
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
    MatTooltipModule,
    MatDatepickerModule,
    MatNativeDateModule,
  ],
  templateUrl: './kyc-document-component.html',
})
export class KycDocumentComponentDetail {
  empId = input<string>(EMPTY_UUID);

  onKycUpdate = output<void>();

  kycDocs = input<KycDocument[]>([]);
  isEditMode = computed(() => !!this.empId() && this.empId() !== EMPTY_UUID);
  readonly documentModal = inject(DocumentModalService);
  readonly datePipe = inject(DatePipe);
  private readonly employeeStore = inject(EmployeeStore);
  private readonly employeeService = inject(EmployeeService);
  private readonly alertService = inject(AlertService);

  readonly iconMap = APP_ICONS_MAP;

  protected readonly kycModel = signal<KycFormModel>({
    documents: [],
  });

  protected readonly kycSchema = schema<KycFormModel>((path) => {
    required(path.documents);
  });

  protected readonly kycForm = form(this.kycModel, this.kycSchema);
  isDocumentNumberInvalid(index: number): boolean {
    const doc = this.kycModel().documents[index];
    if (!doc) return false;

    const name = doc.documentName?.toLowerCase() || '';
    const no = doc.documentNo?.trim().toUpperCase() || '';

    if (!name || !no) return false;

    if (name.includes('aadhaar') || name.includes('adhar')) return !/^\d{12}$/.test(no);
    if (name.includes('pan')) return !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(no);
    if (name.includes('voter')) return !/^[A-Z]{3}[0-9]{7}$/.test(no);
    if (name.includes('driving')) return !/^[A-Z]{2}[0-9]{13}$/.test(no);

    return false;
  }

  private dateAdapter = inject(DateAdapter<Date>);

  constructor() {
    this.dateAdapter.setLocale('en-GB');
    effect(() => {
      const docs = this.kycDocs();
      if (docs.length && this.kycModel().documents.length === 0) {
        const mandatoryDocs = docs.filter((x) => x.isMandatory);

        this.kycModel.set({
          documents: mandatoryDocs.map((doc) => {
            const model = new EmployeeDocument();

            model.documentName = doc.name;
            model.documentNo = '';
            model.validFrom = null;
            model.validTill = null;
            model.documentCategory = 'KYC';
            model.employeeId = this.empId();
            return model;
          }),
        });
      }
    });
  }

  onDocumentChange(index: number) {
    this.kycModel.update((state) => {
      const documents = [...state.documents];

      const current = documents[index];

      documents[index] = {
        ...current,
        documentNo: '',
        validFrom: null,
        validTill: null,
      };

      return {
        documents,
      };
    });
  }

  private getSelectedDocument(name: string) {
    return this.kycDocs().find((x) => x.name === name);
  }
  selectedDocument(index: number) {
    const name = this.kycModel().documents[index]?.documentName;

    return this.getSelectedDocument(name);
  }
  addDocument() {
    const model = new EmployeeDocument();
    model.documentCategory = 'KYC';
    model.employeeId = this.empId();
    this.kycModel.update((state) => ({
      documents: [...state.documents, model],
    }));
  }

  removeDocument(index: number) {
    this.kycModel.update((state) => ({
      documents: state.documents.filter((_, i) => i !== index),
    }));
  }

  availableDocuments(index: number) {
    const selectedNames = this.kycModel()
      .documents.map((x) => x.documentName)
      .filter(Boolean);

    return this.kycDocs().filter(
      (doc) =>
        !selectedNames.includes(doc.name) ||
        doc.name === this.kycModel().documents[index]?.documentName,
    );
  }
  hasMissingMandatoryDocuments(): boolean {
    const mandatoryDocs = this.kycDocs().filter((doc) => doc.isMandatory);

    const uploadedDocIds = this.kycModel()
      .documents.filter((doc) => !!doc.documentName)
      .map((doc) => doc.documentName);

    return mandatoryDocs.some((doc) => !uploadedDocIds.includes(doc.name));
  }
  hasMissingFilesForImportantDocs(): boolean {
    return this.kycModel().documents.some((doc) => {
      const name = doc.documentName?.toLowerCase() || '';
      const isImportant =
        name.includes('aadhaar') || name.includes('adhar') || name.includes('pan');
      const hasNoFile = !doc.fileName && !(doc as any).rawFile;

      return isImportant && hasNoFile;
    });
  }

  hasMissingDateValidation(): boolean {
    return this.kycModel().documents.some((doc) => {
      const selectedDoc = this.kycDocs().find((x) => x.name === doc.documentName);

      return selectedDoc?.isDateValidate && (!doc.validFrom || !doc.validTill);
    });
  }

  hasMissingDocumentNumbers(): boolean {
    return this.kycModel().documents.some((doc) => !!doc.documentName && !doc.documentNo?.trim());
  }
  hasInvalidDateRange(): boolean {
    return this.kycModel().documents.some((_, index) => this.isValidTillInvalid(index));
  }
  onFileSelected(event: Event, index: number) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      input.value = '';
      this.alertService.warning(null, 'Only image/PDF file can be selected.');
      return;
    }

    this.kycModel.update((state) => {
      const documents = [...state.documents];
      const updatedDoc = { ...documents[index], fileName: file.name };
      (updatedDoc as any).rawFile = file;
      documents[index] = updatedDoc;
      return { documents };
    });
  }

  removeFile(index: number) {
    this.kycModel.update((state) => {
      const documents = [...state.documents];
      const updatedDoc = { ...documents[index], fileName: '' };
      (updatedDoc as any).rawFile = null;
      (updatedDoc as any).fileUrl = '';
      (updatedDoc as any).filePath = '';

      documents[index] = updatedDoc;
      return { documents };
    });
  }
  openDocument(index: number) {
    const doc = this.kycModel().documents[index];
    if (!doc) return;

    let url = '';
    const name = doc.fileName || doc.documentName || 'Document';

    if ((doc as any).rawFile) {
      url = URL.createObjectURL((doc as any).rawFile);
    } else if ((doc as any).fileUrl || (doc as any).filePath) {
      url = (doc as any).fileUrl || (doc as any).filePath;
    }

    if (!url) {
      this.alertService.warning('Oops!', 'Document preview is not available.');
      return;
    }

    this.documentModal.open({
      url: url,
      documentName: name,
      extension: name.split('.').pop()?.toLowerCase() || '',
      downloadAccess: true,
    });
  }
  onSubmit() {
    const dataToSave = [...this.kycForm().value().documents];
    if (this.hasMissingFilesForImportantDocs()) {
      this.alertService.warning(null, 'Please upload the document file for Aadhaar and PAN cards.');
      return;
    }
    if (this.hasMissingMandatoryDocuments()) {
      this.alertService.warning(null, 'Please upload all mandatory KYC documents.');
      return;
    }
    if (this.hasMissingDocumentNumbers()) {
      this.alertService.warning(null, 'Document Number is required.');
      return;
    }
    const hasInvalidDocs = this.kycModel().documents.some((_, i) =>
      this.isDocumentNumberInvalid(i),
    );
    if (hasInvalidDocs) {
      this.alertService.warning(
        null,
        'Please provide valid document numbers matching their format.',
      );
      return;
    }

    if (this.hasMissingDateValidation()) {
      this.alertService.warning(null, 'Valid From and Valid Till are required.');
      return;
    }
    if (this.hasInvalidDateRange()) {
      this.alertService.warning(null, 'Valid Till must be greater than or equal to Valid From.');
      return;
    }

    if (!this.kycForm().valid()) {
      return;
    }

    const formData = new FormData();
    const documents = this.kycForm().value().documents;

    documents.forEach((doc: any, index: number) => {
      formData.append(`documents[${index}].documentName`, doc.documentName || '');
      formData.append(`documents[${index}].documentNo`, doc.documentNo || '');

      if (doc.validFrom) {
        formData.append(
          `documents[${index}].validFrom`,
          this.datePipe.transform(doc.validFrom, 'yyyy-MM-dd') || '',
        );
      }
      if (doc.validTill) {
        formData.append(
          `documents[${index}].validTill`,
          this.datePipe.transform(doc.validTill, 'yyyy-MM-dd') || '',
        );
      }
      if (doc.fileName) {
        formData.append(`documents[${index}].fileName`, doc.fileName);
      }
      if (doc.rawFile) {
        formData.append(`documents[${index}].file`, doc.rawFile);
      }
    });

    this.employeeService.updateKycInfo(this.empId(), formData).subscribe({
      next: (resp: any) => {
        this.alertService.success('Success', resp).then(() => {
          this.employeeStore.refreshList();
          this.employeeStore.refreshDetail();
          this.onKycUpdate.emit();
        });
      },
      error: (err: any) => {},
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
            const documentsArray = Array.isArray(resp) ? resp : (resp?.documents ?? []);

            this.kycModel.update((state) => ({
              documents: documentsArray.map(
                (doc: IEmployeeDocument) =>
                  new EmployeeDocument({
                    ...doc,
                    validFrom: doc.validFrom ? new Date(doc.validFrom) : null,
                    validTill: doc.validTill ? new Date(doc.validTill) : null,
                  }),
              ),
            }));
          }),
        );
      } else {
        this.kycModel.set({
          documents: [],
        });
        return of(null);
      }
    },
  });
}
