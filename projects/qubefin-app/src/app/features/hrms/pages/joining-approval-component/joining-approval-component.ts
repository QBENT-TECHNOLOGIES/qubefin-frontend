import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { LucideDynamicIcon } from '@lucide/angular';
import { AlertService } from 'qubefin-core';

import { IJoiningApprovalListItem } from '../../models/joining-approval';
import { JoiningApprovalStore } from '../../stores/joining-approval-store';

@Component({
  selector: 'qfin-joining-approval-component',
  imports: [
    CommonModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatTooltipModule,
    MatButtonModule,
    MatMenuModule,
    DatePipe,
    CurrencyPipe,
    LucideDynamicIcon,
  ],
  templateUrl: './joining-approval-component.html',
})
export class JoiningApprovalComponent {
  readonly joiningApprovalStore = inject(JoiningApprovalStore);
  private readonly alertService = inject(AlertService);

  readonly columns = [
    'sl',
    'employeeName',
    'designation',
    'organizationUnit',
    'company',
    'monthlyCtc',
    'department',
    'salaryGrade',
    'joiningDate',
    'qualification',
    'action',
  ];

  pageChanged(event: PageEvent) {
    this.joiningApprovalStore.setPage(event.pageIndex);
    this.joiningApprovalStore.setPageSize(event.pageSize);
  }

  onSortChanged(sort: Sort) {
    if (!sort.direction) {
      return;
    }
    this.joiningApprovalStore.setSort(sort.active, sort.direction as 'asc' | 'desc');
  }

  protected onAction(item: IJoiningApprovalListItem, isApproved: boolean) {
    const action = isApproved ? 'approve' : 'reject';

    this.alertService
      .confirm('Confirmation', `You want to ${action} joining of ${item.employeeName}!`, 'Yes', 'No')
      .then((result) => {
        if (!result.isConfirmed) {
          return;
        }

        this.joiningApprovalStore
          .takeAction({ joiningInfoId: item.id, isApproved })
          .subscribe({
            next: (resp) => {
              this.alertService.success('Success', resp).then(() => {
                this.joiningApprovalStore.refreshList();
              });
            },
          });
      });
  }
}
