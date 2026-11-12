import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { form, FormField, required, schema, Schema, validate } from '@angular/forms/signals';
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
import { catchError, debounceTime, finalize, of, Subject, switchMap } from 'rxjs';
import { AlertService } from 'qubefin-core';
import { CreditOfficerPicker } from '../../components/credit-officer-picker/credit-officer-picker';
import { PaymentMode } from '../../models/bc-group-collection';
import {
  COLLECTION_MESSAGES,
  isMissingUtr,
  isNotPositiveAmount,
  isShortPaid,
} from '../../models/collection-validation';
import { ISaveGroupCollectionRequest } from '../../models/group-collection';
import { IGroupWiseLoan } from '../../models/group-wise-loan';
import { ILoanSearchByText } from '../../models/loan-search';
import { CreditOfficerService } from '../../services/credit-officer-service';
import { CreditOfficerStore } from '../../stores/credit-officer-store';

// Scoped to one officer and group, so an empty text safely lists the whole group.
interface ILoanSearchRequest {
  designationId: string;
  bcGroupId: string;
  searchText: string;
}

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
    CreditOfficerPicker,
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

  protected readonly officerGroups = this.creditOfficerStore.groups;
  protected readonly groupsLoading = this.creditOfficerStore.groupsLoading;

  protected designationId = '';
  protected groupId = '';

  protected readonly loanOptions = signal<ILoanSearchByText[]>([]);
  protected readonly loanSearchText = signal<string>('');
  protected readonly loanSearching = signal<boolean>(false);
  protected readonly selectedLoan = signal<ILoanSearchByText | null>(null);
  private readonly loanSearch$ = new Subject<ILoanSearchRequest | null>();

  protected readonly loan = signal<IGroupWiseLoan | null>(null);
  protected readonly detailLoading = signal<boolean>(false);
  protected readonly saving = signal<boolean>(false);

  private searched: { designationId: string; bcGroupId: string } | null = null;

  protected readonly payModel = signal<IPaymentForm>(this.emptyPayment());

  protected readonly emiAmount = computed(() => this.loan()?.emiAmount ?? 0);

  protected readonly isUpi = computed(() => this.payModel().paymentMode === 'UPI');

  protected readonly isShortPaid = computed(() =>
    isShortPaid(this.payModel().paidAmount, this.emiAmount()),
  );

  // The only place the payment rules are enforced; save() just refuses an invalid form.
  private readonly paymentSchema: Schema<IPaymentForm> = schema((path) => {
    required(path.collectionDate, { message: COLLECTION_MESSAGES.collectionDateRequired });
    required(path.paidAmount, { message: COLLECTION_MESSAGES.paidAmountRequired });

    // Every payment here is a real amount, so > 0 covers negatives and UPI at once.
    validate(path.paidAmount, ({ value }) =>
      isNotPositiveAmount(value())
        ? { kind: 'amountNotPositive', message: COLLECTION_MESSAGES.paidAmountNotPositive }
        : null,
    );

    validate(path.utrNo, ({ value }) =>
      isMissingUtr(this.payModel().paymentMode, this.payModel().paidAmount, value())
        ? { kind: 'utrRequired', message: COLLECTION_MESSAGES.utrRequired }
        : null,
    );

    // Remarks are optional here; only the group sheet requires them on a short payment.
  });

  protected readonly payForm = form(this.payModel, this.paymentSchema);

  constructor() {
    this.dateAdapter.setLocale('en-GB');

    // The root-scoped store is shared with the group sheet.
    this.creditOfficerStore.setDesignationId(undefined);

    this.loanSearch$
      .pipe(
        debounceTime(250),
        switchMap((query) =>
          query
            ? this.creditOfficerService
                .searchGroupLoans(query.designationId, query.bcGroupId, query.searchText)
                .pipe(catchError(() => of([] as ILoanSearchByText[])))
            : of([] as ILoanSearchByText[]),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((loans) => {
        this.loanOptions.set(loans ?? []);
        this.loanSearching.set(false);
      });
  }

  protected onCreditOfficerChange(designationId: string) {
    this.designationId = designationId;
    this.groupId = '';
    this.creditOfficerStore.setDesignationId(designationId || undefined);
    this.resetLoanSelection();
  }

  protected readonly loanLabel = (loan: ILoanSearchByText | string | null): string => {
    if (!loan) {
      return '';
    }
    if (typeof loan === 'string') {
      return loan;
    }
    return loan.memberName ? `${loan.loanNo} (${loan.memberName})` : loan.loanNo;
  };

  protected canSearchLoans(): boolean {
    return !!this.designationId && !!this.groupId;
  }

  protected onGroupChange() {
    this.resetLoanSelection();
    this.loadLoanOptions('');
  }

  protected searchLoans(text: string) {
    this.loanSearchText.set(text);

    if (this.selectedLoan()) {
      this.selectedLoan.set(null);
      this.clearDetail();
    }

    // The box shows 'loanNo (member)'; only the loan no is searched on.
    this.loadLoanOptions(text.split('(')[0].trim());
  }

  private loadLoanOptions(searchText: string) {
    if (!this.canSearchLoans()) {
      this.loanOptions.set([]);
      this.loanSearching.set(false);
      this.loanSearch$.next(null);
      return;
    }

    this.loanSearching.set(true);
    this.loanSearch$.next({
      designationId: this.designationId,
      bcGroupId: this.groupId,
      searchText,
    });
  }

  private resetLoanSelection() {
    this.loanSearchText.set('');
    this.loanOptions.set([]);
    this.loanSearching.set(false);
    this.selectedLoan.set(null);
    this.loanSearch$.next(null);
    this.clearDetail();
  }

  protected selectLoan(event: MatAutocompleteSelectedEvent) {
    const loan = event.option.value as ILoanSearchByText;
    this.selectedLoan.set(loan);
    this.loanSearchText.set(this.loanLabel(loan));
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

    this.searched = { designationId: this.designationId, bcGroupId: this.groupId };

    this.loadDetail(loan.id);
  }

  protected resetFilters() {
    this.designationId = '';
    this.groupId = '';
    this.creditOfficerStore.setDesignationId(undefined);
    this.resetLoanSelection();
  }

  // Any filter edit makes the loan on screen stale.
  private clearDetail() {
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
      .getGroupLoanPaymentDetail(loanId)
      .pipe(finalize(() => this.detailLoading.set(false)))
      .subscribe({
        next: (loan) => {
          this.loan.set(loan);
          this.payModel.set({
            collectionDate: this.payModel().collectionDate ?? new Date(),
            // Never pre-filled from the EMI; the amount collected is always typed in.
            paidAmount: null,
            paymentMode: 'CASH',
            utrNo: '',
            remarks: '',
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
        // The http error interceptor already showed the message.
        error: () => undefined,
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
