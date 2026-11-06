/* =====================================================================
   Qubefin · tracking-api · Jobs & Tasks — UPDATE for an existing database
   Run once on a database created with the first tracking-jobs-schema.sql.
   Brings it in line with the contract changes of 2–4 Nov 2026:
     1. Every job has an assignee (no "assign later", no Unassigned status)
     2. New task fields: Priority, AccompaniedById
     3. Duplicate rule relaxed: an OD member may be pending with several people
     4. History action 'Assigned' removed
   ===================================================================== */

/* ---------- 1. Assignee required ----------
   Fails if any job still has no assignee: assign or delete those test rows first.
   SELECT Id, JobNo FROM tracking.Jobs WHERE AssigneeId IS NULL;            */
DROP INDEX IX_Jobs_Assignee_CompleteBy ON tracking.Jobs;
GO
ALTER TABLE tracking.Jobs ALTER COLUMN AssigneeId UNIQUEIDENTIFIER NOT NULL;
GO
CREATE INDEX IX_Jobs_Assignee_CompleteBy ON tracking.Jobs (AssigneeId, CompleteBy) INCLUDE (CancelledAt);
GO

/* ---------- 2. New task fields ---------- */
ALTER TABLE tracking.JobTasks ADD
    Priority        VARCHAR(10)      NOT NULL CONSTRAINT DF_JobTasks_Priority DEFAULT ('Medium'),  -- existing rows get Medium
    AccompaniedById UNIQUEIDENTIFIER NULL;   -- someone who goes along (information only; never the job's assignee)
GO
ALTER TABLE tracking.JobTasks ADD CONSTRAINT CK_JobTasks_Priority CHECK (Priority IN ('VeryHigh','High','Medium','Low'));
GO
CREATE INDEX IX_JobTasks_AccompaniedBy ON tracking.JobTasks (AccompaniedById) INCLUDE (JobId, Status)
    WHERE AccompaniedById IS NOT NULL;
GO

/* ---------- 3. Relaxed duplicate rule ----------
   The same OD member may now be pending with different people (a CO and the BM),
   so the one-pending-follow-up-per-member unique index must go. The backend refuses
   only the same assignee twice (rule 3.2.3).                                */
DROP INDEX IF EXISTS UX_JobTasks_OdMemberPending ON tracking.JobTasks;
GO

/* ---------- 4. History: 'Assigned' action removed ----------
   Fails if test data has 'Assigned' rows; those came from the old assign endpoint. */
ALTER TABLE tracking.JobHistory DROP CONSTRAINT CK_JobHistory_Action;
GO
ALTER TABLE tracking.JobHistory ADD CONSTRAINT CK_JobHistory_Action CHECK (Action IN (
    'Created','Transferred','TasksTransferredOut','TasksTransferredIn',
    'TasksAdded','TaskSelfAdded','TaskCompleted','TaskCancelled','TaskRejected',
    'DateExtended','BecameDelayed','Completed','Cancelled'));
GO

/* ---------- 5. Views: no Unassigned status; pick up the new task columns ---------- */
CREATE OR ALTER VIEW tracking.vJobSummary
AS
WITH TaskCounts AS
(
    SELECT  JobId,
            SUM(CASE WHEN Status IN ('Pending','Completed') THEN 1 ELSE 0 END)                       AS TaskCount,
            SUM(CASE WHEN Status = 'Completed' THEN 1 ELSE 0 END)                                    AS DoneCount,
            SUM(CASE WHEN Status = 'Pending'   THEN 1 ELSE 0 END)                                    AS OpenCount,
            SUM(CASE WHEN Status IN ('Pending','Completed') AND Origin = 'SelfAdded' THEN 1 ELSE 0 END) AS SelfAddedCount
    FROM    tracking.JobTasks
    GROUP BY JobId
)
SELECT  j.Id, j.JobNo, j.Title, j.Description,
        j.AssigneeId, j.CreatedById, j.CreatedAt,
        j.StartFrom, j.CompleteBy,
        j.TransferredFromJobId, tf.JobNo AS TransferredFromJobNo,
        j.CancelledAt, j.CancelledById, j.CancelReason,
        ISNULL(c.TaskCount, 0)      AS TaskCount,
        ISNULL(c.DoneCount, 0)      AS DoneCount,
        ISNULL(c.OpenCount, 0)      AS OpenCount,
        ISNULL(c.SelfAddedCount, 0) AS SelfAddedCount,
        CASE
            WHEN j.CancelledAt IS NOT NULL OR ISNULL(c.TaskCount, 0) = 0       THEN 'Cancelled'
            WHEN c.OpenCount = 0 AND c.DoneCount > 0                           THEN 'Completed'
            WHEN c.OpenCount > 0 AND d.Today > j.CompleteBy                    THEN 'Delayed'
            WHEN c.DoneCount > 0                                               THEN 'InProgress'
            ELSE 'Assigned'
        END AS Status
FROM    tracking.Jobs j
LEFT JOIN TaskCounts   c  ON c.JobId = j.Id
LEFT JOIN tracking.Jobs tf ON tf.Id   = j.TransferredFromJobId
CROSS APPLY (SELECT CAST(SWITCHOFFSET(SYSDATETIMEOFFSET(), '+05:30') AS DATE) AS Today) d;
GO

-- vJobTasks uses t.*, so refresh it to include Priority and AccompaniedById
EXEC sp_refreshview N'tracking.vJobTasks';
GO
