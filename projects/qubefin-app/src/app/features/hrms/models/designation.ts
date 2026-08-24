export interface IDesignation {
  id: string;
  name: string;
  organizationUnitId: string;
  postId: string;
  isActive: boolean;
  salaryGradeId?: string;
  salaryGrade: string;
  grossSalary: number;
}
