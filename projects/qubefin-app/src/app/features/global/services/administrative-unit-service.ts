import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { ApiPaths } from 'qubefin-core';
import { Observable } from 'rxjs';
import { AdministrativeUnitBasic } from '../models/administrative-unit-tree-node';
import { AdministrativeUnitRequest } from '../models/administrative-unit-request';


@Injectable({
    providedIn: 'root',
})
export class AdministrativeUnitService {

    httpClient = inject(HttpClient);

    create(administrativeUnit: AdministrativeUnitRequest) {
        return this.httpClient.post(`${ApiPaths.GLOBAL}/administrative-units`, administrativeUnit);
    }

    update(id: string, administrativeUnit: AdministrativeUnitRequest) {
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
                params
            });
    }
}
