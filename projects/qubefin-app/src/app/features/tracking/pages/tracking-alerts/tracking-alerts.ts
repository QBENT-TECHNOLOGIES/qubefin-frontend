import { DatePipe, NgClass } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { LucideDynamicIcon } from '@lucide/angular';
import { RouterLink } from '@angular/router';
import { AlertService } from 'qubefin-core';
import { AlertType, TrackingAlert } from '../../models/tracking-alert';
import { TrackingAlertService } from '../../services/tracking-alert-service';
import { TrackingAlertStore } from '../../stores/tracking-alert-store';
import { TrackingLookupStore } from '../../stores/tracking-lookup-store';
import { googleMapsLink } from '../../utils/geo-utils';
import { pollWhileVisible } from '../../utils/poll';
import { ALERT_SEVERITY, ALERT_STATUS, ALERT_TYPE, optionsOf, Tone } from '../../utils/tracking-labels';
import { RemarksDialog, RemarksDialogData } from '../../components/shared/remarks-dialog/remarks-dialog';
import { TrackingChip } from '../../components/shared/tracking-chip/tracking-chip';

@Component({
  selector: 'qfin-tracking-alerts',
  imports: [
    NgClass,
    DatePipe,
    FormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatTooltipModule,
    LucideDynamicIcon,
    RouterLink,
    TrackingChip,
  ],
  templateUrl: './tracking-alerts.html',
})
export class TrackingAlerts {
  readonly store = inject(TrackingAlertStore);
  readonly lookup = inject(TrackingLookupStore);
  private readonly service = inject(TrackingAlertService);
  private readonly popups = inject(AlertService);
  private readonly dialog = inject(MatDialog);

  /** Widened for mat-table rows, which are typed `any` in templates. */
  readonly ALERT_TYPE: Record<string, Tone> = ALERT_TYPE;
  readonly ALERT_SEVERITY: Record<string, Tone> = ALERT_SEVERITY;
  readonly ALERT_STATUS: Record<string, Tone> = ALERT_STATUS;
  readonly typeOptions = optionsOf(ALERT_TYPE);
  readonly severityOptions = optionsOf(ALERT_SEVERITY);
  readonly statusOptions = optionsOf(ALERT_STATUS);
  readonly googleMapsLink = googleMapsLink;
  readonly columns = ['severity', 'type', 'employee', 'message', 'raisedAt', 'status', 'actions'];

  readonly typeCards = computed(() => {
    const open = this.store.openByType();
    return (Object.keys(ALERT_TYPE) as AlertType[]).map((t) => ({ type: t, tone: ALERT_TYPE[t], count: open?.[t] ?? 0 }));
  });
  readonly totalOpen = computed(() => this.typeCards().reduce((s, c) => s + c.count, 0));

  constructor() {
    pollWhileVisible(() => this.store.refresh());
  }

  filterType(type: AlertType) {
    this.store.setFilter(this.store.type, this.store.type() === type ? null : type);
  }

  onPage(e: PageEvent) {
    this.store.pageSize.set(e.pageSize);
    this.store.pageIndex.set(e.pageIndex);
  }

  acknowledge(a: TrackingAlert) {
    this.service.acknowledge(a.id).subscribe(() => {
      this.popups.toast('success', 'Alert acknowledged');
      this.store.refresh();
    });
  }

  resolve(a: TrackingAlert) {
    this.dialog
      .open<RemarksDialog, RemarksDialogData, string>(RemarksDialog, {
        data: {
          title: 'Resolve alert',
          message: a.message,
          label: 'What was found / action taken',
          placeholder: 'e.g. Spoke to the employee – network issue in the area',
          confirmText: 'Resolve',
          icon: 'circle-check',
          tone: 'success',
        },
        panelClass: 'glass-modal',
        maxWidth: '95vw',
      })
      .afterClosed()
      .subscribe((remarks) => {
        if (!remarks) return;
        this.service.resolve(a.id, { remarks }).subscribe(() => {
          this.popups.toast('success', 'Alert resolved');
          this.store.refresh();
        });
      });
  }

  measured(a: TrackingAlert) {
    return a.measuredValue !== null ? `${a.measuredValue} ${a.measuredUnit ?? ''}`.trim() : null;
  }
}
