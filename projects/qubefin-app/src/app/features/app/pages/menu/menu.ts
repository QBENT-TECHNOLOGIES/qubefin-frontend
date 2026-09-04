import { Component, effect, inject, signal } from '@angular/core';
import { EMPTY_UUID } from 'qubefin-core';
import { MenuStore } from '../../stores/menu-store';
import { MenuTreeComponent } from '../../components/menus/menu-tree/menu-tree';
import { MenuViewComponent } from '../../components/menus/menu-view/menu-view';
import { APP_ICONS_MAP } from '../../../../lucide-icons';
import { LucideDynamicIcon } from '@lucide/angular';
import { MenuDetailComponent } from '../../components/menus/menu-detail/menu-detail';
import { MenuTreeNode } from '../../models/menu';

@Component({
  selector: 'qfin-menu-page',
  imports: [MenuTreeComponent, MenuViewComponent, MenuDetailComponent, LucideDynamicIcon],
  templateUrl: './menu.html',
})
export class MenuPage {
  menuStore = inject(MenuStore);

  isViewMode = signal<boolean>(true);
  selectedMenuId = signal<string>(EMPTY_UUID);
  lastViewedMenuId = signal<string>(EMPTY_UUID);
  menuTreeNodes = this.menuStore.menuTree;
  //   menuTreeNodes = this.menuStore.menuTreeByUser;

  readonly iconMap = APP_ICONS_MAP;
  constructor() {
    effect(() => {
      const nodes = this.menuTreeNodes();
      if (!nodes.length) return;

      const selectedId = this.selectedMenuId();
      const lastViewedId = this.lastViewedMenuId();

      if (!this.isViewMode() && selectedId === EMPTY_UUID) {
        return;
      }

      if (this.containsNode(nodes, selectedId)) {
        queueMicrotask(() => {
          this.selectedMenuId.set(selectedId);
          this.lastViewedMenuId.set(selectedId);
        });
        return;
      }

      if (this.containsNode(nodes, lastViewedId)) {
        this.selectedMenuId.set(lastViewedId);
        return;
      }

      this.selectedMenuId.set(nodes[0].id);
      this.lastViewedMenuId.set(nodes[0].id);
    });
    effect(() => {
      this.menuStore.setShouldLoadmenuTree(true);
    });
  }

  protected onAdd() {
    this.isViewMode.set(false);
    this.selectedMenuId.set(EMPTY_UUID);
  }

  protected viewDetail(id: string) {
    this.selectedMenuId.set(id);
    this.lastViewedMenuId.set(id);
  }

  protected onEdit() {
    this.isViewMode.set(false);
  }

  protected onClose() {
    const nodes = this.menuTreeNodes();
    const fallbackId = this.containsNode(nodes, this.lastViewedMenuId())
      ? this.lastViewedMenuId()
      : nodes[0]?.id ?? EMPTY_UUID;

    this.selectedMenuId.set(fallbackId);
    this.isViewMode.set(true);
  }

  private containsNode(nodes: MenuTreeNode[], id: string): boolean {
    return nodes.some((node) => node.id === id || this.containsNode(node.children ?? [], id));
  }
}
