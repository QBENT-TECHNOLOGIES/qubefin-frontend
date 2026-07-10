import { OrganizationUnitHierarchyItem } from "./organization-unit-hierarchy-item";

export interface OrganizationUnit {
    id: string;
    name: string;
    organizationUnitTypeId: string;
    organizationUnitTypeName: string;
    parentId: string | null;
    parentName?: string;
    isActive: boolean;
    hierarchy: OrganizationUnitHierarchyItem[];
}