import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { ApiPaths } from 'qubefin-core';
import { IBcGroup } from '../models/bc-group';
import { ICreditOfficer } from '../models/credit-officer';
import {
  IGroupWiseLoan,
  IGroupWiseLoans,
  IGroupWiseLoanSearchParam,
} from '../models/group-wise-loan';
import { ISaveGroupCollectionRequest } from '../models/group-collection';
import { buildGroupWiseLoanQuery } from './group-wise-loan-query';
import { ILoanSearchByText } from '../models/bc-group-collection';

@Injectable({
  providedIn: 'root',
})
export class CreditOfficerService {
  private readonly httpClient = inject(HttpClient);
  private readonly basePath = ApiPaths.COLLECTION;

  getAll() {
    return this.httpClient.get<ICreditOfficer[]>(`${this.basePath}/credit-officers`);
  }

  getGroupsByDesignationId(designationId: string) {
    return this.httpClient.get<IBcGroup[]>(`${this.basePath}/bc-groups/${designationId}`);
  }

  getGroupWiseLoans(search: IGroupWiseLoanSearchParam) {
    return this.httpClient.get<IGroupWiseLoans>(
      `${this.basePath}/bc-group-loans/${search.designationId}?${buildGroupWiseLoanQuery(search)}`,
    );
  }

  saveGroupCollection(request: ISaveGroupCollectionRequest) {
    return this.httpClient.post<string>(`${this.basePath}/save-bc-collection`, request);
  }
  getGroupLoanPaymentDetail(designationId: string, bcGroupId: string, loanId: string) {
    return this.httpClient.get<IGroupWiseLoan>(
      `${this.basePath}/bc-group-loans-payment/${designationId}`,
      { params: { bcGroupId, loanId } },
    );
  }

  searchLoansByText(searchText: string) {
    return this.httpClient.post<ILoanSearchByText[]>(
      `${this.basePath}/employees/search-loan-by-text`,
      null,
      { params: { searchText } },
    );
  }
}
