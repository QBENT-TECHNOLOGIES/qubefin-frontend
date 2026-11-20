import { Component, computed, input, output } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { LucideDynamicIcon } from '@lucide/angular';
@Component({
  selector: 'qfin-leave-prayer-list',
  imports: [
    CommonModule,
    MatTableModule,
    MatTooltipModule,
    MatButtonModule,
    DatePipe,
    LucideDynamicIcon,
  ],
  templateUrl: './leave-prayer-list.html',
  styles: ``,
})
export class LeavePrayerList {
  readonly data = input<any[]>([]);
  readonly selectedId = input('');
  readonly isCollapsed = input(false);
  onViewDetail = output<string>();
  displayedColumns = computed(() => {
    if (this.isCollapsed()) {
      return ['leaveType', 'appliedOn', 'action'];
    }
    return ['sl', 'leaveType', 'prayerDays', 'appliedOn', 'status', 'action'];
  });

  onDetailView(id: string) {
    this.onViewDetail.emit(id);
  }
}
