import {
  Component,
  computed,
  effect,
  inject,
  model,
  output,
  signal,
  WritableSignal,
} from '@angular/core';
import { AdministrativeUnitStore } from '../../stores/administrative-unit-store';
import { AdministrativeUnit } from '../../models/administrative-unit';
import { AdministrativeUnitHierarchyItem } from '../../models/administrative-unit-hierarchy-item';
import { form, FormField, required, schema, Schema } from '@angular/forms/signals';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
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

function emptyAdministrativeUnit(): AdministrativeUnit {
  return {
    id: EMPTY_UUID,
    name: '',
    administrativeUnitTypeId: '',
    administrativeUnitTypeIcon: '',
    administrativeUnitTypeName: '',
    parentId: null,
    parentName: '',
    isActive: true,
    createdBy: '',
    createdOn: new Date(),
    hierarchy: [],
  };
}

@Component({
  selector: 'qfin-administrative-unit-detail-component',
  imports: [
    FormField,
    MatCheckboxModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    LucideDynamicIcon,
  ],
  templateUrl: './administrative-unit-detail.html',
})
export class AdministrativeUnitDetailComponent {
  administrativeUnitStore = inject(AdministrativeUnitStore);
  administrativeUnitTypeStore = inject(AdministrativeUnitTypeStore);
  administrativeUnitService = inject(AdministrativeUnitService);
  alertService = inject(AlertService);

  administrativeUnitId = model<string>(EMPTY_UUID);
  cancel = output<void>();
  saved = output<void>();

  private readonly hierarchyInitialized = signal(false);
  protected readonly saving = signal(false);
  readonly iconMap = APP_ICONS_MAP;

  administrativeUnit = this.administrativeUnitStore.administrativeUnit;
  administrativeUnitTypes = this.administrativeUnitTypeStore.administrativeUnitTypes;

  /** An existing unit is being edited; drives the header, the labels and which API is called. */
  protected readonly isEditMode = computed(() => {
    const id = this.administrativeUnitId();
    return !!id && id !== EMPTY_UUID;
  });

  constructor() {
    effect(() => {
      // In create mode this parks the store on EMPTY_UUID so nothing is loaded.
      this.administrativeUnitStore.setAdministrativeUnitId(this.administrativeUnitId());
    });

    effect(() => {
      const unit = this.administrativeUnit();

      // Never seed the create form from the unit that was last viewed: the store may
      // still be holding it while the request for the new id is in flight.
      if (!this.isEditMode() || !unit || unit.id !== this.administrativeUnitId()) return;

      this.administrativeUnitModel.set({ ...unit });
    });

    effect(() => {
      const typeId = this.administrativeUnitForm.administrativeUnitTypeId().value();
      if (!typeId) return;

      this.hierarchyInitialized.set(false);
      const selectedType = this.administrativeUnitTypes().find((x) => x.id === typeId);

      if (!selectedType) {
        this.parentTypes.set([]);
        return;
      }

      this.parentTypes.set(
        this.getParents(selectedType).map((parent) =>
          this.createParentField(parent.id, parent.name, parent.category, parent.icon, null),
        ),
      );
    });

    effect(() => {
      if (this.hierarchyInitialized()) {
        return;
      }

      if (!this.parentTypes().length) {
        return;
      }

      // The stored hierarchy describes the unit's own type. Once a different type is
      // picked the ancestor chain changes, so start from an empty selection rather
      // than replaying a path that no longer lines up with the parent fields.
      const loadedUnit = this.administrativeUnit();
      const currentTypeId = this.administrativeUnitForm.administrativeUnitTypeId().value();
      const hierarchy =
        loadedUnit && loadedUnit.administrativeUnitTypeId === currentTypeId
          ? loadedUnit.hierarchy
          : [];

      if (hierarchy.length === 0) {
        this.loadOptionsForParentField(0);
      } else {
        this.populateHierarchy(hierarchy);
      }

      this.hierarchyInitialized.set(true);
    });
  }

