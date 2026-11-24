import { IApprovalItem } from './survey-approval';

// The Head of Branch either recommends the survey or sends it back to the Credit Officers.
export type GroupRecommendationAction = 'Recommend' | 'Recheck';

export interface IGroupRecommendationRequest {
  action: GroupRecommendationAction;
  recommendation: string | null;
  comments: string | null;
}

export interface IGroupRecommendationItem {
  employeeName: string;
  recommendation: string;
  comments: string;
  actionOn: string | null;
}

// What the "Recommendation and Approval" card of a Group Survey needs.
export interface IGroupReview {
  surveyId: string;
  status: string;
  canRecommend: boolean;
  canApprove: boolean;
  recommendation: IGroupRecommendationItem | null;
  // The Area Manager decision (Approve / Reject).
  decision: IApprovalItem | null;
  recheckComment: string | null;
  recheckBy: string | null;
}
