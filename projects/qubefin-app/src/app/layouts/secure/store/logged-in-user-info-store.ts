import { httpResource } from '@angular/common/http';
import { computed, inject, Injectable } from '@angular/core';
import { ApiPaths, AuthStore } from 'qubefin-core';
import { LoggedInUserInfoResponse } from '../../../models/logged-in-user-info-response';

@Injectable({
  providedIn: 'root',
})
export class LoggedInUserInfoStore {
  private readonly authStore = inject(AuthStore);

  private readonly basePath = `${ApiPaths.APP}/users`;

  readonly loggedInUserInfoResource = httpResource<LoggedInUserInfoResponse>(() =>
    this.authStore.isAuthenticated() ? `${this.basePath}/login-info` : undefined,
  );

  readonly loggedInUserInfo = computed(() => this.loggedInUserInfoResource.value());

  readonly loading = computed(() => this.loggedInUserInfoResource.isLoading());

  readonly error = computed(() => this.loggedInUserInfoResource.error());

  refresh(): void {
    this.loggedInUserInfoResource.reload();
  }
}
