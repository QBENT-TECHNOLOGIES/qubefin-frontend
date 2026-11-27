import { unitIdsOf } from '../../../models/field-officer';
import { Component, ElementRef, Injector, afterNextRender, computed, inject, output, signal, viewChild } from '@angular/core';
import { FormField, Schema, form, required, schema } from '@angular/forms/signals';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelect, MatSelectModule } from '@angular/material/select';
import { LucideDynamicIcon } from '@lucide/angular';
import { AlertService } from 'qubefin-core';
import { NewTaskInput } from '../../../models/job';
import { JobService } from '../../../services/job-service';
import { JobStore } from '../../../stores/job-store';
import { TrackingLookupStore } from '../../../stores/tracking-lookup-store';
import { toDateKey } from '../../../utils/geo-utils';
import { jobBranchConflict } from '../../../utils/job-rules';
import { roleLabel } from '../../../utils/tracking-labels';
import { TaskBuilder } from '../task-builder/task-builder';
import { TrkDateField } from '../../shared/date-field/trk-date-field';

interface JobFormModel {
  title: string;
  assigneeId: string;
  startFrom: string;
  completeBy: string;
  description: string;
}

/** End of the current week (Saturday), the usual "complete by" for a weekly plan. */
function thisSaturday(): string {
  const d = new Date();
  const add = (6 - d.getDay() + 7) % 7;
  d.setDate(d.getDate() + add);
  return toDateKey(d);
}

@Component({
  selector: 'qfin-job-form',
  imports: [FormField, MatFormFieldModule, MatInputModule, MatSelectModule, LucideDynamicIcon, TaskBuilder, TrkDateField],
  templateUrl: './job-form.html',
})
export class JobForm {
  private readonly service = inject(JobService);
  private readonly store = inject(JobStore);
  private readonly alerts = inject(AlertService);
  readonly lookup = inject(TrackingLookupStore);

  readonly cancel = output<void>();
  readonly saved = output<string>();

  readonly roleLabel = roleLabel;
  readonly today = toDateKey();
  readonly saving = signal(false);
  readonly submitted = signal(false);
  readonly tasks = signal<NewTaskInput[]>([]);

  protected readonly model = signal<JobFormModel>({
    title: '',
    assigneeId: '',
    startFrom: toDateKey(),
    completeBy: thisSaturday(),
    description: '',
  });

  protected readonly jobSchema: Schema<JobFormModel> = schema((p) => {
    required(p.title, { message: 'Job title is required' });
    required(p.assigneeId, { message: 'Select who will do this job' });
    required(p.completeBy, { message: 'Complete-by date is required' });
  });

  protected readonly jobForm = form(this.model, this.jobSchema);

  readonly assignee = computed(() => this.lookup.officerById().get(this.model().assigneeId) ?? null);

  /** Search text of the Assign to list (name, employee code, branch / unit or role). */
  readonly assigneeQuery = signal('');
  private readonly assigneeSearch = viewChild<ElementRef<HTMLInputElement>>('assigneeSearch');
  private readonly assigneeSelect = viewChild(MatSelect);
  private readonly injector = inject(Injector);

  /** Assign to options filtered by the search. The chosen person always stays listed, so mat-select keeps showing them. */
  readonly assigneeGroups = computed(() => {
    const words = this.assigneeQuery().toLowerCase().split(/\s+/).filter(Boolean);
    const groups = this.lookup.assignableByRole();
    if (!words.length) return groups;
    const chosen = this.model().assigneeId;
    return groups
      .map((g) => ({
        ...g,
        officers: g.officers.filter((o) => {
          if (o.id === chosen) return true;
          const text = `${o.name} ${o.employeeCode} ${o.unitName} ${o.organizationUnitName} ${o.role}`.toLowerCase();
          return words.every((w) => text.includes(w));
        }),
      }))
      .filter((g) => g.officers.length);
  });

  /** Each time the list opens: empty search (box and filter together), cursor in the box. */
  onAssigneeOpened(open: boolean) {
    if (!open) return;
    this.assigneeQuery.set('');
    const box = this.assigneeSearch()?.nativeElement;
    if (box) box.value = '';
    setTimeout(() => box?.focus());
  }

