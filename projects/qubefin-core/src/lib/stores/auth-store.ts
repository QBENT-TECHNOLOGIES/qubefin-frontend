import { computed, effect, Injectable, signal } from "@angular/core";
import { StorageTokens } from "../enums/storage-tokens";

@Injectable({
    providedIn: 'root'
})
export class AuthStore {
    private sessionTokenSignal = signal<string | null>(sessionStorage.getItem(StorageTokens.SESSION_TOKEN));
    private accessTokenSignal = signal<string | null>(sessionStorage.getItem(StorageTokens.ACCESS_TOKEN));

    readonly sessionToken = computed(() => this.sessionTokenSignal());
    readonly accessToken = computed(() => this.accessTokenSignal());

    readonly isAuthenticated = computed(() => {
        const accessToken = this.accessTokenSignal();
        return !!accessToken && !this.isAccessTokenExpired(accessToken);
    });

    constructor() {
        effect(() => {
            this.sync(StorageTokens.SESSION_TOKEN, this.sessionTokenSignal());
        });
        effect(() => {
            this.sync(StorageTokens.ACCESS_TOKEN, this.accessTokenSignal());
        });
    }

    setSessionToken = (sessionToken: string | null) => {
        this.sessionTokenSignal.set(sessionToken);
    };
    setAccessToken = (accessToken: string | null) => {
        this.accessTokenSignal.set(accessToken);
    }
    logout = () => {
        this.setSessionToken(null);
        this.setAccessToken(null);
    }

    private sync = (key: string, value: string | null) => {
        if (value) {
            sessionStorage.setItem(key, value);
        } else {
            sessionStorage.removeItem(key);
        }
    }
    private isAccessTokenExpired = (accessToken: string): boolean => {
        try {
            const payload = JSON.parse(atob(accessToken.split('.')[1]));
            const exp = payload.exp;
            const currentTime = Math.floor(Date.now() / 1000);
            return exp < currentTime;
        } catch (error) {
            console.error('Failed to decode access token:', error);
            return true; // Treat as expired if decoding fails
        }
    };
}