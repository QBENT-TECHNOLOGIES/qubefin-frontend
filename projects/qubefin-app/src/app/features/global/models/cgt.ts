// CGT (Compulsory Group Training) of an Approved Group Survey.

export interface ICgtTopic {
  topicNo: number;
  title: string;
  points: string[];
  // null = not answered yet
  covered: boolean | null;
  remarks: string | null;
}

export interface ICgtConductedBy {
  name: string;
  designation: string | null;
  employeeCode: string | null;
}

export interface ICgt {
  surveyId: string;
  // True once the survey is Approved.
  isOpen: boolean;
  // The survey's Credit Officers can write it until it is Completed.
  canEdit: boolean;
  isSaved: boolean;
  // 'In Progress' or 'Completed'
  status: string;
  branchName: string | null;
  proposedArea: string;
  startDate: string | null;
  endDate: string | null;
  completedOn: string | null;
  conductedBy: ICgtConductedBy | null;
  topics: ICgtTopic[];
}

export interface ICgtTopicRequest {
  topicNo: number;
  covered: boolean | null;
  remarks: string | null;
}

export interface ICgtRequest {
  startDate: string;
  endDate: string | null;
  topics: ICgtTopicRequest[];
  // true also marks the CGT Completed (it is then locked)
  complete: boolean;
}
