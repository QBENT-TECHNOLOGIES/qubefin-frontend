import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { ApiPaths } from 'qubefin-core';

@Injectable({
    providedIn: 'root',
})
export class RoleService {

    httpClient = inject(HttpClient);

    //searchRole()
}
