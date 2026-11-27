import { CommonModule, DatePipe } from '@angular/common';
import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { DateAdapter, MatNativeDateModule, provideNativeDateAdapter } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatStepperModule } from '@angular/material/stepper';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  applyEach,
  form,
  FormField,
  pattern,
  readonly,
  required,
  schema,
} from '@angular/forms/signals';
import { LucideDynamicIcon } from '@lucide/angular';
import { AlertService, DocumentModalService, EMPTY_UUID } from 'qubefin-core';
import { catchError, of, tap } from 'rxjs';
import { APP_ICONS_MAP } from '../../../../../../lucide-icons';
import { IMemberDocument, KycDocument, MemberDocument } from '../../../../models/member-detail';
import { MemberService } from '../../../../services/member-services';
import { MemberStore } from '../../../../stores/member-store';

interface MemberKycFormModel {
  documents: IMemberDocument[];
}

@Component({
  selector: 'qfin-kyc-component',
  providers: [provideNativeDateAdapter(), DatePipe],
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
  templateUrl: './kyc-component.html',
})
export class KycComponent {
  memberId = input<string>(EMPTY_UUID);
  kycDocs = input<KycDocument[]>([]);
  onKycUpdate = output<void>();

  isEditMode = computed(() => !!this.memberId() && this.memberId() !== EMPTY_UUID);

  private readonly dateAdapter = inject(DateAdapter<Date>);
  readonly documentModal = inject(DocumentModalService);
  readonly datePipe = inject(DatePipe);
  private readonly memberStore = inject(MemberStore);
  private readonly memberService = inject(MemberService);
  private readonly alertService = inject(AlertService);

  readonly iconMap = APP_ICONS_MAP;

  protected readonly kycModel = signal<MemberKycFormModel>({
    documents: [],
  });

  protected readonly kycSchema = schema<MemberKycFormModel>((path) => {
    required(path.documents);
    applyEach(path.documents, (docPath) => {
      readonly(docPath.issueDate, { when: () => true });
      readonly(docPath.expiryDate, { when: () => true });

      required(docPath.kycDocumentId, { message: 'Document Name is required' });
      required(docPath.documentNo, {
        when: ({ valueOf }: any) => !!valueOf(docPath.kycDocumentId),
        message: 'Document Number is required',
      });

      pattern(docPath.documentNo, /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, {
        when: ({ valueOf }: any) => {
          const name = this.getDocNameById(valueOf(docPath.kycDocumentId));
          return name.includes('pan');
        },
        message: 'Invalid PAN number',
      });

      pattern(docPath.documentNo, /^\d{12}$/, {
        when: ({ valueOf }: any) => {
          const name = this.getDocNameById(valueOf(docPath.kycDocumentId));
          return name.includes('aadhaar') || name.includes('adhar');
        },
        message: 'Invalid Aadhaar number',
      });

      pattern(docPath.documentNo, /^[A-Z]{3}[0-9]{7}$/, {
        when: ({ valueOf }: any) => {
          const name = this.getDocNameById(valueOf(docPath.kycDocumentId));
          return name.includes('voter');
        },
        message: 'Invalid Voter ID',
      });

      pattern(docPath.documentNo, /^[A-Z]{2}[0-9]{13}$/, {
        when: ({ valueOf }: any) => {
          const name = this.getDocNameById(valueOf(docPath.kycDocumentId));
          return name.includes('driving');
        },
        message: 'Invalid Driving License',
      });
    });
  });

  protected readonly kycForm = form(this.kycModel, this.kycSchema);

  constructor() {
    this.dateAdapter.setLocale('en-GB');

    effect(() => {
      const docs = this.kycDocs();
      if (docs.length && this.kycModel().documents.length === 0) {
        this.populateMandatoryDocuments(docs);
      }
    });
  }

  private populateMandatoryDocuments(docs: KycDocument[]) {
    const mandatoryDocs = docs.filter((x) => x.isMandatory);

    this.kycModel.set({
      documents: mandatoryDocs.map((doc) => {
        const model = new MemberDocument();
        model.kycDocumentId = doc.id;
        model.kycDocumentName = doc.name;
        model.memberId = this.memberId();
        return model;
      }),
    });
  }

  private getDocNameById(kycDocumentId: string): string {
    return (
      this.kycDocs()
        .find((x) => x.id === kycDocumentId)
        ?.name?.toLowerCase() ?? ''
    );
  }

