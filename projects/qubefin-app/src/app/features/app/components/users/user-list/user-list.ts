import { Component, computed, inject, input, output, signal } from '@angular/core';
import { APP_ICONS_MAP } from '../../../../../lucide-icons';
import { MatTableModule } from '@angular/material/table';
import { CommonModule } from '@angular/common';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSortModule, Sort } from '@angular/material/sort';
import { User, UserSearchResult } from '../../../models/user';
import { LucideDynamicIcon } from '@lucide/angular';
import { StatusBadgeComponentComponent } from 'qubefin-core';
import { MatDialog } from '@angular/material/dialog';
import { ResetPasswordModal } from '../reset-password-modal/reset-password-modal';
import { MatTooltip } from '@angular/material/tooltip';

@Component({
  selector: 'qfin-user-list-component',
  imports: [
    MatTooltip,
    CommonModule,
    LucideDynamicIcon,
    MatPaginatorModule,
    MatSortModule,
    MatTableModule,
    StatusBadgeComponentComponent,
  ],
  templateUrl: './user-list.html',
})
export class UserListComponent {
  readonly iconMap = APP_ICONS_MAP;
  private readonly dialog = inject(MatDialog);
  selectedId = signal<string>('');

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
    return ['index', 'username', 'employee', 'mfakey', 'mfaenabled', 'status', 'action'];
  });

  onShowDetail(id: string) {
    this.selectedId.set(id);
    this.showDetail.emit(id);
  }
  openResetPasswordModal(id: string) {
    this.dialog.open(ResetPasswordModal, {
      data: { userId: id },
      maxWidth: '95vw',
      panelClass: 'glass-modal',
    });
  }
}
