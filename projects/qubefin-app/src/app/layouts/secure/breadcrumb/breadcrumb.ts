import { Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { LucideHouse, LucideChevronRight } from '@lucide/angular';

@Component({
  selector: 'qfin-breadcrumb',
  imports: [MatIconModule, LucideHouse,LucideChevronRight ],
  templateUrl: './breadcrumb.html'
})
export class Breadcrumb {

}
