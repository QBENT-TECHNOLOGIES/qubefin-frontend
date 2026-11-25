import { Component, effect, inject, input, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { LucideDynamicIcon } from '@lucide/angular';
import { AlertService } from 'qubefin-core';
import { BorrowerDecision, IBorrower } from '../../../models/mobilization';
import { MobilizationService } from '../../../services/mobilization-service';
import { MobilizationStore } from '../../../stores/mobilization-store';
import { BorrowerModal } from './borrower-modal';

// Community Mobilization of an Approved Group Survey: the prospective borrowers.
// The survey's Credit Officers add and edit them; the Head of the branch can change Add / Block of flagged ones.
// The server decides who can do what.
@Component({
  selector: 'qfin-mobilization',
  imports: [MatFormFieldModule, MatInputModule, LucideDynamicIcon],
  templateUrl: './mobilization.html',
})
export class Mobilization {
  private readonly store = inject(MobilizationStore);
  private readonly service = inject(MobilizationService);
  private readonly dialog = inject(MatDialog);
  private readonly alertService = inject(AlertService);

  readonly surveyId = input.required<string>();
  readonly data = this.store.mobilization;

  // The Head is changing the decision of this borrower: which one, to what, and why.
  readonly changingId = signal<string | null>(null);
  readonly changeTo = signal<BorrowerDecision>('Block');
  readonly changeReason = signal('');
  readonly saving = signal(false);

  constructor() {
    effect(() => this.store.setSurveyId(this.surveyId()));
  }

  // Rupees with Indian grouping, for example ₹2,60,000.
  protected rupees(amount: number): string {
    return '₹' + new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(amount ?? 0);
  }

  // The first letters of the first two words of the name.
  protected initials(name: string): string {
    return name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('');
  }

  protected statusClass(status: string): string {
    switch (status) {
      case 'Blocked':
      case 'Rejected':
        return 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300';
      case 'Member Created':
        return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300';
      default:
        return 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300';
    }
  }

  protected openBorrower(borrower: IBorrower | null) {
    this.dialog
      .open(BorrowerModal, {
        data: { surveyId: this.surveyId(), borrower },
        width: '900px',
        maxWidth: '95vw',
        panelClass: 'glass-modal',
        disableClose: true,
      })
      .afterClosed()
      .subscribe((saved) => {
        if (saved) this.store.refresh();
      });
  }

  // Head of the branch: open the box to change Add / Block.
  protected startChange(borrower: IBorrower) {
    this.changingId.set(borrower.id);
    this.changeTo.set(borrower.status === 'Blocked' ? 'Add' : 'Block');
    this.changeReason.set('');
  }

  protected cancelChange() {
    this.changingId.set(null);
  }

  protected saveChange() {
    const id = this.changingId();
    const reason = this.changeReason().trim();
    if (!id) return;
    if (!reason) {
      this.alertService.error('Oops ....', 'Give the reason for your decision.');
      return;
    }

    this.alertService
      .confirm('Confirmation', `Do you want to ${this.changeTo() === 'Block' ? 'block' : 'add'} this borrower?`)
      .then((result) => {
        if (!result.isConfirmed) return;
        this.saving.set(true);
        this.service.changeDecision(this.surveyId(), id, { decision: this.changeTo(), reason }).subscribe({
          next: (resp: any) => {
            this.saving.set(false);
            this.changingId.set(null);
            this.store.refresh();
            this.alertService.success('Success', resp);
          },
          error: () => this.saving.set(false),
        });
      });
  }
}
