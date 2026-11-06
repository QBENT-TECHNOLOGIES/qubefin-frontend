/* =====================================================================
   Qubefin · tracking-api · Jobs & Tasks
   SQL Server 2019+ / Azure SQL
   Matches docs/TRACKING_API_CONTRACT.md §3 and models/job.ts (as of 5 Nov 2026:
   assignee required, task priority + accompanied by, relaxed duplicate rule).

   Notes
   - Employees and branches live in other services (hrms / global), so their
     ids are plain UNIQUEIDENTIFIER columns. Add the FKs (commented below) only
     if those tables are in the same database.
   - Names (assigneeName, createdByName, ...) are NOT stored: join or look them
     up when building the response.
   - Job status, counts, isLate and permissions are NOT stored: see the views
     at the end. Status depends on today's date (Delayed), so it can't be a column.
   - Times are DATETIMEOFFSET, stamped by the server in IST (+05:30).
   ===================================================================== */

IF SCHEMA_ID(N'tracking') IS NULL EXEC (N'CREATE SCHEMA tracking');
GO

/* ---------- Number sequences: JOB-26001…, TSK-48001… ---------- */
CREATE SEQUENCE tracking.JobNoSeq  AS INT START WITH 26001 INCREMENT BY 1;
CREATE SEQUENCE tracking.TaskNoSeq AS INT START WITH 48001 INCREMENT BY 1;
GO

/* =====================================================================
   1. Jobs
   ===================================================================== */
CREATE TABLE tracking.Jobs
(
    Id                    UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_Jobs_Id DEFAULT NEWSEQUENTIALID(),
    JobNo                 VARCHAR(20)      NOT NULL CONSTRAINT DF_Jobs_JobNo
                              DEFAULT ('JOB-' + CONVERT(VARCHAR(10), NEXT VALUE FOR tracking.JobNoSeq)),
    Title                 NVARCHAR(200)    NOT NULL,
    Description           NVARCHAR(2000)   NULL,

    AssigneeId            UNIQUEIDENTIFIER NOT NULL,        -- required: every job has an assignee from creation (since 2 Nov 2026)
    CreatedById           UNIQUEIDENTIFIER NOT NULL,
    CreatedAt             DATETIMEOFFSET(0) NOT NULL CONSTRAINT DF_Jobs_CreatedAt
                              DEFAULT SWITCHOFFSET(SYSDATETIMEOFFSET(), '+05:30'),

    StartFrom             DATE             NULL,            -- null = from the creation day
    CompleteBy            DATE             NOT NULL,

    TransferredFromJobId  UNIQUEIDENTIFIER NULL,            -- set on the new job of a partial transfer

    -- Explicit cancel of the whole job (status is otherwise derived)
    CancelledAt           DATETIMEOFFSET(0) NULL,
    CancelledById         UNIQUEIDENTIFIER NULL,
    CancelReason          NVARCHAR(1000)   NULL,

    UpdatedAt             DATETIMEOFFSET(0) NULL,
    RowVer                ROWVERSION       NOT NULL,

    CONSTRAINT PK_Jobs PRIMARY KEY CLUSTERED (Id),
    CONSTRAINT UQ_Jobs_JobNo UNIQUE (JobNo),
    CONSTRAINT FK_Jobs_TransferredFrom FOREIGN KEY (TransferredFromJobId) REFERENCES tracking.Jobs (Id),
    CONSTRAINT CK_Jobs_Window CHECK (StartFrom IS NULL OR StartFrom <= CompleteBy),
    CONSTRAINT CK_Jobs_Cancel CHECK (
        (CancelledAt IS NULL AND CancelledById IS NULL)
     OR (CancelledAt IS NOT NULL AND CancelledById IS NOT NULL AND CancelReason IS NOT NULL))
    -- , CONSTRAINT FK_Jobs_Assignee  FOREIGN KEY (AssigneeId)  REFERENCES hrms.Employees (Id)
    -- , CONSTRAINT FK_Jobs_CreatedBy FOREIGN KEY (CreatedById) REFERENCES hrms.Employees (Id)
);
GO

CREATE INDEX IX_Jobs_Assignee_CompleteBy ON tracking.Jobs (AssigneeId, CompleteBy) INCLUDE (CancelledAt);
CREATE INDEX IX_Jobs_CreatedBy           ON tracking.Jobs (CreatedById)             INCLUDE (CompleteBy, CancelledAt);
CREATE INDEX IX_Jobs_CompleteBy          ON tracking.Jobs (CompleteBy)              INCLUDE (AssigneeId, CancelledAt);
GO

