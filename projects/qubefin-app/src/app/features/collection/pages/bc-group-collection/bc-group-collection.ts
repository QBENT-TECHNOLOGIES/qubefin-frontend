import { Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatAutocompleteModule, MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { DateAdapter, provideNativeDateAdapter } from '@angular/material/core';
import { LucideDynamicIcon } from '@lucide/angular';
import { AlertService } from 'qubefin-core';
import { BcGroupLoanTable } from '../../components/bc-group-loan-table/bc-group-loan-table';
import {
  CollectionGroup,
  GroupLoan,
  LoanAmountChange,
  LoanCollectionStatus,
  LoanPaymentModeChange,
  LoanRemarksChange,
  LoanUtrChange,
} from '../../models/bc-group-collection';
import { IGroupWiseLoan } from '../../models/group-wise-loan';
import { ICreditOfficer, ICreditOfficerBranch } from '../../models/credit-officer';
import { CreditOfficerStore } from '../../stores/credit-officer-store';
import { CreditOfficerService } from '../../services/credit-officer-service';
import { ISaveGroupCollectionRequest } from '../../models/group-collection';

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
    MatAutocompleteModule,
    LucideDynamicIcon,
    BcGroupLoanTable,
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

  // Injecting the store starts the credit officer call, so the list is loading from page load.
  readonly creditOfficers = this.creditOfficerStore.creditOfficers;
  readonly creditOfficersLoading = this.creditOfficerStore.creditOfficersLoading;
  readonly officerGroups = this.creditOfficerStore.groups;
  readonly groupsLoading = this.creditOfficerStore.groupsLoading;
  readonly loansLoading = this.creditOfficerStore.loansLoading;

  // A credit officer is picked by designation id - BC groups and their loans are tagged to the designation.
  designationId = '';
  groupId = '';
  collectionDate: Date | null = new Date();
  searchedCollectionDate = '';

  readonly groups = signal<CollectionGroup[]>([]);
  readonly isSearched = signal<boolean>(false);
  readonly officerSearchText = signal<string>('');
  readonly officerFilterText = signal<string>('');

  readonly officerBranches = computed<ICreditOfficerBranch[]>(() => {
    const searchText = this.officerFilterText().trim().toLowerCase();
    const branches = new Map<string, ICreditOfficer[]>();

    const matchedOfficers = this.creditOfficers().filter((officer) =>
      [officer.employeeName, officer.employeeCode, officer.organizationUnitName, officer.designationName]
        .some((value) => value?.toLowerCase().includes(searchText)),
    );

    for (const officer of matchedOfficers) {
      const branchName = officer.organizationUnitName;
      branches.set(branchName, [...(branches.get(branchName) ?? []), officer]);
    }

    return [...branches.entries()]
      .map(([name, officers]) => ({ name, officers }))
      .sort((first, second) => first.name.localeCompare(second.name));
  });

  readonly totalLoans = computed(() =>
    this.groups().reduce((total, group) => total + group.loans.length, 0),
  );

  readonly totalEmiDue = computed(() =>
    this.allLoans().reduce((total, loan) => total + loan.emiAmount, 0),
  );

  readonly totalCollected = computed(() =>
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
  }

  readonly officerLabel = (officer: ICreditOfficer | null): string => {
    if (!officer) {
      return '';
    }
    const code = officer.employeeCode ? ` (${officer.employeeCode})` : '';
    return `${officer.employeeName}${code} - ${officer.organizationUnitName}`;
  };

  searchOfficers(text: string) {
    this.officerSearchText.set(text);
    this.officerFilterText.set(text);

    if (this.designationId) {
      this.designationId = '';
      this.onCreditOfficerChange();
    }
  }

  selectOfficer(event: MatAutocompleteSelectedEvent) {
    const officer = event.option.value as ICreditOfficer;
    this.designationId = officer.designationId;
    this.officerSearchText.set(this.officerLabel(officer));
    this.officerFilterText.set('');
    this.onCreditOfficerChange();
  }

  getInitials(name: string): string {
    return name
      .split(' ')
      .filter((part) => part)
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join('');
  }

  onCreditOfficerChange() {
    this.groupId = '';
    this.creditOfficerStore.setDesignationId(this.designationId || undefined);
    this.clearSheet();
  }

  search() {
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

  resetFilters() {
    this.officerSearchText.set('');
    this.officerFilterText.set('');
    this.designationId = '';
    this.groupId = '';
    this.collectionDate = new Date();
    this.creditOfficerStore.setDesignationId(undefined);
    this.clearSheet();
  }

  onPaidChange(change: LoanAmountChange) {
    this.updateLoans((loan) => {
      if (loan.loanId !== change.loanId || loan.isLocked) {
        return loan;
      }
      const isShortPaid = change.value < loan.emiAmount;
      return { ...loan, paidAmount: change.value, remarks: isShortPaid ? loan.remarks : '' };
    });
  }

  onRemarksChange(change: LoanRemarksChange) {
    this.updateLoans((loan) =>
      loan.loanId === change.loanId && !loan.isLocked ? { ...loan, remarks: change.value } : loan,
    );
  }

  onPaymentModeChange(change: LoanPaymentModeChange) {
    this.updateLoans((loan) => {
      if (loan.loanId !== change.loanId || loan.isLocked) {
        return loan;
      }
      return { ...loan, paymentMode: change.value, utrNo: change.value === 'UPI' ? loan.utrNo : '' };
    });
  }

  onUtrChange(change: LoanUtrChange) {
    this.updateLoans((loan) =>
      loan.loanId === change.loanId && !loan.isLocked ? { ...loan, utrNo: change.value } : loan,
    );
  }

  saveGroup(groupId: string) {
    const group = this.groups().find((item) => item.id === groupId);
    if (!group || group.isSaved || group.isSaving) {
      return;
    }

    const openLoans = group.loans.filter((loan) => !loan.isLocked);

    if (openLoans.length === 0) {
      this.alertService.error('Oops ....', `All loans of ${group.name} are already collected.`);
      return;
    }

    const hasNegativeAmount = openLoans.some((loan) => loan.paidAmount < 0);
    if (hasNegativeAmount) {
      this.alertService.error('Oops ....', `Paid amount cannot be negative in ${group.name}.`);
      return;
    }

    const missingRemarks = openLoans.filter(
      (loan) => loan.paidAmount < loan.emiAmount && !loan.remarks.trim(),
    ).length;

    if (missingRemarks > 0) {
      this.alertService.error('Oops ....', `Add remarks for ${missingRemarks} short-paid loan(s) in ${group.name}.`);
      return;
    }

    const upiLoans = openLoans.filter((loan) => loan.paymentMode === 'UPI');

    if (upiLoans.some((loan) => loan.paidAmount <= 0)) {
      this.alertService.error('Oops ....', `A UPI collection must be more than 0 in ${group.name}.`);
      return;
    }

    const missingUtr = upiLoans.filter((loan) => !loan.utrNo.trim()).length;
    if (missingUtr > 0) {
      this.alertService.error('Oops ....', `Enter UTR No for ${missingUtr} UPI collection(s) in ${group.name}.`);
      return;
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
