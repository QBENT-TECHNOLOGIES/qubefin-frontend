import { DOCUMENT } from '@angular/common';
import { Component, DestroyRef, computed, effect, inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { LucideDynamicIcon } from '@lucide/angular';

import { DocumentModalService } from 'qubefin-core';

export interface IFileUploadDialogData {
  /** Heading of the dialog: "Upload Interview Format". */
  title: string;

  /** One line under the heading. Falls back to the drag-and-drop hint. */
  description?: string;

  /** Accepted extensions, in the same form the file input takes: ".pdf,.doc,.docx". */
  accept: string;
}

/**
 * Picks one file - dropped or browsed - and hands it back to the caller on Upload. Nothing is sent from
 * here: the dialog closes with the File and the caller owns the request, so the same dialog serves every
 * upload on the candidate.
 *
 * View previews the picked file in the shared document viewer before it is committed, which is the point
 * of the extra step: the old flow uploaded whatever was chosen in the OS picker with no way back.
 */
@Component({
  selector: 'qfin-file-upload-dialog',
  imports: [MatDialogModule, MatTooltipModule, LucideDynamicIcon],
  templateUrl: './file-upload-dialog.html',
  styles: ``,
})
export class FileUploadDialog {
  private readonly dialogRef = inject(MatDialogRef<FileUploadDialog, File | undefined>);
  private readonly documentModalService = inject(DocumentModalService);
  private readonly documentRef = inject(DOCUMENT);

  readonly data = inject<IFileUploadDialogData>(MAT_DIALOG_DATA);

  readonly selectedFile = signal<File | null>(null);
  readonly dragging = signal(false);
  readonly errorMessage = signal<string | null>(null);

  constructor() {
    effect(() => {
      const previewing = this.documentModalService.activeDocument() !== null;

      // The viewer closes itself on Escape - without this the same key press would close the dialog
      // underneath it too, losing the picked file.
      this.dialogRef.disableClose = previewing;

      this.stackBelowViewer(previewing);
    });

    // A dialog closed while its preview is still up must not leave the overlay demoted.
    inject(DestroyRef).onDestroy(() => this.stackBelowViewer(false));
  }

  /**
   * Puts this dialog under the document viewer for as long as a preview is open.
   *
   * The viewer is a plain fixed element at z-index 1000 in the app root, while every dialog lives in
   * `.cdk-overlay-container` - pinned to 1000 as well and later in the DOM, so it wins the tie and the
   * preview opens behind it. The container is the stacking context, so nothing set on the dialog's own
   * markup can beat it; dropping the container below the viewer while previewing is what works. The
   * stylesheet pins that z-index with `!important`, so this has to be important too.
   */
  private stackBelowViewer(below: boolean) {
    const container = this.documentRef.querySelector<HTMLElement>('.cdk-overlay-container');

    if (!container) {
      return;
    }

    if (below) {
      container.style.setProperty('z-index', '999', 'important');
    } else {
      container.style.removeProperty('z-index');
    }
  }

  /** ".pdf,.doc,.docx" reads better as "PDF, DOC, DOCX". */
  readonly acceptLabel = computed(() =>
    (this.data.accept || '')
      .split(',')
      .map((part) => part.trim().replace(/^\./, '').toUpperCase())
      .filter(Boolean)
      .join(', '),
  );

  readonly fileSizeLabel = computed(() => {
    const file = this.selectedFile();

    if (!file) {
      return '';
    }

    const kb = file.size / 1024;

    return kb < 1024 ? `${kb.toFixed(1)} KB` : `${(kb / 1024).toFixed(2)} MB`;
  });

  // ============================================================
  // PICKING
  // ============================================================

  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.dragging.set(true);
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.dragging.set(false);
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.dragging.set(false);

    const files = event.dataTransfer?.files;

    if (!files || files.length === 0) {
      return;
    }

    this.acceptFile(files[0]);
  }

  onFileSelected(event: Event) {
    const element = event.currentTarget as HTMLInputElement;
    const file = element.files?.[0];

    // Reset first: picking the same file twice in a row fires no change event otherwise.
    element.value = '';

    if (file) {
      this.acceptFile(file);
    }
  }

  clearFile() {
    this.selectedFile.set(null);
    this.errorMessage.set(null);
  }

  /** Dropped files bypass the input's `accept`, so the check lives here for both routes. */
  private acceptFile(file: File) {
    const allowed = (this.data.accept || '')
      .split(',')
      .map((part) => part.trim().toLowerCase())
      .filter(Boolean);

    const extension = `.${file.name.split('.').pop()?.toLowerCase() ?? ''}`;

    if (allowed.length > 0 && !allowed.includes(extension)) {
      this.selectedFile.set(null);
      this.errorMessage.set(`Only ${this.acceptLabel()} files can be uploaded.`);
      return;
    }

    this.errorMessage.set(null);
    this.selectedFile.set(file);
  }

  // ============================================================
  // ACTIONS
  // ============================================================

  onView() {
    const file = this.selectedFile();

    if (!file) {
      return;
    }

    this.documentModalService.open({
      url: URL.createObjectURL(file),
      documentName: file.name,
      extension: file.name.split('.').pop()?.toLowerCase() || 'pdf',
      downloadAccess: true,
    });
  }

  onUpload() {
    const file = this.selectedFile();

    if (!file) {
      return;
    }

    this.dialogRef.close(file);
  }

  onCancel() {
    this.dialogRef.close(undefined);
  }
}
