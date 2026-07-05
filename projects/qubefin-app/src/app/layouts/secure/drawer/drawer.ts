import { CommonModule } from '@angular/common';
import { Component, input, model } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MenuTreeNode } from '../../../features/app/models/menu-tree-node';
import { Router, RouterLink } from '@angular/router';

@Component({
	selector: 'qfin-drawer',
	imports: [CommonModule, RouterLink, MatIconModule],
	templateUrl: './drawer.html'
})
export class Drawer {
	isExpanded = model<boolean>(true);
	isHovered = model<boolean>(false);

	openSubmenu: string | null = null;

	userMenus = input<MenuTreeNode[]>();

	constructor(private router: Router) {
	}


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

	isActive(path: string): boolean {
		return this.router.url === path;
	}

	isAnySubmenuRouteActive(): boolean {
		return this.userMenus()!.some((group) =>
			group.children?.some(
				(item) =>
					item.children && item.children.some((subItem) => this.isActive(subItem.target!))
			)
		);
	}

	isSubMenuOpen(groupIndex: number, itemIndex: number): boolean {
		const key = `${groupIndex}-${itemIndex}`;
		return false;
		// return (
		// 	this.openSubmenu === key ||
		// 	(this.isAnySubmenuRouteActive() &&
		// 		this.userMenus()![groupIndex].children?[itemIndex].children?.some((subItem: any) =>
		// 			this.isActive(subItem.path)
		// 		))
		// ) ?? false;
	}
}
