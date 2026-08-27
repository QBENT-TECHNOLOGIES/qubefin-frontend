import { CommonModule, DatePipe } from '@angular/common';
import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { AlertService, EMPTY_UUID } from 'qubefin-core';
import { LeaveFitnessStore } from '../../../stores/leave-fitness-store';
import { LucideDynamicIcon } from '@lucide/angular';
import { DateAdapter, provideNativeDateAdapter } from '@angular/material/core';
import { DocumentModalService } from '../../../../../shared/services/document-modal.service';
import { ILeaveFitnessItem } from '../../../models/leave-fitness';
import { LeaveRequestStore } from '../../../stores/leave-request-store';

@Component({
  selector: 'qfin-leave-fitness-detail',
  imports: [
    CommonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    LucideDynamicIcon,
    MatDatepickerModule,
    MatButtonModule,
  ],
  providers: [provideNativeDateAdapter(), DatePipe],
  templateUrl: './leave-fitness-detail.html',
  styles: ``,
})
export class LeaveFitnessDetail {
  private readonly leaveRequestStorere = inject(LeaveRequestStore);
  private readonly leaveFitnessStore = inject(LeaveFitnessStore);
  private readonly alertService = inject(AlertService);
  private readonly dateAdapter = inject(DateAdapter<Date>);
  readonly documentModal = inject(DocumentModalService);
  private readonly datePipe = inject(DatePipe);

  readonly recordId = input<string>(EMPTY_UUID);

  readonly cancel = output<void>();
  readonly actionCompleted = output<void>();

  readonly loading = this.leaveRequestStorere.loading;
  readonly item = this.leaveRequestStorere.leaveRequest;

  public readonly documentUrl = signal<string>('');
  public readonly documentName = signal<string>('');

  public readonly fitnessReportUrl = signal<string>('');

  constructor() {
    this.dateAdapter.setLocale('en-GB');

    effect(() => {
      this.leaveRequestStorere.setLeaveRequestId(this.recordId());
    });

    effect(() => {
      const data = this.item();
      if (data) {
        this.documentUrl.set(data.enclosedDocUrl || '');
        this.documentName.set(data.enclosedDocName || '');
        this.fitnessReportUrl.set(data.fitnessReportUrl || '');
      }
    });
  }

  getStatusClass(status: string | null | undefined): string {
    switch (status) {
      case 'Approved':
        return 'text-emerald-600 dark:text-emerald-400';

      case 'Rejected':
        return 'text-rose-600 dark:text-rose-400';

      case 'Cancelled':
        return 'text-slate-600 dark:text-slate-400';

      case 'Pending':
        return 'text-yellow-600 dark:text-yellow-400';

      default:
        return 'text-blue-600 dark:text-blue-400';
    }
  }

  getStatusPingClass(status: string | null | undefined): string {
    switch (status) {
      case 'Approved':
        return 'bg-emerald-400';

      case 'Rejected':
        return 'bg-rose-400';

      case 'Cancelled':
        return 'bg-slate-400';

      case 'Pending':
        return 'bg-yellow-400';

      default:
        return 'bg-blue-400';
    }
  }

  getStatusDotClass(status: string | null | undefined): string {
    switch (status) {
      case 'Approved':
        return 'bg-emerald-500';

      case 'Rejected':
        return 'bg-rose-500';

      case 'Cancelled':
        return 'bg-slate-500';

      case 'Pending':
        return 'bg-yellow-500';

      default:
        return 'bg-blue-500';
    }
  }

  openDocument(url: any, name: any) {
    if (!url || !name) {
      return;
    }

    this.documentModal.open({
      url: url,
      documentName: name,
      extension: name.split('.').pop()?.toLowerCase() || '',
      downloadAccess: true,
    });
  }

  protected onCancelClicked() {
    this.cancel.emit();
  }

  protected onApprove() {
    this.handleAction('Approve');
  }

  protected onReject() {
    this.handleAction('Reject');
  }

  private handleAction(actionStatus: string) {
    this.alertService
      .confirm(
        'Confirmation',
        `Are you sure you want to ${actionStatus.toLowerCase()} this fitness report?`,
        'Yes',
        'No',
      )
      .then((result: any) => {
        if (result.isConfirmed) {
          const id = this.item()?.id;
          if (!id) return;
          this.leaveFitnessStore.action(id).subscribe({
            next: (resp: any) => {
              this.alertService.success('Success', resp).then(() => {
                this.leaveFitnessStore.refreshList();
                this.actionCompleted.emit();
              });
            },
            error: (err: any) => {},
          });
        }
      });
  }
}
