import { Component, computed, inject, model, signal } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { LucideDynamicIcon } from '@lucide/angular';
import { EMPTY_UUID } from 'qubefin-core';
import { OrganizationUnitTypeStore } from '../../../../../global/stores/organization-unit-type-store';
import { OrganizationUnitService } from '../../../../../global/services/organization-unit-service';
import { OrganizationUnit } from '../../../../../global/models/organization-unit';
import { EmployeeStore } from '../../../../stores/employee-store';
import { IPanelistOption } from '../../../../models/panel-tagging';

/** Picks panelists: organization unit type -> organization unit -> employees of that unit. The selection is
 * kept across units, so panelists can come from several units. */
@Component({
  selector: 'qfin-panelist-picker',
  imports: [MatFormFieldModule, MatSelectModule, MatCheckboxModule, LucideDynamicIcon],
  templateUrl: './panelist-picker.html',
})
export class PanelistPicker {
  private readonly organizationUnitTypeStore = inject(OrganizationUnitTypeStore);
  private readonly organizationUnitService = inject(OrganizationUnitService);
  private readonly employeeStore = inject(EmployeeStore);

  readonly selected = model<IPanelistOption[]>([]);

  protected readonly organizationUnitTypes = this.organizationUnitTypeStore.organizationUnitTypes;
  protected readonly organizationUnits = signal<OrganizationUnit[]>([]);
  protected readonly organizationUnitTypeId = signal<string>('');
  protected readonly organizationUnitId = signal<string>('');
  protected readonly searchTerm = signal('');
  protected readonly employeesLoading = computed(() => this.employeeStore.employeesByOrgUnitResource.isLoading());

  private readonly employees = computed(() =>
    this.organizationUnitId() ? (this.employeeStore.employeesByOrgUnit() as IPanelistOption[]) : [],
  );
  protected readonly filteredEmployees = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const list = this.employees();
    if (!term) return list;
    return list.filter(
      (e) =>
        e.name?.toLowerCase().includes(term) ||
        e.code?.toLowerCase().includes(term) ||
        e.currentDesignation?.toLowerCase().includes(term),
    );
  });
  protected readonly hasEmployees = computed(() => this.employees().length > 0);

  constructor() {
    // The employee list lives in a shared store - start from a clean unit every time the picker opens.
    this.employeeStore.setSearchOrganizationUnitId(null);
  }

  protected onTypeChange(typeId: string) {
    this.organizationUnitTypeId.set(typeId);
    this.organizationUnitId.set('');
    this.organizationUnits.set([]);
    this.employeeStore.setSearchOrganizationUnitId(null);
    if (!typeId || typeId === EMPTY_UUID) return;
    this.organizationUnitService
      .getOrganizationUnitByType(typeId)
      .subscribe((units: any) => this.organizationUnits.set(units ?? []));
  }

  protected onUnitChange(unitId: string) {
    this.organizationUnitId.set(unitId);
    this.employeeStore.setSearchOrganizationUnitId(unitId || null);
  }

  protected isSelected(id: string): boolean {
    return this.selected().some((e) => e.id === id);
  }

  protected toggle(employee: IPanelistOption, checked: boolean) {
    this.selected.update((current) =>
      checked
        ? current.some((e) => e.id === employee.id)
          ? current
          : [...current, employee]
        : current.filter((e) => e.id !== employee.id),
    );
  }

  protected initials(name: string | null | undefined): string {
    if (!name) return '?';
    return name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join('');
  }
}
