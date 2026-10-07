import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  disabled,
  form,
  FormField,
  maxLength,
  pattern,
  required,
  schema,
  Schema,
} from '@angular/forms/signals';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { AlertService, DocumentModalService, EMPTY_UUID } from 'qubefin-core';
import { LucideDynamicIcon } from '@lucide/angular';
import { MatStepperModule } from '@angular/material/stepper';
import { MatDialog } from '@angular/material/dialog';
import { CandidateStore } from '../../../../stores/candidate-store';
import { CandidateService } from '../../../../services/candidate-service';
import { ICandidateDetail } from '../../../../models/candidate';
import { DatePipe } from '@angular/common';
import { AttendanceRegularizationsStore } from '../../../../stores/attendance-regularizations-store';
import { CompanyStore } from '../../../../../global/stores/company-store';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { DateAdapter, provideNativeDateAdapter } from '@angular/material/core';
import { DepartmentStore } from '../../../../stores/department-store';
import { OrganizationUnitService } from '../../../../../global/services/organization-unit-service';
import { OrganizationUnitTypeStore } from '../../../../../global/stores/organization-unit-type-store';
import { AdministrativeUnitStore } from '../../../../../global/stores/administrative-unit-store';
import { AdministrativeUnitTreeNode } from '../../../../../global/models/administrative-unit-tree-node';
import { openTimePicker, toApiTime, toDisplayTime, toLocalDate } from '../../interview-time';

/** CV / job application picked on the form. `fileUrl` is the stored file, `rawFile` a newly picked one that has
 * not been saved yet. */
interface CandidateDocument {
  fileName: string;
  fileUrl: string;
  rawFile: File | null;
}

type CandidateDocumentField = 'cv' | 'jobApplication';

const emptyDocument = (): CandidateDocument => ({ fileName: '', fileUrl: '', rawFile: null });

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
    MatStepperModule,
  ],
  providers: [provideNativeDateAdapter(), DatePipe],
  templateUrl: './candidate-detail.html',
  styles: ``,
})
export class CandidateDetail {
  readonly datePipe = inject(DatePipe);
  readonly dateAdapter = inject(DateAdapter<Date>);
  private readonly attendRegularizationsStore = inject(AttendanceRegularizationsStore);
  private readonly candidateService = inject(CandidateService);
  private readonly alertService = inject(AlertService);
  private readonly documentModal = inject(DocumentModalService);
  private readonly dialog = inject(MatDialog);
  private readonly candidateStore = inject(CandidateStore);
  readonly companyStore = inject(CompanyStore);

  private readonly administrativeUnitStore = inject(AdministrativeUnitStore);
  private readonly departmentStore = inject(DepartmentStore);
  private readonly organizationUnitService = inject(OrganizationUnitService);

  readonly departments = this.departmentStore.departments;
  readonly organizationUnits = signal<any[]>([]);
  private readonly organizationUnitTypeStore = inject(OrganizationUnitTypeStore);
  readonly organizationUnitTypes = this.organizationUnitTypeStore.organizationUnitTypes;
  /** Units of the selected type, for the Posted Organization Unit dropdown. */
  readonly postedOrganizationUnits = signal<any[]>([]);

  /** Address: the country (shown read-only) and its states - the candidate's AdministrativeUnitId is the state. */
  readonly countries = this.administrativeUnitStore.administrativeUnitTree;
  readonly states = computed<AdministrativeUnitTreeNode[]>(() => {
    const countryId = this.formModel().countryId;
    return this.countries().find((c) => c.id === countryId)?.children ?? [];
  });

  protected readonly documentFields: { key: CandidateDocumentField; label: string; icon: string }[] = [
    { key: 'cv', label: 'CV', icon: 'file-user' },
    { key: 'jobApplication', label: 'Job Application', icon: 'file-text' },
  ];
  protected readonly cvDocument = signal<CandidateDocument>(emptyDocument());
  protected readonly jobApplicationDocument = signal<CandidateDocument>(emptyDocument());

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

  /** Joining details only apply once the panel's assessments are in - until then the Address step is the last
   *  one and saves the form itself. */
  readonly showJoiningStep = computed(() => {
    const candidate = this.candidateStore.candidate();
    return (
      this.isEditMode() &&
      candidate?.id === this.candidateId() &&
      !!candidate?.isAllPanelAssessmentSubmitted
    );
  });

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
    required(path.email, {
      message: 'Email is required',
    });
    required(path.fatherName, {
      message: 'Father is required',
    });

    required(path.companyId, {
      message: 'Company is required',
    });
    // The reference number is issued per company, so the company is fixed once the candidate exists.
    disabled(path.companyId, () => this.isEditMode());
    required(path.interviewPost, {
      message: 'Interview Post is required',
    });
    required(path.departmentId, {
      message: 'Department Post is required',
    });
    required(path.VenueOrganizationUnitId, {
      message: 'Venue Organization Unit is required',
    });

