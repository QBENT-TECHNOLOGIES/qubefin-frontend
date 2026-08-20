import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { ApiPaths } from 'qubefin-core';
import { Observable } from 'rxjs';
import { AdministrativeUnitBasic } from '../models/administrative-unit-tree-node';
import { AdministrativeUnit } from '../models/administrative-unit';

@Injectable({
  providedIn: 'root',
})
export class AdministrativeUnitService {
  httpClient = inject(HttpClient);

  create(administrativeUnit: AdministrativeUnit) {
    return this.httpClient.post(`${ApiPaths.GLOBAL}/administrative-units`, administrativeUnit);
  }

  update(id: string, administrativeUnit: AdministrativeUnit) {
    return this.httpClient.put(`${ApiPaths.GLOBAL}/administrative-units/${id}`, administrativeUnit);
  }

  loadChildren(parentId: string | null): Observable<AdministrativeUnitBasic[]> {
    let params = new HttpParams();
    if (parentId) {
      params = params.set('id', parentId);
    }
    return this.httpClient.get<AdministrativeUnitBasic[]>(
      `${ApiPaths.GLOBAL}/administrative-units/children`,
      {
        params,
      },
    );
  }
  getPoliceStationByDistrict(districtId: string) {
    return this.httpClient.get(
      `${ApiPaths.GLOBAL}/administrative-units/police-stations/${districtId}`,
    );
  }
}