  /** New search text: once the list has re-rendered, highlight the first match so Enter picks it. */
  setAssigneeQuery(q: string) {
    this.assigneeQuery.set(q);
    afterNextRender(() => this.assigneeSelect()?._keyManager?.setFirstItemActive(), { injector: this.injector });
  }

  clearAssigneeQuery() {
    this.setAssigneeQuery('');
    this.assigneeSearch()?.nativeElement.focus();
  }

  /**
   * Letters and space stay in the search box (mat-select would use them for typeahead / selection). Arrows and Enter are
   * handed to mat-select, which only listens on its trigger, so the list can still be driven from the keyboard. Esc and Tab
   * bubble up and close the panel as usual.
   */
  onSearchKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape' || e.key === 'Tab') return;
    e.stopPropagation();
    const select = this.assigneeSelect();
    if (!select) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      select._handleKeydown(e);
    } else if (e.key === 'Enter') {
      // Pick from the current matches: the highlighted one, else the first (the highlight may lag a fast typist or a paste).
      e.preventDefault();
      const ids = this.assigneeGroups().flatMap((g) => g.officers.map((o) => o.id));
      const active = select._keyManager?.activeItem?.value as string | undefined;
      const id = active && ids.includes(active) ? active : ids[0];
      if (!id) return;
      this.jobForm.assigneeId().value.set(id);
      this.jobForm.assigneeId().markAsTouched();
      select.close();
    }
  }

  /** Branches places can come from: the assignee's branch(es). */
  readonly allowedBranchIds = computed(() => {
    const a = this.assignee();
    return a ? unitIdsOf(a) : [];
  });

  private readonly builder = viewChild(TaskBuilder);
  /** Tasks the assignee cannot take (e.g. the assignee was changed to someone who already has them pending). */
  readonly blockedTasks = computed(() => this.builder()?.blockedTaskCount() ?? 0);

  readonly window = computed<[string, string]>(() => [this.model().startFrom || this.today, this.model().completeBy || this.today]);

  readonly taskBranchIds = computed(() => [...new Set(this.tasks().map((t) => t.target.organizationUnitId))]);

  readonly branchConflict = computed(() => {
    const o = this.assignee();
    return o ? jobBranchConflict(o, this.taskBranchIds(), (id) => this.lookup.branchById().get(id)?.name ?? 'another branch') : null;
  });

  readonly dateError = computed(() => {
    const m = this.model();
    if (m.completeBy && m.completeBy < this.today) return 'Complete-by date cannot be in the past.';
    if (m.startFrom && m.completeBy && m.startFrom > m.completeBy) return 'Start date must be on or before the complete-by date.';
    return null;
  });

  async submit() {
    this.submitted.set(true);
    this.jobForm().markAsTouched();
    if (!this.jobForm().valid() || !this.assignee() || !this.tasks().length || this.branchConflict() || this.dateError() || this.blockedTasks()) return;

    // Places pending with someone else are allowed; confirm once before saving.
    const warned = this.builder()?.warnedTaskCount() ?? 0;
    if (warned) {
      const n = this.tasks().length;
      const ok = await this.alerts.confirm(
        'Some places are already with other people',
        `${warned} of these ${n} tasks are already pending with someone else. ${this.assignee()!.name} will get their own task at those places. Create the job anyway?`,
        'Create job',
        'Go back',
      );
      if (!ok.isConfirmed) return;
    }

    const m = this.model();
    this.saving.set(true);
    this.service
      .create({
        jobTitle: m.title.trim(),
        jobDescription: m.description.trim() || null,
        assigneeId: m.assigneeId,
        startDate: m.startFrom || null,
        endDate: m.completeBy,
        tasks: this.tasks(),
      })
      .subscribe({
        // C1 answers { jobId, message }; the message already says the job code, assignee and task count.
        next: ({ jobId, message }) => {
          this.saving.set(false);
          Promise.resolve(this.alerts.success('Job created', message)).then(() => {
            this.store.refreshList();
            this.saved.emit(jobId);
          });
        },
        error: () => this.saving.set(false),
      });
  }
}
