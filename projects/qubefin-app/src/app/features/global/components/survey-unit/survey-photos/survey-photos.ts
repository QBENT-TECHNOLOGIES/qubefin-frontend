import { DatePipe } from '@angular/common';
import { Component, computed, effect, inject, input } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { LucideDynamicIcon } from '@lucide/angular';
import {
  AlertService,
  DocumentModalService,
  EMPTY_UUID,
  FileUploadDialog,
  IFileUploadDialogData,
} from 'qubefin-core';
import {
  ISurveyDocument,
  MAX_SURVEY_PHOTO_SIZE_MB,
  MAX_SURVEY_PHOTOS,
} from '../../../models/survey-document';
import { SurveyDocumentService } from '../../../services/survey-document-service';
import { SurveyDocumentStore } from '../../../stores/survey-document-store';

// The photographs of a survey. Everyone who can see the survey sees them.
// Only the Lead Surveyor (canEdit) can add or remove photographs, before the survey is submitted.
@Component({
  selector: 'qfin-survey-photos',
  imports: [DatePipe, LucideDynamicIcon],
  templateUrl: './survey-photos.html',
})
export class SurveyPhotos {
  private readonly store = inject(SurveyDocumentStore);
  private readonly service = inject(SurveyDocumentService);
  private readonly dialog = inject(MatDialog);
  private readonly alertService = inject(AlertService);
  private readonly documentModal = inject(DocumentModalService);

  readonly surveyId = input<string>(EMPTY_UUID);
  readonly canEdit = input<boolean>(false);

  readonly documents = this.store.documents;
  readonly loading = this.store.loading;
  readonly maxPhotos = MAX_SURVEY_PHOTOS;
  readonly maxSizeMb = MAX_SURVEY_PHOTO_SIZE_MB;
  readonly canAddMore = computed(() => this.documents().length < MAX_SURVEY_PHOTOS);
  // For the small progress bar next to the counter.
  readonly usedPercent = computed(() => (this.documents().length / MAX_SURVEY_PHOTOS) * 100);

  constructor() {
    effect(() => {
      this.store.setSurveyId(this.surveyId());
    });
  }

  // Opens the photograph in the shared document viewer (a modal).
  protected onView(document: ISurveyDocument) {
    this.documentModal.open({
      url: document.url,
      documentName: document.fileName,
      extension: document.fileName.split('.').pop()?.toLowerCase() || '',
      downloadAccess: true,
    });
  }

  protected onAddClick() {
    const data: IFileUploadDialogData = {
      title: 'Upload Photograph',
      description: `Drag a photograph here, or browse to pick it. JPG or PNG, up to ${MAX_SURVEY_PHOTO_SIZE_MB} MB.`,
      accept: '.jpg,.jpeg,.png',
    };

    const dialogRef = this.dialog.open<FileUploadDialog, IFileUploadDialogData, File | undefined>(
      FileUploadDialog,
      {
        width: '560px',
        maxWidth: '95vw',
        panelClass: ['glass-modal', 'slide-in-up'],
        data,
      },
    );

    dialogRef.afterClosed().subscribe((file) => {
      if (file) {
        this.upload(file);
      }
    });
  }

  protected onRemove(document: ISurveyDocument) {
    this.alertService
      .confirm('Confirmation', `Do you want to remove "${document.fileName}"?`)
      .then((result) => {
        if (!result.isConfirmed) {
          return;
        }

        this.service.remove(this.surveyId(), document.id).subscribe({
          next: (resp: any) => {
            this.alertService.success('Success', resp).then(() => this.store.refresh());
          },
        });
      });
  }

  private upload(file: File) {
    // The server checks the same rules; this only gives a quicker answer.
    if (file.type !== 'image/jpeg' && file.type !== 'image/png') {
      this.alertService.error('Oops ....', 'Only JPG and PNG photographs are allowed.');
      return;
    }
    if (file.size > MAX_SURVEY_PHOTO_SIZE_MB * 1024 * 1024) {
      this.alertService.error('Oops ....', `The photograph can be at most ${MAX_SURVEY_PHOTO_SIZE_MB} MB.`);
      return;
    }

    this.service.upload(this.surveyId(), file).subscribe({
      next: (resp: any) => {
        this.alertService.success('Success', resp).then(() => this.store.refresh());
      },
    });
  }
}
