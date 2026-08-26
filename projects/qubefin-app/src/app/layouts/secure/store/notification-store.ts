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
  readonly notificationCountResource = httpResource<number>(() => `${this.basePath}/count`);
  readonly count = computed(() => this.notificationCountResource.value() ?? 0);
  readonly notifications = computed(() => {
    if (this.notificationsResource.error()) return [];
    return this.notificationsResource.value() ?? [];
  });
  readonly loading = computed(() => this.notificationsResource.isLoading());
  readonly error = computed(() => this.notificationsResource.error());
  refresh() {
    this.notificationsResource.reload();
  }
  refreshCount() {
    this.notificationCountResource.reload();
  }
}
