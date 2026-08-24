import { SearchParam } from "../../../models/search-param";

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
}

export interface UserSearch {
    id: string;
    userName: string;
    employee: string;
    mfaSecret: string;
    hasMfaEnabled: boolean;
    isActive: boolean;
}

export interface UserSearchResult {
    totalCount: number;
    users: UserSearch[];
};

export interface IUserDetail {
    userId: string | null;
    userName: string;
    password?: string;
    employeeId: string | null;
    isActive?: boolean;
    hasMfaEnabled?: boolean;
    employeeName?: string; // used for display
}