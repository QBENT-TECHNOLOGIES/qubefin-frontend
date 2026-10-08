import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
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

  // What is typed in the box, kept apart from what the Filter button has applied, so the
  // tree only changes when the button (or Enter) is used.
  protected searchText = signal<string>('');
  protected appliedSearchText = signal<string>('');

  protected readonly filteredMenuTreeNodes = computed(() => {
    const term = this.appliedSearchText().trim().toLowerCase();
    const nodes = this.menuTreeNodes();

    return term ? this.filterNodes(nodes, term) : nodes;
  });

  readonly iconMap = APP_ICONS_MAP;

  constructor() {
    // Keep the selection valid whenever the tree reloads. The selection is read untracked,
    // so selecting a node - or pointing at a menu that was just saved but whose reloaded
    // tree has not arrived yet - never re-runs this and overrides the choice.
    effect(() => {
      const nodes = this.menuTreeNodes();
      if (!nodes.length) return;

      const selectedId = untracked(this.selectedMenuId);
      if (this.containsNode(nodes, selectedId)) {
        this.lastViewedMenuId.set(selectedId);
        return;
      }

      const lastViewedId = untracked(this.lastViewedMenuId);
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

  /** Keeps the menu that was just created or edited as the active node in the tree. */
  protected onSaved(id: string) {
    if (id && id !== EMPTY_UUID) {
      this.selectedMenuId.set(id);
      this.lastViewedMenuId.set(id);
      this.isViewMode.set(true);
      return;
    }

    this.onClose();
  }

  protected onClose() {
    const nodes = this.menuTreeNodes();
    const fallbackId = this.containsNode(nodes, this.lastViewedMenuId())
      ? this.lastViewedMenuId()
      : (nodes[0]?.id ?? EMPTY_UUID);

    this.selectedMenuId.set(fallbackId);
    this.isViewMode.set(true);
  }

  protected onSearch(event: Event) {
    this.searchText.set((event.target as HTMLInputElement).value);
  }

  protected applyFilter() {
    this.appliedSearchText.set(this.searchText());
  }

  private containsNode(nodes: MenuTreeNode[], id: string): boolean {
    return nodes.some((node) => node.id === id || this.containsNode(node.children ?? [], id));
  }

  private filterNodes(nodes: MenuTreeNode[], term: string): MenuTreeNode[] {
    const matches: MenuTreeNode[] = [];

    for (const node of nodes) {
      // A node that matches keeps its whole subtree; one that does not is kept only as
      // the path leading to a matching descendant.
      if (this.matchesTerm(node, term)) {
        matches.push(node);
        continue;
      }

      const children = this.filterNodes(node.children ?? [], term);
      if (children.length) {
        matches.push({ ...node, children });
      }
    }

    return matches;
  }

  private matchesTerm(node: MenuTreeNode, term: string): boolean {
    return (
      node.name.toLowerCase().includes(term) || (node.target ?? '').toLowerCase().includes(term)
    );
  }
}
