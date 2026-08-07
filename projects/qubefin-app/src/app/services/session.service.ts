import { Injectable, inject } from '@angular/core';
import { SessionUser } from '../models/session-user';
import { PermissionStore } from 'qubefin-core';

@Injectable({
    providedIn: 'root'
})
export class SessionService {

    private readonly permissionStore = inject(PermissionStore);

    private _sessionUser: SessionUser | null = null;

    get currentUser(): SessionUser | null {

        if (this._sessionUser) {
            return this._sessionUser;
        }

        const token = this.permissionStore.getAuthToken();

        if (!token) {
            return null;
        }

        try {
            const payload = JSON.parse(atob(token.split('.')[1]));

            this._sessionUser = {
                employeeId: payload.EmployeeId,
                userId: payload.UserId
            };

            return this._sessionUser;

        } catch {
            return null;
        }
    }

    get employeeId(): string {
        return this.currentUser?.employeeId ?? '';
    }

    get userId(): string {
        return this.currentUser?.userId ?? '';
    }

    clear(): void {
        this._sessionUser = null;
    }
}