import { Component, computed, inject, signal } from '@angular/core';
import { EMPTY_UUID } from 'qubefin-core';
import { APP_ICONS_MAP } from '../../../../lucide-icons';
import { LeavePrayerStore } from '../../stores/leave-prayer-store';
import { LeavePrayerList } from '../../components/leave-prayer-components/leave-prayer-list/leave-prayer-list';
import { LeavePrayerView } from '../../components/leave-prayer-components/leave-prayer-view/leave-prayer-view';
import { LeavePrayerDetail } from '../../components/leave-prayer-components/leave-prayer-detail/leave-prayer-detail';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { LucideDynamicIcon } from '@lucide/angular';
import { CommonModule } from '@angular/common';
@Component({
  selector: 'qfin-leave-prayer-component',
  imports: [
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    FormsModule,
    MatIconModule,
    MatTooltipModule,
    LucideDynamicIcon,
    CommonModule,
    LeavePrayerList,
    LeavePrayerView,
    LeavePrayerDetail,
  ],
  templateUrl: './leave-prayer-component.html',
  styles: ``,
})
export class LeavePrayerComponent {
  public readonly EMPTY_UUID = EMPTY_UUID;
  readonly iconMap = APP_ICONS_MAP;
  readonly leavePrayerStore = inject(LeavePrayerStore);
  readonly isViewMode = signal<boolean>(true);
  readonly selectedLeavePrayerId = signal<string>(EMPTY_UUID);
  readonly currentYear = new Date().getFullYear();
  readonly yearsList = Array.from({ length: 4 }, (_, i) => this.currentYear - i);
  readonly selectedYear = signal(this.currentYear);
  readonly leavePrayers = this.leavePrayerStore.leavePrayers;
  readonly hasSelectedLeavePrayer = computed(
    () => this.selectedLeavePrayerId() !== EMPTY_UUID || !this.isViewMode(),
  );
  protected onView(id: string) {
    this.selectedLeavePrayerId.set(id);
    this.isViewMode.set(true);
  }
  protected onAdd() {
    this.isViewMode.set(false);
    this.selectedLeavePrayerId.set(EMPTY_UUID);
  }

  protected closePanel() {
    this.selectedLeavePrayerId.set(EMPTY_UUID);
    this.isViewMode.set(true);
  }
  onYearChange(year: number) {
    this.selectedYear.set(year);
    this.leavePrayerStore.setYearQuery(year);
  }
  // protected onEditRequest() {
  //   this.isViewMode.set(false);
  // }

  protected onSaveRequest() {
    this.closePanel();
  }
}
