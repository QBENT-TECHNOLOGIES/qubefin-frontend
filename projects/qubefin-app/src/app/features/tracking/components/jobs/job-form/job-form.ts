import { Component, computed, inject, output, signal } from '@angular/core';
import { FormField, Schema, form, required, schema } from '@angular/forms/signals';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { LucideDynamicIcon } from '@lucide/angular';
import { AlertService } from 'qubefin-core';
import { NewTaskInput } from '../../../models/job';
import { JobService } from '../../../services/job-service';
import { JobStore } from '../../../stores/job-store';
import { TrackingLookupStore } from '../../../stores/tracking-lookup-store';
import { toDateKey } from '../../../utils/geo-utils';
import { jobBranchConflict } from '../../../utils/job-rules';
import { ROLE_LABEL } from '../../../utils/tracking-labels';
import { TaskBuilder } from '../task-builder/task-builder';

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
  imports: [FormField, MatFormFieldModule, MatInputModule, MatSelectModule, LucideDynamicIcon, TaskBuilder],
  templateUrl: './job-form.html',
})
export class JobForm {
  private readonly service = inject(JobService);
  private readonly store = inject(JobStore);
  private readonly alerts = inject(AlertService);
  readonly lookup = inject(TrackingLookupStore);

  readonly cancel = output<void>();
  readonly saved = output<string>();

  readonly ROLE_LABEL = ROLE_LABEL;
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
    required(p.completeBy, { message: 'Complete-by date is required' });
  });

  protected readonly jobForm = form(this.model, this.jobSchema);

  readonly assignee = computed(() => this.lookup.officerById().get(this.model().assigneeId) ?? null);

  /** Branches places can come from: the assignee's branch(es), or anything while unassigned. */
  readonly allowedBranchIds = computed(() => this.assignee()?.branchIds ?? null);

  readonly window = computed<[string, string]>(() => [this.model().startFrom || this.today, this.model().completeBy || this.today]);

  readonly taskBranchIds = computed(() => [...new Set(this.tasks().map((t) => t.target.branchId))]);

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

  submit() {
    this.submitted.set(true);
    this.jobForm().markAsTouched();
    if (!this.jobForm().valid() || !this.tasks().length || this.branchConflict() || this.dateError()) return;

    const m = this.model();
    this.saving.set(true);
    this.service
      .create({
        title: m.title.trim(),
        description: m.description.trim() || null,
        assigneeId: m.assigneeId || null,
        startFrom: m.startFrom || null,
        completeBy: m.completeBy,
        tasks: this.tasks(),
      })
      .subscribe({
        next: ({ job, skipped }) => {
          this.saving.set(false);
          const who = job.assigneeName ? `assigned to ${job.assigneeName}` : 'not assigned yet';
          const done = skipped.length
            ? this.alerts.warning(`${job.jobNo} created with ${job.taskCount} task(s)`, `Skipped: ${skipped.map((s) => `${s.title} – ${s.reason}`).join(' · ')}`)
            : this.alerts.success('Job created', `${job.jobNo} with ${job.taskCount} task(s), ${who}.`);
          Promise.resolve(done).then(() => {
            this.store.refreshList();
            this.saved.emit(job.id);
          });
        },
        error: () => this.saving.set(false),
      });
  }
}
