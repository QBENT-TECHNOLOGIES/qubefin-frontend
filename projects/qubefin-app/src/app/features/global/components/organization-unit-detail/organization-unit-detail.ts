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
import { OrganizationUnitStore } from '../../stores/organization-unit-store';
import { OrganizationUnitTypeStore } from '../../stores/organization-unit-type-store';
import { APP_ICONS_MAP } from '../../../../lucide-icons';
import { OrganizationUnit } from '../../models/organization-unit';
import { form, FormField, required, schema, Schema } from '@angular/forms/signals';
import { OrganizationUnitBasic } from '../../models/organization-unit-tree-node';
import { AlertService, EMPTY_UUID } from 'qubefin-core';
import { OrganizationUnitType } from '../../models/organization-unit-type';
import { OrganizationUnitService } from '../../services/organization-unit-service';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { LucideDynamicIcon } from '@lucide/angular';

export interface OrganizationUnitTypeParentField {
  id: string;
  name: string;
  typeIcon: string;
  value: WritableSignal<string | null>;
  parentId: WritableSignal<string | null>;
  options: WritableSignal<OrganizationUnitBasic[]>;
}

@Component({
  selector: 'qfin-organization-unit-detail-component',
  imports: [
    FormField,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    LucideDynamicIcon,
  ],
  templateUrl: './organization-unit-detail.html',
})
export class OrganizationUnitDetailComponent {
  organizationUnitStore = inject(OrganizationUnitStore);
  organizationUnitTypeStore = inject(OrganizationUnitTypeStore);
  organizationUnitService = inject(OrganizationUnitService);
  alertService = inject(AlertService);

  organizationUnitId = model<string>('');
  cancel = output<void>();
  private readonly hierarchyInitialized = signal(false);
  readonly iconMap = APP_ICONS_MAP;

  organizationUnit = this.organizationUnitStore.organizationUnit;
  organizationUnitTypes = this.organizationUnitTypeStore.organizationUnitTypes;
  buttonText = computed(() => (this.organizationUnitId() === EMPTY_UUID ? 'Create' : 'Update'));

  constructor() {
    effect(() => {
      const id = this.organizationUnitId();
      this.organizationUnitStore.setOrganizationUnitId(id);
    });

    effect(() => {
      const unit = this.organizationUnit();

      if (!unit) return;

      this.organizationUnitModel.set(unit!);
    });

    effect(() => {
      const typeId = this.organizationUnitForm.organizationUnitTypeId().value();
      if (!typeId) return;

      this.hierarchyInitialized.set(false);
      const selectedType = this.organizationUnitTypes().find((x) => x.id === typeId);

      if (!selectedType) {
        this.parentTypes.set([]);
        return;
      }

      this.parentTypes.set(
        this.getParents(selectedType).map((parent, index) =>
          this.createParentField(parent.id, parent.name, parent.typeIcon, null),
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

      const hierarchy = this.organizationUnitModel().hierarchy;

      if (hierarchy.length === 0) {
        this.loadOptionsForParentField(0);
      } else {
        this.populateHierarchy();
      }

      this.hierarchyInitialized.set(true);
    });
  }

  protected readonly organizationUnitModel = signal<OrganizationUnit>({
    id: '',
    name: '',
    organizationUnitTypeId: '',
    organizationUnitTypeIcon: '',
    organizationUnitTypeName: '',
    parentId: '',
    parentName: '',
    isActive: true,
    createdBy: '',
    createdOn: new Date(),
    hierarchy: [],
    designations: [],
  });
  protected readonly organizationUnitSchema: Schema<OrganizationUnit> = schema((path) => {
    required(path.name, { message: 'Organization Unit Name is required' });
  });
  protected readonly organizationUnitForm = form(
    this.organizationUnitModel,
    this.organizationUnitSchema,
  );

  parentTypes = signal<OrganizationUnitTypeParentField[]>([]);

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
    if (!this.organizationUnitForm().valid()) {
      return;
    }

    const dataToSave = this.organizationUnitForm().value();
    dataToSave.parentId = this.parentTypes().at(-1)?.value()!;
    if (this.organizationUnitId() === EMPTY_UUID) {
      this.organizationUnitService.create(dataToSave).subscribe({
        next: (resp: any) => {
          this.alertService.success('Success', resp).then(() => {
            this.organizationUnitStore.refreshTree();
          });
        },
        error: (err: any) => {},
      });
    } else {
      this.organizationUnitService.update(this.organizationUnitId(), dataToSave).subscribe({
        next: (resp: any) => {
          this.alertService.success('Success', resp).then(() => {
            this.organizationUnitStore.refreshTree();
            this.organizationUnitStore.refresh();
            this.onCancel();
          });
        },
        error: (err: any) => {},
      });
    }
  }

  onCancel() {
    this.cancel.emit();
  }

  private loadOptionsForParentField(index: number) {
    const field = this.parentTypes()[index];
    this.organizationUnitService.loadChildren(field.parentId()).subscribe({
      next: (result) => {
        field.options.set(result);
      },
      error: () => {
        field.options.set([]);
      },
    });
  }

  private getParents(selected: OrganizationUnitType): OrganizationUnitType[] {
    return this.organizationUnitTypes()
      .filter((x) => {
        return x.levelNo < selected.levelNo;
      })
      .sort((a, b) => a.levelNo - b.levelNo);
  }

  private createParentField(
    id: string,
    name: string,
    typeIcon: string,
    value: string | null,
  ): OrganizationUnitTypeParentField {
    return {
      id,
      name,
      typeIcon,
      value: signal(value),
      parentId: signal<string | null>(null),
      options: signal<OrganizationUnitBasic[]>([]),
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
    const hierarchy = this.organizationUnitModel().hierarchy;
    const fields = this.parentTypes();

    if (index >= fields.length) return;

    const field = fields[index];

    this.organizationUnitService.loadChildren(field.parentId()).subscribe({
      next: (result) => {
        field.options.set(result);

        if (hierarchy.length > 0) {
          // Set selected value from model
          field.value.set(hierarchy[index].id ?? null);

          // Set parent for next dropdown
          if (index + 1 < fields.length) {
            fields[index + 1].parentId.set(hierarchy[index].id);

            this.populateLevel(index + 1);
          }
        }
      },
    });
  }
}
