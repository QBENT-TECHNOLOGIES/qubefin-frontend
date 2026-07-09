import { Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { LucideHouse, LucideChevronRight, LucidePlus, LucideUpload } from '@lucide/angular';

@Component({
  selector: 'qfin-breadcrumb',
  imports: [MatIconModule, LucideHouse,LucideChevronRight, LucidePlus,LucideUpload ],
  templateUrl: './breadcrumb.html'
})
export class Breadcrumb {

}
