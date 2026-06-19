import { Injectable, signal } from "@angular/core";
import { StorageTokens } from "../enums/storage-tokens";

export type LoginStep = | 'login' | 'mfa' | 'register-mfa' | 'complete';

export type LoginState = {
    step: LoginStep;
    sessionId: string;
};

export const transitions: Record<LoginStep, LoginStep[]> = {
    login: ['mfa'],
    mfa: ['complete', 'register-mfa'],
    'register-mfa': ['mfa'],
    complete: []
};

@Injectable({
    providedIn: 'root'
})
export class LoginStateStore {
    private loginStateSignal = signal<LoginState>(this.loadState());

    readonly loginState = this.loginStateSignal.asReadonly();

    setLoginStep(next: LoginStep) {
        const current = this.loginStateSignal();

        if (!transitions[current.step].includes(next)) {
            console.warn(`Invalid login state transition from ${current.step} to ${next}`);
            return;
        }

        const newLoginState = { ...current, step: next };
        this.loginStateSignal.set(newLoginState);
        sessionStorage.setItem(StorageTokens.LOGIN_STATE_TOKEN, JSON.stringify(newLoginState));
    }

    resetLoginState() {
        const initialState: LoginState = { step: 'login', sessionId: crypto.randomUUID() };
        this.loginStateSignal.set(initialState);
        sessionStorage.setItem(StorageTokens.LOGIN_STATE_TOKEN, JSON.stringify(initialState));
    }

    private loadState(): LoginState {
        const raw = sessionStorage.getItem(StorageTokens.LOGIN_STATE_TOKEN);
        if (raw) {
            return JSON.parse(raw) as LoginState;
        }

        return { step: 'login', sessionId: crypto.randomUUID() };
    }
}