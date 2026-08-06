import { CommonModule } from '@angular/common';
import { Component, inject, input, model } from '@angular/core';
import { MenuTreeNode } from '../../../features/app/models/menu';
import { Router, RouterLink } from '@angular/router';
import { LucideDynamicIcon } from '@lucide/angular';
import { MatTooltipModule } from '@angular/material/tooltip';
import { APP_ICONS_MAP } from '../../../lucide-icons';
import { LoggedInUserInfoStore } from '../store/logged-in-user-info-store';
import { AuthStore } from 'qubefin-core';

@Component({
  selector: 'qfin-drawer',
  imports: [CommonModule, RouterLink, MatTooltipModule, LucideDynamicIcon],
  templateUrl: './drawer.html',
})
export class Drawer {
  readonly userStore = inject(LoggedInUserInfoStore);
  readonly authStore = inject(AuthStore);
  isExpanded = model<boolean>(true);
  isHovered = model<boolean>(false);

  readonly iconMap = APP_ICONS_MAP;
  openSubmenu: string | null = null;

  // NEW:
  openCategoryIndex: number | null = null;

  userMenus = input<MenuTreeNode[]>();

  constructor(private router: Router) {}

  onMouseEnter() {
    if (!this.isExpanded()) {
      this.isHovered.set(true);
    }
  }

  onMouseLeave() {
    this.isHovered.set(false);
  }

  toggleSubmenu(groupIndex: number, itemIndex: number): void {
    const key = `${groupIndex}-${itemIndex}`;
    this.openSubmenu = this.openSubmenu === key ? null : key;
  }

  // NEW: accordion behavior category header
  toggleCategory(groupIndex: number): void {
    this.openCategoryIndex = this.openCategoryIndex === groupIndex ? null : groupIndex;
  }

  // NEW: Checked when category open
  isCategoryOpen(groupIndex: number): boolean {
    return this.openCategoryIndex === groupIndex;
  }

  isActive(path: string): boolean {
    return this.router.url === path;
  }

  isAnySubmenuRouteActive(): boolean {
    return this.userMenus()!.some((group) =>
      group.children?.some(
        (item) => item.children && item.children.some((subItem) => this.isActive(subItem.target!)),
      ),
    );
  }

  isSubMenuOpen(groupIndex: number, itemIndex: number): boolean {
    const key = `${groupIndex}-${itemIndex}`;
    const group = this.userMenus()?.[groupIndex];
    const item = group?.children?.[itemIndex];
    const hasActiveChild =
      item?.children?.some((subItem) => (subItem.target ? this.isActive(subItem.target) : false)) ??
      false;
    return this.openSubmenu === key || hasActiveChild;
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
