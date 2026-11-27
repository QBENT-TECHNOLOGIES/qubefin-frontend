import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { ApiPaths } from 'qubefin-core';

@Injectable({
  providedIn: 'root',
})
export class MemberService {
  httpClient = inject(HttpClient);

  getPersonalData(id: string) {
    return this.httpClient.get(`${ApiPaths.GLOBAL}/members/personal-details/${id}`);
  }

  create(personalInfo: any) {
    return this.httpClient.post(`${ApiPaths.GLOBAL}/members`, personalInfo);
  }

  updatePersonalInfo(memberId: string, personalInfo: any) {
    return this.httpClient.put(
      `${ApiPaths.GLOBAL}/members/update/personal/` + memberId,
      personalInfo,
    );
  }
  getGroupsBySearchText(searchText: string) {
    return this.httpClient.post(`${ApiPaths.GLOBAL}/groups/userwise-search-by-text`, {
      searchText,
    });
  }
  getAddressData(id: string) {
    return this.httpClient.get(`${ApiPaths.GLOBAL}/members/addresses/${id}`);
  }

  updateAddressInfo(memberId: string, addresses: any[]) {
    return this.httpClient.put(`${ApiPaths.GLOBAL}/members/addresses/${memberId}`, addresses);
  }
  getKycData(id: string) {
    return this.httpClient.get(`${ApiPaths.GLOBAL}/members/documents/${id}`);
  }

  updateKycInfo(memberId: string, formData: FormData) {
    return this.httpClient.put(`${ApiPaths.GLOBAL}/members/documents/${memberId}`, formData);
  }
}