  selectedDocument(index: number) {
    const id = this.kycModel().documents[index]?.kycDocumentId;
    return this.kycDocs().find((x) => x.id === id);
  }

  onDocumentChange(index: number) {
    const selected = this.selectedDocument(index);
    this.kycModel.update((state) => {
      const documents = [...state.documents];
      const current = documents[index];

      documents[index] = {
        ...current,
        kycDocumentName: selected?.name ?? '',
        documentNo: '',
        issueDate: null,
        expiryDate: null,
      };

      return { documents };
    });
  }

  addDocument() {
    const model = new MemberDocument();
    model.memberId = this.memberId();
    this.kycModel.update((state) => ({
      documents: [...state.documents, model],
    }));
  }

  removeDocument(index: number) {
    const doc = this.kycModel().documents[index];
    if (doc?.isVerify) {
      this.alertService.warning(null, 'Verified document cannot be deleted.');
      return;
    }

    this.kycModel.update((state) => ({
      documents: state.documents.filter((_, i) => i !== index),
    }));
  }

  availableDocuments(index: number) {
    const selectedIds = this.kycModel()
      .documents.map((x) => x.kycDocumentId)
      .filter(Boolean);

    return this.kycDocs().filter(
      (doc) =>
        !selectedIds.includes(doc.id) || doc.id === this.kycModel().documents[index]?.kycDocumentId,
    );
  }

  hasMissingMandatoryDocuments(): boolean {
    const mandatoryDocs = this.kycDocs().filter((doc) => doc.isMandatory);
    const uploadedDocIds = this.kycModel()
      .documents.filter((doc) => !!doc.kycDocumentId)
      .map((doc) => doc.kycDocumentId);

    return mandatoryDocs.some((doc) => !uploadedDocIds.includes(doc.id));
  }

  hasMissingFilesForImportantDocs(): boolean {
    return this.kycModel().documents.some((doc) => {
      const name = this.getDocNameById(doc.kycDocumentId);
      const isImportant =
        name.includes('aadhaar') || name.includes('adhar') || name.includes('pan');
      const hasNoFrontFile = !doc.fontSideFileName && !(doc as any).fontSideRawFile;

      return isImportant && hasNoFrontFile;
    });
  }

  hasMissingDateValidation(): boolean {
    return this.kycModel().documents.some((doc) => {
      const selectedDoc = this.kycDocs().find((x) => x.id === doc.kycDocumentId);
      return selectedDoc?.isDateValidate && (!doc.issueDate || !doc.expiryDate);
    });
  }

  isExpiryDateInvalid(index: number): boolean {
    const document = this.kycModel().documents[index];
    if (!document.issueDate || !document.expiryDate) {
      return false;
    }
    return new Date(document.expiryDate) < new Date(document.issueDate);
  }

  hasInvalidDateRange(): boolean {
    return this.kycModel().documents.some((_, index) => this.isExpiryDateInvalid(index));
  }

