import { Component, computed, effect, inject, model, output, signal, untracked, WritableSignal } from '@angular/core';
import { AdministrativeUnitStore } from '../../stores/administrative-unit-store';
import { AdministrativeUnit } from '../../models/administrative-unit';
import { form, FormField, required, schema, Schema } from '@angular/forms/signals';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { AdministrativeUnitTypeStore } from '../../stores/administrative-unit-type-store';
import { AdministrativeUnitType } from '../../models/administrative-unit-type';
import { AdministrativeUnitBasic } from '../../models/administrative-unit-tree-node';
import { AdministrativeUnitService } from '../../services/administrative-unit-service';
import { AlertService, EMPTY_UUID } from 'qubefin-core';
import { LucideDynamicIcon } from '@lucide/angular';
import { APP_ICONS_MAP } from '../../../../lucide-icons';

export interface AdministrativeUnitTypeParentField {
	id: string;
	name: string;
	category: string;
	categoryIcon: string;
	value: WritableSignal<string | null>;
	parentId: WritableSignal<string | null>;
	options: WritableSignal<AdministrativeUnitBasic[]>;
}

@Component({
	selector: 'qfin-administrative-unit-detail-component',
	imports: [FormField, MatIconModule, MatFormFieldModule, MatInputModule, MatSelectModule, LucideDynamicIcon],
	templateUrl: './administrative-unit-detail.html'
})
export class AdministrativeUnitDetailComponent {
	administrativeUnitStore = inject(AdministrativeUnitStore);
	administrativeUnitTypeStore = inject(AdministrativeUnitTypeStore);
	administrativeUnitService = inject(AdministrativeUnitService);
	alertService = inject(AlertService);

	administrativeUnitId = model<string>('');
	cancel = output<void>();
	private readonly hierarchyInitialized = signal(false);
	readonly iconMap = APP_ICONS_MAP;

	administrativeUnit = this.administrativeUnitStore.administrativeUnit;
	administrativeUnitTypes = this.administrativeUnitTypeStore.administrativeUnitTypes;

	constructor() {
		effect(() => {
			const id = this.administrativeUnitId();
			this.administrativeUnitStore.setAdministrativeUnitId(id);
		});

		effect(() => {
			const unit = this.administrativeUnit();

			if (!unit)
				return;

			this.administrativeUnitModel.set(unit!);
		});

		effect(() => {
			const typeId = this.administrativeUnitForm.administrativeUnitTypeId().value();
			if (!typeId)
				return;

			this.hierarchyInitialized.set(false);
			const selectedType = this.administrativeUnitTypes().find(x => x.id === typeId);

			if (!selectedType) {
				this.parentTypes.set([]);
				return;
			}

			this.parentTypes.set(
				this.getParents(selectedType)
					.map((parent, index) =>
						this.createParentField(parent.id, parent.name, parent.category, parent.icon, null)
					)
			);
		});

		effect(() => {

			if (this.hierarchyInitialized()) {
				return;
			}

			if (!this.parentTypes().length) {
				return;
			}

			const hierarchy = this.administrativeUnitModel().hierarchy;

			if (hierarchy.length === 0) {
				this.loadOptionsForParentField(0);
			} else {
				this.populateHierarchy();
			}

			this.hierarchyInitialized.set(true);

		});

	}

	protected readonly administrativeUnitModel = signal<AdministrativeUnit>({
		id: '',
		name: '',
		administrativeUnitTypeId: '',
		administrativeUnitTypeIcon: '',
		administrativeUnitTypeName: '',
		parentId: '',
		parentName: '',
		isActive: true,
		createdBy: '',
		createdOn: new Date(),
		hierarchy: []
	});
	protected readonly administrativeUnitSchema: Schema<AdministrativeUnit> = schema((path) => {
		required(path.name, { message: 'Administrative Unit Name is required' });
	});
	protected readonly administrativeUnitForm = form(this.administrativeUnitModel, this.administrativeUnitSchema);

	parentTypes = signal<AdministrativeUnitTypeParentField[]>([]);

