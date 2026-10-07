import { Component, computed, inject, input, output, signal } from '@angular/core';
import { APP_ICONS_MAP } from '../../../../../lucide-icons';
import { MatTableModule } from '@angular/material/table';
import { CommonModule } from '@angular/common';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSortModule, Sort } from '@angular/material/sort';
import { User, UserSearchResult } from '../../../models/user';
import { LucideDynamicIcon } from '@lucide/angular';
import { StatusBadgeComponentComponent } from 'qubefin-core';
import { DeviceListModal } from './device-list-modal/device-list-modal';
import { MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'qfin-user-list-component',
  imports: [
    CommonModule,
    LucideDynamicIcon,
    MatPaginatorModule,
    MatSortModule,
    MatTableModule,
    MatTooltipModule,
    StatusBadgeComponentComponent,
  ],
  templateUrl: './user-list.html',
})
export class UserListComponent {
  readonly iconMap = APP_ICONS_MAP;

  selectedId = signal<string>('');
  private readonly dialog = inject(MatDialog);
  readonly data = input.required<UserSearchResult>();
  isCollapsed = input<boolean>(false);
  readonly pageIndex = input(0);
  readonly pageSize = input(10);

  readonly sortChange = output<Sort>();
  readonly pageChange = output<PageEvent>();
  readonly showDetail = output<string>();

  displayedColumns = computed(() => {
    if (this.isCollapsed()) {
      return ['index', 'username', 'action'];
    }
    return ['index', 'ogName', 'username', 'employee', 'mfakey', 'mfaenabled', 'status', 'action'];
  });

  onShowDetail(id: string) {
    this.selectedId.set(id);
    this.showDetail.emit(id);
  }
  openDeviceModal(id: string) {
    this.dialog.open(DeviceListModal, {
      data: { id: id },
      width: '70vw',
      maxWidth: '95vw',
      panelClass: 'glass-modal',
    });
  }
}
