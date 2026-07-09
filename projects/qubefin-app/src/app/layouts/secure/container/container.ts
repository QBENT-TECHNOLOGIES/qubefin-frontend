import { Component, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Header } from '../header/header';
import { Footer } from '../footer/footer';
import { Drawer } from '../drawer/drawer';
import { CommonModule } from '@angular/common';
import { MenuStore } from '../../../features/app/stores/menu-store';

@Component({
	selector: 'qfin-container',
	imports: [RouterOutlet, CommonModule, Drawer, Footer, Header],
	templateUrl: './container.html'
})
export class Container {
	menuStore = inject(MenuStore);

	isExpanded = signal<boolean>(true);
	isHovered = signal<boolean>(false);

	userMenus = this.menuStore.menuTree;
}
