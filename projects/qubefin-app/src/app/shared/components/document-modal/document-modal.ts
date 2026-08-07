import { CommonModule, DOCUMENT, isPlatformBrowser } from '@angular/common';
import { SafeResourceUrl, DomSanitizer } from '@angular/platform-browser';
import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { LucideDynamicIcon } from '@lucide/angular';
import { APP_ICONS_MAP } from '../../../lucide-icons';
import {
  DocumentModalData,
  DocumentModalService,
  DocumentModalType,
} from '../../services/document-modal.service';

type FileTypeMeta = {
  icon: string;
  color: string;
  label: string;
};

@Component({
  selector: 'qfin-document-modal',
  imports: [CommonModule, LucideDynamicIcon],
  templateUrl: './document-modal.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocumentModal implements OnInit, OnDestroy {
  readonly modalService = inject(DocumentModalService);
  readonly documentRef = inject(DOCUMENT);
  readonly platformId = inject(PLATFORM_ID);
  readonly sanitizer = inject(DomSanitizer);
  readonly iconMap = APP_ICONS_MAP;
  readonly isBrowser = isPlatformBrowser(this.platformId);

  readonly zoom = signal(1);
  readonly rotation = signal(0);
  readonly position = signal({ x: 0, y: 0 });
  readonly dragging = signal(false);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly isFullscreen = signal(false);

  readonly activeDocument = this.modalService.activeDocument;
  readonly isOpen = computed(() => this.activeDocument() !== null);
  readonly currentDocument = computed(() => this.activeDocument());
  readonly mediaUrl = computed(() => this.currentDocument()?.url ?? '');
  readonly documentType = computed<DocumentModalType>(() =>
    this.modalService.resolveType(this.currentDocument()?.extension),
  );
  readonly fileMeta = computed<FileTypeMeta>(() => {
    const type = this.documentType();

    switch (type) {
      case 'image':
        return { icon: 'Image', color: '#6D5EF5', label: 'Image' };
      case 'pdf':
        return { icon: 'FileText', color: '#F0654B', label: 'PDF' };
      case 'video':
        return { icon: 'Video', color: '#3FB6A8', label: 'Video' };
      case 'audio':
        return { icon: 'Music', color: '#E5A94C', label: 'Audio' };
      default:
        return { icon: 'FileText', color: '#8B8FA3', label: 'File' };
    }
  });
  readonly canZoomRotate = computed(() => {
    const type = this.documentType();
    return type === 'image' || type === 'pdf';
  });
  readonly transformStyle = computed(() => {
    const zoom = this.zoom();
    const dragging = this.dragging();
    const position = this.position();
    const rotation = this.rotation();

    return {
      transform: `translate(${position.x}px, ${position.y}px) scale(${zoom}) rotate(${rotation}deg)`,
      cursor: zoom > 1 ? (dragging ? 'grabbing' : 'grab') : 'default',
      transition: dragging ? 'none' : 'transform 0.2s cubic-bezier(.2,.7,.3,1)',
    };
  });
  readonly zoomPercent = computed(() => Math.round(this.zoom() * 100));
  readonly pdfUrl = computed<SafeResourceUrl>(() => {
    const mediaUrl = this.mediaUrl();

    if (!mediaUrl) {
      return this.sanitizer.bypassSecurityTrustResourceUrl('');
    }

    return this.sanitizer.bypassSecurityTrustResourceUrl(`${mediaUrl}#toolbar=0&navpanes=0`);
  });

  private readonly dragStart = signal({ x: 0, y: 0 });
  private fullscreenChangeHandler?: () => void;

  constructor() {
    effect(() => {
      const activeDocument = this.activeDocument();

      if (!this.isBrowser) {
        return;
      }

      if (activeDocument) {
        this.resetView();
        this.loading.set(true);
        this.error.set(false);
        this.documentRef.body.style.overflow = 'hidden';
      } else {
        this.documentRef.body.style.overflow = '';
      }
    });
  }

  ngOnInit() {
    if (!this.isBrowser) {
      return;
    }

    this.fullscreenChangeHandler = () => {
      this.isFullscreen.set(Boolean(this.documentRef.fullscreenElement));
    };

    this.documentRef.addEventListener('fullscreenchange', this.fullscreenChangeHandler);
  }

  ngOnDestroy() {
    if (this.isBrowser) {
      this.documentRef.body.style.overflow = '';
    }

    if (this.fullscreenChangeHandler) {
      this.documentRef.removeEventListener('fullscreenchange', this.fullscreenChangeHandler);
    }

  }

  @HostListener('window:keydown', ['$event'])
  handleKeydown(event: KeyboardEvent) {
    if (!this.isBrowser || !this.isOpen()) {
      return;
    }

    if (event.key === 'Escape') {
      this.close();
      return;
    }

    if (!this.canZoomRotate()) {
      return;
    }

    if (event.key === '+' || event.key === '=') {
      this.zoomIn();
    }

    if (event.key === '-' || event.key === '_') {
      this.zoomOut();
    }

    if (event.key.toLowerCase() === 'r') {
      this.rotateClockwise();
    }

    if (event.key === '0') {
      this.resetView();
    }
  }

  close() {
    this.modalService.close();
  }

  onWheel(event: WheelEvent) {
    if (!this.canZoomRotate() || !(event.ctrlKey || event.metaKey)) {
      return;
    }

    event.preventDefault();
    event.deltaY < 0 ? this.zoomIn() : this.zoomOut();
  }

  onMouseDown(event: MouseEvent) {
    if (this.zoom() <= 1) {
      return;
    }

    const position = this.position();
    this.dragging.set(true);
    this.dragStart.set({
      x: event.clientX - position.x,
      y: event.clientY - position.y,
    });
  }

  onMouseMove(event: MouseEvent) {
    if (!this.dragging()) {
      return;
    }

    const dragStart = this.dragStart();
    this.position.set({
      x: event.clientX - dragStart.x,
      y: event.clientY - dragStart.y,
    });
  }

  stopDrag() {
    this.dragging.set(false);
  }

  zoomIn() {
    this.zoom.update((value) => Math.min(value + 0.25, 4));
  }

  zoomOut() {
    this.zoom.update((value) => Math.max(value - 0.25, 0.5));
  }

  rotateClockwise() {
    this.rotation.update((value) => value + 90);
  }

  rotateCounterClockwise() {
    this.rotation.update((value) => value - 90);
  }

  resetView() {
    this.zoom.set(1);
    this.rotation.set(0);
    this.position.set({ x: 0, y: 0 });
    this.dragging.set(false);
  }

  markLoaded() {
    this.loading.set(false);
    this.error.set(false);
  }

  markError() {
    this.error.set(true);
    this.loading.set(false);
  }

  retry() {
    this.error.set(false);
    this.loading.set(true);
  }

  toggleFullscreen(container: HTMLElement) {
    if (!this.isBrowser) {
      return;
    }

    if (!this.documentRef.fullscreenElement) {
      void container.requestFullscreen?.();
      return;
    }

    void this.documentRef.exitFullscreen?.();
  }

  openInNewTab() {
    const activeDocument = this.currentDocument();

    if (!this.isBrowser || !activeDocument) {
      return;
    }

    window.open(activeDocument.url, '_blank', 'noopener,noreferrer');
  }

  download() {
    const activeDocument = this.currentDocument();

    if (!this.isBrowser || !activeDocument?.downloadAccess) {
      return;
    }

    const link = this.documentRef.createElement('a');
    link.href = activeDocument.url;
    link.download = activeDocument.documentName
      ? `${activeDocument.documentName}.${activeDocument.extension}`
      : '';
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    this.documentRef.body.appendChild(link);
    link.click();
    this.documentRef.body.removeChild(link);
  }

  reloadViewer() {
    const activeDocument = this.currentDocument();

    if (!activeDocument) {
      return;
    }

    this.modalService.open({ ...activeDocument });
  }
}
