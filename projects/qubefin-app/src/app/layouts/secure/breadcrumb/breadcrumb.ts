import { Component,computed, inject, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { LucideDynamicIcon } from '@lucide/angular';
import { APP_ICONS_MAP } from '../../../lucide-icons';
import { MenuHierarchyItem } from '../../../features/app/models/menu';

@Component({
  selector: 'qfin-breadcrumb',
  imports: [MatIconModule, LucideDynamicIcon ],
  templateUrl: './breadcrumb.html'
})
export class Breadcrumb {

  readonly iconMap = APP_ICONS_MAP;

  data = input<MenuHierarchyItem[]>();
}
