import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { ApiPaths } from 'qubefin-core';
import { IBcGroup } from '../models/bc-group';
import { ICreditOfficer } from '../models/credit-officer';
import { IGroupWiseLoans, IGroupWiseLoanSearchParam } from '../models/group-wise-loan';
import { ISaveGroupCollectionRequest } from '../models/group-collection';
import { buildGroupWiseLoanQuery } from './group-wise-loan-query';

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
}
