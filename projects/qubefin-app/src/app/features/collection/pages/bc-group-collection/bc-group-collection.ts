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
  PaymentMode,
} from '../../models/bc-group-collection';
import {
  collectsByUpi,
  isShortPaid,
  validateLoanCollection,
} from '../../models/collection-validation';
import { ISaveGroupCollectionRequest } from '../../models/group-collection';
import { IGroupWiseLoan } from '../../models/group-wise-loan';
import { CreditOfficerService } from '../../services/credit-officer-service';
import { CreditOfficerStore } from '../../stores/credit-officer-store';

// The sheet is not paged on screen; 200 is the server's cap.
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

  // The officer is picked by designation id - groups and loans are tagged to it.
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

  // Rebuilds the sheet when a search lands. Edits live here until the group is saved.
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

    // The root-scoped store outlives this page, so a return visit would otherwise rebuild
    // the sheet from the last search while the filters above it read empty.
    this.creditOfficerStore.setDesignationId(undefined);
    this.creditOfficerStore.clearLoanSearchParam();
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

      // A row that collects nothing has no payment mode.
      const collecting = change.value > 0;

      return {
        ...loan,
        paidAmount: change.value,
        remarks: shortPaid ? loan.remarks : '',
        paymentMode: collecting ? loan.paymentMode : 'CASH',
        utrNo: collecting ? loan.utrNo : '',
      };
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

    // Same rules as the payment page, per row.
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
      loans: openLoans.map((loan) => {
        // The api rejects a UPI collection of 0 and would block the whole group.
        const isUpiCollection = collectsByUpi(loan.paymentMode, loan.paidAmount);

        return {
          loanId: loan.loanId,
          collectionAmount: loan.paidAmount,
          isUpiCollection,
          utrNo: isUpiCollection ? loan.utrNo.trim() : null,
          remarks: loan.remarks.trim() || null,
        };
      }),
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
          loan.isLocked
            ? loan
            : { ...loan, status: this.getStatus(loan.paidAmount, loan.emiAmount), isLocked: true },
        );
        return { ...item, loans, isSaved: true, isSaving: false };
      }),
    );
  }

  // Only loans with an EMI due on the date, grouped in the order the api sent them.
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

      // The demand row carries the EMI; the loan's own EMI is the fallback.
      const emiAmount = loan.collectionEmiAmount ?? loan.emiAmount ?? 0;
      const collectedAmount = loan.collectedAmount ?? 0;
      // A posted row of 0 is still collected: the officer recorded that nothing came in.
      const isAlreadyCollected = loan.isCollected;

      const status: LoanCollectionStatus = isAlreadyCollected
        ? this.getStatus(collectedAmount, emiAmount)
        : 'PENDING';

      // An open row starts on cash. A locked row shows how it was paid - but not when it
      // collected nothing, and not when the total came from several postings of different modes.
      const isSinglePosting = loan.collectionCount <= 1;
      let paymentMode: PaymentMode | null = 'CASH';
      if (isAlreadyCollected) {
        paymentMode =
          collectedAmount > 0 && isSinglePosting ? (loan.isUpiCollection ? 'UPI' : 'CASH') : null;
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
        paymentMode,
        utrNo: isAlreadyCollected && isSinglePosting ? (loan.collectionUtrNo ?? '') : '',
        collectionCount: loan.collectionCount,
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

  // One reading of an amount, whether it was just saved or came back from the api.
  private getStatus(paidAmount: number, emiAmount: number): LoanCollectionStatus {
    if (paidAmount >= emiAmount) {
      return 'PAID';
    }
    if (paidAmount > 0) {
      return 'PARTIAL';
    }
    return 'NOT_PAID';
  }
}
