// A decision a committee member (or the Committee Lead, for the final decision) can give.
export type EvaluationDecision = 'Approve' | 'Reject' | 'Recheck';

export interface IEvaluationRequest {
  decision: EvaluationDecision;
  comments: string | null;
}

export interface IEvaluationItem {
  employeeName: string;
  decision: EvaluationDecision;
  comments: string;
  evaluationDate: string;
  isFinal: boolean;
}

export interface ISurveyEvaluations {
  surveyId: string;
  status: string;
  canEvaluate: boolean;
  canGiveFinal: boolean;
  isCommitteeLead: boolean;
  requiredCount: number;
  doneCount: number;
  pendingMembers: string[];
  myEvaluation: IEvaluationItem | null;
  evaluations: IEvaluationItem[];
  finalEvaluation: IEvaluationItem | null;
  recheckComment: string | null;
  recheckBy: string | null;
}

export const EVALUATION_DECISIONS: { value: EvaluationDecision; label: string; icon: string }[] = [
  { value: 'Approve', label: 'Approve', icon: 'circle-check' },
  { value: 'Recheck', label: 'Recheck', icon: 'rotate-ccw' },
  { value: 'Reject', label: 'Reject', icon: 'x-circle' },
];
