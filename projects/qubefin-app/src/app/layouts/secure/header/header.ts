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

export interface NotificationItem {
  id: number | string;
  title: string;
  description: string;
  date: string;
  read: boolean;
  type?: 'info' | 'success' | 'warning' | 'danger';
  icon?: string;
}

@Component({
  selector: 'qfin-header',
  standalone: true,
  imports: [MatDividerModule, LucideDynamicIcon, MatMenuModule, MatTooltipModule, Breadcrumb],
  templateUrl: './header.html',
})
export class Header {
  theme = inject(ThemeService);
  readonly authStore = inject(AuthStore);
  readonly userStore = inject(LoggedInUserInfoStore);
  readonly router = inject(Router);
  pageData = input<Menu | null>(null);

  isExpanded = model<boolean>(true);
  readonly iconMap = APP_ICONS_MAP;

  notifications = signal<NotificationItem[]>([
    {
      id: 1,
      title: 'New Loan Request Approved',
      description: 'Loan application #QFB-9482 for ₹1,50,000 has been approved by risk compliance.',
      date: '10 mins ago',
      read: false,
      type: 'success',
      icon: 'check-circle'
    },
    {
      id: 2,
      title: 'System Security Update',
      description: 'Scheduled maintenance will be performed tonight at 11:00 PM IST.',
      date: '1 hour ago',
      read: false,
      type: 'info',
      icon: 'alert-circle'
    },
    {
      id: 3,
      title: 'Monthly Report Generated',
      description: 'Your financial summary report for July 2026 is ready to download.',
      date: 'Yesterday, 4:30 PM',
      read: false,
      type: 'warning',
      icon: 'file-text'
    }
  ]);

  unreadCount = computed(() => this.notifications().filter(n => !n.read).length);

  onHandleToggleDrawer() {
    this.isExpanded.set(!this.isExpanded());
  }

  markAllAsRead() {
    this.notifications.update(items => items.map(item => ({ ...item, read: true })));
  }

  markAsRead(id: number | string) {
    this.notifications.update(items =>
      items.map(item => (item.id === id ? { ...item, read: true } : item))
    );
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

