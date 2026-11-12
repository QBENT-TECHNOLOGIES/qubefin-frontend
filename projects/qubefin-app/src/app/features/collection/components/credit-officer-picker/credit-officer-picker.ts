import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import {
  MatAutocompleteModule,
  MatAutocompleteSelectedEvent,
} from '@angular/material/autocomplete';
import { LucideDynamicIcon } from '@lucide/angular';
import { ICreditOfficer, ICreditOfficerBranch } from '../../models/credit-officer';
import { CreditOfficerStore } from '../../stores/credit-officer-store';

// Officer search box shared by both collection pages. Emits the designation id.
@Component({
  selector: 'qfin-credit-officer-picker',
  imports: [
    CommonModule,
    MatFormFieldModule,
    MatInputModule,
    MatAutocompleteModule,
    LucideDynamicIcon,
  ],
  templateUrl: './credit-officer-picker.html',
  styles: ``,
})
export class CreditOfficerPicker {
  private readonly creditOfficerStore = inject(CreditOfficerStore);

  // Injecting the store starts the call.
  protected readonly creditOfficers = this.creditOfficerStore.creditOfficers;
  protected readonly creditOfficersLoading = this.creditOfficerStore.creditOfficersLoading;

  readonly designationId = input<string>('');
  readonly designationIdChange = output<string>();

  protected readonly searchText = signal<string>('');
  protected readonly filterText = signal<string>('');

  protected readonly officerBranches = computed<ICreditOfficerBranch[]>(() => {
    const searchText = this.filterText().trim().toLowerCase();
    const branches = new Map<string, ICreditOfficer[]>();

    const matchedOfficers = this.creditOfficers().filter((officer) =>
      [
        officer.employeeName,
        officer.employeeCode,
        officer.organizationUnitName,
        officer.designationName,
      ].some((value) => value?.toLowerCase().includes(searchText)),
    );

    for (const officer of matchedOfficers) {
      const branchName = officer.organizationUnitName;
      branches.set(branchName, [...(branches.get(branchName) ?? []), officer]);
    }

    return [...branches.entries()]
      .map(([name, officers]) => ({ name, officers }))
      .sort((first, second) => first.name.localeCompare(second.name));
  });

  // A page reset empties the box.
  private readonly clearOnReset = effect(() => {
    if (!this.designationId()) {
      this.searchText.set('');
      this.filterText.set('');
    }
  });

  protected readonly officerLabel = (officer: ICreditOfficer | null): string => {
    if (!officer) {
      return '';
    }
    const code = officer.employeeCode ? ` (${officer.employeeCode})` : '';
    return `${officer.employeeName}${code} - ${officer.organizationUnitName}`;
  };

  protected getInitials(name: string): string {
    return name
      .split(' ')
      .filter((part) => part)
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join('');
  }

  // Typing over a choice drops the selection.
  protected search(text: string) {
    this.searchText.set(text);
    this.filterText.set(text);

    if (this.designationId()) {
      this.designationIdChange.emit('');
    }
  }

  protected select(event: MatAutocompleteSelectedEvent) {
    const officer = event.option.value as ICreditOfficer;
    this.searchText.set(this.officerLabel(officer));
    this.filterText.set('');
    this.designationIdChange.emit(officer.designationId);
  }
}
