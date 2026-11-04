import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { LucideDynamicIcon } from '@lucide/angular';
import { MyTeamComponent } from '../../../pages/my-team-component/my-team-component';

@Component({
  selector: 'qfin-employee-team-modal',
  imports: [MatDialogModule, LucideDynamicIcon, MyTeamComponent],
  templateUrl: './employee-team-modal.html',
})
export class EmployeeTeamModal {
  readonly dialogRef = inject(MatDialogRef<EmployeeTeamModal>);
  readonly dialogData = inject<{ id: string; name: string }>(MAT_DIALOG_DATA);

  onCancel() {
    this.dialogRef.close();
  }
}
