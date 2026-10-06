import { computed, effect, inject, Injectable, signal } from "@angular/core";
import { StorageTokens } from "../enums/storage-tokens";
import { LoginStateStore } from "./login-state-store";

@Injectable({
    providedIn: 'root'
})
export class AuthStore {
    private sessionTokenSignal = signal<string | null>(sessionStorage.getItem(StorageTokens.SESSION_TOKEN));
    private accessTokenSignal = signal<string | null>(sessionStorage.getItem(StorageTokens.ACCESS_TOKEN));
    private refreshTokenSignal = signal<string | null>(sessionStorage.getItem(StorageTokens.REFRESH_TOKEN));

    readonly sessionToken = computed(() => this.sessionTokenSignal());
    readonly accessToken = computed(() => this.accessTokenSignal());
    readonly refreshToken = computed(() => this.refreshTokenSignal());

    readonly isAuthenticated = computed(() => {
        const accessToken = this.accessTokenSignal();
        if (!accessToken) {
            return false;
        }
        // An expired access token is still a live session while a refresh token can renew it;
        // the refresh interceptor does the renewal when the API rejects the old token.
        return !this.isAccessTokenExpired(accessToken) || !!this.refreshTokenSignal();
    });

    loginStateStore = inject(LoginStateStore);

    constructor() {
        effect(() => {
            this.sync(StorageTokens.SESSION_TOKEN, this.sessionTokenSignal());
        });
        effect(() => {
            this.sync(StorageTokens.ACCESS_TOKEN, this.accessTokenSignal());
        });
        effect(() => {
            this.sync(StorageTokens.REFRESH_TOKEN, this.refreshTokenSignal());
        });
    }

    setSessionToken = (sessionToken: string | null) => {
        this.sessionTokenSignal.set(sessionToken);
    };
    setAccessToken = (accessToken: string | null) => {
        this.accessTokenSignal.set(accessToken);
    }
    setRefreshToken = (refreshToken: string | null) => {
        this.refreshTokenSignal.set(refreshToken);
    }
    logout = () => {
        this.setSessionToken(null);
        this.setAccessToken(null);
        this.setRefreshToken(null);
        this.loginStateStore.resetLoginState();
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