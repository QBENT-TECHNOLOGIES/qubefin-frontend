export interface IDesignation {
  id: string;
  name: string;
  organizationUnitId: string;
  postId: string;
  isActive: boolean;
  salaryGradeId?: string;
  salaryGrade: string;
  grossSalary: number;
  roleId: string;
  roleName: string;
}
export interface IDesignationDetail {
  id: string;
  name: string;
  postId: string;
  organizationUnitId: string;
  roleId: string;
  salaryGradeId: string;
}
