import { EvaluationDecision } from './survey-evaluation';

export interface IApprovalItem {
  employeeName: string;
  decision: EvaluationDecision;
  comments: string;
  actionOn: string;
}

export interface ISurveyApproval {
  surveyId: string;
  status: string;
  canDecide: boolean;
  decision: IApprovalItem | null;
}
