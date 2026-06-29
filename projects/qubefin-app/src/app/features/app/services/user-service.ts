import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { ApiPaths } from 'qubefin-core';

@Injectable({
    providedIn: 'root',
})
export class UserService {

    httpClient = inject(HttpClient);

    registerMfa(sessionToken: string) {
        return this.httpClient.post<any>(`${ApiPaths.APP}/register-mfa`, { 'sessionToken': sessionToken });
    }

    enableMfa(sessionToken: string) {
        return this.httpClient.post<any>(`${ApiPaths.APP}/enable-mfa`, { 'sessionToken': sessionToken });
    }

    // changePassword(passwordChangeRequest: PasswordChangeRequest) {
    //     return this.httpClient.post<any>(`${ApiPaths.APP}/change-password`, passwordChangeRequest);
    // }
}
