import { DatePipe } from '@angular/common';
import { Component, effect, inject, model, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { LucideDynamicIcon } from '@lucide/angular';
import { EMPTY_UUID } from 'qubefin-core';
import { APP_ICONS_MAP } from '../../../../../lucide-icons';
import { MemberStore } from '../../../stores/member-store';

@Component({
  selector: 'qfin-member-view',
  imports: [MatIconModule, DatePipe, MatTooltipModule, LucideDynamicIcon],
  templateUrl: './member-view.html',
  styles: ``,
})
export class MemberView {
  memberStore = inject(MemberStore);
  memberId = model<string>(EMPTY_UUID);
  showEdit = output<boolean>();

  memberDetail = this.memberStore.memberInfoComponent;
  readonly iconMap = APP_ICONS_MAP;

  constructor() {
    effect(() => {
      if (this.memberId() && this.memberId() !== EMPTY_UUID) {
        this.memberStore.setMemberComponentId(this.memberId());
      }
    });
  }

  onShowEdit() {
    this.showEdit.emit(true);
  }
}
