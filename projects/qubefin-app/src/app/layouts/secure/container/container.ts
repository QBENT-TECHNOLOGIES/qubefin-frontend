import { Component, effect, inject, OnInit, signal } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { Header } from '../header/header';
import { Footer } from '../footer/footer';
import { Drawer } from '../drawer/drawer';
import { CommonModule } from '@angular/common';
import { MenuStore } from '../../../features/app/stores/menu-store';
import { PageService } from '../../../services/page-service';
import { Menu } from '../../../features/app/models/menu';
import { filter } from 'rxjs';

@Component({
	selector: 'qfin-container',
	imports: [RouterOutlet, CommonModule, Drawer, Footer, Header],
	templateUrl: './container.html'
})
export class Container implements OnInit {
	private router = inject(Router);

	readonly pageService = inject(PageService);

	menuStore = inject(MenuStore);

	isExpanded = signal<boolean>(true);
	isHovered = signal<boolean>(false);

	pageData = signal<Menu | null>(null);

	userMenus = this.menuStore.menuTree;

	currentPath = signal<string>('');

	ngOnInit() {
		this.loadPageData(this.router.url);

		this.router.events
			.pipe(filter(event => event instanceof NavigationEnd))
			.subscribe(() => {
				this.loadPageData(this.router.url);
			});
	}

	private loadPageData(path: string) {
		if (this.currentPath() === path) {
			return;
		}

		this.currentPath.set(path);

		this.pageService.getByUrl(path).subscribe({
			next: (resp: any) => {
				console.log(resp);
				this.pageData.set(resp);
			},
			error: (err: any) => {
				this.pageData.set(null);
			}
		});;
	}
}
