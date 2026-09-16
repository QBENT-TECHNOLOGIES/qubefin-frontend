import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  form,
  FormField,
  pattern,
  readonly,
  required,
  schema,
  Schema,
} from '@angular/forms/signals';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { AlertService, EMPTY_UUID } from 'qubefin-core';
import { LucideDynamicIcon } from '@lucide/angular';
import { CandidateStore } from '../../../../stores/candidate-store';
import { CandidateService } from '../../../../services/candidate-service';
import { ICandidate, ICandidateDetail } from '../../../../models/candidate';
import { DatePipe } from '@angular/common';
import { AttendanceRegularizationsStore } from '../../../../stores/attendance-regularizations-store';
import { CompanyStore } from '../../../../../global/stores/company-store';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { ApprovalWorkflowStore } from '../../../../stores/approval-workflow-store';
import { DateAdapter } from '@angular/material/core';
@Component({
  selector: 'qfin-candidate-detail',
  imports: [
    CommonModule,
    FormField,
    MatFormFieldModule,
    MatCheckboxModule,
    MatIconModule,
    MatInputModule,
    LucideDynamicIcon,
    MatSelectModule,
    MatDatepickerModule,
  ],
  providers: [DatePipe],
  templateUrl: './candidate-detail.html',
  styles: ``,
})
export class CandidateDetail {
  readonly datePipe = inject(DatePipe);
  readonly dateAdapter = inject(DateAdapter<Date>);
  // readonly approvalWorkflowstore = inject(ApprovalWorkflowStore);
  private readonly attendRegularizationsStore = inject(AttendanceRegularizationsStore);
  private readonly candidateService = inject(CandidateService);
  private readonly alertService = inject(AlertService);
  private readonly candidateStore = inject(CandidateStore);
  readonly companyStore = inject(CompanyStore);
  readonly companies = this.companyStore.companies;
  readonly posts = this.candidateStore.posts;
  protected readonly genders = computed(() => this.filterUtility('GENDER'));
  private filterUtility(sysKey: string) {
    const list = this.attendRegularizationsStore.utilities();
    return list.length > 0 ? list.filter((m: any) => m.sysKey === sysKey) : [];
  }
  readonly candidateId = input<string>(EMPTY_UUID);

  readonly cancel = output<void>();
  readonly save = output<void>();

  readonly isEditMode = computed(() => !!this.candidateId() && this.candidateId() !== EMPTY_UUID);

  readonly formModel = signal<ICandidateDetail>(this.createEmptyModel());

  readonly candidateSchema: Schema<ICandidateDetail> = schema((path) => {
    required(path.firstName, {
      message: 'First Name is required',
    });
    required(path.lastName, {
      message: 'Last Name is required',
    });
    required(path.gender, {
      message: 'Gender is required',
    });
    required(path.mobileNo, {
      message: 'Mobile No is required',
    });
    required(path.companyId, {
      message: 'Company is required',
    });
    required(path.interviewDate, {
      message: 'Interview Date is required',
    });
    required(path.interviewPost, {
      message: 'Interview Post is required',
    });

    pattern(path.mobileNo, /^[6-9]\d{9}$/, { message: 'Enter a valid 10-digit mobile number' });
  });
  protected readonly candidateForm = form(this.formModel, this.candidateSchema);
  constructor() {
    this.dateAdapter.setLocale('en-GB');
    //   effect(() => {
    //     const id = this.candidateId();
    //     const editMode = this.isEditMode();

    //     this.candidateStore.setCandidateId(editMode && id !== EMPTY_UUID ? id : undefined);

    //     if (!editMode || id === EMPTY_UUID) {
    //       this.formModel.set(this.createEmptyModel());
    //     }
    //   });

    // effect(() => {
    //   const candidate = this.candidateStore.candidate();

    //   if (!this.isEditMode() || !candidate) {
    //     return;
    //   }

    //   this.formModel.set({
    //     companyId: candidate.companyId,
    //     firstName: candidate.firstName,
    //     lastName: candidate.lastName,
    //     gender: candidate.gender,
    //     mobileNo: candidate.mobileNo,
    //     interviewDate: candidate.interviewDate,
    //     interviewPost: candidate.interviewPost,
    //   });
    // });
  }
  onCancel() {
    this.cancel.emit();
  }

  onSubmit() {
    this.candidateForm().markAsTouched();
    if (!this.candidateForm().valid()) {
      return;
    }
    const formValue = this.candidateForm().value();
    const dataToSave: any = {
      ...formValue,
      interviewDate: this.datePipe.transform(formValue.interviewDate, 'yyyy-MM-dd'),
    };
    this.candidateService.createCandidate(dataToSave).subscribe({
      next: (resp: any) => {
        this.alertService.success('Success', resp).then(() => {
          this.candidateStore.refreshList();
          this.save.emit();
        });
      },
      error: (err: any) => {},
    });
  }
  private createEmptyModel(): ICandidateDetail {
    return {
      companyId: '',
      firstName: '',
      lastName: '',
      gender: '',
      mobileNo: '',
      interviewDate: '',
      interviewPost: '',
    };
  }
}
