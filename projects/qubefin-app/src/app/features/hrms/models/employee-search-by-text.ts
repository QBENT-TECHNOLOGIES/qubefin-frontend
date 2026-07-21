export interface EmployeeSearchByText {
  id: string;
  employeeName: string;
  hasSignaturePhoto: boolean;
}

export interface EmployeeSearchResponse {
  value?: {
    employees?: EmployeeSearchByText[];
  };
  valueOrDefault?: {
    employees?: EmployeeSearchByText[];
  };
  employees?: EmployeeSearchByText[];
}
