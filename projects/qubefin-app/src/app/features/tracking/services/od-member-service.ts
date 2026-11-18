import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { NewTaskInput } from '../models/job';
import { AddOdToJobRequest, OdMember, OdTaskInput } from '../models/od-member';
import { TASK_TYPE } from '../utils/tracking-labels';
import { JobService } from './job-service';

/**
 * Match radius of an OD follow-up at the member's home. The geo-tag of every OD member in the dev data has 100 m
 * (`geo-tags/points` `taskLocationMatchInMeters`), and the server takes the place from the geo-tag anyway (rule 3.2.1).
 */
const OD_HOME_RADIUS_METERS = 100;

/** What the OD Members page shows after a save: the job's id (to open it) and the API's message. */
export interface OdAddResult {
  jobId: string;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class OdMemberService {
  private readonly jobs = inject(JobService);

  /**
   * Adds the members as OD follow-up tasks to an existing job (C2, `POST jobs/{id}/tasks`) or to a new one (C1, `POST jobs`).
   * There is no separate `od-members/add-to-job` call (decided 18 Nov 2026): each member is a normal task with an `OdMember`
   * target, so the server applies the same duplicate, branch and verified-location rules as for any other task.
   */
  addToJob(req: AddOdToJobRequest, members: OdMember[]): Observable<OdAddResult> {
    const byId = new Map(members.map((m) => [m.id, m]));
    const tasks = req.members.map((d) => odFollowUpTask(byId.get(d.memberId)!, d));
    if (req.jobId) {
      const jobId = req.jobId;
      return this.jobs.addTasks(jobId, { tasks }).pipe(map((message) => ({ jobId, message })));
    }
    const h = req.newJob!;
    return this.jobs.create({
      jobTitle: h.title,
      jobDescription: h.description,
      assigneeId: h.assigneeId,
      startDate: h.startFrom,
      endDate: h.completeBy,
      tasks,
    });
  }
}

/** One OD follow-up at the member's geo-tagged home, with the priority, instruction and companion set in the dialog. */
function odFollowUpTask(m: OdMember, d: OdTaskInput): NewTaskInput {
  return {
    taskType: 'OdFollowUp',
    taskTitle: `${TASK_TYPE.OdFollowUp.label} – ${m.memberName}`,
    notes: d.notes,
    priority: d.priority,
    coOrdinatedBy: d.accompaniedById,
    target: {
      kind: 'OdMember',
      originRefId: m.id,
      targetName: m.memberName,
      targetLocation: m.homeLocation!,
      organizationUnitId: m.organizationUnitId,
      branchName: m.branchName,
      radiusMeters: OD_HOME_RADIUS_METERS,
    },
  };
}
