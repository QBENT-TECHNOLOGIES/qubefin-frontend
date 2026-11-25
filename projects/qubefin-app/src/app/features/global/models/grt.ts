// GRT (Group Recognition Test) with the Final Group Assessment, of an Approved Group Survey.

export interface IGrtComponent {
  componentNo: number;
  title: string;
  points: string[];
  // null = not answered yet
  verified: boolean | null;
  remarks: string | null;
}

// The Final Group Assessment: null = not answered yet.
export interface IGrtAssessment {
  cgtSuccessfullyCompleted: boolean | null;
  groupDiscipline: string | null;
  participationOfMembers: string | null;
  leadershipQuality: string | null;
  understandingOfLoanPolicies: string | null;
  knowledgeOfJointLiability: string | null;
  financialLiteracy: string | null;
  clientProtectionAwareness: string | null;
  meetingConduct: string | null;
  loanUtilizationAwareness: string | null;
  grievanceAwareness: string | null;
  overallRecommendation: string | null;
}

export interface IGrtConductedBy {
  name: string;
  designation: string | null;
  // PIN = employee code
  pin: string | null;
}

export interface IGrt {
  surveyId: string;
  // True once the survey is Approved.
  isOpen: boolean;
  // The GRT starts only after the CGT is Completed.
  cgtCompleted: boolean;
  // The Head of the branch can write it until it is submitted.
  canEdit: boolean;
  isSaved: boolean;
  // 'In Progress' or 'Completed'
  status: string;
  branchName: string | null;
  proposedArea: string;
  grtDate: string | null;
  completedOn: string | null;
  conductedBy: IGrtConductedBy | null;
  components: IGrtComponent[];
  assessment: IGrtAssessment;
}

export interface IGrtRequest {
  grtDate: string;
  components: { componentNo: number; verified: boolean | null; remarks: string | null }[];
  assessment: IGrtAssessment;
  // true also submits the GRT (it is then locked)
  submit: boolean;
}

const SATISFACTORY = ['Satisfactory', 'Unsatisfactory'];
const GOOD_AVERAGE_POOR = ['Good', 'Average', 'Poor'];
const ADEQUATE = ['Adequate', 'Inadequate'];

// The ten dropdown ratings of the Final Group Assessment, in the order of the document (the server checks the same values).
export const GRT_RATINGS: { key: keyof IGrtAssessment; label: string; options: string[] }[] = [
  { key: 'groupDiscipline', label: 'Group Discipline', options: SATISFACTORY },
  { key: 'participationOfMembers', label: 'Participation of Members', options: GOOD_AVERAGE_POOR },
  { key: 'leadershipQuality', label: 'Leadership Quality', options: GOOD_AVERAGE_POOR },
  { key: 'understandingOfLoanPolicies', label: 'Understanding of Loan Policies', options: ADEQUATE },
  { key: 'knowledgeOfJointLiability', label: 'Knowledge of Joint Liability', options: ADEQUATE },
  { key: 'financialLiteracy', label: 'Financial Literacy', options: ADEQUATE },
  { key: 'clientProtectionAwareness', label: 'Client Protection Awareness', options: ADEQUATE },
  { key: 'meetingConduct', label: 'Meeting Conduct', options: SATISFACTORY },
  { key: 'loanUtilizationAwareness', label: 'Loan Utilization Awareness', options: ADEQUATE },
  { key: 'grievanceAwareness', label: 'Grievance Awareness', options: ADEQUATE },
];

export function createEmptyAssessment(): IGrtAssessment {
  return {
    cgtSuccessfullyCompleted: null,
    groupDiscipline: null,
    participationOfMembers: null,
    leadershipQuality: null,
    understandingOfLoanPolicies: null,
    knowledgeOfJointLiability: null,
    financialLiteracy: null,
    clientProtectionAwareness: null,
    meetingConduct: null,
    loanUtilizationAwareness: null,
    grievanceAwareness: null,
    overallRecommendation: null,
  };
}
