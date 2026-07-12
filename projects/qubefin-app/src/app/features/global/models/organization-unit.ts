import { OrganizationUnitHierarchyItem } from "./organization-unit-hierarchy-item";

export interface OrganizationUnit {
    id: string;
    name: string;
    organizationUnitTypeId: string;
    organizationUnitTypeIcon: string;
    organizationUnitTypeName: string;
    parentId: string | null;
    parentName?: string;
    isActive: boolean;
    createdBy: string;
    createdOn: Date;
    lastModifiedBy?: string;
    lastModifiedOn?: Date;
    hierarchy: OrganizationUnitHierarchyItem[];
}