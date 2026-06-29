import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { ApiPaths } from "qubefin-core";
import { ValidateLoginRequest } from "../requests/validate-login-request";
import { VerifyMfaRequest } from "../requests/verify-mfa-request";

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    httpClient = inject(HttpClient);

    validateLogin(req: ValidateLoginRequest) {
		return this.httpClient.post<any>(`${ApiPaths.AUTH}/validate-login`, req);
	}

	verifyMfa(req: VerifyMfaRequest) {
		return this.httpClient.post<any>(`${ApiPaths.AUTH}/verify-mfa`, req);
	}
}