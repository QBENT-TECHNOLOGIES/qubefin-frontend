import { Component, computed, effect, inject, model, output, signal } from '@angular/core';
import { ApprovalWorkflowStore } from '../../../stores/approval-workflow-store';
import { AlertService, EMPTY_UUID } from 'qubefin-core';
import { IApprovalWorkflow, IApprovalWorkflowDetail } from '../../../models/approval-workflow';
import { form, required, schema, Schema, validate } from '@angular/forms/signals';
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
  readonly categories = signal<string[]>(['LEAVE', 'LEAVE_PRAYER', 'ONDUTY', 'ATTENDANCE']);

  readonly approvalWorkflowId = model<string>(EMPTY_UUID);
  readonly onCancel = output<void>();
  readonly onSave = output<void>();
  readonly filterLeaveTypes = signal<any[]>([]);
  readonly isLeaveCategory = signal<boolean>(false);
  readonly isAttendanceCategory = signal<boolean>(false);

  private readonly organizationUnitTypeStore = inject(OrganizationUnitTypeStore);
  readonly approvalWorkflowstore = inject(ApprovalWorkflowStore);

  readonly alertService = inject(AlertService);
  readonly workflowService = inject(ApprovalWorkflowService);

  readonly organizationUnits = this.organizationUnitTypeStore.organizationUnitTypes;
  readonly leaveTypes = this.approvalWorkflowstore.leaveTypes;
  readonly posts = this.approvalWorkflowstore.posts;
  readonly salaryGrades = this.approvalWorkflowstore.salaryGrades;

  readonly isEditMode = computed(() => this.approvalWorkflowId() !== EMPTY_UUID);

  readonly formModel = signal<IApprovalWorkflow>({
    id: EMPTY_UUID,
    category: '',
    leaveTypeId: null,
    organizationUnitTypeId: null,
    postId: null,
    salaryGradeId: null,
    minimumDays: 0,
    maximumDays: 0,
    approvalSteps: [],
  });
  readonly approvalSteps = computed(() => this.formModel().approvalSteps || []);
  protected readonly formSchema: Schema<IApprovalWorkflow> = schema((path) => {
    required(path.category, { message: 'Category is required' });
    required(path.organizationUnitTypeId, { message: 'Organization Unit Type is required' });
    required(path.leaveTypeId, {
      message: 'Leave Type is required',
      when: ({ valueOf }) => {
        const category = valueOf(path.category);

        return category === 'LEAVE' || category === 'LEAVE_PRAYER';
      },
    });
  });

  protected readonly approvalWorkflowForm = form(this.formModel, this.formSchema);

  constructor() {
    effect(() => {
      if (this.approvalWorkflowId() !== EMPTY_UUID) {
        this.approvalWorkflowstore.setApprovalWorkflowId(this.approvalWorkflowId());
      }
    });
    effect(() => {
      const category = this.approvalWorkflowForm.category().value();

      this.isLeaveCategory.set(category === 'LEAVE' || category === 'LEAVE_PRAYER');
      this.isAttendanceCategory.set(category === 'ONDUTY' || category === 'ATTENDANCE');

      if (category && this.isLeaveCategory()) {
        this.filterLeaveTypes.set(
          this.leaveTypes().filter((m) => (category === 'LEAVE' ? true : m.isPrayerable)),
        );
      } else {
        this.approvalWorkflowForm.leaveTypeId().reset();
        this.filterLeaveTypes.set([]);
      }
    });
    effect(() => {
      if (this.isEditMode()) {
        const detail = this.approvalWorkflowstore.approvalWorkflow();
        if (detail) {
          const normalizedSteps = (detail.approvalSteps ?? detail.steps ?? []).map((step) => ({
            id: step.id ?? EMPTY_UUID,
            approvalWorkflowId: step.approvalWorkflowId ?? detail.id ?? EMPTY_UUID,
            organizationUnitTypeId: step.organizationUnitTypeId ?? null,
            receiverPostId: step.receiverPostId ?? '',
            isRecommendEvent: !!step.isRecommendEvent,
            isApprovalEvent: !!step.isApprovalEvent,
            eventStatus: step.eventStatus ?? '',
            eventButtonText: step.eventButtonText ?? '',
            sequenceNo: step.sequenceNo ?? 0,
          }));

          this.formModel.set({
            id: detail.id ?? EMPTY_UUID,
            category: detail.category ?? '',
            leaveTypeId: detail.leaveTypeId ?? null,
            organizationUnitTypeId: detail.organizationUnitTypeId ?? null,
            postId: detail.postId ?? null,
            salaryGradeId: detail.salaryGradeId ?? null,
            minimumDays: detail.minimumDays ?? 0,
            maximumDays: detail.maximumDays ?? 0,
            approvalSteps: normalizedSteps,
          });
        }
      } else {
        this.formModel.set({
          id: EMPTY_UUID,
          category: '',
          leaveTypeId: null,
          organizationUnitTypeId: null,
          postId: null,
          salaryGradeId: null,
          minimumDays: 0,
          maximumDays: 0,
          approvalSteps: [],
        });
      }
    });
  }

  protected addApprovalStep() {
    this.formModel.update((current) => {
      const steps = current.approvalSteps || [];

      return {
        ...current,
        approvalSteps: [
          ...steps,
          {
            id: EMPTY_UUID,
            approvalWorkflowId: this.approvalWorkflowId(),
            organizationUnitTypeId: null,
            receiverPostId: '',
            isRecommendEvent: false,
            isApprovalEvent: false,
            eventStatus: '',
            eventButtonText: '',
            sequenceNo: steps.length + 1,
          },
        ],
      };
    });
  }

  protected removeApprovalStep(index: number) {
    this.alertService
      .confirm('Confirmation', 'Are you sure you want to remove this step?')
      .then((result) => {
        if (result.isConfirmed) {
          this.formModel.update((current) => {
            const steps = [...(current.approvalSteps || [])];

            steps.splice(index, 1);

            const updatedSteps = steps.map((step, i) => ({
              ...step,
              sequenceNo: i + 1,
            }));

            return {
              ...current,
              approvalSteps: updatedSteps,
            };
          });
        }
      });
  }
  protected updateApprovalStep(
    index: number,
    field: 'isRecommendEvent' | 'isApprovalEvent',
    value: boolean,
  ) {
    this.formModel.update((current) => {
      const steps = [...(current.approvalSteps || [])];
      const step = { ...(steps[index] ?? {}) };

      if (field === 'isRecommendEvent') {
        step.isRecommendEvent = value;
        step.isApprovalEvent = value ? false : step.isApprovalEvent;
      } else {
        step.isApprovalEvent = value;
        step.isRecommendEvent = value ? false : step.isRecommendEvent;
      }

      steps[index] = step;
      return { ...current, approvalSteps: steps };
    });
  }

  protected isReceiverPostAvailable(postId: string | null | undefined): boolean {
    const workflowPostId = this.approvalWorkflowForm.postId().value();
    return !postId || postId !== workflowPostId;
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
          const approvalSteps = this.formModel().approvalSteps || [];

          for (let i = 0; i < approvalSteps.length; i++) {
            const step = approvalSteps[i];
            const stepNo = i + 1;
            const workflowPostId = this.approvalWorkflowForm.postId().value();

            if (!step.receiverPostId?.trim()) {
              this.alertService.error(null, `Receiver Post is required for Step ${stepNo}`);
              return;
            }

            if (!step.organizationUnitTypeId?.trim()) {
              this.alertService.error(
                null,
                `Organization Unit Type is required for Step ${stepNo}`,
              );
              return;
            }

            if (workflowPostId && step.receiverPostId === workflowPostId) {
              this.alertService.error(
                null,
                `Receiver Post cannot be the same as the workflow Post for Step ${stepNo}`,
              );
              return;
            }

            if (!step.eventStatus?.trim()) {
              this.alertService.error(null, `Event Status is required for Step ${stepNo}`);
              return;
            }

            if (!step.eventButtonText?.trim()) {
              this.alertService.error(null, `Event Button Text is required for Step ${stepNo}`);
              return;
            }

            if (!step.isApprovalEvent && !step.isRecommendEvent) {
              this.alertService.error(
                null,
                `Please select at least one event type (Approval or Recommend) for Step ${stepNo}.`,
              );
              return;
            }
          }
          const formValue = this.approvalWorkflowForm().value();

          const payload = {
            id: formValue.id,
            category: formValue.category,
            leaveTypeId: formValue.leaveTypeId,
            organizationUnitTypeId: formValue.organizationUnitTypeId,
            salaryGradeId: formValue.salaryGradeId,
            postId: formValue.postId,
            minimumDays: formValue.minimumDays,
            maximumDays: formValue.maximumDays,

            steps: (this.formModel().approvalSteps ?? []).map((step) => ({
              id: step.id,
              organizationUnitTypeId: step.organizationUnitTypeId,
              receiverPostId: step.receiverPostId,
              isRecommendEvent: step.isRecommendEvent,
              isApprovalEvent: step.isApprovalEvent,
              eventStatus: step.eventStatus,
              eventButtonText: step.eventButtonText,
              sequenceNo: step.sequenceNo,
            })),
          };
          if (!this.isEditMode()) {
            this.workflowService.create(payload).subscribe({
              next: (resp: any) => {
                this.alertService.success(null, resp).then(() => {
                  this.approvalWorkflowstore.refreshList();
                  this.onSave.emit();
                });
              },
              error: (err: any) => {},
            });
          } else {
            this.workflowService.update(payload.id, payload).subscribe({
              next: (resp: any) => {
                this.alertService.success(null, resp).then(() => {
                  this.approvalWorkflowstore.refreshList();
                  this.approvalWorkflowstore.refreshDetail();
                  this.onSave.emit();
                });
              },
              error: (err: any) => {},
            });
          }
        }
      });
  }

  protected onCancelClicked() {
    this.onCancel.emit();
  }
}
