import { CommonModule } from '@angular/common';
import {
  Component,
  computed,
  effect,
  HostBinding,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { AdministrativeUnitStore } from '../../stores/administrative-unit-store';
import { AdministrativeUnitCascadeLevel } from '../../models/administrative-unit-cascade-level';
import { AdministrativeUnitTreeNode } from '../../models/administrative-unit-tree-node';
import { LucideDynamicIcon } from '@lucide/angular';
import { APP_ICONS_MAP } from '../../../../lucide-icons';

@Component({
  selector: 'qfin-administrative-unit-cascade',
  imports: [CommonModule, MatFormFieldModule, MatSelectModule, LucideDynamicIcon],
  templateUrl: './administrative-unit-cascade.html',
  styles: ``,
})
export class AdministrativeUnitCascade {
  @HostBinding('class.md:col-span-1')
  get span1(): boolean {
    return this.columns() === 1;
  }

  @HostBinding('class.md:col-span-2')
  get span2(): boolean {
    return this.columns() === 2;
  }

  @HostBinding('class.md:col-span-3')
  get span3(): boolean {
    return this.columns() === 3;
  }

  @HostBinding('class.md:col-span-4')
  get span4(): boolean {
    return this.columns() === 4;
  }

  readonly columns = computed(() => Math.min(Math.max(this.levels().length, 1), 3));

  administrativeUnitId = input<string>('');
  selectedIdChanged = output<string>();
  readonly iconMap = APP_ICONS_MAP;

  private readonly administrativeUnitStore = inject(AdministrativeUnitStore);
  readonly tree = this.administrativeUnitStore.administrativeUnitTree;
  readonly levels = signal<AdministrativeUnitCascadeLevel[]>([]);

  constructor() {
    effect(() => {
      const tree = this.tree();

      if (!tree.length) {
        return;
      }
      const administrativeUnitId = this.administrativeUnitId();
      if (administrativeUnitId) {
        this.restoreSelection(administrativeUnitId);
      } else {
        this.initializeLevels();
      }
    });
  }
  private initializeLevels(): void {
    const tree = this.tree();

    if (!tree.length) {
      return;
    }

    this.levels.set([
      {
        level: 0,
        label: tree[0].administrativeUnitTypeName,
        icon: tree[0].administrativeUnitTypeIcon,
        options: tree,
        selectedId: null,
      },
    ]);
  }
  select(levelIndex: number, selectedId: string) {
    const levels = [...this.levels()];
    levels[levelIndex].selectedId = selectedId;
    levels.splice(levelIndex + 1);
    const node = levels[levelIndex].options.find((x) => x.id === selectedId);

    if (node?.children?.length) {
      levels.push({
        level: levelIndex + 1,
        label: node.children[0].administrativeUnitTypeName,
        icon: node.children[0].administrativeUnitTypeIcon,
        options: node.children,
        selectedId: null,
      });
    } else {
      this.selectedIdChanged.emit(selectedId);
    }

    this.levels.set(levels);
  }
  private findPath(
    nodes: AdministrativeUnitTreeNode[],
    id: string,
  ): AdministrativeUnitTreeNode[] | null {
    for (const node of nodes) {
      // Found the node
      if (node.id.toLowerCase() === id.toLowerCase()) {
        return [node];
      }

      // Search children
      if (node.children?.length) {
        const path = this.findPath(node.children, id);

        if (path) {
          return [node, ...path];
        }
      }
    }

    return null;
  }

  private restoreSelection(administrativeUnitId: string) {
    const path = this.findPath(this.tree(), administrativeUnitId);

    if (!path) {
      return;
    }

    const levels: AdministrativeUnitCascadeLevel[] = [];

    // First dropdown (Country)
    levels.push({
      level: 0,
      label: this.tree()[0].administrativeUnitTypeName,
      icon: this.tree()[0].administrativeUnitTypeIcon,
      options: this.tree(),
      selectedId: path[0].id,
    });

    // Remaining dropdowns
    for (let i = 1; i < path.length; i++) {
      levels.push({
        level: i,
        label: path[i].administrativeUnitTypeName,
        icon: path[i].administrativeUnitTypeIcon,
        options: path[i - 1].children ?? [],
        selectedId: path[i].id,
      });
    }

    this.levels.set(levels);
  }
}
