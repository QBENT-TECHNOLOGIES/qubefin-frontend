import { CommonModule } from '@angular/common';
import { Component, model } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
	selector: 'qfin-drawer',
	imports: [CommonModule, MatIconModule],
	templateUrl: './drawer.html'
})
export class Drawer {
	isExpanded = model<boolean>(true);
	isHovered = model<boolean>(false);

	onMouseEnter() {
		if (!this.isExpanded()) {
			this.isHovered.set(true);
		}
	}

	onMouseLeave() {
		this.isHovered.set(false);
	}
}