  protected readonly administrativeUnitModel = signal<AdministrativeUnit>(
    emptyAdministrativeUnit(),
  );
  protected readonly administrativeUnitSchema: Schema<AdministrativeUnit> = schema((path) => {
    required(path.name, { message: 'Administrative Unit Name is required' });
  });
  protected readonly administrativeUnitForm = form(
    this.administrativeUnitModel,
    this.administrativeUnitSchema,
  );

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
    if (!this.administrativeUnitForm().valid() || this.saving()) {
      return;
    }

    const parentFields = this.parentTypes();
    if (parentFields.some((field) => !field.value())) {
      this.alertService.error(
        'Incomplete hierarchy',
        'Please select every parent level before saving.',
      );
      return;
    }

    const isEdit = this.isEditMode();

    // Copy before overriding the parent: the form value is the same object the store
    // handed us for the loaded unit.
    const dataToSave: AdministrativeUnit = {
      ...this.administrativeUnitForm().value(),
      parentId: parentFields.at(-1)?.value() ?? null,
      // The active flag is only editable on update; a new unit is always created active.
      isActive: isEdit ? this.administrativeUnitForm.isActive().value() : true,
    };

    const request = isEdit
      ? this.administrativeUnitService.update(this.administrativeUnitId(), dataToSave)
      : this.administrativeUnitService.create(dataToSave);

    this.saving.set(true);
    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.alertService.success(
          'Success!',
          isEdit
            ? 'Administrative Unit updated successfully !'
            : 'Administrative Unit created successfully !',
        );
        this.administrativeUnitStore.refreshAll();
        this.saved.emit();
      },
      error: () => {
        this.saving.set(false);
      },
    });
  }

  onCancel() {
    this.cancel.emit();
  }

  private loadOptionsForParentField(index: number) {
    const field = this.parentTypes()[index];
    this.administrativeUnitService.loadChildren(field.parentId()).subscribe({
      next: (result) => {
        field.options.set(this.filterByCategory(result, field.category));
      },
      error: () => {
        field.options.set([]);
      },
    });
  }

  private getParents(selected: AdministrativeUnitType): AdministrativeUnitType[] {
    return this.administrativeUnitTypes()
      .filter((x) => {
        if (selected.category === 'RURAL')
          return (
            (x.category === 'COMMON' || x.category === 'RURAL') && x.levelNo < selected.levelNo
          );

        if (selected.category === 'URBAN')
          return (
            (x.category === 'COMMON' || x.category === 'URBAN') && x.levelNo < selected.levelNo
          );

        return x.levelNo < selected.levelNo;
      })
      .sort((a, b) => a.levelNo - b.levelNo);
  }

  private createParentField(
    id: string,
    name: string,
    category: string,
    categoryIcon: string,
    value: string | null,
  ): AdministrativeUnitTypeParentField {
    return {
      id,
      name,
      category,
      categoryIcon,
      value: signal(value),
      parentId: signal<string | null>(null),
      options: signal<AdministrativeUnitBasic[]>([]),
    };
  }

  private filterByCategory(units: AdministrativeUnitBasic[], category: string) {
    if (category !== 'RURAL' && category !== 'URBAN') {
      return units;
    }
    return units.filter((x) => (x.category ?? '').toUpperCase().includes(category));
  }

  private populateHierarchy(hierarchy: AdministrativeUnitHierarchyItem[]) {
    if (!this.parentTypes().length) {
      return;
    }

    // First level has no parent
    this.parentTypes()[0].parentId.set(null);

    this.populateLevel(0, hierarchy);
  }

  private populateLevel(index: number, hierarchy: AdministrativeUnitHierarchyItem[]) {
    const fields = this.parentTypes();

    if (index >= fields.length) return;

    const field = fields[index];

    this.administrativeUnitService.loadChildren(field.parentId()).subscribe({
      next: (result) => {
        field.options.set(this.filterByCategory(result, field.category));

        // The hierarchy can be shorter than the parent fields, so stop once it runs
        // out and leave the remaining dropdowns for the user to fill in.
        const hierarchyItem = hierarchy[index];
        if (!hierarchyItem) return;

        // Set selected value from model
        field.value.set(hierarchyItem.id ?? null);

        // Set parent for next dropdown
        if (index + 1 < fields.length) {
          fields[index + 1].parentId.set(hierarchyItem.id);

          this.populateLevel(index + 1, hierarchy);
        }
      },
      error: () => {
        field.options.set([]);
      },
    });
  }
}
