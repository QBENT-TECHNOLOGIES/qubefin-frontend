import { Component, computed, effect, inject, model, output, signal } from '@angular/core';
import { UserStore } from '../../../stores/user-store';
import { EMPTY_UUID } from 'qubefin-core';
import { APP_ICONS_MAP } from '../../../../../lucide-icons';
import { User } from '../../../models/user';
import { DatePipe } from '@angular/common';
import { LucideDynamicIcon } from '@lucide/angular';

@Component({
	selector: 'qfin-user-view',
	imports: [DatePipe, LucideDynamicIcon],
	templateUrl: './user-view.html'
})
export class UserView {
	userStore = inject(UserStore);

	userId = model<string>(EMPTY_UUID);

	showEdit = output<boolean>();

	readonly iconMap = APP_ICONS_MAP;

	readonly user = computed(() => this.userCache());

	private readonly userCache = signal<User | undefined>(undefined);

	constructor() {
		effect(() => {
			if (this.userId() && this.userId() !== EMPTY_UUID) {
				this.userStore.setUserId(this.userId());
			}
		});

		effect(() => {
			const value = this.userStore.user;

			if (value) {
				this.userCache.set(value());
			}
		});
	}

	onShowEdit() {
		this.showEdit.emit(true);
	}
}
