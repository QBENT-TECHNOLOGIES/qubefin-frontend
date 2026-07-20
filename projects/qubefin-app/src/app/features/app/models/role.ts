import { SearchParam } from "../../../models/search-param";

export interface Role {
    id: string;
    name: string;
    isActive: boolean;
    createdBy: string;
    createdOn: Date;
    lastModifiedBy?: string;
    lastModifiedOn?: Date;
}

export interface RoleSearchParam extends SearchParam {
}

export interface RoleSearch {
    id: string;
    name: string;
    isActive: boolean;
}

export interface RoleSearchResult   {
    totalCount: number;
    roles: RoleSearch[];
};