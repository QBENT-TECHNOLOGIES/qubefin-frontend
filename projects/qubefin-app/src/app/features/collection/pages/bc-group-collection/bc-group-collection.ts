import { Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { DateAdapter, provideNativeDateAdapter } from '@angular/material/core';
import { LucideDynamicIcon } from '@lucide/angular';
import { AlertService } from 'qubefin-core';
import { BcGroupLoanTable } from '../../components/bc-group-loan-table/bc-group-loan-table';
import { CreditOfficerPicker } from '../../components/credit-officer-picker/credit-officer-picker';
import {
  CollectionGroup,
  GroupLoan,
  LoanAmountChange,
  LoanCollectionStatus,
  LoanPaymentModeChange,
  LoanRemarksChange,
  LoanUtrChange,
} from '../../models/bc-group-collection';
import { isShortPaid, validateLoanCollection } from '../../models/collection-validation';
import { ISaveGroupCollectionRequest } from '../../models/group-collection';
import { IGroupWiseLoan } from '../../models/group-wise-loan';
import { CreditOfficerService } from '../../services/credit-officer-service';
import { CreditOfficerStore } from '../../stores/credit-officer-store';

// The sheet is not paged on screen, so one page covers a credit officer's groups. 200 is the server's cap.
const LOAN_PAGE_SIZE = 200;

@Component({
  selector: 'qfin-bc-group-collection',
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    LucideDynamicIcon,
    BcGroupLoanTable,
    CreditOfficerPicker,
  ],
  providers: [provideNativeDateAdapter(), DatePipe],
  templateUrl: './bc-group-collection.html',
  styles: ``,
})
export class BcGroupCollection {
  private readonly alertService = inject(AlertService);
  private readonly creditOfficerStore = inject(CreditOfficerStore);
  private readonly creditOfficerService = inject(CreditOfficerService);
  private readonly dateAdapter = inject(DateAdapter<Date>);
  private readonly datePipe = inject(DatePipe);

  protected readonly officerGroups = this.creditOfficerStore.groups;
  protected readonly groupsLoading = this.creditOfficerStore.groupsLoading;
  protected readonly loansLoading = this.creditOfficerStore.loansLoading;

  // A credit officer is picked by designation id - BC groups and their loans are tagged to the designation.
  protected designationId = '';
  protected groupId = '';
  protected collectionDate: Date | null = new Date();
  private searchedCollectionDate = '';

  protected readonly groups = signal<CollectionGroup[]>([]);
  protected readonly isSearched = signal<boolean>(false);

  protected readonly totalLoans = computed(() =>
    this.groups().reduce((total, group) => total + group.loans.length, 0),
  );

  protected readonly totalEmiDue = computed(() =>
    this.allLoans().reduce((total, loan) => total + loan.emiAmount, 0),
  );

  protected readonly totalCollected = computed(() =>
    this.allLoans().reduce((total, loan) => total + loan.paidAmount, 0),
  );

  // The loans of a search land on the store's resource, so the editable sheet is rebuilt whenever one lands.
  // Edits made on screen live in this.groups until each group is saved.
  private readonly loadSheet = effect(() => {
    const loans = this.creditOfficerStore.loans();

    if (!this.creditOfficerStore.hasLoanSearch() || this.creditOfficerStore.loansLoading()) {
      return;
    }

    if (this.creditOfficerStore.loansError()) {
      this.groups.set([]);
      this.isSearched.set(false);
      return;
    }

    this.groups.set(this.toCollectionGroups(loans));
    this.isSearched.set(true);
  });

  constructor() {
    this.dateAdapter.setLocale('en-GB');

    // The store is root scoped and shared with the payment page, so each page starts with no officer.
    this.creditOfficerStore.setDesignationId(undefined);
  }

  protected onCreditOfficerChange(designationId: string) {
    this.designationId = designationId;
    this.groupId = '';
    this.creditOfficerStore.setDesignationId(designationId || undefined);
    this.clearSheet();
  }

  protected search() {
    if (!this.designationId || !this.collectionDate) {
      this.alertService.error('Oops ....', 'Select credit officer and collection date.');
      return;
    }

    this.searchedCollectionDate = this.datePipe.transform(this.collectionDate, 'yyyy-MM-dd') ?? '';

    this.creditOfficerStore.setLoanSearchParam({
      designationId: this.designationId,
      collectionDate: this.searchedCollectionDate,
      bcGroupId: this.groupId || null,
      searchText: null,
      // A collection sheet is for running loans.
      isClosed: false,
      sortOn: '',
      sortDirection: '',
      pageIndex: 0,
      pageSize: LOAN_PAGE_SIZE,
    });
    this.creditOfficerStore.refreshLoans();
  }

  protected resetFilters() {
    this.designationId = '';
    this.groupId = '';
    this.collectionDate = new Date();
    this.creditOfficerStore.setDesignationId(undefined);
    this.clearSheet();
  }

  protected onPaidChange(change: LoanAmountChange) {
    this.updateLoans((loan) => {
      if (loan.loanId !== change.loanId || loan.isLocked) {
        return loan;
      }
      const shortPaid = isShortPaid(change.value, loan.emiAmount);
      return { ...loan, paidAmount: change.value, remarks: shortPaid ? loan.remarks : '' };
    });
  }

  protected onRemarksChange(change: LoanRemarksChange) {
    this.updateLoans((loan) =>
      loan.loanId === change.loanId && !loan.isLocked ? { ...loan, remarks: change.value } : loan,
    );
  }

