import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { form, FormField, required, schema, Schema } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { LucideDynamicIcon } from '@lucide/angular';
import { AlertService } from 'qubefin-core';
import { IImportJobResult } from '../../models/import-job-result';
import { ImportService } from '../../services/import-service';

interface IImportFormModel {
  importTypeId: string;
}

@Component({
  selector: 'qfin-import',
  imports: [
    CommonModule,
    FormField,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    MatTableModule,
    LucideDynamicIcon,
  ],
  templateUrl: './import.html',
  styles: ``,
})
export class ImportPage {
  private readonly importService = inject(ImportService);
  private readonly alertService = inject(AlertService);

  protected readonly selectedFile = signal<File | null>(null);
  protected readonly uploading = signal<boolean>(false);
  protected readonly result = signal<IImportJobResult | null>(null);

  protected readonly errorColumns = ['row', 'column', 'value', 'message'];

  protected readonly importModel = signal<IImportFormModel>({ importTypeId: '' });

  protected readonly importSchema: Schema<IImportFormModel> = schema((path) => {
    required(path.importTypeId, { message: 'Import Type is required' });
  });

  protected readonly importForm = form(this.importModel, this.importSchema);

  private readonly importTypesResource = rxResource({
    stream: () => this.importService.getActiveImportTypes(),
  });

  protected readonly importTypes = this.importTypesResource.value;

  protected selectedImportType() {
    return this.importTypes()?.find((x) => x.id === this.importForm.importTypeId().value());
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      input.value = '';
      this.alertService.warning(null, 'Only .xlsx files can be selected.');
      return;
    }

    this.selectedFile.set(file);
  }

  removeFile() {
    this.selectedFile.set(null);
  }

  protected onReset() {
    this.importModel.set({ importTypeId: '' });
    this.selectedFile.set(null);
    this.result.set(null);
  }

  protected onUpload() {
    if (!this.importForm().valid()) {
      this.importForm().markAsTouched();
      return;
    }

    if (!this.selectedFile()) {
      this.alertService.warning(null, 'Please choose a file to upload.');
      return;
    }

    const formData = new FormData();
    formData.append('importTypeId', this.importForm().value().importTypeId);
    formData.append('file', this.selectedFile() as Blob);

    this.uploading.set(true);
    this.result.set(null);

    this.importService.uploadImport(formData).subscribe({
      next: (resp) => {
        this.uploading.set(false);
        this.result.set(resp);

        if (resp.status === 'Completed') {
          this.alertService.success('Success', `Imported ${resp.successRows} row(s) successfully.`);
          this.selectedFile.set(null);
        } else {
          this.alertService.warning(null, 'Import failed. See the errors below.');
        }
      },
      error: () => {
        this.uploading.set(false);
      },
    });
  }
}
