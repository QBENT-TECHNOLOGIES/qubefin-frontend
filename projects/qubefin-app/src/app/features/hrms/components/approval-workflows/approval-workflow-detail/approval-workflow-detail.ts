import { Component, computed, effect, inject, model, output, signal } from '@angular/core';
import { ApprovalWorkflowStore } from '../../../stores/approval-workflow-store';
import { AlertService, EMPTY_UUID } from 'qubefin-core';
import { IApprovalWorkflow, IApprovalWorkflowDetail } from '../../../models/approval-workflow';
import { form, required, schema, Schema } from '@angular/forms/signals';
import { ApprovalWorkflowService } from '../../../services/approval-workflow-service';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { FormsModule } from '@angular/forms';
import { LucideDynamicIcon } from '@lucide/angular';
import { FormField } from '@angular/forms/signals';
import { LeaveRequestStore } from '../../../stores/leave-request-store';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { OrganizationUnitTypeStore } from '../../../../global/stores/organization-unit-type-store';
@Component({
  selector: 'qfin-approval-workflow-detail',
  imports: [
    CommonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    FormsModule,
    LucideDynamicIcon,
    FormField,
    MatCheckboxModule,
  ],
  templateUrl: './approval-workflow-detail.html',
})
export class ApprovalWorkflowDetail {
  readonly categories = signal<string[]>(['Leave', 'Leave Prayer', 'Regularization']);
  readonly posts = signal<string[]>(['ok', 'ok2']);
  private readonly organizationUnitTypeStore = inject(OrganizationUnitTypeStore);
  readonly organizationUnits = this.organizationUnitTypeStore.organizationUnitTypes;
  private readonly leaveRequestStore = inject(LeaveRequestStore);
  readonly approvalWorkflowstore = inject(ApprovalWorkflowStore);
  readonly alertService = inject(AlertService);
  readonly workflowService = inject(ApprovalWorkflowService);
  readonly approvalWorkflowId = model<string>(EMPTY_UUID);
  readonly onCancel = output<void>();
  readonly onSave = output<void>();
  readonly leaveTypeBalances = this.leaveRequestStore.leaveTypeBalances;
  readonly isEditMode = computed(() => this.approvalWorkflowId() !== EMPTY_UUID);
  readonly formModel = signal<IApprovalWorkflow>({
    id: EMPTY_UUID,
    category: '',
    leaveTypeId: '',
    minimumDays: 0,
    maximumDays: 0,
    approvalSteps: [],
  });
  readonly approvalSteps = computed(() => this.formModel().approvalSteps || []);
  protected readonly formSchema: Schema<IApprovalWorkflow> = schema((path) => {
    required(path.category, { message: 'Category is required' });
    // required(path.leaveTypeId, { message: 'Leave type is required' });
    // required(path.minimumDays, { message: 'Minimum days is required' });
    // required(path.maximumDays, { message: 'Maximum days is required' });
  });
  protected readonly approvalWorkflowForm = form(this.formModel, this.formSchema);
  constructor() {
    effect(() => {
      if (this.approvalWorkflowId() !== EMPTY_UUID) {
        this.approvalWorkflowstore.setApprovalWorkflowId(this.approvalWorkflowId());
      }
    });
    effect(() => {
      if (this.isEditMode()) {
        const detail = this.approvalWorkflowstore.approvalWorkflow();
        if (detail) {
          this.formModel.set({
            ...detail,
            approvalSteps: detail.approvalSteps || [],
          });
        }
      } else {
        this.formModel.set({
          id: EMPTY_UUID,
          category: '',
          leaveTypeId: '',
          minimumDays: 0,
          maximumDays: 0,
          approvalSteps: [],
        });
      }
    });
  }
  // updateField() {}
  protected addApprovalStep() {
    this.formModel.update((current) => ({
      ...current,
      approvalSteps: [
        ...(current.approvalSteps || []),
        {
          id: EMPTY_UUID,
          approvalWorkflowId: this.approvalWorkflowId(),
          receiverPostId: '',
          isRecommendEvent: false,
          isApprovalEvent: false,
          eventStatus: '',
          eventButtonText: '',
        },
      ],
    }));
  }
  protected removeApprovalStep(index: number) {
    this.alertService
      .confirm('Confirmation', 'Are you sure you want to remove this step?')
      .then((result) => {
        if (result.isConfirmed) {
          this.formModel.update((current) => {
            const steps = [...(current.approvalSteps || [])];
            steps.splice(index, 1);
            return { ...current, approvalSteps: steps };
          });
        }
      });
  }
  protected updateApprovalStep(index: number, field: string, value: any) {
    this.formModel.update((current) => {
      const steps = [...(current.approvalSteps || [])];
      steps[index] = { ...steps[index], [field]: value };
      return { ...current, approvalSteps: steps };
    });
  }
  protected onCancelClicked() {
    this.onCancel.emit();
  }
  protected onSubmit() {
    if (!this.approvalWorkflowForm().valid()) {
      return;
    }
    this.alertService
      .confirm(
        'Confirmation',
        `Are you sure you want to ${!this.isEditMode() ? 'create' : 'update'} this approval workflow?`,
      )
      .then((result) => {
        if (result.isConfirmed) {
          const payload = {
            ...this.approvalWorkflowForm().value(),
            approvalSteps: this.formModel().approvalSteps,
          };
          if (!this.isEditMode()) {
            this.workflowService.create(payload).subscribe({
              next: () => {
                this.approvalWorkflowstore.refreshList();
                this.onSave.emit();
              },
            });
          } else {
            this.workflowService.update(payload.id, payload).subscribe({
              next: () => {
                this.approvalWorkflowstore.refreshList();
                this.approvalWorkflowstore.refreshDetail();
                this.onSave.emit();
              },
            });
          }
        }
      });
  }
}
