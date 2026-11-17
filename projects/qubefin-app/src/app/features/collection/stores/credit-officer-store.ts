import { httpResource } from '@angular/common/http';
import { computed, Injectable, signal } from '@angular/core';
import { ApiPaths, EMPTY_UUID } from 'qubefin-core';
import { IBcGroup } from '../models/bc-group';
import { ICreditOfficer } from '../models/credit-officer';
import {
  IGroupWiseLoan,
  IGroupWiseLoans,
  IGroupWiseLoanSearchParam,
} from '../models/group-wise-loan';
import { buildGroupWiseLoanQuery } from '../services/group-wise-loan-query';

@Injectable({
  providedIn: 'root',
})
export class CreditOfficerStore {
  private readonly basePath = ApiPaths.COLLECTION;

  // Groups are tagged to the designation, not the employee.
  private readonly designationId = signal<string | undefined>(undefined);
  private readonly loanSearchParam = signal<IGroupWiseLoanSearchParam | undefined>(undefined);

  // Loads as soon as the store is injected.
  private readonly creditOfficersResource = httpResource<ICreditOfficer[]>(() => {
    return `${this.basePath}/credit-officers`;
  });

  readonly creditOfficers = computed<ICreditOfficer[]>(() =>
    this.creditOfficersResource.hasValue() ? this.creditOfficersResource.value() : [],
  );

  readonly creditOfficersLoading = computed(() => this.creditOfficersResource.isLoading());
  readonly creditOfficersError = computed(() => this.creditOfficersResource.error());

  private readonly groupsResource = httpResource<IBcGroup[]>(() => {
    const id = this.designationId();

    return id && id !== EMPTY_UUID ? `${this.basePath}/bc-groups/${id}` : undefined;
  });

  readonly groups = computed<IBcGroup[]>(() =>
    this.groupsResource.hasValue() ? this.groupsResource.value() : [],
  );

  readonly groupsLoading = computed(() => this.groupsResource.isLoading());
  readonly groupsError = computed(() => this.groupsResource.error());

  readonly selectedDesignationId = computed(() => this.designationId());

  // Officer, optional group and date all filter this one call.
  private readonly loansResource = httpResource<IGroupWiseLoans>(() => {
    const search = this.loanSearchParam();
    if (!search?.designationId || search.designationId === EMPTY_UUID) return undefined;
    if (!search.collectionDate) return undefined;

    return `${this.basePath}/bc-group-loans/${search.designationId}?${buildGroupWiseLoanQuery(search)}`;
  });

  readonly loans = computed<IGroupWiseLoan[]>(() =>
    this.loansResource.hasValue() ? this.loansResource.value().loans ?? [] : [],
  );
  readonly loansTotalRecords = computed(() =>
    this.loansResource.hasValue() ? this.loansResource.value().totalRecords : 0,
  );
  readonly loansLoading = computed(() => this.loansResource.isLoading());
  readonly loansError = computed(() => this.loansResource.error());
  readonly hasLoanSearch = computed(() => this.loanSearchParam() !== undefined);

  setDesignationId(id: string | undefined) {
    if (this.designationId() !== id) {
      this.designationId.set(id);
    }
  }

  setLoanSearchParam(search: IGroupWiseLoanSearchParam) {
    this.loanSearchParam.set({ ...search });
  }

  clearLoanSearchParam() {
    this.loanSearchParam.set(undefined);
  }

  refreshCreditOfficers() {
    this.creditOfficersResource.reload();
  }

  refreshGroups() {
    this.groupsResource.reload();
  }

  refreshLoans() {
    this.loansResource.reload();
  }
}
