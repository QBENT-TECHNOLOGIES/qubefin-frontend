import { IAuditInfo } from './leave-request';

export interface IDepartment {
  id: string;
  name: string;
  isActive: boolean;
  hodEmployeeId: string;
  hodEmployeeName?: string;
  createdBy?: string;
  createdOn?: Date;
  lastModifiedBy?: string;
  lastModifiedOn?: Date;
  auditInfo?: IAuditInfo;
}
