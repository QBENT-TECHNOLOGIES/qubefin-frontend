import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { form, FormField, readonly, required, schema, Schema } from '@angular/forms/signals';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { DateAdapter, provideNativeDateAdapter } from '@angular/material/core';
import { LucideDynamicIcon } from '@lucide/angular';
import { AlertService, EMPTY_UUID } from 'qubefin-core';

import { HolidayStore } from '../../../stores/holiday-store';
import { HolidayService } from '../../../services/holiday-service';
import { OrganizationUnitService } from '../../../../global/services/organization-unit-service';
import { IHolidayDetail } from '../../../models/holiday-detail';
import { OrganizationUnitLocation } from '../../../../global/models/organization-unit';

// A State, District or Unit row of the Applicable Organization Units tree.
export interface OrgUnitTreeNode {
  key: string;
  name: string;
  level: 'state' | 'district' | 'unit';
  typeName?: string;
  children: OrgUnitTreeNode[];
  // Ids of the units under this node that pass the current search.
  unitIds: string[];
}

const NO_DISTRICT_KEY = 'state:none';

@Component({
  selector: 'qfin-holiday-detail',
  imports: [
    CommonModule,
    FormField,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    LucideDynamicIcon,
  ],
  providers: [provideNativeDateAdapter(), DatePipe],
  templateUrl: './holiday-detail.html',
  styles: ``,
})
export class HolidayDetail {
  private readonly holidayStore = inject(HolidayStore);
  private readonly holidayService = inject(HolidayService);
  private readonly orgUnitService = inject(OrganizationUnitService);
  private readonly alertService = inject(AlertService);
  private readonly dateAdapter = inject(DateAdapter<Date>);
  private readonly datePipe = inject(DatePipe);

  readonly holidayDate = input<string | undefined>();
  readonly holidayId = input<string>(EMPTY_UUID);
  readonly cancel = output<void>();
  readonly save = output<void>();

  // readonly isEditMode = computed(() => this.holidayId() !== EMPTY_UUID);
  readonly isEditMode = computed(() => !!this.holidayDate());
  readonly orgUnits = signal<OrganizationUnitLocation[]>([]);
  readonly orgUnitsLoaded = signal(false);
  readonly selectedOrgUnitIds = signal<Set<string>>(new Set());
  readonly orgUnitSearch = signal('');
  readonly expandedNodes = signal<Set<string>>(new Set());

  // State > District > Unit, limited to units whose State, District or own name matches the search.
  // Units without a District are grouped under a 'No District' node at the bottom.
  readonly orgUnitTree = computed<OrgUnitTreeNode[]>(() => {
    const term = this.orgUnitSearch().trim().toLowerCase();
    const matches = (value: string | null) => !!value && value.toLowerCase().includes(term);
    const units = this.orgUnits().filter(
      (ou) => !term || matches(ou.stateName) || matches(ou.districtName) || matches(ou.name),
    );

    const states = new Map<string, OrgUnitTreeNode>();
    for (const ou of units) {
      const unitNode: OrgUnitTreeNode = {
        key: `unit:${ou.id}`,
        name: ou.name,
        level: 'unit',
        typeName: ou.organizationUnitTypeName,
        children: [],
        unitIds: [ou.id],
      };

      if (!ou.districtId) {
        const noDistrict = this.getOrAddNode(states, NO_DISTRICT_KEY, 'No District', 'state');
        noDistrict.children.push(unitNode);
        noDistrict.unitIds.push(ou.id);
        continue;
      }

      const state = this.getOrAddNode(
        states,
        `state:${ou.stateId}`,
        ou.stateName ?? 'Unknown State',
        'state',
      );
      const districts = new Map(state.children.map((d) => [d.key, d]));
      const district = this.getOrAddNode(
        districts,
        `district:${ou.districtId}`,
        ou.districtName ?? '',
        'district',
      );
      if (!state.children.includes(district)) state.children.push(district);

      district.children.push(unitNode);
      district.unitIds.push(ou.id);
      state.unitIds.push(ou.id);
    }

    const tree = [...states.values()];
    const noDistrictIndex = tree.findIndex((x) => x.key === NO_DISTRICT_KEY);
    if (noDistrictIndex >= 0) tree.push(...tree.splice(noDistrictIndex, 1));
    return tree;
  });

  readonly visibleUnitIds = computed(() => this.orgUnitTree().flatMap((x) => x.unitIds));
  readonly isAllOrgUnitsSelected = computed(() => this.isNodeChecked(this.visibleUnitIds()));
  readonly isSomeOrgUnitsSelected = computed(() =>
    this.isNodePartial(this.visibleUnitIds()),
  );

  protected readonly formModel = signal<IHolidayDetail>(this.createEmptyModel());

  private loadedForId: string | null = null;