    // Country is fixed - only its states are offered.
    disabled(path.countryId, () => true);
    required(path.administrativeUnitId, { message: 'State is required' });
    required(path.address, { message: 'Address is required' });
    maxLength(path.address, 200, { message: 'Address cannot exceed 200 characters' });
    required(path.pinCode, { message: 'Pin Code is required' });

    pattern(path.mobileNo, /^[6-9]\d{9}$/, { message: 'Enter a valid 10-digit mobile number' });
    pattern(path.monthlyCostCompany, /^\d+(\.\d{1,2})?$/, {
      message: 'Enter a valid amount',
    });
    pattern(path.pinCode, /^\d{6}$/, {
      message: 'Pin code must be exactly 6 digits (Characters are not allowed)',
    });
    pattern(path.email, /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, {
      message: 'Enter a valid Email Id',
    });
  });
  protected readonly candidateForm = form(this.formModel, this.candidateSchema);
  /** Edit mode fills the form once, from the candidate the view already loaded. */
  private loadedCandidateId: string | null = null;

  constructor() {
    this.dateAdapter.setLocale('en-GB');
    effect(() => {
      if (this.isEditMode()) {
        this.candidateStore.setCandidateId(this.candidateId());
      }
    });
    effect(() => {
      const candidate: any = this.candidateStore.candidate();
      if (!this.isEditMode() || !candidate || candidate.id !== this.candidateId()) return;
      if (this.loadedCandidateId === candidate.id) return;
      this.loadedCandidateId = candidate.id;
      this.populateForm(candidate);
    });
    // Place the saved administrative unit on its country / state once the tree is loaded. Older candidates may
    // hold a deeper unit (district, block...) - the address now records the state it belongs to.
    effect(() => {
      const tree = this.countries();
      const model = this.formModel();
      if (tree.length === 0 || model.countryId) return;

      const path = model.administrativeUnitId ? this.findPath(tree, model.administrativeUnitId) : [];
      this.formModel.update((m) => ({
        ...m,
        countryId: path[0]?.id ?? tree[0].id,
        administrativeUnitId: path[1]?.id ?? '',
      }));
    });
    // The saved posted unit only carries its id - take its type from the full unit list (which loads
    // independently) so both dropdowns show the saved selection.
    effect(() => {
      const model = this.formModel();
      const units = this.organizationUnits();
      if (
        !model.postedOrganizationUnitId ||
        model.postedOrganizationUnitTypeId ||
        units.length === 0
      )
        return;
      const unit = units.find((u: any) => u.id === model.postedOrganizationUnitId);
      if (unit?.organizationUnitTypeId) {
        this.formModel.update((m) => ({
          ...m,
          postedOrganizationUnitTypeId: unit.organizationUnitTypeId,
        }));
        this.loadPostedOrganizationUnits(unit.organizationUnitTypeId);
      }
    });
    this.organizationUnitService.getAll().subscribe((res: any) => {
      this.organizationUnits.set(res);
    });
  }

  openReportingTimePicker() {
    openTimePicker(this.dialog, 'Reporting Time', this.formModel().reportingTime, (time: string) => {
      this.formModel.update((m) => ({ ...m, reportingTime: time }));
    });
  }

  onPostedOrganizationUnitTypeChange(typeId: string) {
    this.formModel.update((m) => ({ ...m, postedOrganizationUnitId: '' }));
    this.loadPostedOrganizationUnits(typeId);
  }

  private loadPostedOrganizationUnits(typeId: string) {
    if (!typeId) {
      this.postedOrganizationUnits.set([]);
      return;
    }
    this.organizationUnitService.getOrganizationUnitByType(typeId).subscribe({
      next: (res: any) => this.postedOrganizationUnits.set(res ?? []),
    });
  }

  // ============================================================
  // CV / JOB APPLICATION
  // ============================================================

  private documentSignal(field: CandidateDocumentField) {
    return field === 'cv' ? this.cvDocument : this.jobApplicationDocument;
  }

  onDocumentSelected(event: Event, field: CandidateDocumentField) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      this.alertService.warning(null, 'Please choose an image or a PDF file.');
      return;
    }

    this.documentSignal(field).update((doc) => ({ ...doc, fileName: file.name, rawFile: file }));
  }

  /** Drops a newly picked file - an already stored one comes back. */
  removeDocument(field: CandidateDocumentField) {
    this.documentSignal(field).update((doc) =>
      doc.fileUrl ? { ...doc, rawFile: null, fileName: this.fileNameFromUrl(doc.fileUrl) } : emptyDocument(),
    );
  }

  openDocument(field: CandidateDocumentField) {
    const doc = this.documentSignal(field)();
    const url = doc.rawFile ? URL.createObjectURL(doc.rawFile) : doc.fileUrl;
    if (!url) return;

    const name = doc.fileName || (field === 'cv' ? 'CV' : 'Job Application');
    this.documentModal.open({
      url,
      documentName: name,
      extension: name.split('.').pop()?.toLowerCase() || '',
      downloadAccess: true,
    });
  }

  private fileNameFromUrl(url: string | null | undefined): string {
    if (!url) return '';
    const name = decodeURIComponent(url.split('?')[0].split('/').pop() ?? '');
    // Stored keys are "<ticks>_<original name>".
    return name.replace(/^\d+_/, '');
  }

  onCancel() {
    this.cancel.emit();
  }

  onSubmit() {
    this.candidateForm().markAsTouched();
    if (!this.candidateForm().valid()) {
      return;
    }
    if (!this.cvDocument().fileName || !this.jobApplicationDocument().fileName) {
      this.alertService.warning(null, 'Please upload both the CV and the Job Application.');
      return;
    }

    const { postedOrganizationUnitTypeId, countryId, ...formValue } = this.candidateForm().value();
    const dataToSave: Record<string, unknown> = {
      ...formValue,
      companyId: this.formModel().companyId,
      address: formValue.address?.trim(),
      postedOrganizationUnitId: formValue.postedOrganizationUnitId || null,
      dateOfJoining: formValue.dateOfJoining
        ? this.datePipe.transform(formValue.dateOfJoining, 'yyyy-MM-dd')
        : null,
      reportingTime: toApiTime(formValue.reportingTime),
      monthlyCostCompany: formValue.monthlyCostCompany
        ? Number(formValue.monthlyCostCompany)
        : null,
      administrativeUnitId: formValue.administrativeUnitId || null,
      departmentId: formValue.departmentId || null,
      VenueOrganizationUnitId: formValue.VenueOrganizationUnitId || null,
    };

    const cvFile = this.cvDocument().rawFile;
    const jobApplicationFile = this.jobApplicationDocument().rawFile;
    const request = this.isEditMode()
      ? this.candidateService.updateCandidate(this.candidateId(), dataToSave, cvFile, jobApplicationFile)
      : this.candidateService.createCandidate(dataToSave, cvFile, jobApplicationFile);
    request.subscribe({
      next: (resp: any) => {
        this.alertService.success('Success', resp).then(() => {
          this.candidateStore.refreshList();
          if (this.isEditMode()) {
            this.candidateStore.refreshDetail();
          }
          this.save.emit();
        });
      },
      error: (err: any) => {},
    });
  }

  /** Root-to-node path of `id` in the administrative unit tree, or [] when it is not there. */
  private findPath(nodes: AdministrativeUnitTreeNode[], id: string): AdministrativeUnitTreeNode[] {
    for (const node of nodes) {
      if (node.id === id) return [node];
      const childPath = this.findPath(node.children ?? [], id);
      if (childPath.length) return [node, ...childPath];
    }
    return [];
  }

  private populateForm(candidate: any) {
    this.formModel.set({
      companyId: candidate.companyId ?? '',
      firstName: candidate.firstName ?? '',
      middleName: candidate.middleName ?? '',
      lastName: candidate.lastName ?? '',
      gender: candidate.gender ?? '',
      mobileNo: candidate.mobileNo ?? '',
      email: candidate.email ?? '',
      fatherName: candidate.fatherName ?? '',
      interviewPost: candidate.interviewPost ?? '',
      departmentId: candidate.departmentId ?? '',
      VenueOrganizationUnitId: candidate.venueOrganizationUnitId ?? '',
      countryId: '',
      administrativeUnitId: candidate.administrativeUnitId ?? '',
      address: candidate.address ?? '',
      pinCode: candidate.pinCode ?? '',
      postedOrganizationUnitTypeId: '',
      postedOrganizationUnitId: candidate.postedOrganizationUnitId ?? '',
      dateOfJoining: toLocalDate(candidate.dateOfJoining) as any,
      reportingTime: toDisplayTime(candidate.reportingTime),
      monthlyCostCompany:
        candidate.monthlyCostCompany != null ? String(candidate.monthlyCostCompany) : '',
    });

    this.cvDocument.set({
      ...emptyDocument(),
      fileUrl: candidate.cvFileUrl ?? '',
      fileName: this.fileNameFromUrl(candidate.cvFileUrl),
    });
    this.jobApplicationDocument.set({
      ...emptyDocument(),
      fileUrl: candidate.jobApplicationFileUrl ?? '',
      fileName: this.fileNameFromUrl(candidate.jobApplicationFileUrl),
    });
  }

  private createEmptyModel(): ICandidateDetail {
    return {
      companyId: '',
      firstName: '',
      middleName: '',
      lastName: '',
      gender: '',
      mobileNo: '',
      email: '',
      fatherName: '',
      interviewPost: '',
      departmentId: '',
      VenueOrganizationUnitId: '',
      countryId: '',
      administrativeUnitId: '',
      address: '',
      pinCode: '',
      postedOrganizationUnitTypeId: '',
      postedOrganizationUnitId: '',
      dateOfJoining: '',
      reportingTime: '',
      monthlyCostCompany: '',
    };
  }
}
