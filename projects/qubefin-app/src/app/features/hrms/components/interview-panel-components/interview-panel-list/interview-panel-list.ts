import { CommonModule } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { IInterviewPanelDto } from '../../../models/interview-panel';
import { MatTableModule } from '@angular/material/table';

@Component({
  selector: 'qfin-interview-panel-list',
  standalone: true,
  imports: [CommonModule, MatTableModule],
  templateUrl: './interview-panel-list.html',
})
export class InterviewPanelList {
  isCollapsed = input<boolean>(false);
  readonly data = input<IInterviewPanelDto[]>([]);
  readonly selectedId = input<string>('');
  
  readonly onViewDetail = output<string>();

  displayedColumns = ['scheduledDate', 'scheduledTime', 'status', 'action'];

  onView(id: string): void {
    this.onViewDetail.emit(id);
  }
}
