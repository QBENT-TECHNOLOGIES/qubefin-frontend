import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { form, FormField, min, required, schema, Schema } from '@angular/forms/signals';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import {
  MatAutocompleteModule,
  MatAutocompleteSelectedEvent,
} from '@angular/material/autocomplete';
import { DateAdapter, provideNativeDateAdapter } from '@angular/material/core';
import { LucideDynamicIcon } from '@lucide/angular';
import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  finalize,
  of,
  Subject,
  switchMap,
} from 'rxjs';
import { AlertService } from 'qubefin-core';
import { IGroupWiseLoan } from '../../models/group-wise-loan';
import { ICreditOfficer, ICreditOfficerBranch } from '../../models/credit-officer';
import { ILoanSearchByText } from '../../models/bc-group-collection';
import { ISaveGroupCollectionRequest } from '../../models/group-collection';
import { CreditOfficerStore } from '../../stores/credit-officer-store';
import { CreditOfficerService } from '../../services/credit-officer-service';

// The loan search returns every running loan that matches, so wait for a few characters before calling it.
const LOAN_SEARCH_MIN_LENGTH = 3;

type PaymentMode = 'CASH' | 'UPI';
interface IPaymentForm {
  collectionDate: Date | null;
  paidAmount: number | null;
  paymentMode: PaymentMode;
  utrNo: string;
  remarks: string;
}

@Component({
  selector: 'qfin-bc-payment-collection',
  imports: [
    CommonModule,
    FormsModule,
    FormField,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatAutocompleteModule,
    LucideDynamicIcon,
  ],
  providers: [provideNativeDateAdapter(), DatePipe],
  templateUrl: './bc-payment-collection.html',
  styles: ``,
})
export class BcPaymentCollection {
  private readonly alertService = inject(AlertService);
  private readonly creditOfficerStore = inject(CreditOfficerStore);
  private readonly creditOfficerService = inject(CreditOfficerService);
  private readonly dateAdapter = inject(DateAdapter<Date>);
  private readonly datePipe = inject(DatePipe);

  protected readonly creditOfficers = this.creditOfficerStore.creditOfficers;
  protected readonly creditOfficersLoading = this.creditOfficerStore.creditOfficersLoading;
  protected readonly officerGroups = this.creditOfficerStore.groups;
  protected readonly groupsLoading = this.creditOfficerStore.groupsLoading;

  protected designationId = '';
  protected groupId = '';

  protected readonly officerSearchText = signal<string>('');
  protected readonly officerFilterText = signal<string>('');

  protected readonly officerBranches = computed<ICreditOfficerBranch[]>(() => {
    const searchText = this.officerFilterText().trim().toLowerCase();
    const branches = new Map<string, ICreditOfficer[]>();

    const matchedOfficers = this.creditOfficers().filter((officer) =>
      [
        officer.employeeName,
        officer.employeeCode,
        officer.organizationUnitName,
        officer.designationName,
      ].some((value) => value?.toLowerCase().includes(searchText)),
    );

    for (const officer of matchedOfficers) {
      const branchName = officer.organizationUnitName;
      branches.set(branchName, [...(branches.get(branchName) ?? []), officer]);
    }

    return [...branches.entries()]
      .map(([name, officers]) => ({ name, officers }))
      .sort((first, second) => first.name.localeCompare(second.name));
  });

  protected readonly loanOptions = signal<ILoanSearchByText[]>([]);
  protected readonly loanSearchText = signal<string>('');
  protected readonly loanSearching = signal<boolean>(false);
  protected readonly selectedLoan = signal<ILoanSearchByText | null>(null);
  private readonly loanSearch$ = new Subject<string>();

  protected readonly loan = signal<IGroupWiseLoan | null>(null);
  protected readonly detailLoading = signal<boolean>(false);
  protected readonly saving = signal<boolean>(false);

  private searched: { designationId: string; bcGroupId: string } | null = null;

