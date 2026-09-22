import {
  Component,
  ElementRef,
  HostListener,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { LucideDynamicIcon } from '@lucide/angular';

import { FileUploadDialog, IFileUploadDialogData } from '../file-upload-dialog/file-upload-dialog';

/**
 * A download/upload pair for one document - the blank format out, the filled-in file back in - as a
 * single split button, the same control the letter actions use: the download is the primary action and
 * the upload lives behind the caret.
 *
 * The parent decides whether the control is rendered at all (the show* flags from
 * USP_GetInterviewCandidateById) and owns the two handlers. Upload opens the drag-and-drop dialog and
 * emits only what comes back from it, so a file is never sent to the parent until the user has confirmed
 * it - and can preview it first.
 */
@Component({
  selector: 'qfin-file-actions',
  imports: [LucideDynamicIcon],
  templateUrl: './file-actions.html',
  styles: ``,
})
export class FileActions {
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly dialog = inject(MatDialog);

  /** The document's name as it reads on the button: "Interview Format", "Joining Letter". */
  readonly actionName = input.required<string>();

  /** An upload is in flight - the menu item shows "Uploading..." and the control locks. */
  readonly uploading = input(false);

  /** Accepted file types for the picker. */
  readonly accept = input('.pdf,.doc,.docx');

  /** Heading of the upload dialog. Defaults to "Upload <actionName>". */
  readonly uploadDialogTitle = input<string>();

  /** The line under that heading, when "the filled-in <actionName>" isn't how this document reads. */
  readonly uploadDialogDescription = input<string>();

  /** Overrides for the two labels when they don't read as "<actionName> Download/Upload". */
  readonly downloadLabel = input<string>();
  readonly uploadLabel = input<string>();

  readonly download = output<void>();
  readonly upload = output<File>();

  readonly menuOpen = signal(false);

  readonly busy = computed(() => this.uploading());

  readonly downloadText = computed(() => this.downloadLabel() ?? `${this.actionName()} Download`);

  readonly uploadText = computed(() =>
    this.uploading() ? 'Uploading...' : (this.uploadLabel() ?? `${this.actionName()} Upload`),
  );

  toggleMenu() {
    this.menuOpen.update((open) => !open);
  }

  onDownload() {
    this.menuOpen.set(false);
    this.download.emit();
  }

  /** Opens the drag-and-drop dialog; the file only reaches the parent once Upload is pressed there. */
  onUploadClick() {
    this.menuOpen.set(false);

    const data: IFileUploadDialogData = {
      title: this.uploadDialogTitle() ?? `Upload ${this.actionName()}`,
      description:
        this.uploadDialogDescription() ??
        `Drag the filled-in ${this.actionName().toLowerCase()} here, or browse to pick it.`,
      accept: this.accept(),
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
        this.upload.emit(file);
      }
    });
  }

  /** Clicking anywhere outside this control closes the menu. */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (!this.menuOpen()) {
      return;
    }

    if (!this.host.nativeElement.contains(event.target as Node)) {
      this.menuOpen.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    this.menuOpen.set(false);
  }
}
