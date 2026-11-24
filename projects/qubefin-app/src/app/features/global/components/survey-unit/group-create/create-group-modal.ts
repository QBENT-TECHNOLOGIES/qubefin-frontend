import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { LucideDynamicIcon } from '@lucide/angular';
import { EMPTY_UUID } from 'qubefin-core';
import { GroupDetail } from '../../group/group-detail/group-detail';

// The window where the Credit Officer (or the Head of the branch) creates the group from an Approved Group Survey.
// It shows the Group form with that survey already chosen.
@Component({
  selector: 'qfin-create-group-modal',
  imports: [MatDialogModule, LucideDynamicIcon, GroupDetail],
  templateUrl: './create-group-modal.html',
})
export class CreateGroupModal {
  readonly dialogRef = inject(MatDialogRef<CreateGroupModal, boolean>);
  private readonly data = inject<{ surveyId: string; surveyNo: string; proposedArea: string }>(MAT_DIALOG_DATA);

  readonly EMPTY_UUID = EMPTY_UUID;
  readonly surveyId = this.data.surveyId;
  readonly surveyNo = this.data.surveyNo;
  readonly proposedArea = this.data.proposedArea;
}
