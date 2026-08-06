import { Component, inject, input, model, output } from '@angular/core';
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

  onHandleToggleDrawer() {
    this.isExpanded.set(!this.isExpanded());
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
    this.router.navigate(['/login']);
  }
}
