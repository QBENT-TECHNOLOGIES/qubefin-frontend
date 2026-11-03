import { httpResource } from '@angular/common/http';
import { afterRenderEffect, Component, computed, ElementRef, input, signal, viewChild } from '@angular/core';
import { DecimalPipe, NgTemplateOutlet } from '@angular/common';
import { MatTooltipModule } from '@angular/material/tooltip';
import { LucideDynamicIcon } from '@lucide/angular';
import { ApiPaths } from 'qubefin-core';
import { IEmployeeHierarchy, IEmployeeHierarchyNode } from '../../models/employee-hierarchy';

// One colour per level of the chart, from the top (HOD) down
const LEVEL_COLORS = [
  { bar: 'bg-violet-500', avatar: 'from-violet-500 to-fuchsia-500', ring: 'hover:ring-violet-300 dark:hover:ring-violet-500/60', badge: 'bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300' },
  { bar: 'bg-indigo-500', avatar: 'from-indigo-500 to-blue-500', ring: 'hover:ring-indigo-300 dark:hover:ring-indigo-500/60', badge: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300' },
  { bar: 'bg-sky-500', avatar: 'from-sky-500 to-cyan-500', ring: 'hover:ring-sky-300 dark:hover:ring-sky-500/60', badge: 'bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300' },
  { bar: 'bg-teal-500', avatar: 'from-teal-500 to-emerald-500', ring: 'hover:ring-teal-300 dark:hover:ring-teal-500/60', badge: 'bg-teal-50 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300' },
  { bar: 'bg-amber-500', avatar: 'from-amber-500 to-orange-500', ring: 'hover:ring-amber-300 dark:hover:ring-amber-500/60', badge: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300' },
  { bar: 'bg-rose-500', avatar: 'from-rose-500 to-pink-500', ring: 'hover:ring-rose-300 dark:hover:ring-rose-500/60', badge: 'bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300' },
];

@Component({
  selector: 'qfin-my-team-component',
  imports: [LucideDynamicIcon, NgTemplateOutlet, MatTooltipModule, DecimalPipe],
  templateUrl: './my-team-component.html',
  styleUrl: './my-team-component.css',
})
export class MyTeamComponent {
  // Set when opened from the employee list; empty means the logged-in employee
  readonly employeeId = input<string | null>(null);

  readonly hierarchyResource = httpResource<IEmployeeHierarchy | null>(() => {
    const id = this.employeeId();
    return `${ApiPaths.HRMS}/employees/hierarchy${id ? `/${id}` : ''}`;
  });

  readonly root = computed(() => this.hierarchyResource.value()?.root);
  readonly startId = computed(() => this.hierarchyResource.value()?.employeeId ?? null);

  // The API returns the superiors as a single chain above the employee's node
  readonly superiors = computed(() => {
    const nodes = new Set<IEmployeeHierarchyNode>();
    for (let node = this.root(); node && !this.hasStart(node); node = node.children[0]) {
      nodes.add(node);
    }
    return nodes;
  });

  readonly startNode = computed(() => {
    let node = this.root();
    while (node && !this.hasStart(node)) node = node.children[0];
    return node;
  });

  // People below each node, for the team badges
  readonly teamSizes = computed(() => {
    const sizes = new Map<IEmployeeHierarchyNode, number>();
    const count = (node: IEmployeeHierarchyNode): number => {
      const size = node.children.reduce((sum, child) => sum + child.members.length + count(child), 0);
      sizes.set(node, size);
      return size;
    };
    const root = this.root();
    if (root) count(root);
    return sizes;
  });

  readonly teamSize = computed(() => this.teamSizes().get(this.startNode()!) ?? 0);

  readonly zoom = signal(1);
  private readonly scroller = viewChild<ElementRef<HTMLElement>>('scroller');

  constructor() {
    // Bring the employee's own card into view once the chart is drawn
    afterRenderEffect(() => {
      this.root();
      this.scrollToStart('instant');
    });
  }

  protected scrollToStart(behavior: ScrollBehavior = 'smooth') {
    const container = this.scroller()?.nativeElement;
    const card = container?.querySelector<HTMLElement>('[data-start]');
    if (!container || !card) return;
    const box = container.getBoundingClientRect();
    const target = card.getBoundingClientRect();
    container.scrollTo({
      top: container.scrollTop + target.top - box.top - (box.height - target.height) / 2,
      left: container.scrollLeft + target.left - box.left - (box.width - target.width) / 2,
      behavior,
    });
  }

  protected changeZoom(step: number) {
    this.zoom.update((zoom) => Math.min(1.5, Math.max(0.5, Math.round((zoom + step) * 10) / 10)));
  }

  protected color(level: number) {
    return LEVEL_COLORS[level % LEVEL_COLORS.length];
  }

  // Leaf-only teams (e.g. credit officers under a branch manager) are stacked to keep the chart narrow
  protected isStacked(node: IEmployeeHierarchyNode) {
    return node.children.every((child) => !child.children.length);
  }

  private hasStart(node: IEmployeeHierarchyNode) {
    return node.members.some((member) => member.id === this.startId());
  }

  protected initials(name: string) {
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join('');
  }
}
