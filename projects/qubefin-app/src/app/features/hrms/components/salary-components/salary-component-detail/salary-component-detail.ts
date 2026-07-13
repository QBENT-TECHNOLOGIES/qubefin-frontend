import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSelectModule } from '@angular/material/select';
import { EMPTY_UUID } from 'qubefin-core';
import { SalaryStore } from '../../../stores/salary-store';
import { SalaryComponentService } from '../../../services/salary-component-service';
import { form, FormField, required, schema, Schema } from '@angular/forms/signals';
import { ISalaryModel, SalaryModel } from '../../../models/salary';

@Component({
  selector: 'qfin-salary-component-detail',
  imports: [
    CommonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatSelectModule,
    MatCheckboxModule,
    FormField,
  ],
  templateUrl: './salary-component-detail.html',
})
export class SalaryComponentDetail {
  salaryId = input<string>(EMPTY_UUID);
  onCancel = output<void>();
  onSave = output<void>();

  private readonly salaryStore = inject(SalaryStore);
  private readonly salaryComponentService = inject(SalaryComponentService);
  categories = this.salaryStore.categories;

  isEditMode = computed(() => !!this.salaryId() && this.salaryId() !== EMPTY_UUID);

  protected readonly salaryModel = signal<ISalaryModel>(new SalaryModel());

  protected readonly salarySchema: Schema<ISalaryModel> = schema((path) => {
    required(path.name, { message: 'Name is required' });
    required(path.code, { message: 'Code is required' });
    required(path.categoryId, { message: 'Category is required' });
  });

  protected readonly salaryForm = form(this.salaryModel, this.salarySchema);

  constructor() {
    this.salaryStore.loadCategories();
    effect(() => {
      const id = this.salaryId();
      if (id && id !== EMPTY_UUID) {
        this.salaryStore.setSalaryComponentId(id);
      }
    });
    effect(() => {
      if (this.isEditMode()) {
        const detail = this.salaryStore.salaryComponent();
        if (detail) {
          this.salaryModel.set(detail);
        }
      } else {
        this.salaryModel.set(new SalaryModel());
      }
    });
  }

  onSubmit() {
    if (!this.salaryForm().valid()) {
      return;
    }

    const dataToSave = this.salaryForm().value();

    if (!this.isEditMode()) {
      this.salaryComponentService.create(dataToSave).subscribe({
        next: () => {
          this.salaryStore.refreshList();
          this.onSave.emit();
        },
        error: (err: any) => {
          if (err.error?.isError) {
          }
        }
      });
    } else {
      this.salaryComponentService.update(this.salaryId(), dataToSave).subscribe({
        next: () => {
          this.salaryStore.refreshList();
          this.salaryStore.refreshDetail();
          this.onSave.emit();
        },
        error: (err: any) => {
          if (err.error?.isError) {
          }
        }
      });
    }
  }

  onCancelClicked() {
    this.onCancel.emit();
  }
}