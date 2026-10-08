import { SearchParam } from '../../../models/search-param';

export interface User {
  id: string;
  userName: string;
  employeeId: string;
  employee: string;
  mfaSecret: string;
  hasMfaEnabled: boolean;
  isActive: boolean;
  createdBy: string;
  createdOn: Date;
  lastModifiedBy?: string;
  lastModifiedOn?: Date;
}

export interface UserSearchParam extends SearchParam {
  organizationUnitId: string;
  companyId: string;
}

export interface UserSearch {
  id: string;
  organizationUnitName?: string;
  userName: string;
  employee: string;
  mfaSecret: string;
  hasMfaEnabled: boolean;
  isActive: boolean;
}

export interface UserSearchResult {
  totalCount: number;
  users: UserSearch[];
}

export interface IUserDetail {
  userId: string | null;
  userName: string;
  password?: string;
  employeeId: string | null;
  isActive?: boolean;
  hasMfaEnabled?: boolean;
  employeeName?: string; // used for display
}
export interface IUserDevice {
  id: string;
  deviceId: string;
  assignDate: string;
  isRelease: boolean;
  releaseDate: string;
}
export interface IResetPassword {
    //   userId: string;
    password: string;
    confirmPassword: string;
}
