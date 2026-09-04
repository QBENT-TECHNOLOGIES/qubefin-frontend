import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { form, FormField, readonly, required, schema, Schema } from '@angular/forms/signals';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatTableModule } from '@angular/material/table';
import { DateAdapter, provideNativeDateAdapter } from '@angular/material/core';
import { LucideDynamicIcon } from '@lucide/angular';
import { AlertService, EMPTY_UUID } from 'qubefin-core';

import { HolidayStore } from '../../../stores/holiday-store';
import { HolidayService } from '../../../services/holiday-service';
import { OrganizationUnitService } from '../../../../global/services/organization-unit-service';
import { IHolidayDetail } from '../../../models/holiday-detail';
import { OrganizationUnit } from '../../../../global/models/organization-unit';

export interface OrgUnitSelection extends OrganizationUnit {
  isSelected: boolean;
}

@Component({
  selector: 'qfin-holiday-detail',
  imports: [
    CommonModule,
    FormField,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatTableModule,
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

  readonly holidayId = input<string>(EMPTY_UUID);
  readonly cancel = output<void>();
  readonly save = output<void>();

  readonly isEditMode = computed(() => this.holidayId() !== EMPTY_UUID);

  readonly orgUnitsList = signal<OrgUnitSelection[]>([]);
  readonly orgUnitColumns = ['select', 'name'];

  readonly isAllOrgUnitsSelected = computed(
    () => this.orgUnitsList().length > 0 && this.orgUnitsList().every((ou) => ou.isSelected),
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

    this.orgUnitService.getAll().subscribe({
      next: (res: any) => {
        this.orgUnitsList.set(
          (res ?? []).map((ou: OrganizationUnit) => ({ ...ou, isSelected: false })),
        );
        this.syncOrgUnitsSelection();
      },
    });

    effect(() => {
      this.holidayStore.setHolidayId(this.holidayId());
    });

    effect(() => {
      const id = this.holidayId();
      const holiday = this.holidayStore.holiday();

      if (id === EMPTY_UUID) {
        this.formModel.set(this.createEmptyModel());
        this.orgUnitsList.update((list) => list.map((ou) => ({ ...ou, isSelected: false })));
        this.loadedForId = null;
        return;
      }

      if (!holiday || this.loadedForId === id) return;

      this.formModel.set({
        ...holiday,
        holidayDate: holiday.holidayDate ? (new Date(holiday.holidayDate) as any) : null,
      });

      this.syncOrgUnitsSelection();
      this.loadedForId = id;
    });
  }

  private syncOrgUnitsSelection() {
    const selectedOrgUnitIds = new Set(this.formModel().orgUnits?.map((ou) => ou.id) || []);

    this.orgUnitsList.update((list) =>
      list.map((ou) => ({
        ...ou,
        isSelected: selectedOrgUnitIds.has(ou.id),
      })),
    );
  }

  toggleAllOrgUnitSelection(checked: boolean) {
    this.orgUnitsList.update((current) => current.map((ou) => ({ ...ou, isSelected: checked })));
  }

  toggleOrgUnitSelection(index: number, checked: boolean) {
    this.orgUnitsList.update((current) => {
      const updated = [...current];
      updated[index] = { ...updated[index], isSelected: checked };
      return updated;
    });
  }

  protected onSubmit() {
    this.holidayForm().markAsTouched();
    if (!this.holidayForm().valid()) {
      return;
    }

    const selectedUnits = this.orgUnitsList().filter((ou) => ou.isSelected);

    if (selectedUnits.length === 0) {
      this.alertService.error('Validation Error', 'Please select at least one Organization Unit.');
      return;
    }
    const updatedDescription = this.holidayForm.description().value();
    const updatedDate = this.holidayForm.holidayDate().value();

    const payload: any = {
      ...this.formModel(),
      description: updatedDescription.trim(),
      holidayDate: this.datePipe.transform(updatedDate, 'yyyy-MM-dd'),
      orgUnitIds: selectedUnits.map((ou) => ou.id),
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
      this.holidayService.updateHoliday(this.holidayId(), payload).subscribe({
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
