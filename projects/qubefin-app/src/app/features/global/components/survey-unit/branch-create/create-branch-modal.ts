import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { LucideDynamicIcon } from '@lucide/angular';
import { IBranchCreateInfo } from '../../../models/branch-create';
import { OrganizationUnitDetailComponent } from '../../organization-unit-detail/organization-unit-detail';

// The window where the Committee Lead creates the Branch from an approved survey.
// It shows the Organization Unit form, pre-filled from the survey, with the Unit Type fixed to Branch.
@Component({
  selector: 'qfin-create-branch-modal',
  imports: [MatDialogModule, LucideDynamicIcon, OrganizationUnitDetailComponent],
  templateUrl: './create-branch-modal.html',
})
export class CreateBranchModal {
  readonly dialogRef = inject(MatDialogRef<CreateBranchModal, boolean>);
  private readonly data = inject<{ surveyId: string; info: IBranchCreateInfo }>(MAT_DIALOG_DATA);

  readonly surveyId = this.data.surveyId;
  readonly info = this.data.info;
}
