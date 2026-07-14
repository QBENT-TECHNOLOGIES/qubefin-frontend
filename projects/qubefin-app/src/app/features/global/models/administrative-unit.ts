import { AdministrativeUnitHierarchyItem } from "./administrative-unit-hierarchy-item";

export interface AdministrativeUnit {
    id: string;
    name: string;
    administrativeUnitTypeId: string;
    administrativeUnitTypeIcon: string;
    administrativeUnitTypeName: string;
    parentId: string | null;
    parentName?: string;
    isActive: boolean;
    createdBy: string;
    createdOn: Date;
    lastModifiedBy?: string;
    lastModifiedOn?: Date;
    hierarchy: AdministrativeUnitHierarchyItem[];
}