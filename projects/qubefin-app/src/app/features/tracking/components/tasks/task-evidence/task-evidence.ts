import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { LucideDynamicIcon } from '@lucide/angular';
import { DocumentModalService } from 'qubefin-core';
import { JobTask } from '../../../models/job';
import { formatCoords, formatDistance, googleMapsLink } from '../../../utils/geo-utils';

/** Location check + completion photo + remarks + OD outcome for one task (all captured on the mobile app). */
@Component({
  selector: 'qfin-task-evidence',
  imports: [DatePipe, DecimalPipe, LucideDynamicIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './task-evidence.html',
})
export class TaskEvidence {
  private readonly documents = inject(DocumentModalService);

  readonly task = input.required<JobTask>();

  readonly formatDistance = formatDistance;
  readonly formatCoords = formatCoords;
  readonly googleMapsLink = googleMapsLink;

  readonly verdict = computed(() => {
    const v = this.task().verification;
    if (!v || v.locationMatched === null) return null;
    return v.locationMatched
      ? { ok: true, text: `Within ${this.task().target.matchRadiusMeters} m of the geo-tag` }
      : { ok: false, text: `Outside the ${this.task().target.matchRadiusMeters} m match radius` };
  });

  readonly arrivalOk = computed(() => {
    const v = this.task().verification;
    return v?.arrivalDistanceMeters != null ? v.arrivalDistanceMeters <= this.task().target.matchRadiusMeters : null;
  });

  openPhoto() {
    const v = this.task().verification;
    if (!v?.photoUrl) return;
    const ext = /\.(\w{3,4})(?:\?|$)/.exec(v.photoUrl)?.[1] ?? 'png';
    this.documents.open({ url: v.photoUrl, documentName: `${this.task().taskNo}-evidence`, extension: ext, downloadAccess: true });
  }
}
