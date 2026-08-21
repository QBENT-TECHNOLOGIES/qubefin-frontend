import { Component, inject, input, model, output, signal, computed } from '@angular/core';
import { LucideDynamicIcon } from '@lucide/angular';
import { ThemeService } from '../../../services/theme.service';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { APP_ICONS_MAP } from '../../../lucide-icons';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Breadcrumb } from '../breadcrumb/breadcrumb';
import { Menu } from '../../../features/app/models/menu';
import { LoggedInUserInfoStore } from '../store/logged-in-user-info-store';
import { AuthStore } from 'qubefin-core';
import { Router } from '@angular/router';
import { NotificationStore } from '../store/notification-store';
import { NotificationService } from '../../../services/notification-service';
import { DatePipe } from '@angular/common';
import { interval } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
@Component({
  selector: 'qfin-header',
  standalone: true,
  imports: [
    MatDividerModule,
    LucideDynamicIcon,
    MatMenuModule,
    MatTooltipModule,
    Breadcrumb,
    DatePipe,
  ],
  templateUrl: './header.html',
})
export class Header {
  theme = inject(ThemeService);
  readonly notificationService = inject(NotificationService);

  readonly notificationStore = inject(NotificationStore);
  readonly authStore = inject(AuthStore);
  readonly userStore = inject(LoggedInUserInfoStore);

  readonly router = inject(Router);
  pageData = input<Menu | null>(null);
  isExpanded = model<boolean>(true);

  readonly iconMap = APP_ICONS_MAP;

  readonly notifications = this.notificationStore.notifications;

  unreadCount = computed(() => this.notifications().filter((n) => !n.isRead).length);
  constructor() {
    // interval(300000)
    //   .pipe(takeUntilDestroyed())
    //   .subscribe(() => {
    //     this.notificationStore.refresh();
    //     this.userStore.refresh();
    //   });
  }
  onHandleToggleDrawer() {
    this.isExpanded.set(!this.isExpanded());
  }

  markAllAsRead() {
    this.notificationService.allRead().subscribe({
      next: () => {
        this.notificationStore.refresh();
        this.userStore.refresh();
      },
    });
  }

  markAsRead(id: string, actionUrl: string) {
    if (this.unreadCount() > 0) {
      this.notificationService.read(id).subscribe({
        next: () => {
          this.notificationStore.refresh();
          this.userStore.refresh();
          if (actionUrl) {
            this.router.navigate([actionUrl]);
          }
        },
      });
    }
  }

  getInitials(name: string | null | undefined): string {
    if (!name?.trim()) {
      return '';
    }
    const parts = name.trim().split(/\s+/);
    const first = parts[0][0];
    const last = parts.length > 1 ? parts[parts.length - 1][0] : '';

    return (first + last).toUpperCase();
  }
  onLogout() {
    this.authStore.logout();
    this.router.navigate(['/public/auth/login']);
  }
}
