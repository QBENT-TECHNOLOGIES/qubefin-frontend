import { Component, model } from '@angular/core';

@Component({
  selector: 'qfin-header',
  imports: [],
  templateUrl: './header.html',
  styles: ``,
})
export class Header {
  isExpanded = model<boolean>(true);

	onHandleToggleDrawer() {
		this.isExpanded.set(!this.isExpanded());
	}
}