  private createEmptyModel(): IHolidayDetail {
    return {
      id: EMPTY_UUID,
      description: '',
      holidayDate: '',
      orgUnits: [],
    };
  }

  protected readonly holidaySchema: Schema<IHolidayDetail> = schema((path) => {
    required(path.description, { message: 'Description is required' });
    required(path.holidayDate, { message: 'Holiday Date is required' });
    readonly(path.holidayDate, { when: () => true });
  });

  protected readonly holidayForm = form(this.formModel, this.holidaySchema);

  constructor() {
    this.dateAdapter.setLocale('en-GB');

    this.orgUnitService.getAllByLocation().subscribe({
      next: (res) => {
        this.orgUnits.set(res ?? []);
        this.orgUnitsLoaded.set(true);
      },
      error: () => this.orgUnitsLoaded.set(true),
    });
    effect(() => {
      this.holidayStore.setHolidayDate(this.holidayDate());
    });
    // effect(() => {
    //   this.holidayStore.setHolidayId(this.holidayId());
    // });

    effect(() => {
      const date = this.holidayDate();
      const holiday = this.holidayStore.holiday();

      // Check if there is no date provided (create mode)
      if (!date) {
        this.formModel.set(this.createEmptyModel());
        this.selectedOrgUnitIds.set(new Set());
        this.loadedForId = null; // Can rename this to loadedForDate if preferred
        return;
      }

      if (!holiday || this.loadedForId === date) return;

      this.formModel.set({
        ...holiday,
        holidayDate: holiday.holidayDate ? (new Date(holiday.holidayDate) as any) : null,
      });

      this.syncOrgUnitsSelection();
      this.loadedForId = date;
    });
  }

  private syncOrgUnitsSelection() {
    this.selectedOrgUnitIds.set(new Set(this.formModel().orgUnits?.map((ou) => ou.id) || []));
  }

  private getOrAddNode(
    nodes: Map<string, OrgUnitTreeNode>,
    key: string,
    name: string,
    level: OrgUnitTreeNode['level'],
  ): OrgUnitTreeNode {
    let node = nodes.get(key);
    if (!node) {
      node = { key, name, level, children: [], unitIds: [] };
      nodes.set(key, node);
    }
    return node;
  }

  isNodeChecked(unitIds: string[]): boolean {
    const selected = this.selectedOrgUnitIds();
    return unitIds.length > 0 && unitIds.every((id) => selected.has(id));
  }

  isNodePartial(unitIds: string[]): boolean {
    const selected = this.selectedOrgUnitIds();
    return !this.isNodeChecked(unitIds) && unitIds.some((id) => selected.has(id));
  }

  selectedCount(unitIds: string[]): number {
    const selected = this.selectedOrgUnitIds();
    return unitIds.filter((id) => selected.has(id)).length;
  }

  // Checking a State / District selects only the units under it that are visible with the current search.
  toggleUnits(unitIds: string[], checked: boolean) {
    this.selectedOrgUnitIds.update((current) => {
      const updated = new Set(current);
      unitIds.forEach((id) => (checked ? updated.add(id) : updated.delete(id)));
      return updated;
    });
  }

  // While searching every matching branch is shown open.
  isExpanded(key: string): boolean {
    return !!this.orgUnitSearch().trim() || this.expandedNodes().has(key);
  }

  toggleExpanded(key: string) {
    this.expandedNodes.update((current) => {
      const updated = new Set(current);
      if (!updated.delete(key)) updated.add(key);
      return updated;
    });
  }

  protected onSubmit() {
    this.holidayForm().markAsTouched();
    if (!this.holidayForm().valid()) {
      return;
    }

    const selectedUnitIds = [...this.selectedOrgUnitIds()];

    if (selectedUnitIds.length === 0) {
      this.alertService.error('Validation Error', 'Please select at least one Organization Unit.');
      return;
    }
    const updatedDescription = this.holidayForm.description().value();
    const updatedDate = this.holidayForm.holidayDate().value();

    const payload: any = {
      ...this.formModel(),
      description: updatedDescription.trim(),
      holidayDate: this.datePipe.transform(updatedDate, 'yyyy-MM-dd'),
      orgUnitIds: selectedUnitIds,
    };

    delete payload.orgUnits;

    if (!this.isEditMode()) {
      this.holidayService.createHoliday(payload).subscribe({
        next: (resp: any) => {
          this.alertService.success('Success', 'Holiday created successfully').then(() => {
            this.holidayStore.refreshList();
            this.save.emit();
          });
        },
      });
    } else {
      this.holidayService.updateHoliday(payload).subscribe({
        next: (resp: any) => {
          this.alertService.success('Success', 'Holiday updated successfully').then(() => {
            this.holidayStore.refreshList();
            this.holidayStore.refreshDetail();
            this.save.emit();
          });
        },
      });
    }
  }

  protected onCancelClicked() {
    this.cancel.emit();
  }
}
