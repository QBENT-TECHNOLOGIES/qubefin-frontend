import { Injectable, inject, signal } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';

import { DocumentModal } from '../components/document-modal/document-modal';

export type DocumentModalType = 'image' | 'pdf' | 'video' | 'audio' | 'unknown';

export interface DocumentModalData {
  url: string;
  documentName: string;
  extension: string;
  downloadAccess?: boolean;
}

const TYPE_EXTENSIONS: Record<DocumentModalType, string[]> = {
  image: ['jpg', 'jpeg', 'png'],
  pdf: ['pdf'],
  video: ['mp4'],
  audio: ['mp3'],
  unknown: [],
};

@Injectable({ providedIn: 'root' })
export class DocumentModalService {
  private readonly dialog = inject(MatDialog);
  private dialogRef: MatDialogRef<DocumentModal> | null = null;

  readonly activeDocument = signal<DocumentModalData | null>(null);

  /**
   * Shows the document in the viewer dialog. Opening while the viewer is already up swaps the document
   * in place (the viewer resets itself off `activeDocument`) rather than stacking a second dialog.
   */
  open(document: DocumentModalData) {
    this.activeDocument.set({
      ...document,
      extension: document.extension.replace('.', ''),
    });

    if (this.dialogRef) {
      return;
    }

    const dialogRef = this.dialog.open(DocumentModal, {
      width: '1080px',
      maxWidth: 'calc(100vw - 48px)',
      height: '88vh',
      panelClass: 'qfin-document-modal-panel',
      backdropClass: ['bg-black/40', 'backdrop-blur-sm'],
      autoFocus: 'dialog',
      // The viewer handles Escape itself and never closed on a backdrop click or a route change.
      disableClose: true,
      closeOnNavigation: false,
    });

    this.dialogRef = dialogRef;

    // Only the dialog still on record may clear the state: a close() followed straight by an open()
    // must not have the old dialog's late afterClosed wipe the new document.
    dialogRef.afterClosed().subscribe(() => {
      if (this.dialogRef === dialogRef) {
        this.dialogRef = null;
        this.activeDocument.set(null);
      }
    });
  }

  close() {
    const dialogRef = this.dialogRef;

    this.dialogRef = null;
    this.activeDocument.set(null);
    dialogRef?.close();
  }

  resolveType(extension?: string): DocumentModalType {
    const normalizedExtension = (extension ?? '').toLowerCase().replace('.', '');

    for (const [type, extensions] of Object.entries(TYPE_EXTENSIONS) as Array<
      [DocumentModalType, string[]]
    >) {
      if (extensions.includes(normalizedExtension)) {
        return type;
      }
    }

    return 'unknown';
  }
}
