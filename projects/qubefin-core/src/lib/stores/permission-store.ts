import { Injectable } from "@angular/core";
import { StorageTokens } from "../enums/storage-tokens";
import { tokenDecoder } from "../heloers/token-decoder";

@Injectable({
    providedIn: 'root'
})
export class PermissionStore {

    private permissions: string[] = [];

    getAuthToken = (): string | null => sessionStorage.getItem(StorageTokens.ACCESS_TOKEN) || '';

    constructor() {
        const token = this.getAuthToken();
        if (token) {
            const decoded = tokenDecoder(token);
            this.permissions = decoded['permission'] || [];
        }
    }

    has(permission: string): boolean {
        return this.permissions.includes(permission);
    }
}