  protected onPaymentModeChange(change: LoanPaymentModeChange) {
    this.updateLoans((loan) => {
      if (loan.loanId !== change.loanId || loan.isLocked) {
        return loan;
      }
      const utrNo = change.value === 'UPI' ? loan.utrNo : '';
      return { ...loan, paymentMode: change.value, utrNo };
    });
  }

  protected onUtrChange(change: LoanUtrChange) {
    this.updateLoans((loan) =>
      loan.loanId === change.loanId && !loan.isLocked ? { ...loan, utrNo: change.value } : loan,
    );
  }

  protected saveGroup(groupId: string) {
    const group = this.groups().find((item) => item.id === groupId);
    if (!group || group.isSaved || group.isSaving) {
      return;
    }

    const openLoans = group.loans.filter((loan) => !loan.isLocked);

    if (openLoans.length === 0) {
      this.alertService.error('Oops ....', `All loans of ${group.name} are already collected.`);
      return;
    }

    // Same rules the payment page's form schema enforces, applied row by row.
    for (const loan of openLoans) {
      const error = validateLoanCollection(loan);

      if (error) {
        this.alertService.error('Oops ....', `${error} - ${loan.loanNo} in ${group.name}.`);
        return;
      }
    }

    const request: ISaveGroupCollectionRequest = {
      designationId: group.creditOfficerId,
      bcGroupId: groupId,
      collectionDate: this.searchedCollectionDate,
      loans: openLoans.map((loan) => ({
        loanId: loan.loanId,
        collectionAmount: loan.paidAmount,
        isUpiCollection: loan.paymentMode === 'UPI',
        utrNo: loan.paymentMode === 'UPI' ? loan.utrNo.trim() : null,
        remarks: loan.remarks.trim() || null,
      })),
    };

    this.setGroupSaving(groupId, true);

    this.creditOfficerService.saveGroupCollection(request).subscribe({
      next: (message) => {
        this.markGroupSaved(groupId);
        this.alertService.success('Saved', message || `${group.name} collection saved.`);
      },
      error: () => {
        this.setGroupSaving(groupId, false);
      },
    });
  }

  private setGroupSaving(groupId: string, isSaving: boolean) {
    this.groups.update((groups) =>
      groups.map((item) => (item.id === groupId ? { ...item, isSaving } : item)),
    );
  }

  private markGroupSaved(groupId: string) {
    this.groups.update((groups) =>
      groups.map((item) => {
        if (item.id !== groupId) {
          return item;
        }
        const loans = item.loans.map((loan) =>
          loan.isLocked ? loan : { ...loan, status: this.getStatus(loan), isLocked: true },
        );
        return { ...item, loans, isSaved: true, isSaving: false };
      }),
    );
  }

  // One row per loan comes back; only loans with an EMI due on the collection date are shown, under their
  // BC group, in the order the api sent them.
  private toCollectionGroups(loans: IGroupWiseLoan[]): CollectionGroup[] {
    const groupsByBcGroupId = new Map<string, CollectionGroup>();

    const demandLoans = loans.filter((loan) => loan.isDemandDate);

    for (const loan of demandLoans) {
      let group = groupsByBcGroupId.get(loan.bcGroupId);

      if (!group) {
        group = {
          id: loan.bcGroupId,
          name: `${loan.groupCode} - ${loan.groupName}`,
          creditOfficerId: this.designationId,
          loans: [],
          isSaved: false,
          isSaving: false,
        };
        groupsByBcGroupId.set(loan.bcGroupId, group);
      }

      // The demand row of the collection date carries the EMI; the loan's own EMI is the fallback when the
      // sheet for that date has not been raised yet.
      const emiAmount = loan.collectionEmiAmount ?? loan.emiAmount ?? 0;
      const collectedAmount = loan.collectedAmount ?? 0;
      const isAlreadyCollected = loan.isCollected && collectedAmount > 0;

      let status: LoanCollectionStatus = 'PENDING';
      if (isAlreadyCollected) {
        status = collectedAmount >= emiAmount ? 'PAID' : 'PARTIAL';
      }

      group.loans.push({
        loanId: loan.id,
        loanNo: loan.loanNo,
        memberName: loan.memberName,
        loanAmount: loan.loanAmount ?? 0,
        outstanding: loan.currentOutstandingAmount ?? 0,
        overdue: loan.overdueAmount ?? 0,
        emiAmount,
        paidAmount: isAlreadyCollected ? collectedAmount : emiAmount,
        remarks: loan.collectionRemarks ?? '',
        paymentMode: isAlreadyCollected ? null : 'CASH',
        utrNo: '',
        status,
        isLocked: isAlreadyCollected,
      });
    }

    return [...groupsByBcGroupId.values()];
  }

  private clearSheet() {
    this.creditOfficerStore.clearLoanSearchParam();
    this.groups.set([]);
    this.isSearched.set(false);
  }

  private allLoans(): GroupLoan[] {
    return this.groups().flatMap((group) => group.loans);
  }

  private updateLoans(change: (loan: GroupLoan) => GroupLoan) {
    this.groups.update((groups) =>
      groups.map((group) => ({ ...group, loans: group.loans.map(change) })),
    );
  }

  private getStatus(loan: GroupLoan): LoanCollectionStatus {
    if (loan.paidAmount >= loan.emiAmount) {
      return 'PAID';
    }
    if (loan.paidAmount > 0) {
      return 'PARTIAL';
    }
    return 'NOT_PAID';
  }
}
