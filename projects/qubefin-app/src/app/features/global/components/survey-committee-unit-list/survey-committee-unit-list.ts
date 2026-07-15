import { Component, input, output } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { LucideDynamicIcon } from '@lucide/angular';
import { APP_ICONS_MAP } from '../../../../lucide-icons';
import { SurveyCommitteeItem } from '../../models/survey-committee-item';

@Component({
  selector: 'qfin-survey-committee-unit-list',
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    LucideDynamicIcon,
    DatePipe,
  ],
  templateUrl: './survey-committee-unit-list.html',
  styles: ``,
})
export class SurveyCommitteeUnitList {
  onViewDetail = output<string>();
  readonly data = input<any[]>([]);
  readonly isCollapsed = input<boolean>(false);
  readonly selectedId = input<string>('');
  readonly iconMap = APP_ICONS_MAP;

  onDetailView(id: string) {
    this.onViewDetail.emit(id);
  }
}
