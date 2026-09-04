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
import { form, FormField, readonly, required, schema, Schema } from '@angular/forms/signals';
import { OrganizationUnitBasic } from '../../models/organization-unit-tree-node';
import { AlertService, EMPTY_UUID, TimePickerDialogComponent } from 'qubefin-core';
import { OrganizationUnitType } from '../../models/organization-unit-type';
import { OrganizationUnitService } from '../../services/organization-unit-service';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { LucideDynamicIcon } from '@lucide/angular';
import { IComapnyList } from '../../models/company';
import { CompanyService } from '../../services/company-service';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

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
    MatDialogModule,
  ],
  templateUrl: './organization-unit-detail.html',
})
export class OrganizationUnitDetailComponent {
  private readonly dialog = inject(MatDialog);
  companyService = inject(CompanyService);
  organizationUnitStore = inject(OrganizationUnitStore);
  organizationUnitTypeStore = inject(OrganizationUnitTypeStore);
  organizationUnitService = inject(OrganizationUnitService);
  alertService = inject(AlertService);

  companies = signal<IComapnyList[]>([]);

  organizationUnitId = model<string>('');
  cancel = output<void>();
  private readonly hierarchyInitialized = signal(false);
  readonly iconMap = APP_ICONS_MAP;

  organizationUnit = this.organizationUnitStore.organizationUnit;
  organizationUnitTypes = this.organizationUnitTypeStore.organizationUnitTypes;
  isBranchSelected = computed(() => {
    const typeId = this.organizationUnitForm.organizationUnitTypeId().value();
    if (!typeId) return false;

    const selectedType = this.organizationUnitTypes().find((x) => x.id === typeId);
    return selectedType?.name === 'Branch';
  });
  constructor() {
    this.companyService.getAll().subscribe((companies: any) => {
      this.companies.set(
        companies.map((company: any) => ({ ...company, name: company.name.trim() })),
      );
    });
    effect(() => {
      const id = this.organizationUnitId();
      this.organizationUnitStore.setOrganizationUnitId(id);
    });
    effect(() => {
      if (this.organizationUnitId() === EMPTY_UUID) {
        this.organizationUnitModel.set({
          id: '',
          name: '',
          organizationUnitTypeId: '',
          organizationUnitTypeIcon: '',
          organizationUnitTypeName: '',
          parentId: '',
          parentName: '',
          isActive: true,
          companyId: '',
          latitude: null,
          longitude: null,
          attendanceInTime: '',
          attendanceOutTime: '',
          checkRadiusInMeter: null,
          createdBy: '',
          createdOn: new Date(),
          hierarchy: [],
          designations: [],
        });
        this.parentTypes.set([]);
        return;
      }

      const unit = this.organizationUnit();

      if (!unit) return;

      this.organizationUnitModel.set({
        ...unit,
        companyId: unit.companyId ?? '',
        latitude: unit.latitude ?? null,
        longitude: unit.longitude ?? null,
        checkRadiusInMeter: unit.checkRadiusInMeter ?? null,
        attendanceInTime: this.formatTo12Hour(unit.attendanceInTime),
        attendanceOutTime: this.formatTo12Hour(unit.attendanceOutTime),
      });
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
    companyId: '',
    latitude: null,
    longitude: null,
    attendanceInTime: '',
    attendanceOutTime: '',
    checkRadiusInMeter: null,
    createdBy: '',
    createdOn: new Date(),
    hierarchy: [],
    designations: [],
  });
  protected readonly organizationUnitSchema: Schema<OrganizationUnit> = schema((path) => {
    required(path.name, { message: 'Organization Unit Name is required' });
    required(path.organizationUnitTypeId, { message: 'Organization Unit Type is required' });
    required(path.companyId, {
      message: 'Company is required',
      when: () => this.isBranchSelected(),
    });
    required(path.attendanceInTime, {
      message: 'In Time is required',
      when: () => this.isBranchSelected(),
    });
    required(path.attendanceOutTime, {
      message: 'Out Time is required',
      when: () => this.isBranchSelected(),
    });
    required(path.checkRadiusInMeter, {
      message: 'Check Radius is required',
      when: () => this.isBranchSelected(),
    });
    required(path.latitude, {
      message: 'Latitude is required',
      when: () => this.isBranchSelected(),
    });
    required(path.longitude, {
      message: 'Longitude is required',
      when: () => this.isBranchSelected(),
    });
    readonly(path.attendanceInTime, { when: () => true });
    readonly(path.attendanceOutTime, { when: () => true });
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
  openInTimePicker() {
    const currentTime = this.organizationUnitModel().attendanceInTime;
    this.openTimePicker('In Time', currentTime, (time: string) => {
      this.organizationUnitModel.update((m) => ({ ...m, attendanceInTime: time }));
    });
  }

  openOutTimePicker() {
    const currentTime = this.organizationUnitModel().attendanceOutTime;
    this.openTimePicker('Out Time', currentTime, (time: string) => {
      this.organizationUnitModel.update((m) => ({ ...m, attendanceOutTime: time }));
    });
  }

  private openTimePicker(title: string, currentTime: string, callback: (time: string) => void) {
    let currentHour = 12;
    let currentMinute = 0;
    let currentPeriod: 'AM' | 'PM' = 'AM';

    if (currentTime) {
      const parts = currentTime.split(' ');
      const timeParts = parts[0].split(':');
      currentHour = parseInt(timeParts[0], 10) || 12;
      currentMinute = parseInt(timeParts[1], 10) || 0;
      if (parts[1]) {
        currentPeriod = parts[1] as 'AM' | 'PM';
      } else {
        currentPeriod = currentHour >= 12 ? 'PM' : 'AM';
        currentHour = currentHour % 12 || 12;
      }
    }

    const dialogRef = this.dialog.open(TimePickerDialogComponent, {
      width: '340px',
      maxWidth: '95vw',
      panelClass: 'custom-time-picker-dialog',
      data: { title, currentHour, currentMinute, currentPeriod },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result && result.formatted) {
        callback(result.formatted);
      }
    });
  }

  private formatTo12Hour(time: string | null | undefined): string {
    if (!time) return '';

    const parts = time.trim().split(' ');
    const timePart = parts[0];

    const [hoursStr, minutesStr] = timePart.split(':');
    let hours = parseInt(hoursStr, 10);
    const minutes = parseInt(minutesStr, 10);

    if (isNaN(hours) || isNaN(minutes)) {
      return '';
    }

    // Already 12-hour format
    if (parts[1]) {
      const period = parts[1].toUpperCase();
      hours = hours % 12 || 12;

      return `${hours.toString().padStart(2, '0')}:${minutes
        .toString()
        .padStart(2, '0')} ${period}`;
    }

    // Convert 24-hour -> 12-hour
    const period = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${period}`;
  }
  private formatTimeForApi(timeStr: string | null | undefined): string {
    if (!timeStr) return '';

    if (timeStr.includes('AM') || timeStr.includes('PM')) {
      const parts = timeStr.trim().split(/\s+/);
      const timeParts = parts[0].split(':');

      let hour = parseInt(timeParts[0], 10);
      const minute = parseInt(timeParts[1] || '0', 10);
      const period = parts[1]?.toUpperCase();

      if (period === 'PM' && hour !== 12) hour += 12;
      if (period === 'AM' && hour === 12) hour = 0;

      return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`;
    }

    const timeParts = timeStr.split(':');
    const h = String(timeParts[0] || '0').padStart(2, '0');
    const m = String(timeParts[1] || '0').padStart(2, '0');
    const s = String(timeParts[2] || '0').padStart(2, '0');

    return `${h}:${m}:${s}`;
  }
  onSubmit() {
    this.organizationUnitForm().markAsTouched();
    if (!this.organizationUnitForm().valid()) {
      return;
    }
    const parents = this.parentTypes();
    for (let i = 0; i < parents.length; i++) {
      if (!parents[i].value()) {
        this.alertService.warning('Validation Error', `Please select ${parents[i].name}.`);
        return;
      }
    }
    const dataToSave = this.organizationUnitForm().value() as any;
    dataToSave.parentId = this.parentTypes().at(-1)?.value()!;
    dataToSave.companyId = dataToSave.companyId ? dataToSave.companyId : null;
    dataToSave.attendanceInTime = dataToSave.attendanceInTime
      ? this.formatTimeForApi(dataToSave.attendanceInTime)
      : null;
    dataToSave.attendanceOutTime = dataToSave.attendanceOutTime
      ? this.formatTimeForApi(dataToSave.attendanceOutTime)
      : null;
    if (this.organizationUnitId() === EMPTY_UUID) {
      this.organizationUnitService.create(dataToSave).subscribe({
        next: (resp: any) => {
          this.alertService.success('Success', resp).then(() => {
            this.organizationUnitStore.refreshTree();
            this.cancel.emit();
          });
        },
        error: (err: any) => {},
      });
    } else {
      this.organizationUnitService.update(this.organizationUnitId(), dataToSave).subscribe({
        next: (resp: any) => {
          this.alertService.success('Success', resp).then(() => {
            this.organizationUnitStore.refreshTree();
            this.cancel.emit();
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
