import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { ApiPaths } from 'qubefin-core';
import { Observable } from 'rxjs';
import { OrganizationUnitBasic } from '../models/organization-unit-tree-node';
import { OrganizationUnit } from '../models/organization-unit';

@Injectable({
  providedIn: 'root',
})
export class OrganizationUnitService {
  httpClient = inject(HttpClient);

  create(organizationUnit: OrganizationUnit) {
    return this.httpClient.post(`${ApiPaths.GLOBAL}/organization-units`, organizationUnit);
  }

  update(id: string, organizationUnit: OrganizationUnit) {
    return this.httpClient.put(`${ApiPaths.GLOBAL}/organization-units/${id}`, organizationUnit);
  }

  loadChildren(parentId: string | null): Observable<OrganizationUnitBasic[]> {
    let params = new HttpParams();
    if (parentId) {
      params = params.set('id', parentId);
    }
    return this.httpClient.get<OrganizationUnitBasic[]>(
      `${ApiPaths.GLOBAL}/organization-units/children`,
      {
        params,
      },
    );
  }
  getOrganizationUnitByType(id: string) {
    return this.httpClient.get(`${ApiPaths.GLOBAL}/organization-units/${id}/types`);
  }
}