	onParentChanged(index: number, value: string) {
		const fields = this.parentTypes();
		fields[index].value.set(value);
		for (let i = index + 1; i < fields.length; i++) {
			fields[i].value.set(null);
			fields[i].options.set([]);
			fields[i].parentId.set(null);
		}
		if (index + 1 < fields.length) {
			fields[index + 1].parentId.set(value);
			this.loadOptionsForParentField(index + 1);
		}
	}

	onSubmit() {
		if (!this.administrativeUnitForm().valid()) {
			return;
		}

		const dataToSave = this.administrativeUnitForm().value();
		dataToSave.parentId = this.parentTypes().at(-1)?.value()!;
		if (this.administrativeUnitId() === EMPTY_UUID) {
			this.administrativeUnitService.create(dataToSave).subscribe({
				next: (resp: any) => {
					this.alertService.success("Success!", "Administrative Unit created successfully !")
					this.administrativeUnitStore.refreshAll();
				},
				error: (err: any) => {
					if (err.error.isError) {
					}
				}
			});
		} else {
			this.administrativeUnitService.update(this.administrativeUnitId(), dataToSave).subscribe({
				next: (resp: any) => {
					this.alertService.success("Success!", "Administrative Unit updated successfully !");
					this.administrativeUnitStore.refreshAll();
				},
				error: (err: any) => {
					if (err.error.isError) {
					}
				}
			});
		}
	}

	onCancel() {
		this.cancel.emit();
	}

	private loadOptionsForParentField(index: number) {
		const field = this.parentTypes()[index];
		this.administrativeUnitService
			.loadChildren(field.parentId())
			.subscribe({
				next: result => {
					console.log(field.category);
					if (field.category === 'RURAL') {
						result = result.filter(x => x.category.toLowerCase().includes('rural'));
					}
					if (field.category === 'URBAN') {
						result = result.filter(x => x.category.toLowerCase().includes('urban'));
					}

					field.options.set(result);
				},
				error: () => {
					field.options.set([]);
				}
			});
	}

	private getParents(selected: AdministrativeUnitType): AdministrativeUnitType[] {
		return this.administrativeUnitTypes()
			.filter(x => {
				if (selected.category === 'RURAL')
					return (x.category === 'COMMON' || x.category === 'RURAL')
						&& x.levelNo < selected.levelNo;

				if (selected.category === 'URBAN')
					return (x.category === 'COMMON' || x.category === 'URBAN')
						&& x.levelNo < selected.levelNo;

				return x.levelNo < selected.levelNo;
			})
			.sort((a, b) => a.levelNo - b.levelNo);
	}

	private createParentField(
		id: string,
		name: string,
		category: string,
		categoryIcon: string,
		value: string | null
	): AdministrativeUnitTypeParentField {
		return {
			id,
			name,
			category,
			categoryIcon,
			value: signal(value),
			parentId: signal<string | null>(null),
			options: signal<AdministrativeUnitBasic[]>([])
		};
	}

	private populateHierarchy() {

		if (!this.parentTypes().length) {
			return;
		}

		// First level has no parent
		this.parentTypes()[0].parentId.set(null);

		this.populateLevel(0);

	}

	private populateLevel(index: number) {

		const hierarchy = this.administrativeUnitModel().hierarchy;
		const fields = this.parentTypes();

		if (index >= fields.length)
			return;

		const field = fields[index];

		this.administrativeUnitService
			.loadChildren(field.parentId())
			.subscribe({

				next: result => {

					if (field.category === 'RURAL') {
						result = result.filter(x => x.category.includes('RURAL'));
					}

					if (field.category === 'URBAN') {
						result = result.filter(x => x.category.includes('URBAN'));
					}

					field.options.set(result);

					if (hierarchy.length > 0) {
						// Set selected value from model
						field.value.set(hierarchy[index].id ?? null);

						// Set parent for next dropdown
						if (index + 1 < fields.length) {

							fields[index + 1]
								.parentId
								.set(hierarchy[index].id);

							this.populateLevel(index + 1);

						}
					}

				}

			});

	}
}
