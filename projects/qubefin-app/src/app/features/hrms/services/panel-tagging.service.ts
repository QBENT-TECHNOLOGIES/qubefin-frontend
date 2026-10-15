import { inject, Injectable } from '@angular/core';
import { catchError, forkJoin, map, Observable, of, switchMap } from 'rxjs';
import { InterviewPanelService } from './interview-panel-service';
import { HrmsReportService } from '../../Report/Service/hrms-report-service';
import { IPanelCandidate, IPanelGroup, IPanelMember } from '../models/panel-tagging';

/** Panel Tagging actions and display rules shared by the Panel Tagging page and dialog. */
@Injectable({
  providedIn: 'root',
})
export class PanelTaggingService {
  private readonly panelService = inject(InterviewPanelService);
  private readonly hrReportService = inject(HrmsReportService);

  /** Sets the candidates' panel to exactly these panelists. Each candidate's panel acknowledgement PDF is
   * fetched first and mailed to the new panelists; a failed report just leaves that attachment out. */
  assign(candidateIds: string[], employeeIds: string[]): Observable<string> {
    const acknowledgements = candidateIds.map((id) =>
      (this.hrReportService.getInterviewPanelAcknowledgement(id) as Observable<Blob>).pipe(
        map((blob): [string, Blob | null] => [id, blob]),
        catchError(() => of<[string, Blob | null]>([id, null])),
      ),
    );

    return forkJoin(acknowledgements).pipe(
      switchMap((files) => {
        const fileMap = new Map<string, Blob>();
        files.forEach(([id, blob]) => blob && fileMap.set(id, blob));
        return this.panelService.assignPanel(candidateIds, employeeIds, fileMap);
      }),
    );
  }

  untag(candidateIds: string[]): Observable<string> {
    return this.panelService.untagCandidates(candidateIds);
  }

  /** Same order-independent key the API builds for a set of panelists. */
  keyOf(employeeIds: string[]): string {
    return [...employeeIds].map((id) => id.replace(/-/g, '').toLowerCase()).sort().join(',');
  }

  /** "Ritam & Sourav", "Ritam, Sourav +2" - the panelists' first names. */
  panelLabel(members: IPanelMember[]): string {
    const names = members.map((m) => m.employeeName.split(' ')[0]);
    return names.length > 2 ? `${names.slice(0, 2).join(', ')} +${names.length - 2}` : names.join(' & ');
  }

  panelStatus(panel: IPanelGroup, isPast: boolean): { label: string; cls: string } {
    const candidates = panel.candidates;
    if (isPast) return { label: 'Completed', cls: 'pill-slate' };
    if (!candidates.length) return { label: 'No candidates', cls: 'pill-slate' };
    if (candidates.every((c) => c.submittedCount === c.panelistCount)) return { label: 'Assessed', cls: 'pill-emerald' };
    if (candidates.every((c) => c.acknowledgedCount === c.panelistCount)) return { label: 'Acknowledged', cls: 'pill-blue' };
    return { label: 'Awaiting acknowledgement', cls: 'pill-amber' };
  }

  candidateProgress(c: IPanelCandidate): { label: string; cls: string } {
    if (c.panelistCount && c.submittedCount === c.panelistCount) return { label: 'Assessed', cls: 'pill-emerald' };
    if (c.submittedCount > 0) return { label: `Submitted ${c.submittedCount}/${c.panelistCount}`, cls: 'pill-violet' };
    if (c.isLocked) return { label: 'In progress', cls: 'pill-violet' };
    if (c.acknowledgedCount === c.panelistCount) return { label: 'Acknowledged', cls: 'pill-blue' };
    return { label: `Ack ${c.acknowledgedCount}/${c.panelistCount}`, cls: 'pill-amber' };
  }

  initials(name: string | null | undefined): string {
    if (!name) return '?';
    return name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join('');
  }

  errorMessage(error: any, fallback: string): string {
    return error?.error?.message ?? error?.error?.detail ?? fallback;
  }
}
