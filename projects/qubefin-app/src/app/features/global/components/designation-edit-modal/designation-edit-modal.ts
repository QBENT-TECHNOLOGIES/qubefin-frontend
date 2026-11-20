import { Component, computed, inject, signal } from '@angular/core';
import { ApprovalWorkflowStore } from '../../../hrms/stores/approval-workflow-store';
import { RoleStore } from '../../../app/stores/role-store';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { LucideDynamicIcon } from '@lucide/angular';
import { FormsModule } from '@angular/forms';
import { AlertService, EMPTY_UUID } from 'qubefin-core';
import { IDesignationDetail } from '../../../hrms/models/designation';
import { form, FormField, required, schema, Schema } from '@angular/forms/signals';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { OrganizationUnitService } from '../../services/organization-unit-service';
import { OrganizationUnitStore } from '../../stores/organization-unit-store';

@Component({
  selector: 'qfin-designation-edit-modal',
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    LucideDynamicIcon,
    MatSelectModule,
    MatFormFieldModule,
    FormField,
    MatInputModule,
  ],
  templateUrl: './designation-edit-modal.html',
  styles: ``,
})
export class DesignationEditModal {
  readonly dialogRef = inject(MatDialogRef<DesignationEditModal>);
  private readonly data = inject(MAT_DIALOG_DATA);
  readonly orgId = computed(() => this.data?.id);
  readonly desName = computed(() => this.data?.name);
  readonly approvalWorkflowstore = inject(ApprovalWorkflowStore);
  readonly roleStore = inject(RoleStore);
  readonly organizationUnitService = inject(OrganizationUnitService);
  readonly alertService = inject(AlertService);
  organizationUnitStore = inject(OrganizationUnitStore);
  readonly roles = this.roleStore.roles;
  readonly posts = this.approvalWorkflowstore.posts;
  readonly salaryGrades = this.approvalWorkflowstore.salaryGrades;

  protected readonly designationModel = signal<IDesignationDetail>({
    id: EMPTY_UUID,
    name: '',
    salaryGradeId: '',
    postId: '',
    roleId: '',
    organizationUnitId: this.orgId(),
  });
  protected readonly designationSchema: Schema<IDesignationDetail> = schema((path) => {
    required(path.name, { message: 'Designation Name is required' });
    required(path.postId, { message: 'Post is required' });
    required(path.roleId, { message: 'Role is required' });
    required(path.salaryGradeId, { message: 'Salary Grade is required' });
  });
  protected readonly designationForm = form(this.designationModel, this.designationSchema);
  onCancel(): void {
    this.dialogRef.close();
  }
  onSave() {
    if (!this.designationForm().valid()) {
      return;
    }
    const dataToSave = {
      ...this.designationForm().value(),
      organizationUnitId: this.orgId(),
    };
    this.organizationUnitService.saveDesignation(dataToSave).subscribe({
      next: (resp: any) => {
        this.alertService.success('Success', resp).then(() => {
          this.dialogRef.close(true);
          this.organizationUnitStore.refresh();
        });
      },
      error: (err: any) => {
        if (err.error?.isError) {
        }
      },
    });
  }
}
