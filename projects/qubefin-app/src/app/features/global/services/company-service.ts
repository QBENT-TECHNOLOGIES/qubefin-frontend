import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { ApiPaths } from 'qubefin-core';

@Injectable({
    providedIn: 'root',
})
export class CompanyService {
    httpClient = inject(HttpClient);
    getAll() {
        return this.httpClient.get(`${ApiPaths.GLOBAL}/companies`);
    }
}
