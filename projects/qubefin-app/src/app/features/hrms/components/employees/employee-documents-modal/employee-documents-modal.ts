import { Component, computed, inject } from '@angular/core';
import { EmployeeStore } from '../../../stores/employee-store';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { LucideDynamicIcon } from '@lucide/angular';
import { MatTableModule } from '@angular/material/table';
import { DocumentModalService } from 'qubefin-core';
import { IEmployeeDocuments } from '../../../models/employee-detail';
@Component({
  selector: 'qfin-employee-documents-modal',
  imports: [MatDialogModule, LucideDynamicIcon, MatTableModule],
  templateUrl: './employee-documents-modal.html',
  styles: ``,
})
export class EmployeeDocumentsModal {
  readonly documentModal = inject(DocumentModalService);
  readonly employeeStore = inject(EmployeeStore);
  readonly displayedColumns = computed(() => {
    return ['sl', 'docName', 'fileName', 'view'];
  });
  readonly dialogRef = inject(MatDialogRef<EmployeeDocumentsModal>);
  private readonly dialogData = inject(MAT_DIALOG_DATA);
  readonly documents = this.employeeStore.documentsByEmpId;
  readonly isLoading = computed(() => this.employeeStore.documentsByEmpIdResource.isLoading());
  constructor() {
    this.employeeStore.setDocumentEmployeeId(this.dialogData.id);
  }
  onOpenDocument(item: IEmployeeDocuments) {
    if (!item.fileUrl || !item.fileName) {
      return;
    }
    this.documentModal.open({
      url: item.fileUrl,
      documentName: item.fileName,
      extension: item.fileName.split('.').pop()?.toLowerCase() || '',
      downloadAccess: true,
    });
  }
  onCancel() {
    this.dialogRef.close(false);
  }
}
