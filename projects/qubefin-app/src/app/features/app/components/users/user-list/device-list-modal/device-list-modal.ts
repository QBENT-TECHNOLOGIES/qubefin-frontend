import { Component, computed, effect, inject } from '@angular/core';
import { GrossSalaryModal } from '../../../../../hrms/components/employees/gross-salary-modal/gross-salary-modal';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatTableModule } from '@angular/material/table';
import { CommonModule } from '@angular/common';
import { LucideDynamicIcon } from '@lucide/angular';
import { MatTooltipModule } from '@angular/material/tooltip';
import { UserStore } from '../../../../stores/user-store';
import { AlertService, EMPTY_UUID } from 'qubefin-core';
import { UserService } from '../../../../services/user-service';

@Component({
  selector: 'qfin-device-list-modal',
  imports: [CommonModule, MatDialogModule, MatTableModule, LucideDynamicIcon, MatTooltipModule],
  templateUrl: './device-list-modal.html',
  styles: ``,
})
export class DeviceListModal {
  private readonly alertService = inject(AlertService);
  private readonly userService = inject(UserService);
  protected readonly userStore = inject(UserStore);
  private readonly dialogData = inject(MAT_DIALOG_DATA);

  constructor() {
    const id = this.dialogData?.id;
    effect(() => {
      if (id && id !== EMPTY_UUID) {
        this.userStore.setUserId(id);
      }
    });
  }
  readonly deviceList = computed(() => this.userStore.deviceResource.value() ?? []);
  readonly dialogRef = inject(MatDialogRef<GrossSalaryModal>);
  readonly displayedColumns = computed(() => {
    return ['sl', 'deviceId', 'assignedDate', 'isReleased', 'releaseDate', 'action'];
  });
  unbindDevice(deviceId: string) {
    if (!deviceId || deviceId === EMPTY_UUID) return;

    this.alertService
      .confirm('Confirmation', 'Are you sure you want to unbind this device?')
      .then((result) => {
        if (result.isConfirmed) {
          this.userService.unBindDevice(deviceId).subscribe({
            next: () => {
              this.alertService.success('Success', 'Device Unbind Successfully').then(() => {
                this.userStore.deviceResource.reload();
              });
            },
            error: (err: any) => {},
          });
        }
      });
  }
  onCancel() {
    this.dialogRef.close(false);
  }
}