/* =====================================================================
   2. JobTasks
   ===================================================================== */
CREATE TABLE tracking.JobTasks
(
    Id                       UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_JobTasks_Id DEFAULT NEWSEQUENTIALID(),
    TaskNo                   VARCHAR(20)      NOT NULL CONSTRAINT DF_JobTasks_TaskNo
                                 DEFAULT ('TSK-' + CONVERT(VARCHAR(10), NEXT VALUE FOR tracking.TaskNoSeq)),
    JobId                    UNIQUEIDENTIFIER NOT NULL,

    Type                     VARCHAR(20)      NOT NULL,     -- TaskType
    Title                    NVARCHAR(200)    NOT NULL,
    Notes                    NVARCHAR(1000)   NULL,         -- shown as "Instruction" to the assignee
    Priority                 VARCHAR(10)      NOT NULL CONSTRAINT DF_JobTasks_Priority DEFAULT ('Medium'),
    AccompaniedById          UNIQUEIDENTIFIER NULL,         -- someone who goes along (information only; never the job's assignee)

    -- Target: a snapshot copied from the geo-tag when the task is added (rule 3.2.1)
    TargetKind               VARCHAR(20)      NOT NULL,     -- TaskTargetKind
    TargetRefId              UNIQUEIDENTIFIER NULL,         -- null only for Custom (map point)
    TargetName               NVARCHAR(200)    NOT NULL,
    TargetAddress            NVARCHAR(500)    NOT NULL CONSTRAINT DF_JobTasks_TargetAddress DEFAULT (N''),
    TargetLat                DECIMAL(9,6)     NOT NULL,
    TargetLng                DECIMAL(9,6)     NOT NULL,
    BranchId                 UNIQUEIDENTIFIER NOT NULL,
    MatchRadiusMeters        INT              NOT NULL CONSTRAINT DF_JobTasks_MatchRadius DEFAULT (100),

    Status                   VARCHAR(20)      NOT NULL CONSTRAINT DF_JobTasks_Status DEFAULT ('Pending'),
    Origin                   VARCHAR(10)      NOT NULL CONSTRAINT DF_JobTasks_Origin DEFAULT ('Assigned'),
    AddedById                UNIQUEIDENTIFIER NOT NULL,
    AddedAt                  DATETIMEOFFSET(0) NOT NULL CONSTRAINT DF_JobTasks_AddedAt
                                 DEFAULT SWITCHOFFSET(SYSDATETIMEOFFSET(), '+05:30'),

    -- Verification (from the mobile app; server-stamped, never sent by clients — rule 3.2.9)
    ArrivedAt                DATETIMEOFFSET(0) NULL,
    ArrivalLat               DECIMAL(9,6)     NULL,
    ArrivalLng               DECIMAL(9,6)     NULL,
    ArrivalDistanceMeters    DECIMAL(9,2)     NULL,
    CompletedAt              DATETIMEOFFSET(0) NULL,
    CompletedById            UNIQUEIDENTIFIER NULL,
    CompletionLat            DECIMAL(9,6)     NULL,
    CompletionLng            DECIMAL(9,6)     NULL,
    CompletionDistanceMeters DECIMAL(9,2)     NULL,
    LocationMatched          BIT              NULL,         -- CompletionDistance <= MatchRadius (rule 3.2.10)
    PhotoUrl                 NVARCHAR(500)    NULL,
    PhotoTakenAt             DATETIMEOFFSET(0) NULL,
    Remarks                  NVARCHAR(1000)   NULL,         -- employee's remarks on completion

    -- OD visit outcome (OdFollowUp only)
    OdMemberAvailable        BIT              NULL,
    OdPaid                   BIT              NULL,
    OdAmountCollected        DECIMAL(18,2)    NULL,
    OdPtpDate                DATE             NULL,         -- promise-to-pay, required when not paid

    -- Closing: Cancelled / Rejected / Transferred
    TransferredToJobId       UNIQUEIDENTIFIER NULL,
    ClosedAt                 DATETIMEOFFSET(0) NULL,
    ClosedById               UNIQUEIDENTIFIER NULL,
    ClosedReason             NVARCHAR(1000)   NULL,

    UpdatedAt                DATETIMEOFFSET(0) NULL,
    RowVer                   ROWVERSION       NOT NULL,

    CONSTRAINT PK_JobTasks PRIMARY KEY CLUSTERED (Id),
    CONSTRAINT UQ_JobTasks_TaskNo UNIQUE (TaskNo),
    CONSTRAINT FK_JobTasks_Job           FOREIGN KEY (JobId)              REFERENCES tracking.Jobs (Id),
    CONSTRAINT FK_JobTasks_TransferredTo FOREIGN KEY (TransferredToJobId) REFERENCES tracking.Jobs (Id),

    CONSTRAINT CK_JobTasks_Type   CHECK (Type IN ('GroupVisit','MemberVisit','OdFollowUp','LeadSourcing','Survey')),
    CONSTRAINT CK_JobTasks_Kind   CHECK (TargetKind IN ('Member','OdMember','GroupCentre','Branch','Custom')),
    CONSTRAINT CK_JobTasks_Status CHECK (Status IN ('Pending','Completed','Cancelled','Transferred','Rejected')),
    CONSTRAINT CK_JobTasks_Origin CHECK (Origin IN ('Assigned','SelfAdded')),
    CONSTRAINT CK_JobTasks_Priority CHECK (Priority IN ('VeryHigh','High','Medium','Low')),

    -- Custom = map point (no ref); every other kind points at a geo-tagged entity
    CONSTRAINT CK_JobTasks_RefId CHECK ((TargetKind = 'Custom' AND TargetRefId IS NULL)
                                     OR (TargetKind <> 'Custom' AND TargetRefId IS NOT NULL)),

    -- Type follows the place (TYPES_FOR_KIND in utils/job-rules.ts)
    CONSTRAINT CK_JobTasks_TypeForKind CHECK (
           (TargetKind = 'GroupCentre' AND Type IN ('GroupVisit','Survey','LeadSourcing'))
        OR (TargetKind = 'Member'      AND Type = 'MemberVisit')
        OR (TargetKind = 'OdMember'    AND Type IN ('OdFollowUp','MemberVisit'))
        OR (TargetKind = 'Branch'      AND Type = 'Survey')
        OR (TargetKind = 'Custom'      AND Type IN ('LeadSourcing','Survey'))),

    CONSTRAINT CK_JobTasks_Lat CHECK (TargetLat BETWEEN -90  AND 90),
    CONSTRAINT CK_JobTasks_Lng CHECK (TargetLng BETWEEN -180 AND 180),
    CONSTRAINT CK_JobTasks_Radius CHECK (MatchRadiusMeters > 0),

    CONSTRAINT CK_JobTasks_Completed CHECK (Status <> 'Completed' OR (CompletedAt IS NOT NULL AND CompletedById IS NOT NULL)),
    CONSTRAINT CK_JobTasks_Transferred CHECK (Status <> 'Transferred' OR TransferredToJobId IS NOT NULL),
    CONSTRAINT CK_JobTasks_Rejected CHECK (Status <> 'Rejected' OR Origin = 'SelfAdded'),
    CONSTRAINT CK_JobTasks_Closed CHECK (Status NOT IN ('Cancelled','Rejected','Transferred') OR ClosedAt IS NOT NULL),

    -- OD outcome only on OD follow-ups; not paid => PTP date required
    CONSTRAINT CK_JobTasks_OdOnly CHECK (Type = 'OdFollowUp'
                                      OR (OdMemberAvailable IS NULL AND OdPaid IS NULL AND OdAmountCollected IS NULL AND OdPtpDate IS NULL)),
    CONSTRAINT CK_JobTasks_OdPtp CHECK (OdPaid IS NULL OR OdPaid = 1 OR OdPtpDate IS NOT NULL),
    CONSTRAINT CK_JobTasks_OdAmount CHECK (OdAmountCollected IS NULL OR OdAmountCollected >= 0)
    -- , CONSTRAINT FK_JobTasks_Branch       FOREIGN KEY (BranchId)        REFERENCES global.OrganizationUnits (Id)
    -- , CONSTRAINT FK_JobTasks_AccompaniedBy FOREIGN KEY (AccompaniedById) REFERENCES hrms.Employees (Id)
);
GO

CREATE INDEX IX_JobTasks_Job_Status    ON tracking.JobTasks (JobId, Status) INCLUDE (Origin, Type, BranchId);
CREATE INDEX IX_JobTasks_Branch_Status ON tracking.JobTasks (BranchId, Status) INCLUDE (JobId, Type, TargetLat, TargetLng);

-- Duplicate rule 3.2.3 lookup: same place + same type pending in another open job.
-- Not unique: since 2 Nov 2026 the same place may be pending with DIFFERENT people (a warning);
-- only the same assignee twice is refused, which the backend checks via the job's AssigneeId.
CREATE INDEX IX_JobTasks_PendingPlace ON tracking.JobTasks (TargetRefId, Type) INCLUDE (JobId)
    WHERE Status = 'Pending' AND TargetRefId IS NOT NULL;

-- Tasks someone goes along on (e.g. a BM's list of visits with COs)
CREATE INDEX IX_JobTasks_AccompaniedBy ON tracking.JobTasks (AccompaniedById) INCLUDE (JobId, Status)
    WHERE AccompaniedById IS NOT NULL;
GO

/* =====================================================================
   3. JobHistory (append-only audit trail) + its task numbers
   ===================================================================== */
CREATE TABLE tracking.JobHistory
(
    Id               UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_JobHistory_Id DEFAULT NEWSEQUENTIALID(),
    JobId            UNIQUEIDENTIFIER NOT NULL,
    Action           VARCHAR(30)      NOT NULL,
    PerformedById    UNIQUEIDENTIFIER NULL,     -- null = system (nightly BecameDelayed, auto-allocation)
    PerformedAt      DATETIMEOFFSET(0) NOT NULL CONSTRAINT DF_JobHistory_PerformedAt
                         DEFAULT SWITCHOFFSET(SYSDATETIMEOFFSET(), '+05:30'),
    FromAssigneeId   UNIQUEIDENTIFIER NULL,     -- previous assignee (Transferred, TasksTransferredOut)
    ToAssigneeId     UNIQUEIDENTIFIER NULL,     -- new assignee (Created, Transferred, TasksTransferredOut)
    RelatedJobId     UNIQUEIDENTIFIER NULL,     -- the other job in a partial transfer
    OldCompleteBy    DATE             NULL,     -- DateExtended
    NewCompleteBy    DATE             NULL,
    Remarks          NVARCHAR(1000)   NULL,

    CONSTRAINT PK_JobHistory PRIMARY KEY CLUSTERED (Id),
    CONSTRAINT FK_JobHistory_Job        FOREIGN KEY (JobId)        REFERENCES tracking.Jobs (Id),
    CONSTRAINT FK_JobHistory_RelatedJob FOREIGN KEY (RelatedJobId) REFERENCES tracking.Jobs (Id),
    CONSTRAINT CK_JobHistory_Action CHECK (Action IN (
        'Created','Transferred','TasksTransferredOut','TasksTransferredIn',
        'TasksAdded','TaskSelfAdded','TaskCompleted','TaskCancelled','TaskRejected',
        'DateExtended','BecameDelayed','Completed','Cancelled'))
);
GO

CREATE INDEX IX_JobHistory_Job ON tracking.JobHistory (JobId, PerformedAt DESC);
GO

-- taskNos[] of a history entry
CREATE TABLE tracking.JobHistoryTasks
(
    HistoryId UNIQUEIDENTIFIER NOT NULL,
    TaskId    UNIQUEIDENTIFIER NOT NULL,
    CONSTRAINT PK_JobHistoryTasks PRIMARY KEY CLUSTERED (HistoryId, TaskId),
    CONSTRAINT FK_JobHistoryTasks_History FOREIGN KEY (HistoryId) REFERENCES tracking.JobHistory (Id),
    CONSTRAINT FK_JobHistoryTasks_Task    FOREIGN KEY (TaskId)    REFERENCES tracking.JobTasks (Id)
);
GO

-- Append-only: block updates and deletes on the audit trail
CREATE OR ALTER TRIGGER tracking.TR_JobHistory_AppendOnly
ON tracking.JobHistory
INSTEAD OF UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;
    THROW 50001, 'JobHistory is append-only.', 1;
END;
GO

/* =====================================================================
   4. Derived values (contract §3.1) — use these for reads / jobs/search
   ===================================================================== */

-- Job with counts and derived status (JobSummary minus names / branch lists / types)
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

-- Task with IsLate and the transferred-to job number
CREATE OR ALTER VIEW tracking.vJobTasks
AS
SELECT  t.*,
        tt.JobNo AS TransferredToJobNo,
        CAST(CASE
            WHEN t.Status = 'Completed'
             AND CAST(SWITCHOFFSET(t.CompletedAt, '+05:30') AS DATE) > j.CompleteBy THEN 1
            WHEN t.Status = 'Pending' AND d.Today > j.CompleteBy                    THEN 1
            ELSE 0
        END AS BIT) AS IsLate
FROM    tracking.JobTasks t
JOIN    tracking.Jobs j       ON j.Id  = t.JobId
LEFT JOIN tracking.Jobs tt    ON tt.Id = t.TransferredToJobId
CROSS APPLY (SELECT CAST(SWITCHOFFSET(SYSDATETIMEOFFSET(), '+05:30') AS DATE) AS Today) d;
GO