  onFileSelected(event: Event, index: number, side: 'front' | 'back') {
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
      const updatedDoc: any = { ...documents[index] };

      if (side === 'front') {
        updatedDoc.fontSideFileName = file.name;
        updatedDoc.fontSideRawFile = file;
      } else {
        updatedDoc.backSideFileName = file.name;
        updatedDoc.backSideRawFile = file;
      }

      documents[index] = updatedDoc;
      return { documents };
    });
  }

  removeFile(index: number, side: 'front' | 'back') {
    this.kycModel.update((state) => {
      const documents = [...state.documents];
      const updatedDoc: any = { ...documents[index] };

      if (side === 'front') {
        updatedDoc.fontSideFileName = '';
        updatedDoc.fontSideFileSequence = '';
        updatedDoc.fontSideRawFile = null;
        updatedDoc.fontSideFileUrl = '';
      } else {
        updatedDoc.backSideFileName = '';
        updatedDoc.backSideFileSequence = '';
        updatedDoc.backSideRawFile = null;
        updatedDoc.backSideFileUrl = '';
      }

      documents[index] = updatedDoc;
      return { documents };
    });
  }

  openDocument(index: number, side: 'front' | 'back') {
    const doc: any = this.kycModel().documents[index];
    if (!doc) return;

    const rawFile = side === 'front' ? doc.fontSideRawFile : doc.backSideRawFile;
    const fileUrl = side === 'front' ? doc.fontSideFileUrl : doc.backSideFileUrl;
    const fileName =
      (side === 'front' ? doc.fontSideFileName : doc.backSideFileName) ||
      doc.kycDocumentName ||
      'Document';

    let url = '';
    if (rawFile) {
      url = URL.createObjectURL(rawFile);
    } else if (fileUrl) {
      url = fileUrl;
    }

    if (!url) {
      this.alertService.warning('Oops!', 'Document preview is not available.');
      return;
    }

    this.documentModal.open({
      url,
      documentName: fileName,
      extension: fileName.split('.').pop()?.toLowerCase() || '',
      downloadAccess: true,
    });
  }

  onSubmit() {
    this.kycForm().markAsTouched();

    if (this.hasMissingMandatoryDocuments()) {
      this.alertService.warning(null, 'Please upload all mandatory KYC documents.');
      return;
    }

    if (this.hasMissingFilesForImportantDocs()) {
      this.alertService.warning(null, 'Please upload the front side document file.');
      return;
    }

    if (this.hasMissingDateValidation()) {
      this.alertService.warning(null, 'Issue Date and Expiry Date are required.');
      return;
    }

    if (this.hasInvalidDateRange()) {
      this.alertService.warning(null, 'Expiry Date must be greater than or equal to Issue Date.');
      return;
    }

    if (!this.kycForm().valid()) {
      return;
    }

    const formData = new FormData();
    const documents = this.kycForm().value().documents;

    documents.forEach((doc: any, index: number) => {
      if (doc.id && doc.id !== EMPTY_UUID) {
        formData.append(`documents[${index}].id`, doc.id);
      }
      formData.append(`documents[${index}].kycDocumentId`, doc.kycDocumentId || '');
      formData.append(`documents[${index}].documentNo`, doc.documentNo?.trim() || '');
      formData.append(`documents[${index}].isVerify`, String(!!doc.isVerify));

      if (doc.remarks?.trim()) {
        formData.append(`documents[${index}].remarks`, doc.remarks.trim());
      }
      if (doc.issueDate) {
        formData.append(
          `documents[${index}].issueDate`,
          this.datePipe.transform(doc.issueDate, 'yyyy-MM-dd') || '',
        );
      }
      if (doc.expiryDate) {
        formData.append(
          `documents[${index}].expiryDate`,
          this.datePipe.transform(doc.expiryDate, 'yyyy-MM-dd') || '',
        );
      }

      if (doc.fontSideFileName) {
        formData.append(`documents[${index}].fontSideFileName`, doc.fontSideFileName);
      }
      if (doc.fontSideFileSequence) {
        formData.append(`documents[${index}].fontSideFileSequence`, doc.fontSideFileSequence);
      }
      if (doc.fontSideRawFile) {
        formData.append(`documents[${index}].fontSideFile`, doc.fontSideRawFile);
      }

      if (doc.backSideFileName) {
        formData.append(`documents[${index}].backSideFileName`, doc.backSideFileName);
      }
      if (doc.backSideFileSequence) {
        formData.append(`documents[${index}].backSideFileSequence`, doc.backSideFileSequence);
      }
      if (doc.backSideRawFile) {
        formData.append(`documents[${index}].backSideFile`, doc.backSideRawFile);
      }
    });

    this.memberService.updateKycInfo(this.memberId(), formData).subscribe({
      next: (resp: any) => {
        this.alertService.success('Success', resp).then(() => {
          this.memberStore.refreshList();
          this.memberStore.refreshDetail();
          this.onKycUpdate.emit();
        });
      },
      error: () => {},
    });
  }

  private kycResource = rxResource({
    params: () => ({ id: this.memberId(), editMode: this.isEditMode() }),
    stream: ({ params }) => {
      if (params.editMode && params.id !== EMPTY_UUID) {
        return this.memberService.getKycData(params.id).pipe(
          tap((resp: any) => {
            const documentsArray = Array.isArray(resp) ? resp : (resp?.documents ?? []);

            if (documentsArray.length === 0) {
              if (this.kycDocs().length > 0) {
                this.populateMandatoryDocuments(this.kycDocs());
              } else {
                this.kycModel.set({ documents: [] });
              }
              return;
            }

            this.kycModel.set({
              documents: documentsArray.map(
                (doc: IMemberDocument) =>
                  new MemberDocument({
                    ...doc,
                    issueDate: doc.issueDate ? new Date(doc.issueDate) : null,
                    expiryDate: doc.expiryDate ? new Date(doc.expiryDate) : null,
                  }),
              ),
            });
          }),
          catchError(() => of(null)),
        );
      } else {
        this.kycModel.set({ documents: [] });
        return of(null);
      }
    },
  });
}
