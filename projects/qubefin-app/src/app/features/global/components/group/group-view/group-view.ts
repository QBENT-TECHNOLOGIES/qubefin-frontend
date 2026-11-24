import { DatePipe } from '@angular/common';
import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { LucideDynamicIcon } from '@lucide/angular';
import { AlertService, StatusBadgeComponentComponent } from 'qubefin-core';
import { GROUP_DAYS, IGroupDecisionRequest } from '../../../models/group';
import { GroupService } from '../../../services/group-service';
import { GroupStore } from '../../../stores/group-store';

// A group's details. The Head of the branch or the Area Manager approves or rejects a Pending group here;
// the owner Credit Officer or the Head can edit it. The server decides who can do what.
@Component({
  selector: 'qfin-group-view',
  imports: [DatePipe, MatFormFieldModule, MatInputModule, LucideDynamicIcon, StatusBadgeComponentComponent],
  templateUrl: './group-view.html',
})
export class GroupView {
  private readonly store = inject(GroupStore);
  private readonly service = inject(GroupService);
  private readonly alertService = inject(AlertService);
  private readonly sanitizer = inject(DomSanitizer);

  readonly groupId = input.required<string>();
  readonly showEdit = output<void>();

  readonly group = this.store.group;
  readonly loading = this.store.groupLoading;
  readonly error = this.store.groupError;

  readonly comments = signal('');
  readonly saving = signal(false);

  constructor() {
    effect(() => this.store.setGroupId(this.groupId()));
  }

  // The map of the group location, shown in a frame (Google Maps embed).
  readonly mapUrl = computed<SafeResourceUrl | null>(() => {
    const g = this.group();
    if (!g || g.latitude === null || g.longitude === null) return null;
    return this.sanitizer.bypassSecurityTrustResourceUrl(
      `https://maps.google.com/maps?q=${g.latitude},${g.longitude}&z=16&output=embed`,
    );
  });

  protected openInMaps() {
    const g = this.group();
    if (!g || g.latitude === null || g.longitude === null) return;
    window.open(`https://www.google.com/maps/search/?api=1&query=${g.latitude},${g.longitude}`, '_blank', 'noopener');
  }

  protected dayName(day: number): string {
    return GROUP_DAYS.find((d) => d.value === day)?.label ?? '';
  }

  protected onEdit() {
    this.showEdit.emit();
  }

  protected decide(decision: 'Approve' | 'Reject') {
    const comments = this.comments().trim();
    if (decision === 'Reject' && !comments) {
      this.alertService.error('Oops ....', 'Comments are required to reject a group.');
      return;
    }
    if (comments.length > 200) {
      this.alertService.error('Oops ....', 'Comments can have at most 200 characters.');
      return;
    }

    const request: IGroupDecisionRequest = { decision, comments: comments || null };
    this.alertService
      .confirm('Confirmation', `Do you want to ${decision.toLowerCase()} this group?`)
      .then((result) => {
        if (!result.isConfirmed) return;
        this.saving.set(true);
        this.service.decide(this.groupId(), request).subscribe({
          next: (resp: any) => {
            this.saving.set(false);
            this.comments.set('');
            this.store.refreshDetail();
            this.store.refreshList();
            this.alertService.success('Success', resp);
          },
          error: () => this.saving.set(false),
        });
      });
  }
}
