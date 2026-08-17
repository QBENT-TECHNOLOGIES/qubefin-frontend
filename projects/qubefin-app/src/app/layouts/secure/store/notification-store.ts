import { httpResource } from '@angular/common/http';
import { computed, inject, Injectable } from '@angular/core';
import { ApiPaths, AuthStore } from 'qubefin-core';
import { NotificationItem } from '../../../models/notification';

@Injectable({
  providedIn: 'root',
})
export class NotificationStore {
  private readonly basePath = `${ApiPaths.GLOBAL}/notifications`;

  readonly notificationsResource = httpResource<NotificationItem[]>(() => this.basePath);
  readonly notifications = computed(() => this.notificationsResource.value() ?? []);

  readonly loading = computed(() => this.notificationsResource.isLoading());
  readonly error = computed(() => this.notificationsResource.error());
  refresh() {
    this.notificationsResource.reload();
  }
}
