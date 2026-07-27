import { Injectable, signal } from '@angular/core';

export type DocumentModalType = 'image' | 'pdf' | 'video' | 'audio' | 'unknown';

export interface DocumentModalData {
  url: string;
  documentName: string;
  extension: string;
  downloadAccess?: boolean;
}

const TYPE_EXTENSIONS: Record<DocumentModalType, string[]> = {
  image: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'avif'],
  pdf: ['pdf'],
  video: ['mp4', 'webm', 'mov', 'mkv', 'avi', 'm4v'],
  audio: ['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac'],
  unknown: [],
};

@Injectable({ providedIn: 'root' })
export class DocumentModalService {
  readonly activeDocument = signal<DocumentModalData | null>(null);

  open(document: DocumentModalData) {
    this.activeDocument.set({
      ...document,
      extension: document.extension.replace('.', ''),
    });
  }

  close() {
    this.activeDocument.set(null);
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
