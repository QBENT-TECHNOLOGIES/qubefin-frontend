import { Component, input, output, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { LucideDynamicIcon } from '@lucide/angular';
import { ICandidateList } from '../../../../models/candidate';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatDialog } from '@angular/material/dialog';
import { InterviewPanelDetail } from '../interview-panel-detail/interview-panel-detail';

@Component({
  selector: 'qfin-candidate-list',
  imports: [
    CommonModule,
    MatTableModule,
    MatTooltipModule,
    MatButtonModule,
    LucideDynamicIcon,
    MatPaginatorModule,
    MatSortModule,
  ],
  providers: [DatePipe],
  templateUrl: './candidate-list.html',
  styles: ``,
})
export class CandidateList {
  private readonly dialog = inject(MatDialog);
  readonly data = input<ICandidateList[]>([]);
  readonly totalRecords = input(0);
  readonly pageIndex = input(0);
  readonly pageSize = input(10);
  readonly selectedId = input('');
  readonly isCollapsed = input(false);
  pageChanged = output<PageEvent>();
  onViewDetail = output<string>();
  sortChanged = output<Sort>();

  displayedColumns = [
    'sl',
    'name',
    'ref',
    'interviewPost',
    'interviewDate',
    'interviewTime',
    'recommendationStatus',
    'action',
  ];
  get columns() {
    return this.isCollapsed() ? ['name', 'interviewPost', 'action'] : this.displayedColumns;
  }
  onDetailView(id: string) {
    this.onViewDetail.emit(id);
  }

  onCreatePanel(id: string) {
    const dialogRef = this.dialog.open(InterviewPanelDetail, {
      width: '800px',
      disableClose: true,
      panelClass: 'glass-modal'
    });
    
    if (dialogRef.componentInstance) {
      dialogRef.componentRef?.setInput('candidateIdForPanel', id);
      dialogRef.componentRef?.setInput('isAssessmentMode', false);
      
      const sub1 = dialogRef.componentInstance.cancel.subscribe(() => dialogRef.close());
      const sub2 = dialogRef.componentInstance.save.subscribe(() => dialogRef.close());
      
      dialogRef.afterClosed().subscribe(() => {
        sub1.unsubscribe();
        sub2.unsubscribe();
      });
    }
  }

  onPage(event: PageEvent) {
    this.pageChanged.emit(event);
  }

  onSortChange(sort: Sort) {
    this.sortChanged.emit(sort);
  }
}