  protected readonly payModel = signal<IPaymentForm>(this.emptyPayment());

  protected readonly emiAmount = computed(() => {
    const loan = this.loan();
    return loan ? (loan.collectionEmiAmount ?? loan.emiAmount ?? 0) : 0;
  });

  protected readonly isUpi = computed(() => this.payModel().paymentMode === 'UPI');

  protected readonly isShortPaid = computed(() => {
    const paid = this.payModel().paidAmount;
    return paid !== null && paid < this.emiAmount();
  });

  private readonly paymentSchema: Schema<IPaymentForm> = schema((path) => {
    required(path.utrNo, { message: 'UTR NO  is required', when: () => this.isUpi() });
    required(path.collectionDate, { message: 'Collection date is required' });
    required(path.paidAmount, { message: 'Paid amount is required' });
    min(path.paidAmount, 0, { message: 'Paid amount cannot be negative' });
    required(path.remarks, {
      message: 'Remarks are required when paid amount is less than EMI',
      when: () => this.isShortPaid(),
    });
  });

  protected readonly payForm = form(this.payModel, this.paymentSchema);

  constructor() {
    this.dateAdapter.setLocale('en-GB');

    this.creditOfficerStore.setDesignationId(undefined);

    this.loanSearch$
      .pipe(
        debounceTime(250),
        distinctUntilChanged(),
        switchMap((text) =>
          this.creditOfficerService
            .searchLoansByText(text)
            .pipe(catchError(() => of([] as ILoanSearchByText[]))),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((loans) => {
        this.loanOptions.set(loans ?? []);
        this.loanSearching.set(false);
      });
  }

  protected readonly officerLabel = (officer: ICreditOfficer | null): string => {
    if (!officer) {
      return '';
    }
    const code = officer.employeeCode ? ` (${officer.employeeCode})` : '';
    return `${officer.employeeName}${code} - ${officer.organizationUnitName}`;
  };

  protected searchOfficers(text: string) {
    this.officerSearchText.set(text);
    this.officerFilterText.set(text);

    if (this.designationId) {
      this.designationId = '';
      this.onCreditOfficerChange();
    }
  }

  protected selectOfficer(event: MatAutocompleteSelectedEvent) {
    const officer = event.option.value as ICreditOfficer;
    this.designationId = officer.designationId;
    this.officerSearchText.set(this.officerLabel(officer));
    this.officerFilterText.set('');
    this.onCreditOfficerChange();
  }

  protected getInitials(name: string): string {
    return name
      .split(' ')
      .filter((part) => part)
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join('');
  }

  private onCreditOfficerChange() {
    this.groupId = '';
    this.creditOfficerStore.setDesignationId(this.designationId || undefined);
    this.clearDetail();
  }

  protected readonly loanLabel = (loan: ILoanSearchByText | string | null): string => {
    if (!loan) {
      return '';
    }
    return typeof loan === 'string' ? loan : loan.loanNo;
  };

  protected searchLoans(text: string) {
    this.loanSearchText.set(text);

    if (this.selectedLoan()) {
      this.selectedLoan.set(null);
      this.clearDetail();
    }

    const searchText = text.trim();
    if (searchText.length < LOAN_SEARCH_MIN_LENGTH) {
      this.loanOptions.set([]);
      this.loanSearching.set(false);
      return;
    }

    this.loanSearching.set(true);
    this.loanSearch$.next(searchText);
  }

  protected selectLoan(event: MatAutocompleteSelectedEvent) {
    const loan = event.option.value as ILoanSearchByText;
    this.selectedLoan.set(loan);
    this.loanSearchText.set(loan.loanNo);
    this.clearDetail();
  }

  protected search() {
    const loan = this.selectedLoan();
    if (!this.designationId) {
      this.alertService.error('Oops ....', 'Select Credit officer');
      return;
    }
    if (!this.groupId) {
      this.alertService.error('Oops ....', 'Select Group');
      return;
    }
    if (!loan) {
      this.alertService.error('Oops ....', 'Select Loan No');
      return;
    }
    // if (!this.designationId || !this.groupId || !loan) {
    //   this.alertService.error('Oops ....', 'Select credit officer, group and loan.');
    //   return;
    // }

    this.searched = { designationId: this.designationId, bcGroupId: this.groupId };

    this.loadDetail(loan.id);
  }

  protected resetFilters() {
    this.officerSearchText.set('');
    this.officerFilterText.set('');
    this.designationId = '';
    this.groupId = '';
    this.loanSearchText.set('');
    this.loanOptions.set([]);
    this.selectedLoan.set(null);
    this.creditOfficerStore.setDesignationId(undefined);
    this.clearDetail();
  }

  // Any filter edit makes the loan on screen stale, so it is cleared until the next search.
  protected clearDetail() {
    this.loan.set(null);
    this.searched = null;
    this.payModel.set(this.emptyPayment());
  }

  private loadDetail(loanId: string) {
    const searched = this.searched;
    if (!searched) {
      return;
    }

    this.detailLoading.set(true);

    this.creditOfficerService
      .getGroupLoanPaymentDetail(searched.designationId, searched.bcGroupId, loanId)
      .pipe(finalize(() => this.detailLoading.set(false)))
      .subscribe({
        next: (loan) => {
          this.loan.set(loan);
          this.payModel.set({
            collectionDate: this.payModel().collectionDate ?? new Date(),
            paidAmount: loan.collectionEmiAmount ?? loan.emiAmount ?? 0,
            paymentMode: 'CASH',
            utrNo: '',
            remarks: loan.collectionRemarks ?? '',
          });
        },
        error: () => this.loan.set(null),
      });
  }

  protected setPaymentMode(mode: PaymentMode) {
    this.payModel.update((state) => ({
      ...state,
      paymentMode: mode,
      utrNo: mode === 'UPI' ? state.utrNo : '',
    }));
  }

  protected save() {
    const loan = this.loan();
    const searched = this.searched;

    if (!loan || !searched || this.saving()) {
      return;
    }

    this.payForm().markAsTouched();
    if (this.payForm().invalid()) {
      return;
    }

    const { collectionDate, paidAmount, paymentMode, utrNo, remarks } = this.payForm().value();

    if (paidAmount === null || !collectionDate) {
      return;
    }

    if (paidAmount < this.emiAmount() && !remarks.trim()) {
      this.alertService.error('Oops ....', 'Add remarks for a short-paid loan.');
      return;
    }

    if (paymentMode === 'UPI') {
      if (paidAmount <= 0) {
        this.alertService.error('Oops ....', 'A UPI collection must be more than 0.');
        return;
      }
      if (!utrNo.trim()) {
        this.alertService.error('Oops ....', 'Enter UTR No for the UPI collection.');
        return;
      }
    }

    const request: ISaveGroupCollectionRequest = {
      designationId: searched.designationId,
      bcGroupId: searched.bcGroupId,
      collectionDate: this.datePipe.transform(collectionDate, 'yyyy-MM-dd') ?? '',
      loans: [
        {
          loanId: loan.id,
          collectionAmount: paidAmount,
          isUpiCollection: paymentMode === 'UPI',
          utrNo: paymentMode === 'UPI' ? utrNo.trim() : null,
          remarks: remarks.trim() || null,
        },
      ],
    };

    this.saving.set(true);

    this.creditOfficerService
      .saveGroupCollection(request)
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: (message) => {
          this.alertService.success('Saved', message || `Collection saved for ${loan.loanNo}.`);
          this.loadDetail(loan.id);
        },
        error: () => {},
      });
  }

  private emptyPayment(): IPaymentForm {
    return {
      collectionDate: new Date(),
      paidAmount: null,
      paymentMode: 'CASH',
      utrNo: '',
      remarks: '',
    };
  }
}
